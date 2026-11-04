import concurrent.futures
import io
import re
from dataclasses import replace

import pytest
from PIL import Image
from sqlalchemy import func, select

from backend.silent_hello.app import create_app
from backend.silent_hello.cleanup import cleanup
from backend.silent_hello.cli import metrics
from backend.silent_hello.config import Settings
from backend.silent_hello.models import Card, Media, Owner
from backend.silent_hello.service import add_months, uid

from .conftest import document, headers, publish, raster, token, upload


@pytest.mark.parametrize(
    "fmt,mime", [("JPEG", "image/jpeg"), ("PNG", "image/png"), ("WEBP", "image/webp")]
)
def test_upload_and_private_cross_device_read(system, fmt, mime):
    s = system
    r = upload(s, data=raster(fmt), mime=mime)
    assert r.status_code == 200, r.text
    mid = r.json()["id"]
    stored = next(iter(s["storage"].objects.values()))
    assert b"PRIVATE TEST METADATA" not in stored
    with Image.open(io.BytesIO(stored)) as image:
        assert image.format == "WEBP" and not image.getexif()
    c = publish(s, mid)
    assert c.status_code == 200, c.text
    card = c.json()
    t = token(card)
    assert re.fullmatch(r"[A-Za-z0-9_-]{43}", t)
    # No owner key is supplied by the independent recipient client.
    from fastapi.testclient import TestClient

    with TestClient(s["app"]) as recipient:
        r = recipient.get("/v1/shared/" + t)
        assert r.status_code == 200
        assert r.json()["card"]["to"] == "Jamie"
        media = recipient.get("/v1/shared/" + t + "/photo")
        assert media.status_code == 200 and media.content == stored
        assert media.headers["content-type"] == "image/webp"
        assert "no-store" in media.headers["cache-control"]
        assert recipient.get("/v1/shared/" + t + "/media/" + mid).status_code == 404
    assert s["client"].get("/v1/me/cards").status_code == 401


@pytest.mark.parametrize(
    "data,mime",
    [
        (b"<svg onload=alert(1)>", "image/jpeg"),
        (b"GIF89a" + bytes(100), "image/gif"),
        (b"not an image", "image/png"),
        (b"%PDF-malicious", "image/webp"),
    ],
)
def test_bad_uploads(system, data, mime):
    assert upload(system, data=data, mime=mime).status_code in (415, 422)


def test_animation_spoof_dimensions_and_size(system):
    s = system
    assert upload(s, data=raster("PNG"), mime="image/jpeg").status_code == 422
    assert (
        upload(s, idem="request-key-tiny-0001", data=raster(size=(1, 1))).status_code
        == 422
    )
    f = io.BytesIO()
    Image.new("RGB", (100, 100), "red").save(
        f,
        format="PNG",
        save_all=True,
        append_images=[Image.new("RGB", (100, 100), "blue")],
        duration=50,
        loop=0,
    )
    assert (
        upload(
            s, idem="request-key-anim-0001", data=f.getvalue(), mime="image/png"
        ).status_code
        == 422
    )
    huge = b"x" * (s["cfg"].max_upload_bytes + 1)
    assert upload(s, idem="request-key-large-001", data=huge).status_code == 413
    assert (
        s["client"]
        .post("/v1/me/media", headers={"Content-Type": "image/jpeg"}, content=huge)
        .status_code
        == 401
    )


def test_authorisation_and_unknown_fields(system):
    s = system
    mid = upload(s).json()["id"]
    assert publish(s, mid, key=s["other"]).status_code == 404
    assert (
        s["client"]
        .delete("/v1/me/media/" + mid, headers=headers(s, s["other"]))
        .status_code
        == 404
    )
    raw = document(mid)
    raw["ownerId"] = s["owner"]
    assert publish(s, mid, doc=raw).status_code == 422
    raw = document(mid)
    raw["photo"]["url"] = "https://attacker.invalid"
    assert publish(s, mid, doc=raw).status_code == 422
    raw = document(mid)
    raw["card"]["themeId"] = "../../private"
    assert publish(s, mid, doc=raw).status_code == 422
    raw = document(mid)
    raw["card"]["openingConfig"]["type"] = "gift-box"
    assert publish(s, mid, doc=raw).status_code == 422
    raw = document(mid)
    raw["photo"]["kind"] = "cover"
    assert publish(s, mid, doc=raw).status_code == 422
    assert s["client"].get("/v1/shared/" + "x" * 43).status_code == 404
    assert s["client"].get("/v1/shared/short").status_code == 404


