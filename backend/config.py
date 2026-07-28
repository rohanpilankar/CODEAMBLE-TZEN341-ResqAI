import os
from pydantic_settings import BaseSettings

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

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
