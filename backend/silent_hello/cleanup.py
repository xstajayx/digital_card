"""Small batches; no Redis/worker service. Rerunnable after crashes and storage errors."""

from sqlalchemy import and_, delete, exists, func, or_, select

from .models import Card, Counter, Media, Operation, Owner
from .service import increment


def cleanup(sessions, storage, settings, now):
    report = {"cards": 0, "objects": 0, "failed": 0}
    # Scrub private card text as soon as expiry/deletion is processed.
    with sessions.begin() as db:
        expired = db.scalars(
            select(Card)
            .where((Card.revoked == 1) | (Card.expires_at <= now))
            .order_by(Card.expires_at)
            .limit(settings.cleanup_batch)
        ).all()
        for card in expired:
            # Lock order matches publish/delete: owner then media/card.
            db.scalar(select(Owner).where(Owner.id == card.owner_id).with_for_update())
            fresh = db.get(Card, card.id, populate_existing=True)
            if fresh and (fresh.revoked or fresh.expires_at <= now):
                db.delete(fresh)
                report["cards"] += 1
    with sessions() as db:
        candidates = db.scalars(
            select(Media.id)
            .where(
                Media.next_retry <= now,
                ~exists(select(Card.id).where(Card.media_id == Media.id)),
                or_(
                    Media.status == "deleting",
                    and_(
                        Media.purpose == "generated",
                        Media.created_at <= now - settings.generated_days * 86400,
                    ),
                    and_(
                        Media.purpose != "generated",
                        Media.created_at <= now - settings.abandoned_hours * 3600,
                    ),
                ),
            )
            .order_by(Media.created_at)
            .limit(settings.cleanup_batch)
        ).all()
    for mid in candidates:
        if report["objects"] + report["failed"] >= settings.cleanup_batch:
            break
        with sessions.begin() as db:
            media = db.get(Media, mid)
            if not media:
                continue
            db.scalar(select(Owner).where(Owner.id == media.owner_id).with_for_update())
            media = db.scalar(select(Media).where(Media.id == mid).with_for_update())
            if not media:
                continue
            references = db.scalar(
                select(func.count()).select_from(Card).where(Card.media_id == mid)
            )
            if references:
                continue
            lifetime = (
                settings.generated_days * 86400
                if media.purpose == "generated"
                else settings.abandoned_hours * 3600
            )
            if media.status != "deleting" and media.created_at + lifetime > now:
                continue
            media.status = "deleting"
            try:
                storage.delete(media.object_key)
            except Exception:
                media.attempts += 1
                media.last_error = "storage_delete_failed"
                media.next_retry = now + min(86400, 60 * 2 ** min(media.attempts, 10))
                report["failed"] += 1
            else:
                increment(db, "storage-reserved", -media.size, 0)
                db.delete(media)
                report["objects"] += 1
    with sessions.begin() as db:
        # Idempotency tombstones exceed all supported card retention periods; no content/tokens.
        old_ops = db.scalars(
            select(Operation.id)
            .where(
                or_(
                    and_(
                        Operation.kind == "upload",
                        Operation.created_at < now - 7 * 86400,
                    ),
                    Operation.created_at
                    < now
                    - (max(settings.free_months, settings.paid_months) * 31 + 60)
                    * 86400,
                )
            )
            .limit(settings.cleanup_batch * 10)
        ).all()
        if old_ops:
            db.execute(delete(Operation).where(Operation.id.in_(old_ops)))
        old_counters = db.scalars(
            select(Counter.key)
            .where(Counter.expires_at > 0, Counter.expires_at <= now)
            .limit(settings.cleanup_batch * 10)
        ).all()
        if old_counters:
            db.execute(delete(Counter).where(Counter.key.in_(old_counters)))
    with sessions.begin() as db:
        owners = db.scalars(
            select(Owner)
            .where(
                Owner.revoked == 1,
                ~exists(select(Card.id).where(Card.owner_id == Owner.id)),
                ~exists(select(Media.id).where(Media.owner_id == Owner.id)),
            )
            .limit(settings.cleanup_batch)
        ).all()
        for owner in owners:
            db.execute(delete(Operation).where(Operation.owner_id == owner.id))
            db.delete(owner)
    return report
