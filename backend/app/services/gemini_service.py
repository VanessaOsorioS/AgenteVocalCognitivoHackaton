"""Servicio de conversación con Gemini: tool SoQL, streaming por oraciones y sentimiento."""

import asyncio
import json
import re
from functools import lru_cache
from typing import AsyncIterator

from google import genai
from google.genai import types

from app.core.config import GEMINI_API_KEY, MODELO_LLM
from app.services.datos_gov_co import ErrorApiExterna, consultar_socrata

INSTRUCCION_SISTEMA = (
    "Eres el asistente de voz de una aplicación que consulta la base REPS "
    "(Registro Especial de Prestadores de Servicios de Salud) de datos.gov.co. "
    "Responde siempre en español, en frases cortas y naturales, aptas para leerse en voz alta "
    "(máximo 3 oraciones por respuesta). "
    "Cuando el usuario pregunte por datos de la fuente, usa la herramienta consultar_datos "
    "antes de responder; nunca inventes cifras ni nombres. "
    "La base tiene 41.427 filas con columnas: departamento, municipio, nombre_prestador, "
    "c_digo_prestador, nit_ips, naturaleza, c_digo_sede, nom_sede_ips, gerente, direcci_n, "
    "email, tel_fono, nom_grupo_capacidad, nom_descripcion_capacidad, "
    "num_cantidad_capacidad_instalada, fecha_corte. "
    "Eres un agente de VOZ: el usuario habla y tú escuchas; el usuario nunca escribe. "
    "Por eso NUNCA pidas que deletree, escriba o revise mayúsculas, tildes o el nombre exacto. "
    "Escribe los nombres de municipio, departamento, prestador o sede tal como los dijo el usuario, "
    "con la capitalización que quieras: el sistema normaliza mayúsculas y tildes. "
    "Conteos: una sede aparece en varias filas (una por capacidad). Para cuántas sedes usa "
    "count(distinct c_digo_sede); para cuántos prestadores usa count(distinct c_digo_prestador). "
    "NUNCA uses count(*) ni count(nombre_prestador) para contar. Responde el número distinto. "
    "Para listar usa SELECT distinct nombre_prestador, nom_sede_ips. Siempre LIMIT (máximo 50). "
    "Columnas de texto: municipio, departamento, nombre_prestador, nom_sede_ips, gerente. "
    "Direcci_n y tel_fono sin tilde. Nunca uses cláusula FROM: SoQL es solo SELECT ... WHERE ... LIMIT. "
    "Si la consulta no devuelve filas, di en una frase que no encontraste registros con ese nombre "
    "y ofrece consultar otro municipio, departamento o prestador, hablando de forma natural. "
    "Si la herramienta devuelve un error, dilo brevemente sin inventar datos. "
    "Si la pregunta no tiene relación con la fuente, responde con amabilidad y orienta al usuario "
    "sobre lo que sí puede consultar."
)

INSTRUCCION_SENTIMIENTO = (
    "Clasificas el sentimiento de intervenciones de un usuario en una llamada de voz. "
    'Devuelve SOLO un objeto JSON con este formato: '
    '{"sentimiento": "positivo" | "neutro" | "negativo", '
    '"emocion": "<una palabra en español que describa la emoción, por ejemplo contento, '
    "curioso, molesto, indiferente>\"}. "
    "No incluyas ningún texto fuera del JSON."
)

HERRAMIENTA_CONSULTA = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="consultar_datos",
            description=(
                "Consulta la base REPS de datos.gov.co con una consulta SoQL y devuelve las filas "
                "resultantes. Úsala siempre que el usuario pregunte por cifras, nombres, "
                "departamentos, municipios, sedes o capacidades."
            ),
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "query": types.Schema(
                        type=types.Type.STRING,
                        description=(
                            "Consulta SoQL completa. Ejemplo: "
                            "SELECT nombre_prestador, nom_sede_ips WHERE upper(municipio) = 'MANIZALES' "
                            "LIMIT 10"
                        ),
                    )
                },
                required=["query"],
            ),
        )
    ]
)

PATRON_FIN_ORACION = re.compile(r"(?<=[.!?])\s+")


class ErrorGemini(Exception):
    """Error controlado al conversar con Gemini."""

    def __init__(self, mensaje: str, detalle: str | None = None) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.detalle = detalle


@lru_cache(maxsize=1)
def _cliente() -> genai.Client:
    return genai.Client(
        api_key=GEMINI_API_KEY,
        http_options=types.HttpOptions(
            retry_options=types.HttpRetryOptions(attempts=2),
        ),
    )


async def _analizar_sentimiento(texto: str) -> dict[str, str]:
    try:
        respuesta = await _cliente().aio.models.generate_content(
            model=MODELO_LLM,
            contents=f"Intervención del usuario: {texto}",
            config=types.GenerateContentConfig(
                system_instruction=INSTRUCCION_SENTIMIENTO,
                response_mime_type="application/json",
                temperature=0,
            ),
        )
        datos = json.loads(respuesta.text or "{}")
        return {
            "sentimiento": str(datos.get("sentimiento", "neutro")).lower(),
            "emocion": str(datos.get("emocion", "neutral")).lower(),
        }
    except Exception:
        return {"sentimiento": "neutro", "emocion": "neutral"}


COLUMNAS_TEXTO = "municipio|departamento|nombre_prestador|nom_sede_ips|gerente"
PATRON_IGUAL_TEXTO = re.compile(
    rf"(?<![\w.])({COLUMNAS_TEXTO})\s*=\s*'([^']*)'", re.IGNORECASE
)
LETRAS_ACENTUADAS = "ÁÉÍÓÚÜ"


