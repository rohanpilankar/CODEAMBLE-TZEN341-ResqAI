import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "ResQAI"
    ENVIRONMENT: str = "development"
    API_PREFIX: str = "/api/v1"
    WS_PREFIX: str = "/ws"

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./resqai.db")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "resqai_secret_key_super_secure_32_bytes_long_string_2026")
    REFRESH_SECRET_KEY: str = os.getenv("REFRESH_SECRET_KEY", "resqai_refresh_secret_key_super_secure_32_bytes_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "backend/static/uploads")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    GROK_API_KEY: str = os.getenv("GROK_API_KEY", "")
    GROK_API_URL: str = os.getenv("GROK_API_URL", "https://api.x.ai/v1/chat/completions")
    GROK_MODEL: str = os.getenv("GROK_MODEL", "grok-2-latest")
    GROK_TIMEOUT: int = int(os.getenv("GROK_TIMEOUT", "20"))
    MAX_CHAT_HISTORY: int = int(os.getenv("MAX_CHAT_HISTORY", "8"))

    OPEN_METEO_API_KEY: str = os.getenv("OPEN_METEO_API_KEY", "979ab1e38db18f596c7da16d60721135")
    OPEN_METEO_BASE_URL: str = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1")

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
