"""Modelos de datos de la API REST (capa modelo)."""

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class ConsultaRequest(BaseModel):
    """Cuerpo aceptado por POST /api/consulta."""

    query: str = Field(
        default="SELECT * LIMIT 20",
        min_length=1,
        max_length=2000,
        description="Consulta SoQL enviada a datos.gov.co",
    )


class ConsultaResponse(BaseModel):
    """Respuesta exitosa de POST /api/consulta."""

    estado: Literal["exito"] = "exito"
    query: str
    filas: int
    truncada: bool
    tiempo_ms: int
    datos: list[dict[str, Any]]


class ErrorDetail(BaseModel):
    """Respuesta de error de POST /api/consulta."""

    estado: Literal["error"] = "error"
    mensaje: str
    detalle: Optional[str] = None


class SaludResponse(BaseModel):
    """Respuesta de GET /api/salud."""

    estado: Literal["ok"] = "ok"
    servicio: str


class ConversacionRequest(BaseModel):
    """Cuerpo aceptado por POST /api/conversacion."""

    texto: str = Field(
        min_length=1,
        max_length=2000,
        description="Intervención del usuario transcrita por voz",
    )


class ConversacionResponse(BaseModel):
    """Respuesta exitosa de POST /api/conversacion."""

    estado: Literal["exito"] = "exito"
    respuesta: str
    sentimiento: str = "neutro"
    emocion: str = "neutral"
    query: Optional[str] = None
    filas: Optional[int] = None
    tiempo_ms: Optional[int] = None


class TtsRequest(BaseModel):
    """Cuerpo aceptado por POST /api/tts."""

    texto: str = Field(
        min_length=1,
        max_length=5000,
        description="Texto del asistente que se sintetiza con ElevenLabs",
    )
