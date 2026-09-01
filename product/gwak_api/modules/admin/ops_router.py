from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from gwak_api.core.db import get_db
from gwak_api.core.errors import ApiError
from gwak_api.core.rbac import Role, require_roles
from gwak_api.core.security import hash_password
from gwak_api.modules.auth.models import User
from gwak_api.modules.clinical.models import AvailabilitySlot, Doctor
from gwak_api.modules.pharmacy.models import Inventory, Product
from gwak_api.modules.records.models import LabTest

router = APIRouter(prefix="/admin/ops", tags=["admin-ops"])


class DoctorOnboard(BaseModel):
    phone: str
    full_name: str
    registration_no: str
    specialties: str = "General Medicine"
    qualifications: str = "MBBS"
    languages: str = "en,hi"
    experience_years: int = 5
    fee: float = 499
    hospital_name: str | None = "GWAK Partner Clinic"
    hpr_id: str | None = None
    gender: str | None = None
    bio: str | None = None
    slots_next_days: int = Field(default=3, ge=0, le=14)


class ProductSeed(BaseModel):
    sku: str
    name: str
    composition: str | None = None
    schedule_tier: str = "O"
    rx_required: bool = False
    price: float
    mrp: float
    category: str = "General"
    stock: int = 100


class LabSeed(BaseModel):
    code: str
    name: str
    price: float = 499


class PharmacistCreate(BaseModel):
    phone: str
    full_name: str = "GWAK Pharmacist"


@router.post("/doctors", status_code=201)
def onboard_doctor(
    body: DoctorOnboard,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
):
    existing = db.scalar(select(User).where(User.phone == body.phone))
    if existing:
        raise ApiError(409, "PHONE_IN_USE", "Phone already registered")
    existing_reg = db.scalar(select(Doctor).where(Doctor.registration_no == body.registration_no))
    if existing_reg:
        raise ApiError(
            409,
            "REGISTRATION_IN_USE",
            f"Doctor with registration_no {body.registration_no} already exists",
        )
    user = User(
        phone=body.phone,
        full_name=body.full_name,
        role=Role.DOCTOR.value,
        password_hash=hash_password("DoctorChangeMe1!"),
    )
    db.add(user)
    db.flush()
    doctor = Doctor(
        user_id=user.id,
        registration_no=body.registration_no,
        hpr_id=body.hpr_id,
        specialties=body.specialties,
        qualifications=body.qualifications,
        languages=body.languages,
        experience_years=body.experience_years,
        fee=body.fee,
        bio=body.bio,
        verification_status="verified",
        hospital_name=body.hospital_name,
        gender=body.gender,
    )
    db.add(doctor)
    db.flush()
    now = datetime.now(timezone.utc)
    for day in range(body.slots_next_days):
        for hour in (10, 14, 18):
            start = (now + timedelta(days=day + 1)).replace(hour=hour, minute=0, second=0, microsecond=0)
            db.add(
                AvailabilitySlot(
                    doctor_id=doctor.id,
                    starts_at=start,
                    ends_at=start + timedelta(minutes=30),
                    mode="video",
                )
            )
    db.commit()
    return {"doctor_id": doctor.id, "user_id": user.id, "status": "verified"}


@router.post("/products", status_code=201)
def seed_product(
    body: ProductSeed,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN, Role.ADMIN_PHARMACY)),
):
    product = Product(
        sku=body.sku,
        name=body.name,
        composition=body.composition,
        schedule_tier=body.schedule_tier.upper(),
        rx_required=body.rx_required,
        price=body.price,
        mrp=body.mrp,
        category=body.category,
        published=True,
        approval_status="approved",
    )
    db.add(product)
    db.flush()
    db.add(
        Inventory(
            product_id=product.id,
            batch="BATCH-1",
            expiry="2027-12-31",
            qty=body.stock,
        )
    )
    db.commit()
    return {"id": product.id, "sku": product.sku}


@router.post("/labs", status_code=201)
def seed_lab(
    body: LabSeed,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
):
    test = LabTest(code=body.code, name=body.name, price=body.price, description=body.name, published=True)
    db.add(test)
    db.commit()
    db.refresh(test)
    return {"id": test.id, "code": test.code}


@router.post("/pharmacist", status_code=201)
def create_pharmacist(
    body: PharmacistCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
):
    existing = db.scalar(select(User).where(User.phone == body.phone))
    if existing:
        raise ApiError(409, "PHONE_IN_USE", "Phone already registered")
    user = User(phone=body.phone, full_name=body.full_name, role=Role.PHARMACIST.value)
    db.add(user)
    db.commit()
    return {"id": user.id, "role": user.role}


class DeliveryCreate(BaseModel):
    phone: str
    full_name: str = "GWAK Delivery"


@router.post("/delivery", status_code=201)
def create_delivery_agent(
    body: DeliveryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
):
    existing = db.scalar(select(User).where(User.phone == body.phone))
    if existing:
        raise ApiError(409, "PHONE_IN_USE", "Phone already registered")
    user = User(phone=body.phone, full_name=body.full_name, role=Role.DELIVERY.value)
    db.add(user)
    db.commit()
    return {"id": user.id, "role": user.role}