def test_idempotency_and_immutable_share(system):
    s = system
    first = upload(s)
    second = upload(s)
    assert first.json() == second.json()
    assert len(s["storage"].objects) == 1
    mid = first.json()["id"]
    c = publish(s, mid)
    assert c.json() == publish(s, mid).json()
    assert upload(s, data=raster(size=(200, 200))).status_code == 409
    raw = document(mid)
    raw["card"]["message"] = "Changed"
    assert publish(s, mid, doc=raw).status_code == 409
    assert (
        s["client"]
        .delete("/v1/me/cards/" + c.json()["id"], headers=headers(s))
        .status_code
        == 204
    )
    assert publish(s, mid).status_code == 410
    assert s["client"].get("/v1/shared/" + token(c.json())).status_code == 404


def test_deletion_shared_asset_and_expiry(system):
    s = system
    mid = upload(s).json()["id"]
    a = publish(s, mid).json()
    b = publish(s, mid, idem="second-request-card-01").json()
    assert (
        s["client"].delete("/v1/me/media/" + mid, headers=headers(s)).status_code == 409
    )
    assert (
        s["client"]
        .delete("/v1/me/cards/" + a["id"], headers=headers(s, s["other"]))
        .status_code
        == 404
    )
    assert (
        s["client"].delete("/v1/me/cards/" + a["id"], headers=headers(s)).status_code
        == 204
    )
    cleanup(s["app"].state.sessions, s["storage"], s["cfg"], s["now"][0])
    assert len(s["storage"].objects) == 1
    assert s["client"].get("/v1/shared/" + token(b) + "/photo").status_code == 200
    s["now"][0] = b["expiresAt"]
    assert s["client"].get("/v1/shared/" + token(b)).status_code == 404
    cleanup(s["app"].state.sessions, s["storage"], s["cfg"], s["now"][0])
    assert not s["storage"].objects
    with s["app"].state.sessions() as db:
        assert db.scalar(select(func.count()).select_from(Card)) == 0


def test_lifecycle_abandoned_generated_and_retry(system):
    s = system
    assert upload(s).status_code == 200
    sessions = s["app"].state.sessions
    cleanup(sessions, s["storage"], s["cfg"], s["now"][0] + 48 * 3600 - 1)
    assert s["storage"].objects
    delete = s["storage"].delete

    def fail(key):
        raise OSError("simulated R2 outage")

    s["storage"].delete = fail
    result = cleanup(sessions, s["storage"], s["cfg"], s["now"][0] + 48 * 3600)
    assert result["failed"] == 1 and s["storage"].objects
    s["storage"].delete = delete
    cleanup(sessions, s["storage"], s["cfg"], s["now"][0] + 48 * 3600 + 1000)
    assert not s["storage"].objects
    with sessions.begin() as db:
        row = Media(
            id=uid(),
            owner_id=s["owner"],
            object_key="media/generated.webp",
            purpose="generated",
            status="ready",
            size=0,
            created_at=s["now"][0],
        )
        db.add(row)
    assert (
        cleanup(sessions, s["storage"], s["cfg"], s["now"][0] + 7 * 86400 - 1)[
            "objects"
        ]
        == 0
    )
    assert (
        cleanup(sessions, s["storage"], s["cfg"], s["now"][0] + 7 * 86400)["objects"]
        == 1
    )


def test_missing_asset_storage_failure_and_owner_deletion(system):
    s = system
    mid = upload(s).json()["id"]
    c = publish(s, mid).json()
    s["storage"].objects.clear()
    assert s["client"].get("/v1/shared/" + token(c) + "/photo").status_code == 503
    assert s["client"].delete("/v1/me", headers=headers(s)).status_code == 202
    assert s["client"].get("/v1/shared/" + token(c)).status_code == 404
    assert s["client"].get("/v1/me/cards", headers=headers(s)).status_code == 401
    cleanup(s["app"].state.sessions, s["storage"], s["cfg"], s["now"][0])
    with s["app"].state.sessions() as db:
        assert db.get(Owner, s["owner"]) is None


def test_cors_security_headers_and_payload_limits(system):
    s = system
    r = s["client"].get("/v1/config", headers={"Origin": "https://evil.invalid"})
    assert r.status_code == 403
    r = s["client"].options(
        "/v1/me/media",
        headers={
            "Origin": s["cfg"].cors_origins[0],
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,idempotency-key,content-type",
        },
    )
    assert (
        r.status_code == 200
        and r.headers["access-control-allow-origin"] == s["cfg"].cors_origins[0]
    )
    r = s["client"].get("/v1/config")
    assert (
        r.headers["referrer-policy"] == "no-referrer"
        and r.headers["x-content-type-options"] == "nosniff"
    )
    assert (
        s["client"]
        .post("/v1/me/cards", headers=headers(s), content="x" * 25000)
        .status_code
        == 413
    )


def test_month_math():
    from datetime import datetime, timezone

    start = int(datetime(2024, 2, 29, 12, tzinfo=timezone.utc).timestamp())
    end = add_months(start, 12)
    assert (
        datetime.fromtimestamp(end, timezone.utc).isoformat()
        == "2025-02-28T12:00:00+00:00"
    )


