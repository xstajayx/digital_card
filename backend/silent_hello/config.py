"""Server-only configuration; no credentials belong in static JavaScript."""

import os
from dataclasses import dataclass
from urllib.parse import urlsplit


@dataclass(frozen=True)
class Settings:
    database_url: str = "sqlite+pysqlite:///:memory:"
    environment: str = "test"
    token_secret: str = "test-only-secret-not-for-production-00000000"
    frontend_url: str = "http://127.0.0.1:8765/"
    cors_origins: tuple[str, ...] = ("http://127.0.0.1:8765",)
    uploads_enabled: bool = False
    max_upload_bytes: int = 10 * 1024 * 1024
    max_output_bytes: int = 2 * 1024 * 1024
    max_pixels: int = 24_000_000
    max_edge: int = 10_000
    output_edge: int = 1600
    max_card_bytes: int = 24_000
    max_owner_bytes: int = 100 * 1024 * 1024
    max_owner_media: int = 50
    max_owner_cards: int = 25
    global_storage_bytes: int = 2 * 1024**3
    daily_card_quota: int = 25
    global_daily_card_quota: int = 250
    daily_upload_quota: int = 50
    global_daily_upload_quota: int = 500
    global_read_rate: int = 600
    upload_rate: int = 10
    write_rate: int = 60
    read_rate: int = 240
    ip_rate: int = 600
    backup_retention_days: int = 30
    abandoned_hours: int = 48
    generated_days: int = 7
    free_months: int = 12
    paid_months: int = 24
    cleanup_batch: int = 100
    cleanup_seconds: int = 900
    decoder_timeout: int = 15
    body_timeout_seconds: int = 20
    r2_endpoint: str = ""
    r2_bucket: str = ""
    r2_access_key: str = ""
    r2_secret_key: str = ""
    storage_driver: str = "memory"
    storage_dir: str = "/tmp/silent-hello-local-media"
    fixed_monthly_gbp: float = 10.0
    storage_gbp_per_gb: float = 0.012
    writes_gbp_per_million: float = 3.5
    reads_gbp_per_million: float = 0.3
    egress_gbp_per_gb: float = 0.05

    @classmethod
    def from_env(cls):
        if "SH_ENVIRONMENT" not in os.environ:
            raise ValueError(
                "Set SH_ENVIRONMENT explicitly before starting the service"
            )
        fields = cls.__dataclass_fields__
        values = {}
        for name, field in fields.items():
            raw = os.environ.get("SH_" + name.upper())
            if raw is None:
                continue
            default = field.default
            if isinstance(default, bool):
                values[name] = raw.lower() == "true"
            elif isinstance(default, int):
                values[name] = int(raw)
            elif isinstance(default, float):
                values[name] = float(raw)
            elif isinstance(default, tuple):
                values[name] = tuple(x.strip() for x in raw.split(",") if x.strip())
            else:
                values[name] = raw
        result = cls(**values)
        result.validate()
        return result

    def validate(self):
        if self.environment not in ("test", "local", "production"):
            raise ValueError("Invalid environment")
        if not self.cors_origins or "*" in self.cors_origins:
            raise ValueError("Exact CORS origins required")
        for origin in self.cors_origins:
            u = urlsplit(origin)
            if (
                u.scheme not in ("http", "https")
                or not u.netloc
                or u.path
                or u.query
                or u.fragment
                or u.username
            ):
                raise ValueError("Invalid CORS origin")
        u = urlsplit(self.frontend_url)
        if (
            u.scheme not in ("http", "https")
            or not u.netloc
            or u.query
            or u.fragment
            or u.username
        ):
            raise ValueError("Invalid frontend URL")
        for key in (
            "max_upload_bytes",
            "max_output_bytes",
            "max_pixels",
            "max_edge",
            "output_edge",
            "max_card_bytes",
            "max_owner_bytes",
            "max_owner_media",
            "max_owner_cards",
            "global_storage_bytes",
            "daily_card_quota",
            "global_daily_card_quota",
            "daily_upload_quota",
            "global_daily_upload_quota",
            "global_read_rate",
            "upload_rate",
            "write_rate",
            "read_rate",
            "ip_rate",
            "backup_retention_days",
            "abandoned_hours",
            "generated_days",
            "free_months",
            "paid_months",
            "cleanup_batch",
            "cleanup_seconds",
            "decoder_timeout",
            "body_timeout_seconds",
        ):
            if getattr(self, key) <= 0:
                raise ValueError("Positive limit required: " + key)
        import math

        for key in (
            "fixed_monthly_gbp",
            "storage_gbp_per_gb",
            "writes_gbp_per_million",
            "reads_gbp_per_million",
            "egress_gbp_per_gb",
        ):
            if not math.isfinite(getattr(self, key)) or getattr(self, key) < 0:
                raise ValueError("Non-negative finite price required: " + key)
        if max(self.free_months, self.paid_months) > 120:
            raise ValueError("Card retention must be at most 120 months")
        if self.backup_retention_days > 30:
            raise ValueError("Backup policy must not exceed 30 days")
        if self.output_edge > 1600 or self.max_output_bytes > 2 * 1024 * 1024:
            raise ValueError(
                "The current static photo adapter supports at most 1600px and 2 MiB output"
            )
        if self.environment == "production":
            if not self.database_url.startswith("postgresql+psycopg://"):
                raise ValueError("Production requires PostgreSQL/psycopg")
            if len(self.token_secret) < 48 or self.token_secret.startswith("test-"):
                raise ValueError("Set a random server token secret")
            if u.scheme != "https" or any(
                not x.startswith("https://") for x in self.cors_origins
            ):
                raise ValueError("Production requires HTTPS")
            if self.storage_driver != "r2" or not all(
                (
                    self.r2_endpoint,
                    self.r2_bucket,
                    self.r2_access_key,
                    self.r2_secret_key,
                )
            ):
                raise ValueError("Private R2 configuration required")
            endpoint = urlsplit(self.r2_endpoint)
            if (
                endpoint.scheme != "https"
                or not endpoint.hostname.endswith(".r2.cloudflarestorage.com")
                or endpoint.username
                or endpoint.path not in ("", "/")
            ):
                raise ValueError("Use an HTTPS R2 account endpoint")
