from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.analysis import router as analysis_router
from app.api.routes.auth import router as auth_router
from app.api.routes.boards import router as boards_router
from app.api.routes.products import router as products_router

app = FastAPI(
    title="OutfitBase API",
    description="Analiza tableros de Pinterest con IA para identificar prendas de vestir",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(boards_router)
app.include_router(analysis_router)
app.include_router(products_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
