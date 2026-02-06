import json

import httpx
from google import genai

from app.core.config import settings
from app.prompts.outfit_analysis import OUTFIT_ANALYSIS_PROMPT

VALID_TYPES = {"Top", "Bottom", "Vestido", "Abrigo", "Calzado", "Accesorio"}


async def analyze_outfit_image(image_url: str) -> dict:
    """
    Envía una imagen a Gemini Vision y retorna el análisis de prendas.

    Retorna:
        {
            "outfit_style": str | None,
            "outfit_season": str | None,
            "garments": [
                {
                    "name": str,
                    "type": str,
                    "color": str | None,
                    "material": str | None,
                    "style": str | None,
                    "season": str | None,
                    "confidence": float | None,
                }
            ]
        }
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY no está configurada")

    # Descargar la imagen
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        resp = await http_client.get(image_url)
        resp.raise_for_status()
        image_bytes = resp.content
        content_type = resp.headers.get("content-type", "image/jpeg")

    # Crear cliente Gemini
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    image_part = genai.types.Part.from_bytes(
        data=image_bytes,
        mime_type=content_type.split(";")[0],
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash-preview-05-20",
        contents=[OUTFIT_ANALYSIS_PROMPT, image_part],
        config=genai.types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )

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
