import re

import httpx

PINTEREST_BOARD_PATTERN = re.compile(
    r"https?://(www\.)?pinterest\.\w+(/\w+)?/([^/]+)/([^/]+)"
)


def validate_pinterest_url(url: str) -> bool:
    return bool(PINTEREST_BOARD_PATTERN.match(url.rstrip("/")))


def extract_board_info(url: str) -> dict:
    """Extrae username y board_slug de una URL de Pinterest."""
    match = PINTEREST_BOARD_PATTERN.match(url.rstrip("/"))
    if not match:
        return {"username": "", "board_slug": ""}
    return {"username": match.group(3), "board_slug": match.group(4)}


async def scrape_board_images(url: str, max_pins: int = 50) -> dict:
    """
    Scrapea imágenes de un tablero público de Pinterest.

    Retorna:
        {
            "name": str,
            "image_urls": list[str],
            "pin_urls": list[str],
            "cover_image": str | None,
            "pins_count": int,
        }
    """
    info = extract_board_info(url)
    board_name = info["board_slug"].replace("-", " ").title()

    # Usar Pinterest RSS/JSON endpoint para obtener pins sin Playwright
    # Pinterest expone datos via su API interna en formato JSON
    username = info["username"]
    board_slug = info["board_slug"]

    image_urls: list[str] = []
    pin_urls: list[str] = []
    cover_image: str | None = None

    # Intentar obtener pins via endpoint de Pinterest
    api_url = f"https://www.pinterest.com/{username}/{board_slug}.json"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            # Primer intento: endpoint .json
            resp = await client.get(api_url, headers=headers)

            if resp.status_code == 200:
                data = resp.json()

                # Extraer info del tablero
                board_data = (
                    data.get("resource_response", {}).get("data", {})
                )
                if board_data.get("name"):
                    board_name = board_data["name"]
                if board_data.get("image_cover_url"):
                    cover_image = board_data["image_cover_url"]

                # Extraer pins
                pins = (
                    data.get("resource_response", {})
                    .get("data", {})
                    .get("pins", [])
                )

                if not pins:
                    # Estructura alternativa
                    board_feed = data.get("resource_data_cache", [])
                    for cache_item in board_feed:
                        cache_data = cache_item.get("data", {})
                        if isinstance(cache_data, dict) and "results" in cache_data:
                            pins = cache_data["results"]
                            break

                for pin in pins[:max_pins]:
                    if isinstance(pin, dict):
                        images = pin.get("images", {})
                        orig = images.get("orig", {})
                        img_url = orig.get("url") or pin.get("image_large_url")
                        if img_url:
                            image_urls.append(img_url)
                            pin_id = pin.get("id", "")
                            if pin_id:
                                pin_urls.append(
                                    f"https://www.pinterest.com/pin/{pin_id}/"
                                )
                            if not cover_image:
                                cover_image = img_url

    except (httpx.HTTPError, ValueError, KeyError):
        pass

    # Si el endpoint JSON no devolvió resultados, intentar con scraping HTML
    if not image_urls:
        try:
            async with httpx.AsyncClient(
                follow_redirects=True, timeout=30.0
            ) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    html = resp.text

                    # Extraer URLs de imágenes de alta resolución del HTML
                    img_pattern = re.compile(
                        r"https://i\.pinimg\.com/(?:originals|736x)/[a-f0-9/]+\.\w+"
                    )
                    found = img_pattern.findall(html)
                    seen: set[str] = set()
                    for img_url in found:
                        # Convertir a resolución original
                        normalized = img_url.replace("/736x/", "/originals/")
                        if normalized not in seen:
                            seen.add(normalized)
                            image_urls.append(normalized)
                            if not cover_image:
                                cover_image = normalized
                        if len(image_urls) >= max_pins:
                            break

        except httpx.HTTPError:
            pass

    if not image_urls:
        raise ValueError(
            "No se pudieron obtener imágenes del tablero. "
            "Verifica que la URL sea correcta y el tablero sea público."
        )

    return {
        "name": board_name,
        "image_urls": image_urls,
        "pin_urls": pin_urls,
        "cover_image": cover_image,
        "pins_count": len(image_urls),
    }
