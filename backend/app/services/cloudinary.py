import cloudinary
import cloudinary.uploader

from app.core.config import settings


def _configure():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


async def upload_image_from_url(
    image_url: str, board_id: str, filename: str | None = None
) -> str | None:
    """
    Sube una imagen desde URL a Cloudinary.
    Retorna la URL segura de Cloudinary o None si falla.
    """
    if not settings.CLOUDINARY_CLOUD_NAME:
        return None

    _configure()

    folder = f"outfitbase/{board_id}"
    options: dict = {
        "folder": folder,
        "resource_type": "image",
        "overwrite": True,
        "transformation": [
            {"width": 800, "height": 1200, "crop": "limit", "quality": "auto"}
        ],
    }
    if filename:
        options["public_id"] = filename

    try:
        result = cloudinary.uploader.upload(image_url, **options)
        return result.get("secure_url")
    except Exception:
        return None
