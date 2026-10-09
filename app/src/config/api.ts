/** Configuración de acceso al backend (capa de configuración). */
import { Platform } from 'react-native';

const URL_BACKEND = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const API_BASE_URL =
  Platform.OS === 'android' && URL_BACKEND === 'http://localhost:8000'
    ? 'http://10.0.2.2:8000'
    : URL_BACKEND;

export const ENDPOINT_SALUD = `${API_BASE_URL}/api/salud`;
export const ENDPOINT_CONSULTA = `${API_BASE_URL}/api/consulta`;
