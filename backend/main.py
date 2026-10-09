"""Punto de entrada del backend (monolito modular por capas)."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.consulta import router as consulta_router
from app.core.config import PUERTO_BACKEND

app = FastAPI(
    title="Backend prueba API datos.gov.co",
    description="Primera prueba: conexión y consulta manual a la API de datos.gov.co.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ],
    allow_origin_regex=r"http://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(consulta_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PUERTO_BACKEND, reload=True)
