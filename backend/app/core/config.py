from email.utils import formataddr, parseaddr
from pathlib import Path
from typing import Self
from urllib.parse import quote_plus

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    POSTGRES_USER: str
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int = 5432
    POSTGRES_SSLMODE: str = ""
    DATABASE_URL: str = ""

    SECRET_KEY: str = "dev-secret-change-me"
    JWT_EXPIRE_DAYS: int = Field(
        default=7,
        validation_alias=AliasChoices("JWT_EXPIRE_DAYS", "SESSION_EXPIRE_DAYS"),
    )
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    APP_NAME: str = Field(default="Team Workspace", validation_alias=AliasChoices("APP_NAME", "WEBSITE_NAME"))
    APP_URL: str = Field(
        default="http://localhost:3000/admin/login",
        validation_alias=AliasChoices("APP_URL", "WEBSITE_URL", "FRONTEND_URL"),
    )

    SMTP_HOST: str = Field(default="", validation_alias=AliasChoices("SMTP_HOST", "EMAIL_HOST"))
    SMTP_PORT: int = Field(default=587, validation_alias=AliasChoices("SMTP_PORT", "EMAIL_PORT"))
    SMTP_USER: str = Field(default="", validation_alias=AliasChoices("SMTP_USER", "EMAIL_USER"))
    SMTP_PASSWORD: str = Field(
        default="",
        validation_alias=AliasChoices("SMTP_PASSWORD", "EMAIL_PASS", "EMAIL_PASSWORD"),
    )
    SMTP_FROM: str = Field(default="", validation_alias=AliasChoices("SMTP_FROM", "EMAIL_FROM"))
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Team Workspace"
    SMTP_REPLY_TO: str = Field(default="", validation_alias=AliasChoices("SMTP_REPLY_TO", "EMAIL_REPLY_TO"))
    SMTP_USE_TLS: bool = Field(default=True, validation_alias=AliasChoices("SMTP_USE_TLS", "EMAIL_USE_TLS"))

    @model_validator(mode="after")
    def validate_secret_key(self) -> Self:
        import os

        debug = os.getenv("FLASK_DEBUG", "1").strip().lower() in {"1", "true", "yes"}
        is_default_secret = self.SECRET_KEY in {"", "dev-secret-change-me", "change-this-to-a-long-random-string"}

        if not debug:
            if is_default_secret:
                raise ValueError(
                    "SECRET_KEY is not configured for production. "
                    "Set a strong random value (>=32 chars) in backend/.env before starting in production."
                )
            if len(self.SECRET_KEY) < 32:
                raise ValueError(
                    f"SECRET_KEY is too short ({len(self.SECRET_KEY)} chars). Use at least 32 chars in production."
                )
        return self

    @model_validator(mode="after")
    def normalize_email_settings(self) -> Self:
        if self.SMTP_FROM.strip():
            name, addr = parseaddr(self.SMTP_FROM.strip())
            if addr and not self.SMTP_FROM_EMAIL.strip():
                self.SMTP_FROM_EMAIL = addr
            if name and not self.APP_NAME.strip():
                self.SMTP_FROM_NAME = name

        if not self.APP_NAME.strip():
            self.APP_NAME = "Team Workspace"

        self.SMTP_FROM_NAME = self.APP_NAME
        self.SMTP_FROM_EMAIL = self.SMTP_FROM_EMAIL.strip().lower()
        self.SMTP_USER = self.SMTP_USER.strip().lower()
        self.SMTP_REPLY_TO = self.SMTP_REPLY_TO.strip().lower()
        return self

    @property
    def effective_from_email(self) -> str:
        # SMTP providers (especially Gmail) require the From address to match the authenticated account.
        if self.SMTP_USER:
            return self.SMTP_USER
        if self.SMTP_FROM_EMAIL:
            return self.SMTP_FROM_EMAIL
        _, addr = parseaddr(self.SMTP_FROM.strip())
        return addr.lower() if addr else ""

    @property
    def envelope_sender(self) -> str:
        """SMTP MAIL FROM — should match the authenticated Gmail account."""
        if self.SMTP_USER:
            return self.SMTP_USER
        return self.effective_from_email

    @property
    def reply_to_email(self) -> str:
        if self.SMTP_REPLY_TO:
            return self.SMTP_REPLY_TO
        return self.effective_from_email or self.envelope_sender

    @property
    def mail_from_header(self) -> str:
        email = self.effective_from_email
        if email:
            return formataddr((self.APP_NAME, email))
        return self.SMTP_FROM.strip() or self.APP_NAME

    @property
    def reply_to_header(self) -> str:
        email = self.reply_to_email
        if email:
            return formataddr((self.APP_NAME, email))
        return self.mail_from_header

    @property
    def app_url_is_local(self) -> bool:
        lowered = self.APP_URL.lower()
        return "localhost" in lowered or "127.0.0.1" in lowered

    def email_deliverability_warnings(self) -> list[str]:
        warnings: list[str] = []
        if not self.SMTP_HOST or not self.effective_from_email:
            return warnings

        if self.app_url_is_local:
            warnings.append(
                "APP_URL points to localhost. Email links look suspicious and often land in spam. "
                "Set APP_URL to your public HTTPS login URL before sending real emails."
            )

        if self.SMTP_USER and self.SMTP_FROM_EMAIL and self.SMTP_USER != self.SMTP_FROM_EMAIL:
            warnings.append(
                "EMAIL_FROM address differs from EMAIL_USER. The From header will use EMAIL_USER "
                "so Gmail/Workspace authentication aligns and messages are less likely to land in spam."
            )

        if self.effective_from_email.endswith("@gmail.com") and self.app_url_is_local:
            warnings.append(
                "Personal Gmail with localhost links is a common spam pattern. "
                "Use Google Workspace with your own domain, set APP_URL to HTTPS, and configure SPF/DKIM/DMARC."
            )

        if self.SMTP_HOST and "gmail.com" in self.SMTP_HOST and not self.SMTP_PASSWORD.strip():
            warnings.append("EMAIL_PASS is empty. Gmail requires an App Password for SMTP.")

        app_tokens = {token for token in self.APP_NAME.lower().split() if len(token) >= 3}
        if "agent" in app_tokens:
            warnings.append(
                'APP_NAME contains the word "agent". Team-member welcome emails use neutral '
                "subject lines and /login links to reduce spam filtering, but renaming APP_NAME "
                "to something like Team Workspace improves deliverability further."
            )

        return warnings

    @property
    def effective_sslmode(self) -> str:
        if self.POSTGRES_SSLMODE.strip():
            return self.POSTGRES_SSLMODE.strip()

        host = self.POSTGRES_HOST.lower()
        if host in {"localhost", "127.0.0.1"}:
            return "prefer"
        return "require"

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL.strip():
            return self.DATABASE_URL.strip()

        user = quote_plus(self.POSTGRES_USER)
        password = quote_plus(self.POSTGRES_PASSWORD)
        auth = f"{user}:{password}@" if password else f"{user}@"
        return (
            f"postgresql+psycopg2://{auth}"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            f"?sslmode={self.effective_sslmode}&connect_timeout=10"
        )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
