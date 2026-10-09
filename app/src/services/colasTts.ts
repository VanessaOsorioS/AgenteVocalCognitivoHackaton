/** Voz en streaming por oraciones: descarga PCM en paralelo y lo programa al llegar, sin esperar audios completos. */
import { ENDPOINT_TTS_STREAM } from '../config/api';

const FRECUENCIA_PCM = 24000;

export interface ReproductorTts {
  /** Añade una oración: su audio empieza a descargarse de inmediato. */
  encolar: (texto: string) => void;
  /** Indica que no llegarán más oraciones. */
  finalizar: () => void;
  /** Resuelve cuando todo el audio encolado terminó de sonar (o se detuvo). */
  esperarFin: () => Promise<void>;
  detener: () => void;
}

interface Oracion {
  texto: string;
  fragmentos: Float32Array[];
  listo: boolean;
  fallo: boolean;
}

let contextoCompartido: AudioContext | null = null;

/** Un único AudioContext, creado desde un gesto del usuario (requisito de Chrome). */
function obtenerContexto(): AudioContext {
  if (!contextoCompartido) {
    contextoCompartido = new AudioContext();
  }
  if (contextoCompartido.state === 'suspended') {
    void contextoCompartido.resume();
  }
  return contextoCompartido;
}

export function dividirEnOraciones(texto: string): string[] {
  return texto
    .split(/(?<=[.!?¡¿])\s+/)
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0);
}

/** Convierte bytes PCM 16 bits little-endian a Float32, guardando el byte sobrante si queda impar. */
function decodificarPcm(bytes: Uint8Array): { muestras: Float32Array; sobrante: Uint8Array | null } {
  const par = bytes.length - (bytes.length % 2);
  const copia = bytes.slice(0, par);
  const enteros = new Int16Array(copia.buffer);
  const muestras = new Float32Array(enteros.length);
  for (let i = 0; i < enteros.length; i += 1) {
    muestras[i] = enteros[i] / 32768;
  }
  return { muestras, sobrante: bytes.length % 2 ? bytes.slice(par) : null };
}

export function crearReproductorTts(): ReproductorTts {
  const contexto = obtenerContexto();
  const oraciones: Oracion[] = [];
  const controladores = new Set<AbortController>();
  const fuentes = new Set<AudioBufferSourceNode>();
  let finalizado = false;
  let detenido = false;
  let cursor = 0;
  let despertar: (() => void) | null = null;

  const avisar = () => {
    const continuar = despertar;
    despertar = null;
    continuar?.();
  };

  const programar = (muestras: Float32Array) => {
    const buffer = contexto.createBuffer(1, muestras.length, FRECUENCIA_PCM);
    buffer.copyToChannel(muestras as Float32Array<ArrayBuffer>, 0);
    const fuente = contexto.createBufferSource();
    fuente.buffer = buffer;
    fuente.connect(contexto.destination);
    const ahora = contexto.currentTime;
    if (cursor < ahora) cursor = ahora + 0.05;
    fuente.start(cursor);
    cursor += buffer.duration;
    fuentes.add(fuente);
    fuente.onended = () => fuentes.delete(fuente);
  };

  const descargar = async (oracion: Oracion) => {
    const controlador = new AbortController();
    controladores.add(controlador);
    try {
      const respuesta = await fetch(ENDPOINT_TTS_STREAM, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: oracion.texto }),
        signal: controlador.signal,
      });
      if (!respuesta.ok || !respuesta.body) {
        throw new Error(`TTS respondió con estado ${respuesta.status}.`);
      }
      const lector = respuesta.body.getReader();
      let sobrante: Uint8Array | null = null;
      while (!detenido) {
        const { value, done } = await lector.read();
        if (done) break;
        let bytes = value;
        if (sobrante) {
          const unido = new Uint8Array(sobrante.length + value.length);
          unido.set(sobrante);
          unido.set(value, sobrante.length);
          bytes = unido;
        }
        const { muestras, sobrante: resto } = decodificarPcm(bytes);
        sobrante = resto;
        if (muestras.length > 0) {
          oracion.fragmentos.push(muestras);
          avisar();
        }
      }
    } catch (error) {
      if (!detenido) {
        oracion.fallo = true;
        console.warn('No se pudo sintetizar una oración:', error);
      }
    } finally {
      oracion.listo = true;
      controladores.delete(controlador);
      avisar();
    }
  };

  const reproducir = async (): Promise<void> => {
    let indice = 0;
    while (!detenido) {
      if (indice < oraciones.length) {
        const oracion = oraciones[indice];
        indice += 1;
        let programados = 0;
        while (!detenido) {
          while (programados < oracion.fragmentos.length) {
            programar(oracion.fragmentos[programados]);
            programados += 1;
          }
          if (oracion.listo) break;
          await new Promise<void>((resolver) => {
            despertar = resolver;
          });
        }
      } else if (finalizado) {
        break;
      } else {
        await new Promise<void>((resolver) => {
          despertar = resolver;
        });
      }
    }
  };

  const terminado = reproducir();

  return {
    encolar: (texto) => {
      if (detenido) return;
      const oracion: Oracion = { texto, fragmentos: [], listo: false, fallo: false };
      oraciones.push(oracion);
      void descargar(oracion);
      avisar();
    },
    finalizar: () => {
      finalizado = true;
      avisar();
    },
    esperarFin: async () => {
      await terminado;
      const restante = Math.max(0, cursor - contexto.currentTime);
      await new Promise<void>((resolver) => setTimeout(resolver, restante * 1000));
    },
    detener: () => {
      detenido = true;
      controladores.forEach((controlador) => controlador.abort());
      fuentes.forEach((fuente) => {
        try {
          fuente.stop();
        } catch {
          // La fuente ya terminó.
        }
      });
      fuentes.clear();
      avisar();
    },
  };
}
