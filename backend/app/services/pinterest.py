import json
import re
import time

import httpx

PINTEREST_BOARD_PATTERN = re.compile(
    r"https?://(\w+\.)?pinterest\.\w+(/\w+)?/([^/]+)/([^/?]+)"
)

PINTEREST_SHORT_PATTERN = re.compile(
    r"https?://pin\.it/\w+"
)

_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


async def resolve_pinterest_url(url: str) -> str:
    """Resuelve URLs cortas de Pinterest (pin.it) a la URL completa."""
    url = url.strip()
    if not PINTEREST_SHORT_PATTERN.match(url):
        return url
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            resp = await client.get(url, headers={"User-Agent": _USER_AGENT})
            resolved = str(resp.url).split("?")[0].rstrip("/")
            return resolved
    except httpx.HTTPError:
        return url


def validate_pinterest_url(url: str) -> bool:
    return bool(PINTEREST_BOARD_PATTERN.match(url.rstrip("/")))


def extract_board_info(url: str) -> dict:
    """Extrae username y board_slug de una URL de Pinterest."""
    match = PINTEREST_BOARD_PATTERN.match(url.rstrip("/"))
    if not match:
        return {"username": "", "board_slug": ""}
    return {"username": match.group(3), "board_slug": match.group(4)}


# ---------------------------------------------------------------------------
# Helpers internos para parsear la respuesta de Pinterest
# ---------------------------------------------------------------------------

def _extract_script_json(html: str, script_id: str) -> dict | None:
    """Extrae y parsea un <script type='application/json' id='...'> del HTML."""
    pattern = re.compile(
        rf'<script\s+id="{script_id}"\s+type="application/json">(.*?)</script>',
        re.DOTALL,
    )
    match = pattern.search(html)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except (json.JSONDecodeError, ValueError):
        return None


def _get_pin_image_url(pin: dict) -> str | None:
    """Extrae la mejor URL de imagen de un objeto pin."""
    images = pin.get("images", {})
    for key in ("orig", "736x", "474x", "236x"):
        variant = images.get(key, {})
        if variant.get("url"):
            return variant["url"]
    return None


def _extract_pins_from_list(
    items: list,
    image_urls: list[str],
    pin_urls: list[str],
    seen: set[str],
) -> None:
    """Extrae pins reales de una lista, ignorando story modules y duplicados."""
    for item in items:
        if not isinstance(item, dict):
            continue
        # Filtrar story modules e items sin imágenes
        if item.get("type") == "story" or "images" not in item:
            continue
        img_url = _get_pin_image_url(item)
        if not img_url or img_url in seen:
            continue
        seen.add(img_url)
        image_urls.append(img_url)
        pin_id = item.get("id", "")
        if pin_id:
            pin_urls.append(f"https://www.pinterest.com/pin/{pin_id}/")


# ---------------------------------------------------------------------------
# Función principal de scraping
# ---------------------------------------------------------------------------

