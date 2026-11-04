import asyncio
import hashlib
import json
import re
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy import func, select, text
from sqlalchemy.orm import sessionmaker
from starlette.concurrency import run_in_threadpool

from .cleanup import cleanup
from .config import Settings
from .database import database
from .images import optimise
from .models import Base, Card, Media, Owner, ServiceKey
from .service import (
    TOKEN_PATTERN,
    card_result,
    digest,
    increment,
    lock_owner,
    publish,
    rate,
    reserve,
    resolve,
)
from .storage import LocalStorage, MemoryStorage, R2Storage
from .validation import HostedDocument


def create_app(settings=None, storage=None, engine=None, clock=time.time):
    cfg = settings or Settings.from_env()
    cfg.validate()
    db_engine, sessions = (
        database(cfg.database_url)
        if engine is None
        else (
            engine,
            sessionmaker(engine, expire_on_commit=False),
        )
    )
    store = (
        storage
        or {
            "memory": lambda: MemoryStorage(),
            "local": lambda: LocalStorage(cfg.storage_dir),
            "r2": lambda: R2Storage(cfg),
        }[cfg.storage_driver]()
    )
    if cfg.environment == "test":
        Base.metadata.create_all(db_engine)
    decoder = asyncio.Semaphore(1)
    upload_gate = asyncio.Semaphore(2)

    async def loop():
        while True:
            await asyncio.sleep(cfg.cleanup_seconds)
            try:
                result = await run_in_threadpool(
                    cleanup, sessions, store, cfg, int(clock())
                )
                if result["failed"]:
                    import logging

                    logging.getLogger("silent_hello").warning(
                        "cleanup_retries=%d", result["failed"]
                    )
            except Exception:
                import logging

                logging.getLogger("silent_hello").error("cleanup_failed")

    @asynccontextmanager
    async def lifespan(app):
        if cfg.environment != "test":
            with db_engine.connect() as db:
                if (
                    db.scalar(text("SELECT revision FROM sh_schema_version WHERE id=1"))
                    != 1
                ):
                    raise RuntimeError("Apply database migrations first")
        with sessions.begin() as db:
            if db.bind.dialect.name == "postgresql":
                from sqlalchemy.dialects.postgresql import insert
            else:
                from sqlalchemy.dialects.sqlite import insert
            db.execute(
                insert(ServiceKey)
                .values(name="share-hmac-v1", digest=digest(cfg.token_secret))
                .on_conflict_do_nothing(index_elements=[ServiceKey.name])
            )
            import hmac

            if not hmac.compare_digest(
                db.get(ServiceKey, "share-hmac-v1").digest, digest(cfg.token_secret)
            ):
                raise RuntimeError(
                    "The share token secret changed. Restore the original secret or perform a reviewed token migration."
                )
        task = asyncio.create_task(loop())
        yield
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        db_engine.dispose()

    app = FastAPI(
        title="Silent Hello hosted cards",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=lifespan,
    )
    app.state.sessions = sessions
    app.state.storage = store
    app.state.settings = cfg
    app.state.clock = clock
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(cfg.cors_origins),
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
        expose_headers=["Retry-After"],
        allow_credentials=False,
        max_age=600,
    )

    @app.middleware("http")
    async def protections(request, call_next):
        try:
            origin = request.headers.get("origin")
            if origin and origin not in cfg.cors_origins:
                raise HTTPException(403, "This origin is not allowed.")
            if request.method != "OPTIONS" and request.url.path != "/health":
                # Never trust arbitrary X-Forwarded-For. Uvicorn must trust only the Railway proxy.
                ip = request.client.host if request.client else "unknown"
                import hmac

                key = hmac.new(
                    cfg.token_secret.encode(), ("ip:" + ip).encode(), hashlib.sha256
                ).hexdigest()

                def ip_limit():
                    with sessions.begin() as db:
                        rate(db, "ip:" + key, cfg.ip_rate, int(clock()))

                await run_in_threadpool(ip_limit)
            response = await call_next(request)
        except HTTPException as e:
            response = JSONResponse(
                {"detail": e.detail}, status_code=e.status_code, headers=e.headers
            )
        except Exception:
            response = JSONResponse(
                {"detail": "The hosted card service is temporarily unavailable."},
                status_code=503,
            )
        if request.headers.get("origin") in cfg.cors_origins:
            response.headers["Access-Control-Allow-Origin"] = request.headers["origin"]
            response.headers["Vary"] = "Origin"
        for k, v in {
            "Cache-Control": "private, no-store, max-age=0",
            "Pragma": "no-cache",
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
        }.items():
            response.headers[k] = v
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid(request, error):
        return JSONResponse(
            {"detail": "The request contains invalid fields."}, status_code=422
        )

    def auth(request, kind="write"):
        value = request.headers.get("authorization", "")
        if not value.startswith("Bearer ") or not re.fullmatch(
            TOKEN_PATTERN, value[7:]
        ):
            raise HTTPException(401, "A private owner access key is required.")
        with sessions.begin() as db:
            owner = db.scalar(
                select(Owner).where(
                    Owner.token_hash == digest(value[7:]), Owner.revoked == 0
                )
            )
            if not owner:
                raise HTTPException(401, "Owner access is unavailable.")
            rate(
                db,
                "owner:" + owner.id + ":" + kind,
                cfg.upload_rate if kind == "upload" else cfg.write_rate,
                int(clock()),
            )
            return owner.id

    def idem(request):
        key = request.headers.get("idempotency-key", "")
        if not re.fullmatch(r"[A-Za-z0-9_-]{16,80}", key):
            raise HTTPException(
                400,
                "Use a unique Idempotency-Key (16–80 letters, numbers, hyphens or underscores).",
            )
        return key

    async def body(request, limit):
        size = 0
        parts = []
        try:
            declared = int(request.headers.get("content-length", "0"))
        except ValueError:
            raise HTTPException(400, "Invalid request length.")
        if declared < 0 or declared > limit:
            raise HTTPException(413, "This request exceeds the size limit.")
        try:
            async with asyncio.timeout(cfg.body_timeout_seconds):
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > limit:
                        raise HTTPException(413, "This request exceeds the size limit.")
                    parts.append(chunk)
        except TimeoutError:
            raise HTTPException(
                408, "The upload took too long. Try again on a faster connection."
            ) from None
        return b"".join(parts)

    @app.get("/health")
    def health():
        with sessions() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ok"}

    @app.get("/v1/config")
    def config():
        return {
            "uploadsEnabled": cfg.uploads_enabled,
            "maxUploadBytes": cfg.max_upload_bytes,
            "maxPixels": cfg.max_pixels,
            "maxEdge": cfg.max_edge,
            "freeRetentionMonths": cfg.free_months,
        }

    def reserve_upload(owner_id, key, fingerprint, now):
        with sessions.begin() as db:
            return reserve(db, owner_id, key, fingerprint, cfg, now)

    def finish_upload(owner_id, mid, object_key, output, w, h):
        with sessions.begin() as db:
            lock_owner(db, owner_id)
            store.put(object_key, output)
            media = db.get(Media, mid)
            if not media or media.status != "pending":
                raise HTTPException(409, "This upload was cancelled.")
            increment(db, "storage-reserved", len(output) - media.size, 0)
            media.size = len(output)
            media.width = w
            media.height = h
            media.status = "ready"
            media.ready_at = int(clock())

    def fail_upload(mid):
        with sessions.begin() as db:
            media = db.get(Media, mid)
            if media:
                media.status = "deleting"
                media.last_error = "upload_failed"

    @app.post("/v1/me/media")
    async def upload(request: Request):
        owner_id = await run_in_threadpool(auth, request, "upload")
        key = idem(request)
        if not cfg.uploads_enabled:
            raise HTTPException(
                503, "New photo uploads are paused. Existing cards still open."
            )
        mime = request.headers.get("content-type", "").split(";")[0].lower()
        if mime not in ("image/jpeg", "image/png", "image/webp"):
            raise HTTPException(415, "Choose a still JPEG, PNG or WebP photo.")
        try:
            await asyncio.wait_for(upload_gate.acquire(), timeout=0.1)
        except asyncio.TimeoutError:
            raise HTTPException(
                429,
                "Photo processing is busy. Please retry shortly.",
                headers={"Retry-After": "3"},
            )
        try:
            data = await body(request, cfg.max_upload_bytes)
            fingerprint = hashlib.sha256(mime.encode() + b"\0" + data).hexdigest()
            now = int(clock())
            row, reused = await run_in_threadpool(
                reserve_upload, owner_id, key, fingerprint, now
            )
            mid = row.id
            object_key = row.object_key
            if reused:
                return {
                    "id": mid,
                    "width": row.width,
                    "height": row.height,
                    "bytes": row.size,
                    "status": "ready",
                }
            try:
                async with decoder:
                    output, w, h = await run_in_threadpool(optimise, data, mime, cfg)
                    # An owner may be revoked while decoding. Recheck before the private write.
                    await run_in_threadpool(
                        finish_upload, owner_id, mid, object_key, output, w, h
                    )
            except Exception as e:
                await run_in_threadpool(fail_upload, mid)
                if isinstance(e, HTTPException):
                    raise
                if isinstance(e, ValueError):
                    raise HTTPException(422, str(e)) from None
                raise HTTPException(
                    503, "The photo could not be stored. Please retry later."
                ) from None
            return {
                "id": mid,
                "width": w,
                "height": h,
                "bytes": len(output),
                "status": "ready",
            }
        finally:
            upload_gate.release()

    @app.post("/v1/me/cards")
    async def create_card(request: Request):
        owner_id = await run_in_threadpool(auth, request)
        key = idem(request)
        raw = await body(request, cfg.max_card_bytes)
        try:
            document = HostedDocument.model_validate_json(raw).document()
        except (ValueError, TypeError):
            raise HTTPException(422, "The card or photo layout is invalid.") from None

        def commit_card():
            with sessions.begin() as db:
                card = publish(db, owner_id, document, key, cfg, int(clock()))
                return card_result(card, cfg)

        return await run_in_threadpool(commit_card)

    @app.get("/v1/me/cards")
    def cards(request: Request):
        owner_id = auth(request)
        with sessions() as db:
            rows = db.scalars(
                select(Card)
                .where(Card.owner_id == owner_id)
                .order_by(Card.created_at.desc())
                .limit(100)
            ).all()
            return {"cards": [card_result(c, cfg) for c in rows]}

    @app.delete("/v1/me/cards/{cid}")
    def delete_card(cid: str, request: Request):
        owner_id = auth(request)
        with sessions.begin() as db:
            lock_owner(db, owner_id)
            card = db.scalar(
                select(Card)
                .where(Card.id == cid, Card.owner_id == owner_id)
                .with_for_update()
            )
            if not card:
                raise HTTPException(404, "The owned card is unavailable.")
            card.revoked = 1
            card.document = "{}"
            db.flush()
            remaining = db.scalar(
                select(func.count())
                .select_from(Card)
                .where(
                    Card.media_id == card.media_id,
                    Card.revoked == 0,
                    Card.expires_at > int(clock()),
                )
            )
            if not remaining:
                media = db.get(Media, card.media_id)
                if media:
                    media.status = "deleting"
        return Response(status_code=204)

    @app.delete("/v1/me/media/{mid}")
    def delete_media(mid: str, request: Request):
        owner_id = auth(request)
        with sessions.begin() as db:
            lock_owner(db, owner_id)
            media = db.scalar(
                select(Media)
                .where(Media.id == mid, Media.owner_id == owner_id)
                .with_for_update()
            )
            if not media:
                raise HTTPException(404, "The owned photo is unavailable.")
            count = db.scalar(
                select(func.count())
                .select_from(Card)
                .where(
                    Card.media_id == mid,
                    Card.revoked == 0,
                    Card.expires_at > int(clock()),
                )
            )
            if count:
                raise HTTPException(409, "Delete the cards using this photo first.")
            media.status = "deleting"
        return Response(status_code=202)

    @app.delete("/v1/me")
    def delete_owner(request: Request):
        owner_id = auth(request)
        with sessions.begin() as db:
            owner = lock_owner(db, owner_id)
            owner.revoked = 1
            for card in db.scalars(select(Card).where(Card.owner_id == owner_id)):
                card.revoked = 1
                card.document = "{}"
            for media in db.scalars(select(Media).where(Media.owner_id == owner_id)):
                media.status = "deleting"
        return Response(status_code=202)

    def shared(token):
        now = int(clock())
        with sessions.begin() as db:
            card = resolve(db, token, now)
            rate(db, "share:" + card.id, cfg.read_rate, now)
            rate(db, "shares:global", cfg.global_read_rate, now)
            increment(
                db,
                "month:read:"
                + datetime.fromtimestamp(now, timezone.utc).strftime("%Y-%m"),
                1,
                now + 400 * 86400,
            )
            return card

    @app.get("/v1/shared/{token}")
    def manifest(token: str):
        card = shared(token)
        return {"version": 1, "expiresAt": card.expires_at, **json.loads(card.document)}

    @app.get("/v1/shared/{token}/photo")
    def photo(token: str):
        card = shared(token)
        with sessions() as db:
            media = db.get(Media, card.media_id)
            if not media or media.status != "ready":
                raise HTTPException(503, "This card photo is temporarily unavailable.")
            try:
                data = store.get(media.object_key)
                if len(data) > cfg.max_output_bytes:
                    raise OSError("oversize private derivative")
            except Exception:
                raise HTTPException(
                    503, "This card photo is temporarily unavailable."
                ) from None
        with sessions.begin() as db:
            increment(
                db,
                "month:egress:"
                + datetime.fromtimestamp(int(clock()), timezone.utc).strftime("%Y-%m"),
                len(data),
                int(clock()) + 400 * 86400,
            )
        return Response(data, media_type="image/webp")

    @app.get("/v1/me/usage")
    def usage(request: Request):
        owner_id = auth(request)
        with sessions() as db:
            size = int(
                db.scalar(
                    select(func.coalesce(func.sum(Media.size), 0)).where(
                        Media.owner_id == owner_id
                    )
                )
            )
            count = db.scalar(
                select(func.count())
                .select_from(Card)
                .where(
                    Card.owner_id == owner_id,
                    Card.revoked == 0,
                    Card.expires_at > int(clock()),
                )
            )
        return {
            "bytes": size,
            "maxBytes": cfg.max_owner_bytes,
            "activeCards": count,
            "maxCards": cfg.max_owner_cards,
        }

    return app
