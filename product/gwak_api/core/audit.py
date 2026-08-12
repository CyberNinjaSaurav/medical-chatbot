from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, Session

from gwak_api.core.db import Base


def _schema(name: str) -> dict:
    # SQLite has no schemas; Postgres uses module schemas.
    from gwak_api.core.config import get_settings

    if get_settings().database_url.startswith("sqlite"):
        return {}
    return {"schema": name}


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = _schema("records")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


def write_audit(
    db: Session,
    *,
    actor_id: str | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    ip: str | None = None,
    metadata_json: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip=ip,
        metadata_json=metadata_json,
    )
    db.add(entry)
    db.flush()
    return entry
