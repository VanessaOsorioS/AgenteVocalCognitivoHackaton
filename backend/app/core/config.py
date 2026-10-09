"""Configuración central del backend (capa core)."""

API_DATOS_BASE = "https://www.datos.gov.co/api/v3/views/s2ru-bqt6"
QUERY_ENDPOINT = f"{API_DATOS_BASE}/query.json"

TIMEOUT_SEGUNDOS = 20.0
MAX_FILAS = 500
CONSULTA_DEFECTO = "SELECT * LIMIT 20"

PUERTO_BACKEND = 8000
