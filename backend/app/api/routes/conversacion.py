"""Rutas POST /api/conversacion y /api/conversacion/stream (capa presentación)."""

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import ConversacionRequest, ConversacionResponse, ErrorDetail
from app.services.gemini_service import ErrorGemini, flujo_conversacion, responder_conversacion

router = APIRouter(prefix="/api")


@router.post(
    "/conversacion",
    response_model=ConversacionResponse | ErrorDetail,
    summary="Responder a una intervención del usuario (respuesta completa)",
)
async def conversacion(peticion: ConversacionRequest) -> ConversacionResponse | ErrorDetail:
    try:
        resultado = await responder_conversacion(peticion.texto.strip())
    except ErrorGemini as error:
        return ErrorDetail(estado="error", mensaje=error.mensaje, detalle=error.detalle)
    return ConversacionResponse(**resultado)


@router.post(
    "/conversacion/stream",
    summary="Responder por streaming NDJSON, oración a oración",
)
async def conversacion_stream(peticion: ConversacionRequest) -> StreamingResponse:
    texto = peticion.texto.strip()

    async def generar():
        try:
            async for evento in flujo_conversacion(texto):
                yield json.dumps(evento, ensure_ascii=False) + "\n"
        except ErrorGemini as error:
            yield json.dumps(
                {"tipo": "error", "mensaje": error.mensaje, "detalle": error.detalle},
                ensure_ascii=False,
            ) + "\n"

    return StreamingResponse(generar(), media_type="application/x-ndjson")
