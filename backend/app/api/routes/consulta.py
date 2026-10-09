"""Rutas REST del backend (capa presentación)."""

from fastapi import APIRouter

from app.core.config import CONSULTA_DEFECTO
from app.models.schemas import ConsultaRequest, ConsultaResponse, ErrorDetail, SaludResponse
from app.services.datos_gov_co import ErrorApiExterna, consultar_socrata

router = APIRouter(prefix="/api")


@router.get("/salud", response_model=SaludResponse, summary="Comprobar que el backend está activo")
async def salud() -> SaludResponse:
    return SaludResponse(estado="ok", servicio="backend-prueba-api-datos-gov-co")


@router.post(
    "/consulta",
    response_model=ConsultaResponse | ErrorDetail,
    summary="Consultar la API de datos.gov.co con una consulta SoQL",
)
async def consulta(peticion: ConsultaRequest | None = None) -> ConsultaResponse | ErrorDetail:
    query = (peticion.query if peticion else CONSULTA_DEFECTO).strip() or CONSULTA_DEFECTO
    try:
        resultado = await consultar_socrata(query)
    except ErrorApiExterna as error:
        return ErrorDetail(estado="error", mensaje=error.mensaje, detalle=error.detalle)
    return ConsultaResponse(query=query, **resultado)
