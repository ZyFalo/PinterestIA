# 👗 OutfitBase — Tech Stack Acordado

> Última actualización: Febrero 2026
> Estado: Definición de MVP

---

## Principios de arquitectura

- **Costo mínimo**: Free tiers y servicios económicos para validar antes de escalar
- **Todo en Railway**: Backend, frontend y base de datos en un solo proveedor
- **Dockerizado**: Cada servicio con su Dockerfile independiente
- **Monorepo**: Un solo repositorio con separación por carpetas

---

## Estructura del proyecto

```
outfitbase/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── boards.py        # Endpoints de tableros Pinterest
│   │   │   │   ├── analysis.py      # Análisis de outfits con IA
│   │   │   │   ├── products.py      # Búsqueda de productos
│   │   │   │   └── auth.py          # Autenticación
│   │   │   └── deps.py              # Dependencias compartidas
│   │   ├── services/
│   │   │   ├── pinterest.py         # Scraping de tableros
│   │   │   ├── ai_vision.py         # Integración con Gemini Vision
│   │   │   ├── product_search.py    # Búsqueda en tiendas
│   │   │   └── cloudinary.py        # Upload/gestión de imágenes
│   │   ├── models/                  # SQLAlchemy models
│   │   ├── schemas/                 # Pydantic schemas
│   │   ├── core/
│   │   │   ├── config.py            # Settings (env vars)
│   │   │   ├── database.py          # DB connection
│   │   │   └── security.py          # JWT, hashing
│   │   └── prompts/
│   │       └── outfit_analysis.py   # Prompts para Gemini Vision
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
├── docker-compose.yml               # Dev local
├── .gitignore
└── README.md
```

---

## Tech Stack detallado

### Frontend — Next.js 14 + Tailwind CSS

| Decisión | Detalle |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Styling** | Tailwind CSS |
| **Tipo** | PWA responsive (mobile-first) |
| **Deploy** | Railway (modo standalone) |
| **Contenedor** | Docker multi-stage build |

**¿Por qué no app nativa?** Para MVP, una PWA responsive da el 90% de la experiencia mobile sin pasar por App Store/Play Store. Si valida, se puede migrar a React Native reutilizando la lógica.

**Dockerfile (frontend):**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

### Backend — Python + FastAPI

| Decisión | Detalle |
|---|---|
| **Framework** | FastAPI |
| **Python** | 3.12+ |
| **ORM** | SQLAlchemy 2.0 + Alembic (migraciones) |
| **Auth** | JWT con fastapi-users (o manual) |
| **Deploy** | Railway |
| **Contenedor** | Docker |

**¿Por qué Python?** El ecosistema para IA (SDKs de Gemini), scraping (Playwright/BeautifulSoup), y manipulación de imágenes (Pillow) es imbatible. Un solo lenguaje para todo el backend simplifica.

