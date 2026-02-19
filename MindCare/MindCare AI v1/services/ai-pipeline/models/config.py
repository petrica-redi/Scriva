"""Application settings loaded from environment variables."""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API Keys
    deepgram_api_key: str = ""
    anthropic_api_key: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""  # Service role key for server-side ops

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # JWT
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"

    # AI Configuration
    claude_model: str = "claude-sonnet-4-5-20250514"
    claude_max_tokens: int = 4096
    claude_temperature: float = 0.1

    # Deepgram
    deepgram_model: str = "nova-3-medical"
    deepgram_language: str = "en"

    # Service
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
