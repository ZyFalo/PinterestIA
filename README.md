# OutfitBase

Plataforma que analiza tableros de Pinterest con IA para identificar prendas de vestir, clasificarlas y buscar productos similares en tiendas online.

## Tech Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0 async |
| Base de datos | PostgreSQL 16 (asyncpg) |
| IA / Visión | Gemini 2.5 Flash (Vision API) |
| Scraping | httpx (JSON API + HTML fallback con paginación) |
| Búsqueda | SerpAPI (Google Shopping) |
| Infraestructura | Railway (Docker) |

## Funcionalidades principales

- **Importar tableros** — Pegar URL de tablero público de Pinterest
- **Análisis con IA** — Gemini Vision identifica prendas (tipo, color, material, estilo, temporada) en cada pin
- **Progreso en tiempo real** — Polling cada 2s con barra de progreso y fases (scraping → análisis → completado)
- **Dashboard** — Tableros ordenados por cantidad de outfits, búsqueda por nombre, contador de outfits
- **Detalle de tablero** — Cover image del tablero, grid masonry de outfits ordenados por prendas detectadas
- **Tendencias** — Ranking de prendas más repetidas agrupadas por tipo (accordion), filtros combinados con conectores AND/OR, búsqueda facetada de colores, paleta de colores interactiva
- **Detalle de outfit** — Vista de la imagen con listado de prendas identificadas y confianza
- **Búsqueda de productos** — Productos similares vía SerpAPI (Google Shopping)
- **Autenticación** — Registro/login con JWT (bcrypt directo)

## Flujo de análisis

1. El usuario ingresa la URL de un tablero público de Pinterest
2. **httpx** scrapea las imágenes del tablero (JSON API con paginación + fallback HTML)
3. Cada imagen se envía concurrentemente a **Gemini 2.5 Flash Vision** (concurrencia: 3) con prompt estructurado
4. Gemini devuelve JSON con prendas identificadas (tipo, color, material, clima, estilo, confianza)
5. Las prendas se almacenan en **PostgreSQL** vinculadas a cada outfit
6. Se pueden buscar productos similares vía **SerpAPI** (Google Shopping)

## Estructura del proyecto

```
outfitbase/
├── backend/
│   ├── app/
│   │   ├── main.py                  # Entry point FastAPI
│   │   ├── api/
│   │   │   ├── routes/              # auth, boards, analysis, products
│   │   │   └── deps.py              # CurrentUser, DBSession
│   │   ├── services/                # pinterest, ai_vision, product_search
│   │   ├── models/                  # User, Board, Outfit, Garment, Product
│   │   ├── schemas/                 # Pydantic v2 schemas
│   │   ├── core/                    # config, database, security (JWT+bcrypt)
│   │   └── prompts/                 # Prompts para Gemini Vision
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                     # Next.js App Router (login, registro, inicio, tableros, tendencias)
│   │   ├── components/              # cards/, layout/, ui/
│   │   └── lib/                     # api.ts, auth-context, types, constants, color-map
│   ├── package.json
│   ├── Dockerfile
│   ├── next.config.js
│   └── tailwind.config.js
├── docker-compose.yml
└── .gitignore
```

## API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Login (devuelve JWT) |
| GET | `/api/auth/me` | Usuario actual |
| GET | `/api/boards` | Listar tableros del usuario |
| POST | `/api/boards` | Crear tablero |
| GET | `/api/boards/{id}` | Detalle de tablero |
| DELETE | `/api/boards/{id}` | Eliminar tablero |
| POST | `/api/boards/{id}/analyze` | Iniciar análisis |
| GET | `/api/boards/{id}/status` | Estado del análisis (polling) |
| GET | `/api/boards/{id}/outfits` | Outfits del tablero (con filtros) |
| GET | `/api/boards/{id}/trends` | Tendencias de prendas |
| GET | `/api/boards/{id}/color-trends` | Tendencias de colores (faceted) |
| GET | `/api/outfits/{id}` | Detalle de outfit |
| GET | `/api/garments/{id}` | Detalle de prenda |
| GET | `/api/garments/{id}/products` | Productos similares |
| POST | `/api/garments/{id}/search-products` | Buscar productos |

## Requisitos previos

- **Docker** y **Docker Compose** (recomendado)
- **Python 3.12+** (solo para desarrollo sin Docker)
- **Node.js 20+** (solo para desarrollo sin Docker)

## Configuración

```bash
# Clonar el repositorio
git clone https://github.com/ZyFalo/PinterestIA.git
cd PinterestIA

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus API keys reales
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
| `SERPAPI_KEY` | SerpAPI | API key para Google Shopping |
| `NEXT_PUBLIC_API_URL` | Frontend | URL del backend (solo frontend) |

## Deploy

El proyecto se despliega en **Railway** como 3 servicios Dockerizados:

- **Frontend** — Next.js en modo standalone (puerto 3000)
- **Backend** — FastAPI con uvicorn (puerto 8000)
- **PostgreSQL** — Servicio nativo de Railway

Las variables de entorno se configuran directamente en el dashboard de Railway.