def test_quota_rate_and_upload_kill_switch(system):
    from fastapi.testclient import TestClient

    s = system
    cfg = replace(s["cfg"], max_owner_media=1, upload_rate=2, uploads_enabled=True)
    app = create_app(
        cfg, s["storage"], s["app"].state.sessions.kw["bind"], clock=lambda: s["now"][0]
    )
    with TestClient(app) as c:
        old = s["client"]
        s["client"] = c
        assert upload(s).status_code == 200
        assert upload(s, idem="second-upload-key-01").status_code == 413
        assert upload(s, idem="third-upload-key-001").status_code == 429
        s["client"] = old
    mid = next(iter(s["storage"].objects)).split("/")[1].split(".")[0]
    card = publish(s, mid).json()
    paused = create_app(
        replace(s["cfg"], uploads_enabled=False),
        s["storage"],
        s["app"].state.sessions.kw["bind"],
        clock=lambda: s["now"][0],
    )
    with TestClient(paused) as c:
        assert (
            c.post(
                "/v1/me/media",
                headers={**headers(s), "Content-Type": "image/jpeg"},
                content=raster(),
            ).status_code
            == 503
        )
        assert c.get("/v1/shared/" + token(card) + "/photo").status_code == 200
    m = metrics(s["app"].state.sessions, s["cfg"], s["now"][0])
    assert m["storageBytesIncludingReservations"] > 0 and m["estimatedMonthlyGBP"] >= 10


def test_concurrent_idempotent_publish_postgres(system):
    s = system
    if not s["cfg"].database_url.startswith("postgresql"):
        pytest.skip("Requires real PostgreSQL row locks")
    mid = upload(s).json()["id"]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        responses = list(pool.map(lambda _: publish(s, mid), range(5)))
    assert {r.status_code for r in responses} == {200}
    assert len({r.json()["id"] for r in responses}) == 1
    with s["app"].state.sessions() as db:
        assert db.scalar(select(func.count()).select_from(Card)) == 1


