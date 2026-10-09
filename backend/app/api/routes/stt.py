"""Ruta GET /api/stt/token (capa presentación): token efímero para transcribir directo en Gemini Live."""

import asyncio
import warnings
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from google import genai
from google.genai import types

from app.core.config import GEMINI_API_KEY, IDIOMA_STT, MODELO_STT

router = APIRouter(prefix="/api")

URL_LIVE_RESTRINGIDA = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained"
)


def _crear_token() -> str:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        cliente = genai.Client(
            api_key=GEMINI_API_KEY,
            http_options=types.HttpOptions(api_version="v1alpha"),
        )
        ahora = datetime.now(timezone.utc)
        token = cliente.auth_tokens.create(
            config=types.CreateAuthTokenConfig(
                uses=1,
                expire_time=ahora + timedelta(minutes=30),
                new_session_expire_time=ahora + timedelta(minutes=2),
            )
        )
    return token.name


@router.get("/stt/token", summary="Token efímero para abrir una sesión de transcripción en el navegador")
async def stt_token():
    if not GEMINI_API_KEY:
        return JSONResponse(
            status_code=500,
            content={"estado": "error", "mensaje": "Falta GEMINI_API_KEY en el servidor."},
        )
    try:
        nombre = await asyncio.to_thread(_crear_token)
    except Exception as error:
        return JSONResponse(
            status_code=502,
            content={"estado": "error", "mensaje": "No se pudo crear el token de transcripción.", "detalle": str(error)},
        )
    return {
        "url": f"{URL_LIVE_RESTRINGIDA}?access_token={nombre}",
        "modelo": f"models/{MODELO_STT}",
        "idioma": IDIOMA_STT,
    }
