from sqlalchemy import (
    BigInteger,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Owner(Base):
    __tablename__ = "owners"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[int] = mapped_column(BigInteger)
    revoked: Mapped[int] = mapped_column(Integer, default=0)


class Media(Base):
    __tablename__ = "media"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("owners.id"), index=True)
    object_key: Mapped[str] = mapped_column(String(120), unique=True)
    purpose: Mapped[str] = mapped_column(String(16), default="upload")
    status: Mapped[str] = mapped_column(String(16), index=True)
    size: Mapped[int] = mapped_column(BigInteger, default=0)
    width: Mapped[int] = mapped_column(Integer, default=0)
    height: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[int] = mapped_column(BigInteger, index=True)
    ready_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    last_error: Mapped[str | None] = mapped_column(String(40), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_retry: Mapped[int] = mapped_column(BigInteger, default=0)


class Card(Base):
    __tablename__ = "cards"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("owners.id"), index=True)
    media_id: Mapped[str] = mapped_column(ForeignKey("media.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    document: Mapped[str] = mapped_column(Text)
    created_at: Mapped[int] = mapped_column(BigInteger)
    expires_at: Mapped[int] = mapped_column(BigInteger, index=True)
    revoked: Mapped[int] = mapped_column(Integer, default=0)


class Operation(Base):
    __tablename__ = "operations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("owners.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    key: Mapped[str] = mapped_column(String(80))
    fingerprint: Mapped[str] = mapped_column(String(64))
    resource_id: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[int] = mapped_column(BigInteger, index=True)
    __table_args__ = (UniqueConstraint("owner_id", "kind", "key"),)


class Counter(Base):
    __tablename__ = "counters"
    key: Mapped[str] = mapped_column(String(140), primary_key=True)
    value: Mapped[int] = mapped_column(BigInteger, default=0)
    expires_at: Mapped[int] = mapped_column(BigInteger, index=True)


class ServiceKey(Base):
    __tablename__ = "service_keys"
    name: Mapped[str] = mapped_column(String(40), primary_key=True)
    digest: Mapped[str] = mapped_column(String(64))
