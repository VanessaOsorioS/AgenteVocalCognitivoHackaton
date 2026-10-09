/** Captura de micrófono en web: PCM16 mono a 16 kHz en bloques de ~128 ms. */

export interface CapturaMicrofono {
  detener: () => void;
  pausar: () => void;
  reanudar: () => void;
}

const TAMANO_BLOQUE = 2048;

function convertirAPcm16(entrada: Float32Array): ArrayBuffer {
  const salida = new Int16Array(entrada.length);
  for (let i = 0; i < entrada.length; i += 1) {
    const muestra = Math.max(-1, Math.min(1, entrada[i]));
    salida[i] = muestra < 0 ? muestra * 0x8000 : muestra * 0x7fff;
  }
  return salida.buffer;
}

export async function iniciarCaptura(
  onAudio: (pcm: ArrayBuffer) => void,
): Promise<CapturaMicrofono> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Este navegador no permite acceder al micrófono.');
  }

  const flujo = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });

  const ContextoAudio =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const contexto = new ContextoAudio({ sampleRate: 16000 });
  const fuente = contexto.createMediaStreamSource(flujo);
  const procesador = contexto.createScriptProcessor(TAMANO_BLOQUE, 1, 1);
  let pausado = false;

  procesador.onaudioprocess = (evento) => {
    if (pausado) return;
    onAudio(convertirAPcm16(evento.inputBuffer.getChannelData(0)));
  };

  fuente.connect(procesador);
  procesador.connect(contexto.destination);

  return {
    pausar: () => {
      pausado = true;
    },
    reanudar: () => {
      pausado = false;
    },
    detener: () => {
      pausado = true;
      procesador.disconnect();
      fuente.disconnect();
      flujo.getTracks().forEach((pista) => pista.stop());
      void contexto.close();
    },
  };
}
