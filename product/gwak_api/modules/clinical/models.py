from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from gwak_api.core.db import Base
from gwak_api.core.schema_utils import table_args


class Doctor(Base):
    __tablename__ = "doctors"
    __table_args__ = table_args("clinical")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    registration_no: Mapped[str] = mapped_column(String(64), unique=True)
    hpr_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    specialties: Mapped[str] = mapped_column(Text, default="")  # comma-separated
    qualifications: Mapped[str] = mapped_column(Text, default="")
    languages: Mapped[str] = mapped_column(Text, default="en,hi")
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    fee: Mapped[float] = mapped_column(Float, default=0)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    verification_status: Mapped[str] = mapped_column(String(32), default="pending")
    rating_avg: Mapped[float] = mapped_column(Float, default=0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    hospital_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(32), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"
    __table_args__ = table_args("clinical")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    doctor_id: Mapped[str] = mapped_column(String(36), index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    mode: Mapped[str] = mapped_column(String(32), default="video")  # video|audio|clinic|home
    is_booked: Mapped[bool] = mapped_column(Boolean, default=False)


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = table_args("clinical")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), index=True)
    doctor_id: Mapped[str] = mapped_column(String(36), index=True)
    slot_id: Mapped[str] = mapped_column(String(36), index=True)
    mode: Mapped[str] = mapped_column(String(32), default="video")
    status: Mapped[str] = mapped_column(String(32), default="booked")
    consent_ref: Mapped[str | None] = mapped_column(String(36), nullable=True)
    intake_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    fee: Mapped[float] = mapped_column(Float, default=0)
    payment_status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Consultation(Base):
    __tablename__ = "consultations"
    __table_args__ = table_args("clinical")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    appointment_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    notes_soap: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="waiting")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    video_room_id: Mapped[str | None] = mapped_column(String(128), nullable=True)


class Prescription(Base):
    __tablename__ = "prescriptions"
    __table_args__ = table_args("clinical")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    consultation_id: Mapped[str] = mapped_column(String(36), index=True)
    doctor_id: Mapped[str] = mapped_column(String(36), index=True)
    patient_id: Mapped[str] = mapped_column(String(36), index=True)
    registration_no: Mapped[str] = mapped_column(String(64))
    signature: Mapped[str | None] = mapped_column(String(255), nullable=True)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"
    __table_args__ = table_args("clinical")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    prescription_id: Mapped[str] = mapped_column(String(36), index=True)
    product_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    drug_name: Mapped[str] = mapped_column(String(255))
    schedule_tier: Mapped[str] = mapped_column(String(16), default="O")
    dose: Mapped[str] = mapped_column(String(64))
    frequency: Mapped[str] = mapped_column(String(64))
    duration: Mapped[str] = mapped_column(String(64))
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
