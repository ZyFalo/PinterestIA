from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_env_path = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    GEMINI_API_KEY: str = ""
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    SERPAPI_KEY: str = ""

    model_config = SettingsConfigDict(env_file=str(_env_path), extra="ignore")


settings = Settings()
