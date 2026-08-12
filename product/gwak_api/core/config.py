from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "GWAK API"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    database_url: str = f"sqlite:///{PROJECT_ROOT / 'data' / 'gwak.db'}"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "gwak-dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 14

    otp_ttl_seconds: int = 300
    otp_dev_echo: bool = True  # return OTP in response in non-production

    pharmacy_licence_form_20: str = "MH-FORM20-PENDING"
    pharmacy_licence_form_21: str = "MH-FORM21-PENDING"
    grievance_officer_email: str = "grievance@gwak.health"
    support_helpline: str = "+91-20-0000-0000"

    kafka_bootstrap_servers: str = "localhost:9092"
    use_inprocess_events: bool = True  # MVP: in-process bus; set False for Kafka

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