def test_chunked_size_invalid_unicode_and_null_cover_name(system):
    s = system
    # No trustworthy Content-Length: the stream itself still has a hard cap.
    chunks = iter([b"x" * 1024] * ((s["cfg"].max_upload_bytes // 1024) + 1))
    r = s["client"].post(
        "/v1/me/media",
        headers={**headers(s), "Content-Type": "image/jpeg"},
        content=chunks,
    )
    assert r.status_code == 413
    mid = upload(s).json()["id"]
    raw = document(mid)
    raw["card"]["message"] = "🎂" * 4000
    assert publish(s, mid, doc=raw).status_code == 422
    raw = document(mid)
    raw["card"]["physicalConfig"]["coverName"] = None
    assert publish(s, mid, doc=raw).status_code == 422


def test_global_quota_failed_put_and_card_quota(system):
    from fastapi.testclient import TestClient

    s = system
    cfg = replace(s["cfg"], global_storage_bytes=1)
    app = create_app(
        cfg, s["storage"], s["app"].state.sessions.kw["bind"], clock=lambda: s["now"][0]
    )
    with TestClient(app) as c:
        previous = s["client"]
        s["client"] = c
        assert upload(s).status_code == 503
        s["client"] = previous
    put = s["storage"].put

    def fail(*args):
        raise OSError("simulated private storage failure")

    s["storage"].put = fail
    assert upload(s, idem="storage-failure-key-01").status_code == 503
    s["storage"].put = put
    cleanup(s["app"].state.sessions, s["storage"], s["cfg"], s["now"][0])
    mid = upload(s, idem="after-storage-failure").json()["id"]
    app = create_app(
        replace(s["cfg"], max_owner_cards=1),
        s["storage"],
        s["app"].state.sessions.kw["bind"],
        clock=lambda: s["now"][0],
    )
    with TestClient(app) as c:
        previous = s["client"]
        s["client"] = c
        assert publish(s, mid).status_code == 200
        assert publish(s, mid, idem="card-quota-limit-0001").status_code == 413
        s["client"] = previous


def test_production_config_fails_closed_and_key_change(system):
    cfg = replace(Settings(), environment="production")
    with pytest.raises(ValueError):
        cfg.validate()
    from fastapi.testclient import TestClient

    s = system
    changed = create_app(
        replace(s["cfg"], token_secret="different-test-secret-long-enough-1234567"),
        s["storage"],
        s["app"].state.sessions.kw["bind"],
    )
    with pytest.raises(RuntimeError, match="secret changed"):
        with TestClient(changed):
            pass


def test_r2_adapter_private_operations_are_mocked():
    from botocore.stub import Stubber

    from backend.silent_hello.storage import R2Storage

    cfg = replace(
        Settings(),
        r2_endpoint="https://test-account.r2.cloudflarestorage.com",
        r2_bucket="test-private-bucket",
        r2_access_key="fake-test-id",
        r2_secret_key="fake-test-secret",
    )
    store = R2Storage(cfg)
    key = "media/test.webp"
    data = b"test raster bytes"
    with Stubber(store.client) as stub:
        stub.add_response(
            "put_object",
            {},
            dict(
                Bucket=cfg.r2_bucket,
                Key=key,
                Body=data,
                ContentType="image/webp",
                CacheControl="private, no-store",
            ),
        )
        stub.add_response(
            "get_object",
            {"Body": io.BytesIO(data)},
            dict(Bucket=cfg.r2_bucket, Key=key),
        )
        stub.add_response("delete_object", {}, dict(Bucket=cfg.r2_bucket, Key=key))
        store.put(key, data)
        assert store.get(key) == data
        store.delete(key)
        stub.assert_no_pending_responses()


def test_configurable_retention_and_daily_upload_budget(system):
    from fastapi.testclient import TestClient

    s = system
    cfg = replace(s["cfg"], free_months=1, daily_upload_quota=1)
    app = create_app(
        cfg, s["storage"], s["app"].state.sessions.kw["bind"], clock=lambda: s["now"][0]
    )
    with TestClient(app) as client:
        original = s["client"]
        s["client"] = client
        mid = upload(s).json()["id"]
        assert upload(s, idem="daily-limit-second-key").status_code == 429
        card = publish(s, mid).json()
        assert card["expiresAt"] == add_months(s["now"][0], 1)
        raw = document(mid)
        raw["plan"] = "paid"
        assert publish(s, mid, idem="no-paid-plan-override", doc=raw).status_code == 422
        s["client"] = original


def test_cleanup_does_not_starve_after_referenced_media(system):
    s = system
    sessions = s["app"].state.sessions
    # A referenced old asset must not fill the cleanup candidate window forever.
    mid = upload(s).json()["id"]
    publish(s, mid)
    with sessions.begin() as db:
        db.get(Media, mid).created_at = s["now"][0] - 1000000
        orphan = Media(
            id=uid(),
            owner_id=s["owner"],
            object_key="media/orphan.webp",
            status="ready",
            purpose="upload",
            size=0,
            created_at=s["now"][0] - 200000,
        )
        db.add(orphan)
    cfg = replace(s["cfg"], cleanup_batch=1)
    report = cleanup(sessions, s["storage"], cfg, s["now"][0])
    assert report["objects"] == 1
    with sessions() as db:
        assert db.get(Media, mid) is not None


def test_backup_restore_guard_never_resurrects_deleted_capabilities(system):
    from backend.silent_hello.cli import restore_guard

    s = system
    mid = upload(s).json()["id"]
    card = publish(s, mid).json()
    report = restore_guard(s["app"].state.sessions)
    assert report["invalidatedCards"] == 1
    assert s["client"].get("/v1/shared/" + token(card)).status_code == 404
    assert s["client"].get("/v1/me/cards", headers=headers(s)).status_code == 401
    with s["app"].state.sessions() as db:
        assert db.get(Card, card["id"]).document == "{}"


def test_slow_stream_cannot_hold_upload_slots_indefinitely(system):
    import asyncio

    import httpx

    s = system
    app = create_app(
        replace(s["cfg"], body_timeout_seconds=1),
        s["storage"],
        s["app"].state.sessions.kw["bind"],
        clock=lambda: s["now"][0],
    )

    async def slow():
        yield b"x"
        await asyncio.sleep(1.3)
        yield b"y"

    async def request():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app), base_url="http://testserver"
        ) as client:
            return await client.post(
                "/v1/me/media",
                headers={**headers(s), "Content-Type": "image/jpeg"},
                content=slow(),
            )

    result = asyncio.run(request())
    assert result.status_code == 408
    with app.state.sessions() as db:
        assert db.scalar(select(func.count()).select_from(Media)) == 0


def test_forged_forwarded_ips_do_not_bypass_limits_and_errors_keep_cors(system):
    from fastapi.testclient import TestClient

    s = system
    app = create_app(
        replace(s["cfg"], ip_rate=1),
        s["storage"],
        s["app"].state.sessions.kw["bind"],
        clock=lambda: s["now"][0],
    )
    with TestClient(app) as client:
        origin = s["cfg"].cors_origins[0]
        assert (
            client.get(
                "/v1/config", headers={"Origin": origin, "X-Forwarded-For": "192.0.2.1"}
            ).status_code
            == 200
        )
        limited = client.get(
            "/v1/config", headers={"Origin": origin, "X-Forwarded-For": "192.0.2.2"}
        )
        assert limited.status_code == 429
        assert limited.headers["access-control-allow-origin"] == origin
        assert limited.headers["retry-after"]
