from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from gwak_api.core.db import Base
from gwak_api.core.schema_utils import table_args


class ConsentArtifact(Base):
    __tablename__ = "consent_artifacts"
    __table_args__ = table_args("records")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), index=True)
    purpose: Mapped[str] = mapped_column(String(128))
    scope: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="granted")
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class HealthRecord(Base):
    __tablename__ = "health_records"
    __table_args__ = table_args("records")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), index=True)
    record_type: Mapped[str] = mapped_column(String(64))  # consult|prescription|report|vital
    title: Mapped[str] = mapped_column(String(255))
    ref_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = table_args("notify")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    category: Mapped[str] = mapped_column(String(64), default="general")
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class LabTest(Base):
    __tablename__ = "lab_tests"
    __table_args__ = table_args("labs")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Float, default=0)
    home_collection: Mapped[bool] = mapped_column(Boolean, default=True)
    published: Mapped[bool] = mapped_column(Boolean, default=True)


class TestBooking(Base):
    __tablename__ = "test_bookings"
    __table_args__ = table_args("labs")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), index=True)
    test_id: Mapped[str] = mapped_column(String(36))
    status: Mapped[str] = mapped_column(String(32), default="booked")
    collection_slot: Mapped[str | None] = mapped_column(String(64), nullable=True)
    address_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class LabReport(Base):
    __tablename__ = "lab_reports"
    __table_args__ = table_args("labs")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    booking_id: Mapped[str] = mapped_column(String(36), index=True)
    patient_id: Mapped[str] = mapped_column(String(36), index=True)
    file_ref: Mapped[str | None] = mapped_column(String(512), nullable=True)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
