import json
from datetime import datetime, timezone
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from gwak_api.core.audit import write_audit
from gwak_api.core.db import get_db
from gwak_api.core.errors import ApiError
from gwak_api.core.rbac import Role, client_ip, get_current_user, require_roles
from gwak_api.events.bus import publish
from gwak_api.modules.auth.models import User
from gwak_api.modules.clinical.models import (
    Appointment,
    AvailabilitySlot,
    Consultation,
    Doctor,
    Prescription,
    PrescriptionItem,
)
from gwak_api.modules.pharmacy.models import Payment, Product
from gwak_api.modules.records.models import ConsentArtifact, HealthRecord

router = APIRouter(tags=["clinical"])

PROHIBITED_TIERS = {"PROHIBITED", "X", "NDPS"}
LIST_A = {"A"}


class DoctorOut(BaseModel):
    id: str
    registration_no: str
    hpr_id: str | None
    specialties: list[str]
    qualifications: str
    languages: list[str]
    experience_years: int
    fee: float
    bio: str | None
    verification_status: str
    rating_avg: float
    rating_count: int
    hospital_name: str | None
    gender: str | None
    photo_url: str | None
    full_name: str | None = None

    model_config = {"from_attributes": True}


class SlotOut(BaseModel):
    id: str
    doctor_id: str
    starts_at: datetime
    ends_at: datetime
    mode: str
    is_booked: bool

    model_config = {"from_attributes": True}


class BookAppointment(BaseModel):
    doctor_id: str
    slot_id: str
    mode: str = "video"
    intake: dict | None = None


class ConsentBody(BaseModel):
    purpose: str = "teleconsultation"
    accepted: bool = True


class PaymentConfirm(BaseModel):
    provider_ref: str | None = None


class SoapNotes(BaseModel):
    subjective: str = ""
    objective: str = ""
    assessment: str = ""
    plan: str = ""
    diagnosis: str | None = None


class RxItemIn(BaseModel):
    product_id: str | None = None
    drug_name: str
    schedule_tier: str = "O"
    dose: str
    frequency: str
    duration: str
    instructions: str | None = None


class CreatePrescription(BaseModel):
    consultation_id: str
    items: list[RxItemIn] = Field(min_length=1)
    signature: str


def _doctor_out(doc: Doctor, user: User | None = None) -> DoctorOut:
    return DoctorOut(
        id=doc.id,
        registration_no=doc.registration_no,
        hpr_id=doc.hpr_id,
        specialties=[s for s in doc.specialties.split(",") if s],
        qualifications=doc.qualifications,
        languages=[s for s in doc.languages.split(",") if s],
        experience_years=doc.experience_years,
        fee=doc.fee,
        bio=doc.bio,
        verification_status=doc.verification_status,
        rating_avg=doc.rating_avg,
        rating_count=doc.rating_count,
        hospital_name=doc.hospital_name,
        gender=doc.gender,
        photo_url=doc.photo_url,
        full_name=user.full_name if user else None,
    )


@router.get("/doctors", response_model=dict)
def list_doctors(
    db: Annotated[Session, Depends(get_db)],
    specialty: str | None = None,
    language: str | None = None,
    gender: str | None = None,
    min_experience: int | None = None,
    max_fee: float | None = None,
    q: str | None = None,
    cursor: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    sort: str = "rating",
):
    stmt = select(Doctor).where(Doctor.verification_status == "verified")
    doctors = list(db.scalars(stmt))
    if specialty:
        doctors = [d for d in doctors if specialty.lower() in d.specialties.lower()]
    if language:
        doctors = [d for d in doctors if language.lower() in d.languages.lower()]
    if gender:
        doctors = [d for d in doctors if (d.gender or "").lower() == gender.lower()]
    if min_experience is not None:
        doctors = [d for d in doctors if d.experience_years >= min_experience]
    if max_fee is not None:
        doctors = [d for d in doctors if d.fee <= max_fee]
    if q:
        ql = q.lower()
        doctors = [
            d
            for d in doctors
            if ql in d.specialties.lower() or ql in (d.hospital_name or "").lower() or ql in d.registration_no.lower()
        ]
    if sort == "fee":
        doctors.sort(key=lambda d: d.fee)
    elif sort == "experience":
        doctors.sort(key=lambda d: d.experience_years, reverse=True)
    else:
        doctors.sort(key=lambda d: d.rating_avg, reverse=True)

    page = doctors[cursor : cursor + limit]
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_([d.user_id for d in page]))).all()} if page else {}
    items = [_doctor_out(d, users.get(d.user_id)) for d in page]
    next_cursor = cursor + limit if cursor + limit < len(doctors) else None
    return {"items": items, "next_cursor": next_cursor, "total": len(doctors)}


