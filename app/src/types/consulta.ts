/** Tipos compartidos de la primera prueba (capa de modelos). */

export type EstadoConsulta = 'inicial' | 'cargando' | 'exito' | 'error';

export type FilaDatos = Record<string, unknown>;

export interface RespuestaExito {
  estado: 'exito';
  query: string;
  filas: number;
  truncada: boolean;
  tiempo_ms: number;
  datos: FilaDatos[];
}

export interface RespuestaError {
  estado: 'error';
  mensaje: string;
  detalle?: string | null;
}

export type RespuestaConsulta = RespuestaExito | RespuestaError;

export interface EstadoBackend {
  conectado: boolean;
  mensaje: string;
}
