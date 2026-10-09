"""Punto de entrada del backend (monolito modular por capas)."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.conversacion import router as conversacion_router
from app.api.routes.consulta import router as consulta_router
from app.api.routes.stt import router as stt_router
from app.api.routes.tts import router as tts_router
from app.core.config import PUERTO_BACKEND

app = FastAPI(
    title="Backend agente de voz datos.gov.co",
    description="Agente conversacional por voz: STT Gemini Live, LLM con tool SoQL y TTS ElevenLabs.",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ],
    allow_origin_regex=(
        r"https://[a-z0-9-]+\.vercel\.app"
        r"|http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?"
    ),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(consulta_router)
app.include_router(conversacion_router)
app.include_router(tts_router)
app.include_router(stt_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PUERTO_BACKEND, reload=True)