@router.get("/doctors/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: str, db: Annotated[Session, Depends(get_db)]):
    doc = db.get(Doctor, doctor_id)
    if not doc or doc.verification_status != "verified":
        raise ApiError(404, "NOT_FOUND", "Doctor not found")
    user = db.get(User, doc.user_id)
    return _doctor_out(doc, user)


@router.get("/slots", response_model=list[SlotOut])
def list_slots(
    doctor_id: str,
    db: Annotated[Session, Depends(get_db)],
    mode: str | None = None,
):
    stmt = select(AvailabilitySlot).where(
        AvailabilitySlot.doctor_id == doctor_id,
        AvailabilitySlot.is_booked.is_(False),
        AvailabilitySlot.starts_at >= datetime.now(timezone.utc),
    )
    slots = list(db.scalars(stmt))
    if mode:
        slots = [s for s in slots if s.mode == mode]
    slots.sort(key=lambda s: s.starts_at)
    return slots


@router.post("/appointments", status_code=201)
def book_appointment(
    body: BookAppointment,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.PATIENT))],
):
    doc = db.get(Doctor, body.doctor_id)
    if not doc or doc.verification_status != "verified":
        raise ApiError(404, "NOT_FOUND", "Doctor not found")
    slot = db.get(AvailabilitySlot, body.slot_id)
    if not slot or slot.doctor_id != body.doctor_id or slot.is_booked:
        raise ApiError(409, "SLOT_UNAVAILABLE", "Slot is not available")
    if body.mode != slot.mode:
        raise ApiError(422, "MODE_MISMATCH", "Appointment mode must match slot mode")
    slot.is_booked = True
    appt = Appointment(
        patient_id=user.id,
        doctor_id=doc.id,
        slot_id=slot.id,
        mode=body.mode,
        fee=doc.fee,
        intake_json=json.dumps(body.intake) if body.intake else None,
        status="booked",
        payment_status="pending",
    )
    db.add(appt)
    db.flush()
    db.add(Consultation(appointment_id=appt.id, status="waiting", video_room_id=f"gwak-{appt.id[:8]}"))
    db.commit()
    return {"id": appt.id, "status": appt.status, "payment_status": appt.payment_status, "fee": appt.fee}


@router.post("/appointments/{appointment_id}/consent")
def capture_consent(
    appointment_id: str,
    body: ConsentBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.PATIENT))],
    ip: Annotated[str, Depends(client_ip)],
):
    if not body.accepted:
        raise ApiError(400, "CONSENT_REQUIRED", "Explicit consent is required for teleconsultation")
    appt = db.get(Appointment, appointment_id)
    if not appt or appt.patient_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Appointment not found")
    artifact = ConsentArtifact(
        patient_id=user.id,
        purpose=body.purpose,
        scope=f"appointment:{appointment_id}",
        status="granted",
    )
    db.add(artifact)
    db.flush()
    appt.consent_ref = artifact.id
    write_audit(
        db,
        actor_id=user.id,
        action="consent.granted",
        resource_type="appointment",
        resource_id=appointment_id,
        ip=ip,
    )
    publish("consent.granted", {"consent_id": artifact.id, "patient_id": user.id}, idempotency_key=artifact.id)
    db.commit()
    return {"consent_id": artifact.id, "status": "granted"}


@router.post("/appointments/{appointment_id}/pay")
def pay_appointment(
    appointment_id: str,
    body: PaymentConfirm,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.PATIENT))],
):
    appt = db.get(Appointment, appointment_id)
    if not appt or appt.patient_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Appointment not found")
    if not appt.consent_ref:
        raise ApiError(422, "CONSENT_REQUIRED", "Consent must be captured before payment")
    payment = Payment(
        appointment_id=appt.id,
        amount=appt.fee,
        status="confirmed",
        provider_ref=body.provider_ref or f"sim_{uuid4().hex[:12]}",
    )
    db.add(payment)
    appt.payment_status = "paid"
    appt.status = "confirmed"
    db.commit()
    publish("payment.confirmed", {"appointment_id": appt.id, "amount": appt.fee}, idempotency_key=payment.id)
    return {"status": "paid", "payment_id": payment.id}


