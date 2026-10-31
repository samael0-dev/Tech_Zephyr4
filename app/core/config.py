from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "CIT Campus Operations Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # JWT Authentication
    JWT_SECRET_KEY: str = "cit-hackathon-super-secret-jwt-key-2027-change-in-prod-32bytes"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite:///./campus_ops.db"

    # Dataset paths
    DATASET_PATH: str = "CrunchWeek_StarterPack/data/cit_public.json"
    STARTER_PACK_DIR: str = "CrunchWeek_StarterPack"

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # AI Integration
    GEMINI_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
