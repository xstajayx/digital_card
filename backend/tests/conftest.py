import io
import os
import time
from dataclasses import replace

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.silent_hello.app import create_app
from backend.silent_hello.cli import migrate
from backend.silent_hello.config import Settings
from backend.silent_hello.database import database
from backend.silent_hello.models import Base, Owner
from backend.silent_hello.service import digest, opaque, uid
from backend.silent_hello.storage import MemoryStorage


@pytest.fixture
def system(tmp_path):
    now = [int(time.time())]
    url = os.environ.get(
        "SH_TEST_DATABASE_URL", "sqlite+pysqlite:///" + str(tmp_path / "unit.sqlite")
    )
    cfg = replace(
        Settings(),
        database_url=url,
        uploads_enabled=True,
        ip_rate=10000,
        write_rate=10000,
        upload_rate=10000,
        read_rate=10000,
    )
    engine, sessions = database(url)
    if url.startswith("postgresql"):
        # Dedicated disposable test database ONLY; never accept a production URL.
        if not url.rsplit("/", 1)[-1].endswith("_test"):
            raise RuntimeError("Test database name must end with _test")
        Base.metadata.drop_all(engine)
        with engine.begin() as db:
            from sqlalchemy import text

            db.execute(text("DROP TABLE IF EXISTS sh_schema_version"))
        migrate(engine)
        migrate(engine)
    storage = MemoryStorage()
    app = create_app(cfg, storage, engine, clock=lambda: now[0])
    key, other = opaque(), opaque()
    a, b = uid(), uid()
    with app.state.sessions.begin() as db:
        db.add_all(
            [
                Owner(id=a, token_hash=digest(key), created_at=now[0]),
                Owner(id=b, token_hash=digest(other), created_at=now[0]),
            ]
        )
    with TestClient(app) as client:
        yield {
            "app": app,
            "client": client,
            "key": key,
            "other": other,
            "owner": a,
            "otherOwner": b,
            "now": now,
            "cfg": cfg,
            "storage": storage,
        }


def headers(s, key=None, idempotency="request-key-00000001"):
    return {
        "Authorization": "Bearer " + (key or s["key"]),
        "Idempotency-Key": idempotency,
    }


def raster(fmt="JPEG", size=(160, 200)):
    f = io.BytesIO()
    im = Image.new("RGB", size, "pink")
    exif = Image.Exif()
    exif[270] = "PRIVATE TEST METADATA"
    im.save(f, format=fmt, exif=exif)
    return f.getvalue()


def upload(s, key=None, idem="request-key-upload-01", data=None, mime="image/jpeg"):
    return s["client"].post(
        "/v1/me/media",
        headers={**headers(s, key, idem), "Content-Type": mime},
        content=data if data is not None else raster(),
    )


def document(mid):
    return {
        "version": 1,
        "card": {
            "v": 5,
            "themeId": "birthday-balloons",
            "to": "Jamie",
            "message": "Happy birthday!\n\nA proper card, made personal.",
            "from": "Stacey",
            "fontId": "quicksand",
            "textSize": 18,
            "watermark": True,
            "giftUrl": "",
            "birthdayNumber": "",
            "paperOverride": "",
            "inkOverride": "",
            "stickerId": "pink-cake",
            "openingConfig": {
                "type": "envelope",
                "tone": "theme",
                "wrap": "plain",
                "seal": True,
                "effect": "theme",
            },
            "physicalConfig": {
                "paper": "ivory",
                "coverGreeting": "Happy Birthday!",
                "coverName": "",
                "coverArt": "",
                "insideArt": "default",
                "handwriting": "pacifico",
                "signature": "pacifico",
                "effects": False,
            },
        },
        "photo": {
            "mediaId": mid,
            "kind": "memory",
            "layout": "inside",
            "aspect": "portrait",
            "border": "gold",
            "alt": "A favourite memory",
        },
    }


def publish(s, mid, key=None, idem="request-key-card-0001", doc=None):
    return s["client"].post(
        "/v1/me/cards", headers=headers(s, key, idem), json=doc or document(mid)
    )


def token(card):
    return card["shareUrl"].split("?s=")[1]