@router.get("/appointments")
def my_appointments(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if user.role == Role.DOCTOR.value:
        doc = db.scalar(select(Doctor).where(Doctor.user_id == user.id))
        if not doc:
            return {"items": []}
        items = list(db.scalars(select(Appointment).where(Appointment.doctor_id == doc.id)))
    else:
        items = list(db.scalars(select(Appointment).where(Appointment.patient_id == user.id)))
    return {
        "items": [
            {
                "id": a.id,
                "doctor_id": a.doctor_id,
                "patient_id": a.patient_id,
                "mode": a.mode,
                "status": a.status,
                "payment_status": a.payment_status,
                "fee": a.fee,
                "consent_ref": a.consent_ref,
                "created_at": a.created_at,
            }
            for a in items
        ]
    }


@router.post("/appointments/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise ApiError(404, "NOT_FOUND", "Appointment not found")
    if user.role == Role.PATIENT.value and appt.patient_id != user.id:
        raise ApiError(403, "FORBIDDEN", "Not your appointment")
    appt.status = "cancelled"
    slot = db.get(AvailabilitySlot, appt.slot_id)
    if slot:
        slot.is_booked = False
    db.commit()
    return {"status": "cancelled"}


@router.get("/consultations/{consultation_id}/token")
def video_token(
    consultation_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    consult = db.get(Consultation, consultation_id)
    if not consult:
        raise ApiError(404, "NOT_FOUND", "Consultation not found")
    appt = db.get(Appointment, consult.appointment_id)
    if not appt:
        raise ApiError(404, "NOT_FOUND", "Appointment not found")
    doc = db.get(Doctor, appt.doctor_id)
    allowed = appt.patient_id == user.id or (doc and doc.user_id == user.id)
    if not allowed:
        raise ApiError(403, "FORBIDDEN", "Not a participant")
    if appt.payment_status != "paid":
        raise ApiError(422, "PAYMENT_REQUIRED", "Consultation not paid")
    return {
        "room_id": consult.video_room_id,
        "token": f"dev-token-{consultation_id}",
        "provider": "100ms",
        "modes": ["video", "audio", "chat"],
    }


@router.post("/consultations/{consultation_id}/notes")
def save_notes(
    consultation_id: str,
    body: SoapNotes,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.DOCTOR))],
):
    consult = db.get(Consultation, consultation_id)
    if not consult:
        raise ApiError(404, "NOT_FOUND", "Consultation not found")
    consult.notes_soap = json.dumps(body.model_dump())
    consult.diagnosis = body.diagnosis
    consult.status = "in_progress"
    if not consult.started_at:
        consult.started_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "saved"}


