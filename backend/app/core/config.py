"""Configuración central del backend (capa core)."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

API_DATOS_BASE = "https://www.datos.gov.co/api/v3/views/s2ru-bqt6"
QUERY_ENDPOINT = f"{API_DATOS_BASE}/query.json"

TIMEOUT_SEGUNDOS = 20.0
MAX_FILAS = 500
CONSULTA_DEFECTO = "SELECT * LIMIT 20"

PUERTO_BACKEND = 8000

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "cgSgspJ2msm6clMCkdW9")
ELEVENLABS_TTS_URL = (
    "https://api.elevenlabs.io/v1/text-to-speech/"
    f"{ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128"
)
MODELO_LLM = os.getenv("MODELO_LLM", "gemini-3.1-flash-lite")
MODELO_STT = "gemini-3.5-transcribe-live"
IDIOMA_STT = os.getenv("IDIOMA_STT", "es-CO")
