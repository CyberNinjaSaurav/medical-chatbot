from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from gwak_api.core.db import Base
from gwak_api.core.schema_utils import table_args


class User(Base):
    __tablename__ = "users"
    __table_args__ = table_args("auth")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="patient", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    abha_id: Mapped[str | None] = mapped_column(String(14), unique=True, nullable=True)
    language: Mapped[str] = mapped_column(String(8), default="en")
    totp_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class PatientProfile(Base):
    __tablename__ = "patient_profiles"
    __table_args__ = table_args("auth")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    dob: Mapped[str | None] = mapped_column(String(10), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(32), nullable=True)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    chronic_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)


class FamilyMember(Base):
    __tablename__ = "family_members"
    __table_args__ = table_args("auth")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    owner_user_id: Mapped[str] = mapped_column(String(36), index=True)
    member_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255))
    relation: Mapped[str] = mapped_column(String(64))
    dob: Mapped[str | None] = mapped_column(String(10), nullable=True)


class OtpChallenge(Base):
    __tablename__ = "otp_challenges"
    __table_args__ = table_args("auth")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    phone: Mapped[str] = mapped_column(String(20), index=True)
    code_hash: Mapped[str] = mapped_column(String(255))
    purpose: Mapped[str] = mapped_column(String(32), default="login")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = table_args("auth")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    token_jti: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class AbhaLink(Base):
    __tablename__ = "abha_links"
    __table_args__ = table_args("auth")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    abha_id: Mapped[str] = mapped_column(String(14), unique=True, index=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="linked")
