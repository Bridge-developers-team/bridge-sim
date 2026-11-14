"""Settings from environment variables (and backend/.env locally). Names only
in the README; values never in git."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/src/bridge/config.py -> repo root
_REPO = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    anthropic_api_key: SecretStr | None = None
    # Force a mode. Default: "anthropic" when a key is set, else "demo".
    llm_provider: Literal["anthropic", "demo"] | None = None
    bridge_model: str = "claude-sonnet-5-5"
    bridge_model_fast: str = "claude-haiku-5-5"

    database_url: str = "sqlite+aiosqlite:///./bridge.db"
    # Signs practice tasks and graded results. Without one, a random key is made
    # at start-up: fine locally, but tokens then break on every restart.
    secret_key: SecretStr | None = None

    ai_calls_per_client: int = 40
    ai_window_seconds: int = 600
    ai_calls_per_day: int = 400
    proofs_per_client_per_hour: int = 10

    # The built front end. In the Docker image it is copied to /app/static.
    static_dir: Path = _REPO / "frontend" / "dist"

    @property
    def provider(self) -> Literal["anthropic", "demo"]:
        if self.llm_provider:
            return self.llm_provider
        return "anthropic" if self.anthropic_api_key and self.anthropic_api_key.get_secret_value() else "demo"
