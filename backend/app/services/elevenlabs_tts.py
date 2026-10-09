"""Síntesis de voz con ElevenLabs (capa servicio)."""

import httpx

from app.core.config import ELEVENLABS_API_KEY, ELEVENLABS_TTS_URL

TIMEOUT_TTS = httpx.Timeout(30.0, connect=10.0)
MODELO_TTS = "eleven_turbo_v2_5"
IDIOMA_TTS = "es"


class ErrorTts(Exception):
    """Error controlado al sintetizar voz con ElevenLabs."""

    def __init__(self, mensaje: str, detalle: str | None = None) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.detalle = detalle


async def sintetizar_voz(texto: str) -> bytes:
    """Convierte texto en audio MP3 (bytes) con ElevenLabs."""
    if not ELEVENLABS_API_KEY:
        raise ErrorTts("Falta ELEVENLABS_API_KEY en backend/.env.")

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_TTS) as cliente:
            respuesta = await cliente.post(
                ELEVENLABS_TTS_URL,
                json={"text": texto, "model_id": MODELO_TTS, "language_code": IDIOMA_TTS},
                headers={
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
            )
    except httpx.TimeoutException:
        raise ErrorTts("ElevenLabs no respondió a tiempo (timeout).")
    except httpx.HTTPError as error:
        raise ErrorTts("No se pudo conectar con ElevenLabs.", str(error))

    if respuesta.status_code != 200:
        raise ErrorTts(
            f"ElevenLabs respondió con estado {respuesta.status_code}.",
            respuesta.text[:300],
        )

    return respuesta.content


FORMATO_PCM = "pcm_24000"


async def abrir_stream_voz(texto: str) -> httpx.Response:
    """Abre la síntesis en streaming (PCM 24 kHz 16 bits) y devuelve la respuesta sin leerla."""
    if not ELEVENLABS_API_KEY:
        raise ErrorTts("Falta ELEVENLABS_API_KEY en backend/.env.")

    cliente = httpx.AsyncClient(timeout=TIMEOUT_TTS)
    try:
        peticion = cliente.build_request(
            "POST",
            ELEVENLABS_TTS_URL.replace("?output_format=mp3_44100_128", "/stream")
            + f"?output_format={FORMATO_PCM}",
            json={"text": texto, "model_id": MODELO_TTS, "language_code": IDIOMA_TTS},
            headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"},
        )
        respuesta = await cliente.send(peticion, stream=True)
    except httpx.TimeoutException:
        await cliente.aclose()
        raise ErrorTts("ElevenLabs no respondió a tiempo (timeout).")
    except httpx.HTTPError as error:
        await cliente.aclose()
        raise ErrorTts("No se pudo conectar con ElevenLabs.", str(error))

    if respuesta.status_code != 200:
        cuerpo = (await respuesta.aread()).decode(errors="ignore")[:300]
        await respuesta.aclose()
        await cliente.aclose()
        raise ErrorTts(f"ElevenLabs respondió con estado {respuesta.status_code}.", cuerpo)

    respuesta._cliente_propio = cliente  # type: ignore[attr-defined]
    return respuesta