**Dockerfile (backend):**
```dockerfile
FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Instalar Playwright browsers (para scraping Pinterest)
RUN playwright install --with-deps chromium

COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Dependencias principales:**
```
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg
alembic
pydantic-settings
python-jose[cryptography]    # JWT
passlib[bcrypt]               # Password hashing
httpx                         # HTTP client async
google-generativeai           # Gemini SDK
playwright                    # Pinterest scraping
Pillow                        # Procesamiento de imágenes
cloudinary                    # SDK de Cloudinary
python-multipart              # File uploads
```

---

### IA / Visión — Google Gemini (Free Tier)

| Decisión | Detalle |
|---|---|
| **Modelo** | Gemini 2.5 Flash (free tier) |
| **Capacidad** | Visión + texto, análisis multimodal |
| **Límites free** | ~15 RPM, 250K TPM, ~1,000 RPD |
| **Costo MVP** | $0 (free tier) |
| **Costo escalado** | ~$0.15 / millón tokens input (muy barato) |

**Flujo de análisis:**
1. Se reciben las imágenes del tablero Pinterest
2. Cada imagen se envía a Gemini Vision con un prompt estructurado
3. Gemini devuelve un JSON con las prendas identificadas:
   ```json
   {
     "prendas": [
       {
         "tipo": "jeans",
         "subtipo": "bota campana",
         "color": "azul oscuro",
         "material_estimado": "denim",
         "clima": ["frío", "templado"],
         "estilo": "casual"
       },
       {
         "tipo": "top",
         "subtipo": "cuello alto",
         "color": "negro",
         "material_estimado": "algodón",
         "clima": ["frío"],
         "estilo": "casual"
       }
     ]
   }
   ```

**Nota sobre Claude API:** El plan Max de claude.ai es una suscripción de consumidor y NO incluye acceso a la API. La API de Anthropic se factura por separado en console.anthropic.com. Por costos, Gemini free es la mejor opción para MVP.

---

### Base de datos — PostgreSQL (Railway)

| Decisión | Detalle |
|---|---|
| **Motor** | PostgreSQL 16 |
| **Proveedor** | Railway (plugin nativo) |
| **ORM** | SQLAlchemy 2.0 async |
| **Migraciones** | Alembic |

Se crea como servicio adicional en Railway con un click. La connection string se inyecta automáticamente como variable de entorno.

---

### Storage de imágenes — Cloudinary

| Decisión | Detalle |
|---|---|
| **Servicio** | Cloudinary |
| **Free tier** | 25K transformaciones/mes, 25GB storage |
| **Uso** | PNGs de prendas recortadas, imágenes de outfits |
| **Ventajas** | CDN global, transformaciones on-the-fly, API REST sólida |

**Casos de uso:**
- Almacenar PNGs de prendas identificadas (fondo removido)
- Thumbnails y redimensionamiento automático
- Servir imágenes optimizadas por CDN al frontend

---

### Scraping Pinterest — Playwright

| Decisión | Detalle |
|---|---|
| **Herramienta** | Playwright (headless Chromium) |
| **Propósito** | Extraer imágenes de tableros públicos |

La API oficial de Pinterest es restrictiva y el proceso de aprobación es lento. Para MVP, un scraper controlado con Playwright que navega el tablero público y extrae las URLs de imágenes es más rápido. Si el producto escala, se aplica a la API oficial.

---

### Búsqueda de productos — SerpAPI (Google Shopping)

| Decisión | Detalle |
|---|---|
| **Servicio** | SerpAPI |
| **Endpoint** | Google Shopping |
| **Free tier** | 100 búsquedas/mes |
| **Costo pagado** | Desde $50/mes (5,000 búsquedas) |

Se busca por descripción textual generada por Gemini: "jeans azules bota campana mujer" → resultados con imagen, precio y link de tienda.

**Alternativa gratuita:** Scraping directo con Playwright a Google Shopping (más frágil pero $0).

---

## Infraestructura — Todo en Railway

```
Railway Project: outfitbase
├── 🟢 frontend       (Next.js standalone, Docker)
├── 🟢 backend        (FastAPI, Docker)
├── 🟢 postgres       (Plugin nativo Railway)
└── 🔴 redis          (Opcional futuro — cache de análisis)
```

| Servicio | Tipo | Costo estimado |
|---|---|---|
| Frontend | Docker service | ~$5/mes (bajo tráfico) |
| Backend | Docker service | ~$5-7/mes (bajo tráfico) |
| PostgreSQL | Railway plugin | ~$5/mes |
| **Total Railway** | | **~$15-17/mes** |

---

## Servicios externos

| Servicio | Free tier | Costo post-free |
|---|---|---|
| Gemini 2.5 Flash | 1,000 req/día | $0.15/M tokens |
| Cloudinary | 25K transf/mes, 25GB | Desde $89/mes |
| SerpAPI | 100 búsquedas/mes | Desde $50/mes |

---

## Costo total estimado MVP

| Concepto | Costo/mes |
|---|---|
| Railway (3 servicios) | ~$17 |
| Gemini API | $0 (free tier) |
| Cloudinary | $0 (free tier) |
| SerpAPI | $0 (free tier, 100 búsquedas) |
| Dominio (opcional) | ~$12/año |
| **TOTAL** | **~$17/mes** |

---

## Variables de entorno necesarias

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/outfitbase

# Auth
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Gemini
GEMINI_API_KEY=your-gemini-api-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# SerpAPI
SERPAPI_KEY=your-serpapi-key
```

### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=https://backend-url.railway.app
```

---

## Próximos pasos técnicos

1. **Crear repo** con la estructura de carpetas definida
2. **Configurar Dockerfiles** y docker-compose para dev local
3. **Prototipar el pipeline de IA** — Tomar 10 imágenes de un tablero real y probar con Gemini 2.5 Flash Vision la identificación de prendas
4. **Definir modelos de DB** — Users, Boards, Outfits, Garments, Rankings
5. **Implementar scraping de Pinterest** — Playwright extrae imágenes de un tablero público
6. **Conectar todo** — Flujo completo desde URL del tablero hasta ranking de prendas
