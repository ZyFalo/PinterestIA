# OutfitBase

Plataforma que analiza tableros de Pinterest con IA para identificar prendas de vestir, clasificarlas y buscar productos similares en tiendas online.

## Tech Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, PWA mobile-first |
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0 async |
| Base de datos | PostgreSQL 16 (asyncpg) |
| IA / Visión | Gemini 2.5 Flash (Vision API) |
| Scraping | Playwright (headless Chromium) |
| Storage | Cloudinary (CDN + transformaciones) |
| Búsqueda | SerpAPI (Google Shopping) |
| Infraestructura | Railway (Docker) |

## Flujo principal

1. El usuario ingresa la URL de un tablero público de Pinterest
2. **Playwright** scrapea las imágenes del tablero
3. Cada imagen se envía a **Gemini 2.5 Flash Vision** con un prompt estructurado
4. Gemini devuelve un JSON con las prendas identificadas (tipo, color, material, clima, estilo)
5. Las prendas se almacenan en **PostgreSQL** y sus imágenes en **Cloudinary**
6. Se buscan productos similares vía **SerpAPI** (Google Shopping)

## Estructura del proyecto

```
outfitbase/
├── backend/
│   ├── app/
│   │   ├── main.py                  # Entry point FastAPI
│   │   ├── api/
│   │   │   ├── routes/              # boards, analysis, products, auth
│   │   │   └── deps.py              # Dependencias compartidas
│   │   ├── services/                # pinterest, ai_vision, product_search, cloudinary
│   │   ├── models/                  # SQLAlchemy models
│   │   ├── schemas/                 # Pydantic schemas
│   │   ├── core/                    # config, database, security (JWT)
│   │   └── prompts/                 # Prompts para Gemini Vision
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                     # Next.js App Router
│   │   ├── components/
│   │   ├── lib/
│   │   └── styles/
│   ├── package.json
│   ├── Dockerfile
│   ├── next.config.js
│   └── tailwind.config.js
├── docker-compose.yml
└── .gitignore
```

## Requisitos previos

- **Docker** y **Docker Compose** (recomendado)
- **Python 3.12+** (solo para desarrollo sin Docker)
- **Node.js 20+** (solo para desarrollo sin Docker)

## Configuración

```bash
# Clonar el repositorio
git clone https://github.com/ZyFalo/PinterestIA.git
cd PinterestIA

# Configurar variables de entorno del backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus API keys reales

# Configurar variable de entorno del frontend (dev local)
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
```

## Desarrollo local

### Con Docker (recomendado)

```bash
docker-compose up --build      # Build y levantar todos los servicios
docker-compose up              # Levantar sin rebuild
docker-compose down            # Detener servicios
```

Esto levanta 3 servicios: backend (`:8000`), frontend (`:3000`) y PostgreSQL (`:5432`).

### Sin Docker

**Backend:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install --with-deps chromium
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**

```bash
cd frontend
npm ci
npm run dev
```

### Migraciones de base de datos

```bash
cd backend
alembic revision --autogenerate -m "descripcion"
alembic upgrade head
alembic downgrade -1
```

## Variables de entorno

| Variable | Servicio | Descripción |
|---|---|---|
| `DATABASE_URL` | PostgreSQL | Connection string (`postgresql+asyncpg://...`) |
| `SECRET_KEY` | Auth | Clave secreta para firmar JWT |
| `ALGORITHM` | Auth | Algoritmo JWT (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Auth | Tiempo de expiración del token (default: `30`) |
| `GEMINI_API_KEY` | Gemini | API key de Google AI Studio |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary | Nombre del cloud |
| `CLOUDINARY_API_KEY` | Cloudinary | API key |
| `CLOUDINARY_API_SECRET` | Cloudinary | API secret |
| `SERPAPI_KEY` | SerpAPI | API key para Google Shopping |
| `NEXT_PUBLIC_API_URL` | Frontend | URL del backend (solo frontend) |

## Deploy

El proyecto se despliega en **Railway** como 3 servicios Dockerizados:

- **Frontend** — Next.js en modo standalone (puerto 3000)
- **Backend** — FastAPI con uvicorn (puerto 8000)
- **PostgreSQL** — Servicio nativo de Railway

Las variables de entorno se configuran directamente en el dashboard de Railway.
