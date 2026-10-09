"""Rutas de voz (capa presentación): TTS completo y TTS en streaming PCM."""

from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse, StreamingResponse

from app.models.schemas import TtsRequest
from app.services.elevenlabs_tts import ErrorTts, abrir_stream_voz, sintetizar_voz

router = APIRouter(prefix="/api")


@router.post("/tts", summary="Sintetizar texto con ElevenLabs y devolver audio MP3")
async def tts(peticion: TtsRequest) -> Response:
    try:
        audio = await sintetizar_voz(peticion.texto.strip())
    except ErrorTts as error:
        return JSONResponse(
            status_code=502,
            content={"estado": "error", "mensaje": error.mensaje, "detalle": error.detalle},
        )
    return Response(content=audio, media_type="audio/mpeg")


@router.post("/tts/stream", summary="Sintetizar texto en streaming (PCM 24 kHz, 16 bits)")
async def tts_stream(peticion: TtsRequest):
    try:
        respuesta = await abrir_stream_voz(peticion.texto.strip())
    except ErrorTts as error:
        return JSONResponse(
            status_code=502,
            content={"estado": "error", "mensaje": error.mensaje, "detalle": error.detalle},
        )

    async def emitir():
        try:
            async for trozo in respuesta.aiter_bytes():
                yield trozo
        finally:
            await respuesta.aclose()
            await respuesta._cliente_propio.aclose()  # type: ignore[attr-defined]

    return StreamingResponse(emitir(), media_type="application/octet-stream")
