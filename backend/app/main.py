from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.analysis import router as analysis_router
from app.api.routes.auth import router as auth_router
from app.api.routes.boards import router as boards_router
from app.api.routes.products import router as products_router

ALLOWED_ORIGINS = ["http://localhost:3000"]

app = FastAPI(
    title="OutfitBase API",
    description="Analiza tableros de Pinterest con IA para identificar prendas de vestir",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Asegura que los errores 500 incluyan CORS headers."""
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["access-control-allow-origin"] = origin
        headers["access-control-allow-credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"},
        headers=headers,
    )

app.include_router(auth_router)
app.include_router(boards_router)
app.include_router(analysis_router)
app.include_router(products_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
