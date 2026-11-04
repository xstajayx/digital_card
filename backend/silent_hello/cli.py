"""Explicit operator tasks; never runs migrations/creates owners implicitly on import."""

import argparse
import json
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import func, select, text, update

from .cleanup import cleanup
from .config import Settings
from .database import database
from .models import Card, Counter, Media, Owner
from .service import digest, uid
from .storage import LocalStorage, MemoryStorage, R2Storage


def migrate(engine):
    if engine.dialect.name != "postgresql":
        raise RuntimeError("Versioned production migrations require PostgreSQL")
    with engine.begin() as db:
        db.execute(text("SELECT pg_advisory_xact_lock(73939001)"))
        db.execute(
            text(
                "CREATE TABLE IF NOT EXISTS sh_schema_version (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL)"
            )
        )
        version = db.scalar(text("SELECT revision FROM sh_schema_version WHERE id=1"))
        if version is None:
            sql = (
                Path(__file__).parents[1] / "migrations/0001_initial.sql"
            ).read_text()
            for statement in sql.split(";"):
                if statement.strip():
                    db.execute(text(statement))
            db.execute(text("INSERT INTO sh_schema_version(id,revision) VALUES (1,1)"))
        elif version != 1:
            raise RuntimeError("Unsupported database schema revision")


def metrics(sessions, cfg, now):
    month = datetime.fromtimestamp(now, timezone.utc).strftime("%Y-%m")
    with sessions() as db:
        used = int(db.scalar(select(func.coalesce(func.sum(Media.size), 0))))
        cards = db.scalar(
            select(func.count())
            .select_from(Card)
            .where(Card.revoked == 0, Card.expires_at > now)
        )
        failures = db.scalar(
            select(func.count()).select_from(Media).where(Media.last_error.is_not(None))
        )

        def value(name):
            row = db.get(Counter, "month:" + name + ":" + month)
            return row.value if row else 0

        writes, reads, egress = value("write"), value("read"), value("egress")
    estimate = (
        cfg.fixed_monthly_gbp
        + used / 1024**3 * cfg.storage_gbp_per_gb
        + writes / 1e6 * cfg.writes_gbp_per_million
        + reads / 1e6 * cfg.reads_gbp_per_million
        + egress / 1024**3 * cfg.egress_gbp_per_gb
    )
    return {
        "month": month,
        "storageBytesIncludingReservations": used,
        "activeCards": cards,
        "failedMediaJobs": failures,
        "uploadAttempts": writes,
        "sharedReadRequests": reads,
        "photoResponseBytes": egress,
        "estimatedMonthlyGBP": round(estimate, 2),
        "pricingIsEstimate": True,
        "storagePercent": round(used / cfg.global_storage_bytes * 100, 2),
    }


def restore_guard(sessions):
    """Fail-closed restore: invalidate all restored capabilities before serving traffic.

    This intentionally sacrifices hosted links rather than resurrecting deleted data.
    A future independent deletion journal can enable selective restoration.
    """
    with sessions.begin() as db:
        cards = db.execute(update(Card).values(revoked=1, document="{}"))
        owners = db.execute(update(Owner).values(revoked=1))
        db.execute(update(Media).values(status="deleting"))
        return {
            "invalidatedCards": cards.rowcount,
            "invalidatedOwners": owners.rowcount,
        }


def main():
    p = argparse.ArgumentParser()
    p.add_argument(
        "command",
        choices=[
            "migrate",
            "owner-create",
            "cleanup",
            "metrics",
            "reconcile-objects",
            "restore-guard",
        ],
    )
    p.add_argument("--cursor", default="")
    p.add_argument("--confirm-delete-all-hosted-data", action="store_true")
    a = p.parse_args()
    cfg = Settings.from_env()
    engine, sessions = database(cfg.database_url)
    now = int(time.time())
    if a.command == "restore-guard":
        if not a.confirm_delete_all_hosted_data:
            raise RuntimeError("Explicit --confirm-delete-all-hosted-data is required")
        print(json.dumps(restore_guard(sessions)))
        return
    if a.command == "migrate":
        migrate(engine)
        print("Schema revision 1 ready.")
        return
    if a.command == "owner-create":
        token = secrets.token_urlsafe(32)
        owner_id = uid()
        with sessions.begin() as db:
            db.add(Owner(id=owner_id, token_hash=digest(token), created_at=now))
        # Deliberately printed ONCE for secure distribution; no server logs record this value.
        print(
            json.dumps(
                {
                    "ownerId": owner_id,
                    "privateOwnerKey": token,
                    "warning": "Keep this private key secure. No account recovery is provided.",
                }
            )
        )
        return
    if a.command == "metrics":
        print(json.dumps(metrics(sessions, cfg, now)))
        return
    store = (
        R2Storage(cfg)
        if cfg.storage_driver == "r2"
        else (
            LocalStorage(cfg.storage_dir)
            if cfg.storage_driver == "local"
            else MemoryStorage()
        )
    )
    if a.command == "cleanup":
        print(json.dumps(cleanup(sessions, store, cfg, now)))
        return
    if cfg.storage_driver != "r2":
        raise RuntimeError("Inventory reconciliation requires R2")
    import re

    args = {"Bucket": cfg.r2_bucket, "Prefix": "media/", "MaxKeys": cfg.cleanup_batch}
    if a.cursor:
        args["ContinuationToken"] = a.cursor
    page = store.client.list_objects_v2(**args)
    removed = 0
    for item in page.get("Contents", []):
        key = item["Key"]
        if (
            not re.fullmatch(r"media/[a-f0-9-]{36}\.webp", key)
            or item["LastModified"].timestamp() > now - cfg.abandoned_hours * 3600
        ):
            continue
        with sessions() as db:
            known = db.scalar(select(Media.id).where(Media.object_key == key))
        if not known:
            store.delete(key)
            removed += 1
    print(
        json.dumps(
            {"removed": removed, "nextCursor": page.get("NextContinuationToken")}
        )
    )


if __name__ == "__main__":
    main()
