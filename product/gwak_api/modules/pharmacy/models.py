from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from gwak_api.core.db import Base
from gwak_api.core.schema_utils import table_args


class Product(Base):
    __tablename__ = "products"
    __table_args__ = table_args("pharmacy")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    composition: Mapped[str | None] = mapped_column(Text, nullable=True)
    manufacturer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    schedule_tier: Mapped[str] = mapped_column(String(16), default="O")  # O|A|B|PROHIBITED|H1
    rx_required: Mapped[bool] = mapped_column(Boolean, default=False)
    price: Mapped[float] = mapped_column(Float, default=0)
    mrp: Mapped[float] = mapped_column(Float, default=0)
    category: Mapped[str] = mapped_column(String(128), default="General")
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    approval_status: Mapped[str] = mapped_column(String(32), default="draft")


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = table_args("pharmacy")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), index=True)
    warehouse: Mapped[str] = mapped_column(String(64), default="pune-primary")
    batch: Mapped[str] = mapped_column(String(64))
    expiry: Mapped[str] = mapped_column(String(10))
    qty: Mapped[int] = mapped_column(Integer, default=0)


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = table_args("commerce")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), index=True)
    prescription_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(48), default="created")
    address_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    total: Mapped[float] = mapped_column(Float, default=0)
    pharmacist_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    pharmacist_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tracking_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = table_args("commerce")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    order_id: Mapped[str] = mapped_column(String(36), index=True)
    product_id: Mapped[str] = mapped_column(String(36))
    name: Mapped[str] = mapped_column(String(255))
    qty: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    rx_required: Mapped[bool] = mapped_column(Boolean, default=False)


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = table_args("commerce")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    order_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    appointment_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    provider: Mapped[str] = mapped_column(String(32), default="razorpay")
    provider_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = table_args("commerce")

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), index=True)
    product_id: Mapped[str] = mapped_column(String(36))
    cadence_days: Mapped[int] = mapped_column(Integer, default=30)
    status: Mapped[str] = mapped_column(String(32), default="active")
    next_refill_at: Mapped[str | None] = mapped_column(String(10), nullable=True)
