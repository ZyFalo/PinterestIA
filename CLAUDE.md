# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

**OutfitBase** — Plataforma que analiza tableros de Pinterest con IA para identificar prendas de vestir, clasificarlas y buscar productos similares en tiendas online.

## Arquitectura

Monorepo con dos servicios Dockerizados y una base de datos, todo desplegado en Railway:

- **`backend/`** — Python 3.12+ con FastAPI, SQLAlchemy 2.0 async, Alembic para migraciones
- **`frontend/`** — Next.js 14 (App Router), Tailwind CSS, PWA mobile-first, modo standalone
- **PostgreSQL 16** — Servicio nativo de Railway, conectado vía `asyncpg`

### Flujo principal

1. Usuario ingresa URL de tablero público de Pinterest
2. **Playwright** (headless Chromium) scrapea las imágenes del tablero
3. Cada imagen se envía a **Gemini 2.5 Flash Vision** con prompt estructurado
4. Gemini devuelve JSON con prendas identificadas (tipo, color, material, clima, estilo)
5. Las prendas se almacenan en PostgreSQL y sus imágenes en **Cloudinary**
6. Se buscan productos similares vía **SerpAPI** (Google Shopping)

### Estructura backend

```
backend/app/
├── main.py                  # Entry point FastAPI
├── api/
│   ├── routes/              # boards, analysis, products, auth
│   └── deps.py              # Dependencias compartidas
├── services/                # pinterest, ai_vision, product_search, cloudinary
├── models/                  # SQLAlchemy models
├── schemas/                 # Pydantic schemas
├── core/                    # config, database, security (JWT)
└── prompts/                 # Prompts para Gemini Vision
```

## Comandos de desarrollo

### Dev local con Docker
```bash
docker-compose up              # Levantar todos los servicios
docker-compose up --build      # Rebuild y levantar
docker-compose down            # Detener servicios
```

### Backend (sin Docker)
El entorno virtual solo es necesario para desarrollo local sin Docker. En producción, el contenedor Docker provee el aislamiento.
```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # macOS/Linux
pip install -r requirements.txt
playwright install --with-deps chromium
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm ci
npm run dev                    # Dev server en puerto 3000
npm run build                  # Build producción (standalone)
```

### Migraciones de base de datos (Alembic)
```bash
cd backend
alembic revision --autogenerate -m "descripcion"
alembic upgrade head
alembic downgrade -1
```

## Servicios externos y API keys

| Servicio | Uso | Variable de entorno |
|---|---|---|
| Gemini 2.5 Flash | Análisis de imágenes con Vision | `GEMINI_API_KEY` |
| Cloudinary | Storage/CDN de imágenes de prendas | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| SerpAPI | Búsqueda de productos (Google Shopping) | `SERPAPI_KEY` |
| PostgreSQL | Base de datos principal | `DATABASE_URL` (formato: `postgresql+asyncpg://...`) |
| Auth JWT | Autenticación de usuarios | `SECRET_KEY`, `ALGORITHM` (HS256), `ACCESS_TOKEN_EXPIRE_MINUTES` (default: 30) |

## Archivos de entorno

Todos los archivos de entorno están en la **raíz del proyecto** (un solo `.env` para backend y frontend):

- **`.env.example`** — Plantilla con todas las variables necesarias (se commitea al repo)
- **`.env`** — Copia de `.env.example` con valores reales (NO se commitea)

Setup:
```bash
cp .env.example .env   # Rellenar con valores reales
```

## Dockerización

Cada servicio tiene su propio Dockerfile, orquestados por docker-compose para desarrollo local:

| Archivo | Descripción |
|---|---|
| `backend/Dockerfile` | `python:3.12-slim`, instala dependencias + Playwright con Chromium, ejecuta uvicorn en puerto 8000 |
| `frontend/Dockerfile` | Multi-stage build con `node:20-alpine`, genera output standalone de Next.js, ejecuta `node server.js` en puerto 3000 |
| `docker-compose.yml` | Raíz del proyecto, orquesta frontend + backend + PostgreSQL para dev local |

## .gitignore

```
# Python
venv/
__pycache__/
*.pyc

# Entorno
.env
.env.local

# Node
node_modules/
.next/

# Sistema
.DS_Store
```

## Convenciones

- Todo el backend usa **async/await** (SQLAlchemy async, httpx, asyncpg)
- Auth con **JWT** (python-jose + passlib/bcrypt)
- Respuestas de Gemini Vision se esperan como **JSON estructurado** (ver `prompts/outfit_analysis.py`)
- Frontend se comunica con backend vía `NEXT_PUBLIC_API_URL`
- Idioma del producto: **español** (UI, prompts, categorías de prendas)
