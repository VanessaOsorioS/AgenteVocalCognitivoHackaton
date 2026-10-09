/** Configuración de acceso al backend (capa de configuración). */
import { Platform } from 'react-native';

const URL_BACKEND = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const API_BASE_URL =
  Platform.OS === 'android' && URL_BACKEND === 'http://localhost:8000'
    ? 'http://10.0.2.2:8000'
    : URL_BACKEND;

export const ENDPOINT_SALUD = `${API_BASE_URL}/api/salud`;
export const ENDPOINT_CONSULTA = `${API_BASE_URL}/api/consulta`;
export const ENDPOINT_CONVERSACION = `${API_BASE_URL}/api/conversacion`;
export const ENDPOINT_CONVERSACION_STREAM = `${API_BASE_URL}/api/conversacion/stream`;
export const ENDPOINT_TTS = `${API_BASE_URL}/api/tts`;
export const ENDPOINT_TTS_STREAM = `${API_BASE_URL}/api/tts/stream`;
export const ENDPOINT_STT_TOKEN = `${API_BASE_URL}/api/stt/token`;
