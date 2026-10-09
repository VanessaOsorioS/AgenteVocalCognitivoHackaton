"""Cliente de la API de datos.gov.co (capa servicio)."""

import time
from typing import Any

import httpx

from app.core.config import MAX_FILAS, QUERY_ENDPOINT, TIMEOUT_SEGUNDOS


class ErrorApiExterna(Exception):
    """Error controlado al consultar la API de datos.gov.co."""

    def __init__(self, mensaje: str, detalle: str | None = None) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.detalle = detalle


async def consultar_socrata(query: str) -> dict[str, Any]:
    """Ejecuta un POST con la consulta SoQL y devuelve datos + métricas."""
    inicio = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SEGUNDOS) as cliente:
            respuesta = await cliente.post(
                QUERY_ENDPOINT,
                json={"query": query},
                headers={"Content-Type": "application/json"},
            )
    except httpx.TimeoutException:
        raise ErrorApiExterna(
            "La API de datos.gov.co no respondió a tiempo (timeout)."
        )
    except httpx.HTTPError as error:
        raise ErrorApiExterna(
            "No se pudo conectar con la API de datos.gov.co.",
            str(error),
        )

    tiempo_ms = int((time.perf_counter() - inicio) * 1000)

    if respuesta.status_code != 200:
        raise ErrorApiExterna(
            f"La API de datos.gov.co respondió con estado {respuesta.status_code}.",
            respuesta.text[:500],
        )

    try:
        datos = respuesta.json()
    except ValueError as error:
        raise ErrorApiExterna(
            "La API de datos.gov.co devolvió una respuesta que no es JSON válido.",
            str(error),
        )

    if not isinstance(datos, list):
        raise ErrorApiExterna(
            "La API de datos.gov.co devolvió un formato inesperado (se esperaba una lista).",
            str(datos)[:500],
        )

    truncada = len(datos) > MAX_FILAS
    if truncada:
        datos = datos[:MAX_FILAS]

    return {
        "filas": len(datos),
        "truncada": truncada,
        "tiempo_ms": tiempo_ms,
        "datos": datos,
    }