def _condicion_texto(columna: str, valor: str) -> str:
    """Compara en mayúsculas. La base tiene tildes corruptas: cada vocal puede ser un comodín _."""
    mayusculas = valor.upper().replace("'", "''")
    variantes = {mayusculas}
    for i, c in enumerate(mayusculas):
        if c in "AEIOUÁÉÍÓÚÜ":
            variantes.add(mayusculas[:i] + "_" + mayusculas[i + 1 :])
    if len(variantes) == 1:
        return f"upper({columna}) = '{mayusculas}'"
    return "(" + " OR ".join(f"upper({columna}) like '{v}'" for v in sorted(variantes)) + ")"


def _normalizar_texto(query: str) -> str:
    """Hace que las comparaciones de texto no dependan de mayúsculas ni tildes."""
    sin_upper = re.sub(r"upper\((\w+)\)", r"\1", query, flags=re.IGNORECASE)
    return PATRON_IGUAL_TEXTO.sub(
        lambda m: _condicion_texto(m.group(1).lower(), m.group(2)),
        sin_upper,
    )


def _limpiar_soql(query: str) -> str:
    """Quita FROM (SoQL no lo usa) y normaliza comparaciones de texto."""
    sin_from = re.sub(r"\s+FROM\s+\S+", "", query, flags=re.IGNORECASE).strip()
    return _normalizar_texto(sin_from)


async def _ejecutar_herramienta(llamada) -> tuple[dict, str, int | None, int | None]:
    query = _limpiar_soql(str(dict(llamada.args or {}).get("query", "")))
    try:
        resultado = await consultar_socrata(query)
        salida = {
            "filas": resultado["filas"],
            "truncada": resultado["truncada"],
            "tiempo_ms": resultado["tiempo_ms"],
            "datos": resultado["datos"][:20],
        }
        return salida, query, resultado["filas"], resultado["tiempo_ms"]
    except ErrorApiExterna as error:
        return {"error": error.mensaje, "detalle": error.detalle}, query, None, None


async def flujo_conversacion(texto: str) -> AsyncIterator[dict]:
    """Emite eventos NDJSON: 'meta' (si hubo consulta), 'oracion' en vivo y 'fin' con sentimiento."""
    if not GEMINI_API_KEY:
        raise ErrorGemini("Falta GEMINI_API_KEY en backend/.env.")

    tarea_sentimiento = asyncio.create_task(_analizar_sentimiento(texto))
    try:
        cliente = _cliente()
        try:
            primera = await cliente.aio.models.generate_content(
                model=MODELO_LLM,
                contents=texto,
                config=types.GenerateContentConfig(
                    system_instruction=INSTRUCCION_SISTEMA,
                    tools=[HERRAMIENTA_CONSULTA],
                ),
            )
        except Exception as error:
            raise ErrorGemini("No se pudo contactar con Gemini.", str(error))

        llamada = next(
            (l for l in (primera.function_calls or []) if l.name == "consultar_datos"),
            None,
        )

        if llamada is None:
            contenido = primera.text or ""
            for oracion in _partir_oraciones(contenido):
                yield {"tipo": "oracion", "texto": oracion}
        else:
            salida, query, filas, tiempo_ms = await _ejecutar_herramienta(llamada)
            yield {"tipo": "meta", "query": query, "filas": filas, "tiempo_ms": tiempo_ms}

            contenido_herramienta = types.Content(
                role="user",
                parts=[
                    types.Part(
                        function_response=types.FunctionResponse(
                            name="consultar_datos",
                            response=salida,
                        )
                    )
                ],
            )
            try:
                flujo = await cliente.aio.models.generate_content_stream(
                    model=MODELO_LLM,
                    contents=[texto, primera.candidates[0].content, contenido_herramienta],
                    config=types.GenerateContentConfig(system_instruction=INSTRUCCION_SISTEMA),
                )
                buffer = ""
                async for fragmento in flujo:
                    buffer += fragmento.text or ""
                    partes = PATRON_FIN_ORACION.split(buffer)
                    for oracion in partes[:-1]:
                        if oracion.strip():
                            yield {"tipo": "oracion", "texto": oracion.strip()}
                    buffer = partes[-1]
                if buffer.strip():
                    yield {"tipo": "oracion", "texto": buffer.strip()}
            except ErrorGemini:
                raise
            except Exception as error:
                raise ErrorGemini(
                    "No se pudo contactar con Gemini tras consultar los datos.",
                    str(error),
                )

        analisis = await tarea_sentimiento
        yield {"tipo": "fin", **analisis}
    finally:
        if not tarea_sentimiento.done():
            tarea_sentimiento.cancel()


async def responder_conversacion(texto: str) -> dict:
    respuesta: list[str] = []
    meta: dict = {"query": None, "filas": None, "tiempo_ms": None}
    fin: dict = {"sentimiento": "neutro", "emocion": "neutral"}
    async for evento in flujo_conversacion(texto):
        if evento["tipo"] == "oracion":
            respuesta.append(evento["texto"])
        elif evento["tipo"] == "meta":
            meta = {k: evento[k] for k in ("query", "filas", "tiempo_ms")}
        elif evento["tipo"] == "fin":
            fin = {"sentimiento": evento["sentimiento"], "emocion": evento["emocion"]}
    return {"respuesta": " ".join(respuesta), **fin, **meta}


def _partir_oraciones(texto: str) -> list[str]:
    return [parte.strip() for parte in PATRON_FIN_ORACION.split(texto) if parte.strip()]
