import asyncio
import contextlib
import json
import logging
import re

import httpx
from google import genai

from app.core.config import settings
from app.prompts.outfit_analysis import OUTFIT_ANALYSIS_PROMPT

logger = logging.getLogger(__name__)

MAX_RETRIES = 3

VALID_TYPES = {"Top", "Bottom", "Vestido", "Abrigo", "Calzado", "Accesorio"}


async def analyze_outfit_image(
    image_url: str,
    semaphore: asyncio.Semaphore | None = None,
) -> dict:
    """
    Envía una imagen a Gemini Vision y retorna el análisis de prendas.
    Si se proporciona un semaphore, limita la concurrencia.
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY no está configurada")

    async with semaphore if semaphore else contextlib.nullcontext():
        # Descargar la imagen (Pinterest requiere User-Agent válido)
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            resp = await http_client.get(image_url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            })
            resp.raise_for_status()
            image_bytes = resp.content
            content_type = resp.headers.get("content-type", "image/jpeg")

        # Crear cliente Gemini
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        image_part = genai.types.Part.from_bytes(
            data=image_bytes,
            mime_type=content_type.split(";")[0],
        )

        # Retry loop para Gemini con backoff en 429
        response = None
        for attempt in range(MAX_RETRIES):
            try:
                response = await client.aio.models.generate_content(
                    model="gemini-2.5-flash-lite",
                    contents=[OUTFIT_ANALYSIS_PROMPT, image_part],
                    config=genai.types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                    ),
                )
                break
            except Exception as e:
                error_str = str(e)
                if "429" in error_str and attempt < MAX_RETRIES - 1:
                    match = re.search(r"retryDelay.*?(\d+)", error_str)
                    wait = int(match.group(1)) + 2 if match else 60
                    logger.warning(
                        "Gemini 429, esperando %ds (intento %d/%d)",
                        wait, attempt + 1, MAX_RETRIES,
                    )
                    await asyncio.sleep(wait)
                else:
                    raise

        if response is None:
            return {"outfit_style": None, "outfit_season": None, "garments": []}

        # Parsear respuesta JSON
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError:
            return {"outfit_style": None, "outfit_season": None, "garments": []}

        return _validate_response(data)


def _validate_response(data: dict) -> dict:
    """Valida y limpia la respuesta de Gemini."""
    result = {
        "outfit_style": data.get("outfit_style"),
        "outfit_season": data.get("outfit_season"),
        "garments": [],
    }

    garments = data.get("garments", [])
    if not isinstance(garments, list):
        return result

    for g in garments:
        if not isinstance(g, dict):
            continue

        name = g.get("name")
        garment_type = g.get("type")

        if not name or not garment_type:
            continue

        # Validar tipo
        if garment_type not in VALID_TYPES:
            type_map = {
                "top": "Top", "bottom": "Bottom", "vestido": "Vestido",
                "dress": "Vestido", "abrigo": "Abrigo", "jacket": "Abrigo",
                "coat": "Abrigo", "calzado": "Calzado", "shoes": "Calzado",
                "footwear": "Calzado", "accesorio": "Accesorio",
                "accessory": "Accesorio",
            }
            garment_type = type_map.get(garment_type.lower(), "Accesorio")

        confidence = g.get("confidence")
        if confidence is not None:
            try:
                confidence = max(0.0, min(100.0, float(confidence)))
            except (TypeError, ValueError):
                confidence = None

        result["garments"].append({
            "name": str(name)[:100],
            "type": garment_type,
            "color": g.get("color"),
            "material": g.get("material"),
            "style": g.get("style"),
            "season": g.get("season"),
            "confidence": confidence,
        })

    return result
