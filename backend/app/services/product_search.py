import httpx

from app.core.config import settings

SERPAPI_BASE_URL = "https://serpapi.com/search.json"


def _build_query(garment: dict) -> str:
    """Construye query de búsqueda a partir de los atributos de la prenda."""
    parts = []

    if garment.get("name"):
        parts.append(garment["name"])

    if garment.get("color"):
        parts.append(garment["color"])

    if garment.get("material"):
        parts.append(garment["material"])

    parts.append("comprar")

    return " ".join(parts)


async def search_products(garment: dict, max_results: int = 5) -> list[dict]:
    """
    Busca productos similares a una prenda usando SerpAPI (Google Shopping).

    Args:
        garment: dict con name, type, color, material, style
        max_results: cantidad máxima de resultados (default 5)

    Retorna:
        Lista de dicts con: name, price, store, image_url, product_url
    """
    if not settings.SERPAPI_KEY:
        raise ValueError("SERPAPI_KEY no está configurada")

    query = _build_query(garment)

    params = {
        "engine": "google_shopping",
        "q": query,
        "api_key": settings.SERPAPI_KEY,
        "hl": "es",
        "gl": "es",
        "num": max_results,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(SERPAPI_BASE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    shopping_results = data.get("shopping_results", [])

    products = []
    for item in shopping_results[:max_results]:
        price_raw = item.get("extracted_price") or item.get("price")
        if price_raw is not None:
            price = str(price_raw)[:50]
        else:
            price = None

        source = item.get("source") or item.get("seller")
        store = source[:100] if source else None

        products.append({
            "name": item.get("title", "Producto sin nombre")[:255],
            "price": price,
            "store": store,
            "image_url": item.get("thumbnail"),
            "product_url": item.get("link") or item.get("product_link"),
        })

    return products
