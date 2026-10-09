/** Tipos de la pantalla del agente conversacional. */

export type EstadoLlamada = 'inicial' | 'escuchando' | 'pensando' | 'hablando';

export type RolHablante = 'usuario' | 'asistente';

export interface Intervencion {
  id: string;
  hablante: RolHablante;
  texto: string;
  /** Hora de la intervención; se muestra solo si está disponible. */
  timestamp?: string;
  /** Sentimiento detectado (solo intervenciones del usuario). */
  sentimiento?: string;
  emocion?: string;
}

export type EventoStt =
  | { tipo: 'parcial'; texto: string }
  | { tipo: 'final'; texto: string }
  | { tipo: 'error'; mensaje: string; detalle?: string }
  | { tipo: 'desconexion'; motivo: string };

export type EventoConversacion =
  | { tipo: 'meta'; query: string | null; filas: number | null; tiempo_ms: number | null }
  | { tipo: 'oracion'; texto: string }
  | { tipo: 'fin'; sentimiento: string; emocion: string }
  | { tipo: 'error'; mensaje: string; detalle?: string };

export interface RespuestaConversacion {
  estado: 'exito';
  respuesta: string;
  sentimiento: string;
  emocion: string;
  query: string | null;
  filas: number | null;
  tiempo_ms: number | null;
}
