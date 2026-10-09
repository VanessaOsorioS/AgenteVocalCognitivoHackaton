/** Transcripción en vivo: el navegador habla directo con Gemini Live usando un token efímero del backend. */
import { ENDPOINT_STT_TOKEN } from '../config/api';
import type { EventoStt } from '../types/agente';

export interface SocketStt {
  enviarAudio: (pcm: ArrayBuffer) => void;
  cerrar: () => void;
}

interface RespuestaToken {
  url: string;
  modelo: string;
  idioma: string;
}

const TROZO_BASE64 = 0x8000;

function aBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binario = '';
  for (let i = 0; i < bytes.length; i += TROZO_BASE64) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TROZO_BASE64));
  }
  return btoa(binario);
}

export async function abrirSocketStt(onEvento: (evento: EventoStt) => void): Promise<SocketStt> {
  const respuesta = await fetch(ENDPOINT_STT_TOKEN);
  if (!respuesta.ok) {
    throw new Error('No se pudo iniciar la transcripción. Revisa la configuración del servidor.');
  }
  const config = (await respuesta.json()) as RespuestaToken;

  const socket = new WebSocket(config.url);
  let listo = false;
  let cerradoPorCliente = false;
  const enEspera: ArrayBuffer[] = [];

  const enviarJson = (cuerpo: unknown) => socket.send(JSON.stringify(cuerpo));

  const enviarPcm = (pcm: ArrayBuffer) =>
    enviarJson({
      realtimeInput: { audio: { data: aBase64(pcm), mimeType: 'audio/pcm;rate=16000' } },
    });

  socket.onopen = () => {
    enviarJson({
      setup: {
        model: config.modelo,
        generationConfig: { responseModalities: ['TEXT'] },
        inputAudioTranscription: { languageCodes: [config.idioma] },
      },
    });
  };

  socket.onmessage = (mensaje) => {
    let datos: Record<string, unknown>;
    try {
      datos = JSON.parse(String(mensaje.data)) as Record<string, unknown>;
    } catch {
      return;
    }

    if (datos.setupComplete !== undefined) {
      listo = true;
      enEspera.splice(0).forEach(enviarPcm);
      return;
    }
    if (datos.goAway !== undefined) {
      onEvento({ tipo: 'desconexion', motivo: 'limite_sesion' });
      return;
    }

    const contenido = datos.serverContent as
      | { interimInputTranscription?: { text?: string }; inputTranscription?: { text?: string } }
      | undefined;
    const parcial = contenido?.interimInputTranscription?.text;
    const final = contenido?.inputTranscription?.text;
    if (parcial) onEvento({ tipo: 'parcial', texto: parcial });
    if (final) onEvento({ tipo: 'final', texto: final });
  };

  socket.onerror = () => {
    if (!cerradoPorCliente) {
      onEvento({ tipo: 'error', mensaje: 'Se perdió la conexión con el servicio de transcripción.' });
    }
  };

  socket.onclose = () => {
    if (!cerradoPorCliente) {
      onEvento({ tipo: 'desconexion', motivo: 'cierre_servidor' });
    }
  };

  return {
    enviarAudio: (pcm) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      if (listo) {
        enviarPcm(pcm);
      } else if (enEspera.length < 20) {
        enEspera.push(pcm);
      }
    },
    cerrar: () => {
      cerradoPorCliente = true;
      socket.close();
    },
  };
}
