"""Owner-scoped transactions, immutable shares and bounded storage accounting."""

import calendar
import hashlib
import hmac
import json
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select

from .models import Card, Counter, Media, Operation, Owner

TOKEN_PATTERN = r"^[A-Za-z0-9_-]{43}$"


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def opaque():
    return secrets.token_urlsafe(32)


def uid():
    return str(uuid.uuid4())


def share_token(settings, card_id):
    import base64

    return (
        base64.urlsafe_b64encode(
            hmac.new(
                settings.token_secret.encode(),
                ("silent-hello:share:v1:" + card_id).encode(),
                hashlib.sha256,
            ).digest()
        )
        .decode()
        .rstrip("=")
    )


def unavailable():
    return HTTPException(404, "This hosted card is unavailable, expired or removed.")


def add_months(now, months):
    d = datetime.fromtimestamp(now, timezone.utc)
    n = d.year * 12 + d.month - 1 + months
    y, m = divmod(n, 12)
    m += 1
    return int(
        d.replace(
            year=y, month=m, day=min(d.day, calendar.monthrange(y, m)[1])
        ).timestamp()
    )


def lock_owner(db, owner_id):
    row = db.scalar(select(Owner).where(Owner.id == owner_id).with_for_update())
    if not row or row.revoked:
        raise HTTPException(401, "Owner access is unavailable.")
    return row


def increment(db, key, amount, expiry):
    if db.bind.dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    else:
        from sqlalchemy.dialects.sqlite import insert
    stmt = insert(Counter).values(key=key, value=amount, expires_at=expiry)
    return db.scalar(
        stmt.on_conflict_do_update(
            index_elements=[Counter.key],
            set_={"value": Counter.value + amount, "expires_at": expiry},
        ).returning(Counter.value)
    )


def rate(db, key, limit, now, window=60):
    bucket = now // window
    value = increment(db, f"rate:{key}:{bucket}", 1, (bucket + 2) * window)
    if value > limit:
        raise HTTPException(
            429,
            (
                "Daily hosting limit reached. Please try tomorrow."
                if window >= 86400
                else "Too many requests. Please try again shortly."
            ),
            headers={"Retry-After": str(window - now % window)},
        )


def operation(db, owner_id, kind, key, fingerprint):
    row = db.scalar(
        select(Operation).where(
            Operation.owner_id == owner_id, Operation.kind == kind, Operation.key == key
        )
    )
    if row and not hmac.compare_digest(row.fingerprint, fingerprint):
        raise HTTPException(
            409, "This request key was already used for different content."
        )
    return row


def card_result(card, settings):
    from urllib.parse import urljoin

    token = share_token(settings, card.id)
    return {
        "id": card.id,
        "expiresAt": card.expires_at,
        "shareUrl": urljoin(settings.frontend_url, "view.html") + "?s=" + token,
        "revoked": bool(card.revoked),
    }


def used_bytes(db, owner_id):
    return db.scalar(
        select(func.coalesce(func.sum(Media.size), 0)).where(Media.owner_id == owner_id)
    )


def reserve(db, owner_id, key, fingerprint, settings, now):
    lock_owner(db, owner_id)
    previous = operation(db, owner_id, "upload", key, fingerprint)
    if previous:
        row = db.get(Media, previous.resource_id)
        if row and row.status == "ready":
            return row, True
        raise HTTPException(
            409,
            "This upload is pending or no longer available. Use a new request key only for a new upload.",
        )
    rate(db, "daily-uploads:" + owner_id, settings.daily_upload_quota, now, 86400)
    rate(db, "daily-uploads:global", settings.global_daily_upload_quota, now, 86400)
    count = db.scalar(
        select(func.count()).select_from(Media).where(Media.owner_id == owner_id)
    )
    if (
        count >= settings.max_owner_media
        or used_bytes(db, owner_id) + settings.max_output_bytes
        > settings.max_owner_bytes
    ):
        raise HTTPException(
            413, "Your photo storage quota is full. Delete unused media first."
        )
    if (
        increment(db, "storage-reserved", settings.max_output_bytes, 0)
        > settings.global_storage_bytes
    ):
        raise HTTPException(503, "New uploads are paused because storage is full.")
    mid = uid()
    row = Media(
        id=mid,
        owner_id=owner_id,
        object_key="media/" + mid + ".webp",
        status="pending",
        purpose="upload",
        size=settings.max_output_bytes,
        created_at=now,
    )
    db.add(row)
    db.add(
        Operation(
            id=uid(),
            owner_id=owner_id,
            kind="upload",
            key=key,
            fingerprint=fingerprint,
            resource_id=mid,
            created_at=now,
        )
    )
    db.flush()
    increment(
        db,
        "month:write:" + datetime.fromtimestamp(now, timezone.utc).strftime("%Y-%m"),
        1,
        now + 400 * 86400,
    )
    return row, False


def publish(db, owner_id, document, key, settings, now):
    lock_owner(db, owner_id)
    raw = json.dumps(
        document, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )
    fingerprint = digest(raw)
    prev = operation(db, owner_id, "card", key, fingerprint)
    if prev:
        card = db.get(Card, prev.resource_id)
        if not card or card.revoked or card.expires_at <= now:
            raise HTTPException(
                410,
                "The original card was removed or expired. It cannot be recreated by retrying.",
            )
        return card
    rate(db, "daily-cards:" + owner_id, settings.daily_card_quota, now, 86400)
    rate(db, "daily-cards:global", settings.global_daily_card_quota, now, 86400)
    media = db.scalar(
        select(Media)
        .where(Media.id == document["photo"]["mediaId"], Media.owner_id == owner_id)
        .with_for_update()
    )
    if not media or media.status != "ready":
        raise HTTPException(404, "The selected owned photo is unavailable.")
    count = db.scalar(
        select(func.count())
        .select_from(Card)
        .where(Card.owner_id == owner_id, Card.revoked == 0, Card.expires_at > now)
    )
    if count >= settings.max_owner_cards:
        raise HTTPException(413, "Your hosted card quota is full.")
    cid = uid()
    token = share_token(settings, cid)
    card = Card(
        id=cid,
        owner_id=owner_id,
        media_id=media.id,
        token_hash=digest(token),
        document=raw,
        created_at=now,
        expires_at=add_months(now, settings.free_months),
    )
    db.add(card)
    db.add(
        Operation(
            id=uid(),
            owner_id=owner_id,
            kind="card",
            key=key,
            fingerprint=fingerprint,
            resource_id=cid,
            created_at=now,
        )
    )
    db.flush()
    return card


def resolve(db, token, now):
    import re

    if not re.fullmatch(TOKEN_PATTERN, token):
        raise unavailable()
    card = db.scalar(
        select(Card).where(
            Card.token_hash == digest(token), Card.revoked == 0, Card.expires_at > now
        )
    )
    if not card:
        raise unavailable()
    owner = db.get(Owner, card.owner_id)
    if not owner or owner.revoked:
        raise unavailable()
    return card
