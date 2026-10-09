/** Capa de acceso a red: comunica la UI con el backend Python. */

import { ENDPOINT_CONSULTA, ENDPOINT_SALUD } from '../config/api';
import type { EstadoBackend, RespuestaConsulta } from '../types/consulta';

const TIMEOUT_MS = 30000;

async function pedirConTimeout(url: string, opciones: RequestInit): Promise<Response> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opciones, signal: controlador.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

export async function comprobarBackend(): Promise<EstadoBackend> {
  try {
    const respuesta = await pedirConTimeout(ENDPOINT_SALUD, { method: 'GET' });
    if (!respuesta.ok) {
      return { conectado: false, mensaje: `El backend respondió con estado ${respuesta.status}.` };
    }
    return { conectado: true, mensaje: 'Backend conectado.' };
  } catch {
    return {
      conectado: false,
      mensaje: 'No se pudo conectar con el backend. Comprueba que esté ejecutándose en el puerto 8000.',
    };
  }
}

export async function ejecutarConsulta(query: string): Promise<RespuestaConsulta> {
  let respuesta: Response;
  try {
    respuesta = await pedirConTimeout(ENDPOINT_CONSULTA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
  } catch (error) {
    const esTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      estado: 'error',
      mensaje: esTimeout
        ? 'Se agotó el tiempo de espera al consultar el backend.'
        : 'No se pudo conectar con el backend. Comprueba que esté ejecutándose.',
      detalle: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    return (await respuesta.json()) as RespuestaConsulta;
  } catch {
    return {
      estado: 'error',
      mensaje: `El backend devolvió una respuesta que no es JSON válido (estado ${respuesta.status}).`,
    };
  }
}