async def scrape_board_images(url: str) -> dict:
    """
    Scrapea imágenes de un tablero público de Pinterest con paginación.

    Estrategia:
    1. Descarga el HTML de la página del tablero
    2. Parsea __PWS_INITIAL_PROPS__ para obtener los primeros ~15 pins
    3. Pagina vía la API interna BoardFeedResource para obtener el resto

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
    username = info["username"]
    board_slug = info["board_slug"]
    source_url = f"/{username}/{board_slug}/"

    image_urls: list[str] = []
    pin_urls: list[str] = []
    seen: set[str] = set()
    cover_image: str | None = None
    board_id: str | None = None
    bookmark: str | None = None
    app_version: str | None = None

    page_headers = {
        "User-Agent": _USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    async with httpx.AsyncClient(
        follow_redirects=True, timeout=30.0, http2=False
    ) as client:
        # ── Paso 1: Descargar HTML de la página del tablero ──
        resp = await client.get(
            f"https://www.pinterest.com/{username}/{board_slug}/",
            headers=page_headers,
        )
        if resp.status_code != 200:
            raise ValueError(
                "No se pudo acceder al tablero de Pinterest. "
                f"Status: {resp.status_code}"
            )

        html = resp.text

        # ── Paso 2: Parsear __PWS_INITIAL_PROPS__ ──
        props = _extract_script_json(html, "__PWS_INITIAL_PROPS__")
        if not props:
            raise ValueError(
                "No se pudo extraer datos del tablero. "
                "Verifica que la URL sea correcta y el tablero sea público."
            )

        redux = props.get("initialReduxState", {})

        # Extraer app version para headers de API
        pws_data = _extract_script_json(html, "__PWS_DATA__")
        if pws_data:
            app_version = pws_data.get("appVersion")

        # Info del tablero
        detected_pin_count: int | None = None
        boards = redux.get("boards", {})
        for bid, bdata in boards.items():
            board_id = bid
            if bdata.get("name"):
                board_name = bdata["name"]
            if bdata.get("image_cover_url"):
                cover_image = bdata["image_cover_url"]
            if bdata.get("pin_count"):
                detected_pin_count = bdata["pin_count"]
            break

        # ── Paso 3: Extraer pins iniciales de BoardFeedResource ──
        resources = redux.get("resources", {})
        board_feed_resources = resources.get("BoardFeedResource", {})

        for _key, resource in board_feed_resources.items():
            feed_data = resource.get("data", [])
            _extract_pins_from_list(
                feed_data, image_urls, pin_urls, seen
            )
            bookmark = resource.get("nextBookmark")
            break

        # Fallback: si BoardFeedResource no existe, usar pins store
        if not image_urls:
            pins_store = redux.get("pins", {})
            for pin_id, pin_obj in pins_store.items():
                img_url = _get_pin_image_url(pin_obj)
                if img_url and img_url not in seen:
                    seen.add(img_url)
                    image_urls.append(img_url)
                    pin_urls.append(
                        f"https://www.pinterest.com/pin/{pin_id}/"
                    )

        # ── Paso 4: Paginar para obtener el resto de los pins ──
        csrf_token = client.cookies.get("csrftoken", domain=".pinterest.com") or ""

        while bookmark and bookmark != "-end-":
            api_headers = {
                "User-Agent": _USER_AGENT,
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRFToken": csrf_token,
            }
            if app_version:
                api_headers["X-APP-VERSION"] = app_version
            api_headers["X-Pinterest-PWS-Handler"] = (
                f"www/{username}/{board_slug}.js"
            )

            params = {
                "source_url": source_url,
                "data": json.dumps({
                    "options": {
                        "add_vase": True,
                        "board_id": board_id,
                        "field_set_key": "react_grid_pin",
                        "filter_section_pins": False,
                        "is_react": True,
                        "page_size": 25,
                        "prepend": False,
                        "bookmarks": [bookmark],
                    },
                    "context": {},
                }),
                "_": str(int(time.time() * 1000)),
            }

            try:
                api_resp = await client.get(
                    "https://www.pinterest.com/resource/BoardFeedResource/get/",
                    params=params,
                    headers=api_headers,
                )
                if api_resp.status_code != 200:
                    break

                data = api_resp.json()
                resource_resp = data.get("resource_response", {})
                page_pins = resource_resp.get("data", [])

                if not page_pins:
                    break

                prev_count = len(image_urls)
                _extract_pins_from_list(
                    page_pins, image_urls, pin_urls, seen
                )

                # Si no se agregaron nuevos pins, evitar loop infinito
                if len(image_urls) == prev_count:
                    break

                bookmark = resource_resp.get("bookmark")

            except (httpx.HTTPError, json.JSONDecodeError, KeyError):
                break

    if not image_urls:
        raise ValueError(
            "No se pudieron obtener imágenes del tablero. "
            "Verifica que la URL sea correcta y el tablero sea público."
        )

    if not cover_image and image_urls:
        cover_image = image_urls[0]

    return {
        "name": board_name,
        "image_urls": image_urls,
        "pin_urls": pin_urls,
        "cover_image": cover_image,
        "pins_count": len(image_urls),
        "detected_pin_count": detected_pin_count or len(image_urls),
    }