@router.post("/prescriptions", status_code=201)
def create_prescription(
    body: CreatePrescription,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.DOCTOR))],
    ip: Annotated[str, Depends(client_ip)],
):
    doc = db.scalar(select(Doctor).where(Doctor.user_id == user.id))
    if not doc:
        raise ApiError(403, "FORBIDDEN", "Doctor profile required")
    consult = db.get(Consultation, body.consultation_id)
    if not consult:
        raise ApiError(404, "NOT_FOUND", "Consultation not found")
    appt = db.get(Appointment, consult.appointment_id)
    if not appt or appt.doctor_id != doc.id:
        raise ApiError(403, "FORBIDDEN", "Not your consultation")

    for item in body.items:
        tier = item.schedule_tier.upper()
        if tier in PROHIBITED_TIERS:
            raise ApiError(
                422,
                "DRUG_TIER_VIOLATION",
                f"{item.drug_name} cannot be prescribed via teleconsultation",
                details={"drug": item.drug_name, "tier": tier},
            )
        if tier in LIST_A and appt.mode != "video":
            raise ApiError(
                422,
                "DRUG_TIER_VIOLATION",
                f"{item.drug_name} (List A) requires video consultation",
                details={"drug": item.drug_name, "tier": tier, "mode": appt.mode},
            )
        if item.product_id:
            product = db.get(Product, item.product_id)
            if product and product.schedule_tier.upper() in PROHIBITED_TIERS:
                raise ApiError(422, "DRUG_TIER_VIOLATION", "Product is prohibited for teleconsult")

    rx = Prescription(
        consultation_id=consult.id,
        doctor_id=doc.id,
        patient_id=appt.patient_id,
        registration_no=doc.registration_no,
        signature=body.signature,
    )
    db.add(rx)
    db.flush()
    for item in body.items:
        db.add(
            PrescriptionItem(
                prescription_id=rx.id,
                product_id=item.product_id,
                drug_name=item.drug_name,
                schedule_tier=item.schedule_tier.upper(),
                dose=item.dose,
                frequency=item.frequency,
                duration=item.duration,
                instructions=item.instructions,
            )
        )
    consult.status = "completed"
    consult.ended_at = datetime.now(timezone.utc)
    appt.status = "completed"
    db.add(
        HealthRecord(
            patient_id=appt.patient_id,
            record_type="prescription",
            title=f"Prescription {rx.id[:8]}",
            ref_id=rx.id,
            summary=f"Issued by {doc.registration_no}",
        )
    )
    write_audit(
        db,
        actor_id=user.id,
        action="prescription.create",
        resource_type="prescription",
        resource_id=rx.id,
        ip=ip,
    )
    publish(
        "consultation.completed",
        {"consultation_id": consult.id, "prescription_id": rx.id, "patient_id": appt.patient_id},
        idempotency_key=rx.id,
    )
    db.commit()
    return {"id": rx.id, "registration_no": rx.registration_no, "issued_at": rx.issued_at}


@router.get("/prescriptions")
def list_prescriptions(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if user.role == Role.DOCTOR.value:
        doc = db.scalar(select(Doctor).where(Doctor.user_id == user.id))
        rx_list = list(db.scalars(select(Prescription).where(Prescription.doctor_id == doc.id))) if doc else []
    else:
        rx_list = list(db.scalars(select(Prescription).where(Prescription.patient_id == user.id)))
    result = []
    for rx in rx_list:
        items = list(db.scalars(select(PrescriptionItem).where(PrescriptionItem.prescription_id == rx.id)))
        result.append(
            {
                "id": rx.id,
                "consultation_id": rx.consultation_id,
                "doctor_id": rx.doctor_id,
                "patient_id": rx.patient_id,
                "registration_no": rx.registration_no,
                "issued_at": rx.issued_at,
                "items": [
                    {
                        "id": i.id,
                        "product_id": i.product_id,
                        "drug_name": i.drug_name,
                        "schedule_tier": i.schedule_tier,
                        "dose": i.dose,
                        "frequency": i.frequency,
                        "duration": i.duration,
                        "instructions": i.instructions,
                    }
                    for i in items
                ],
            }
        )
    return {"items": result}


@router.get("/specialties")
def specialties(db: Annotated[Session, Depends(get_db)]):
    doctors = list(db.scalars(select(Doctor).where(Doctor.verification_status == "verified")))
    counts: dict[str, dict] = {}
    for d in doctors:
        for s in [x.strip() for x in d.specialties.split(",") if x.strip()]:
            entry = counts.setdefault(s, {"name": s, "doctor_count": 0, "starting_fee": d.fee})
            entry["doctor_count"] += 1
            entry["starting_fee"] = min(entry["starting_fee"], d.fee)
    return {"items": list(counts.values())}


@router.get("/landing")
def landing_content(db: Annotated[Session, Depends(get_db)]):
    from gwak_api.core.config import get_settings

    settings = get_settings()
    doctors = list(db.scalars(select(Doctor).where(Doctor.verification_status == "verified")))
    return {
        "brand": "GWAK",
        "tagline": "Consult, get medicines, view reports — without visiting the hospital",
        "trust": {
            "verified_doctors": len(doctors),
            "delivery_cities": ["Pune"],
            "licence_form_20": settings.pharmacy_licence_form_20,
            "licence_form_21": settings.pharmacy_licence_form_21,
            "helpline": settings.support_helpline,
            "grievance_officer": settings.grievance_officer_email,
        },
        "featured_doctor_ids": [d.id for d in doctors[:6]],
    }
