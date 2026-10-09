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
