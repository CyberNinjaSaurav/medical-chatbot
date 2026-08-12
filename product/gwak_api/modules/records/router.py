from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from gwak_api.core.audit import AuditLog, write_audit
from gwak_api.core.db import get_db
from gwak_api.core.errors import ApiError
from gwak_api.core.rbac import Role, client_ip, get_current_user, require_roles
from gwak_api.events.bus import publish
from gwak_api.modules.auth.models import User
from gwak_api.modules.records.models import (
    ConsentArtifact,
    HealthRecord,
    LabReport,
    LabTest,
    Notification,
    TestBooking,
)

records_router = APIRouter(prefix="/records", tags=["records"])
notify_router = APIRouter(prefix="/notifications", tags=["notifications"])
labs_router = APIRouter(prefix="/labs", tags=["labs"])
admin_router = APIRouter(prefix="/admin", tags=["admin"])


class ConsentCreate(BaseModel):
    purpose: str
    scope: str = ""


class LabBook(BaseModel):
    test_id: str
    collection_slot: str | None = None
    address: dict | None = None


@records_router.get("/timeline")
def timeline(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    ip: Annotated[str, Depends(client_ip)],
):
    rows = list(
        db.scalars(
            select(HealthRecord)
            .where(HealthRecord.patient_id == user.id)
            .order_by(HealthRecord.created_at.desc())
        )
    )
    write_audit(
        db,
        actor_id=user.id,
        action="records.access",
        resource_type="timeline",
        resource_id=user.id,
        ip=ip,
    )
    db.commit()
    return {
        "items": [
            {
                "id": r.id,
                "record_type": r.record_type,
                "title": r.title,
                "ref_id": r.ref_id,
                "summary": r.summary,
                "created_at": r.created_at,
            }
            for r in rows
        ]
    }


@records_router.get("/consents")
def list_consents(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]):
    rows = list(db.scalars(select(ConsentArtifact).where(ConsentArtifact.patient_id == user.id)))
    return {
        "items": [
            {
                "id": c.id,
                "purpose": c.purpose,
                "scope": c.scope,
                "status": c.status,
                "granted_at": c.granted_at,
                "revoked_at": c.revoked_at,
            }
            for c in rows
        ]
    }


@records_router.post("/consents", status_code=201)
def create_consent(
    body: ConsentCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    artifact = ConsentArtifact(patient_id=user.id, purpose=body.purpose, scope=body.scope)
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    publish("consent.granted", {"consent_id": artifact.id, "patient_id": user.id})
    return {"id": artifact.id, "status": artifact.status}


@records_router.post("/consents/{consent_id}/revoke")
def revoke_consent(
    consent_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    artifact = db.get(ConsentArtifact, consent_id)
    if not artifact or artifact.patient_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Consent not found")
    artifact.status = "revoked"
    artifact.revoked_at = datetime.now(timezone.utc)
    publish("consent.revoked", {"consent_id": artifact.id, "patient_id": user.id})
    db.commit()
    return {"status": "revoked"}


@notify_router.get("")
def list_notifications(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    cursor: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    unread_only: bool = False,
):
    rows = list(
        db.scalars(
            select(Notification)
            .where(Notification.user_id == user.id, Notification.archived.is_(False))
            .order_by(Notification.created_at.desc())
        )
    )
    if unread_only:
        rows = [n for n in rows if not n.read]
    page = rows[cursor : cursor + limit]
    return {
        "items": [
            {
                "id": n.id,
                "category": n.category,
                "title": n.title,
                "body": n.body,
                "read": n.read,
                "created_at": n.created_at,
            }
            for n in page
        ],
        "next_cursor": cursor + limit if cursor + limit < len(rows) else None,
    }


@notify_router.post("/{notification_id}/read")
def mark_read(
    notification_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    n = db.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Notification not found")
    n.read = True
    db.commit()
    return {"status": "read"}


@notify_router.post("/{notification_id}/archive")
def archive(
    notification_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    n = db.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Notification not found")
    n.archived = True
    db.commit()
    return {"status": "archived"}


@labs_router.get("/tests")
def list_tests(db: Annotated[Session, Depends(get_db)]):
    tests = list(db.scalars(select(LabTest).where(LabTest.published.is_(True))))
    return {
        "items": [
            {
                "id": t.id,
                "code": t.code,
                "name": t.name,
                "description": t.description,
                "price": t.price,
                "home_collection": t.home_collection,
            }
            for t in tests
        ]
    }


@labs_router.post("/bookings", status_code=201)
def book_test(
    body: LabBook,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.PATIENT))],
):
    import json

    test = db.get(LabTest, body.test_id)
    if not test or not test.published:
        raise ApiError(404, "NOT_FOUND", "Test not found")
    booking = TestBooking(
        patient_id=user.id,
        test_id=test.id,
        collection_slot=body.collection_slot,
        address_json=json.dumps(body.address or {}),
        status="booked",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return {"id": booking.id, "status": booking.status}


@labs_router.get("/bookings")
def my_bookings(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]):
    rows = list(db.scalars(select(TestBooking).where(TestBooking.patient_id == user.id)))
    return {
        "items": [
            {
                "id": b.id,
                "test_id": b.test_id,
                "status": b.status,
                "collection_slot": b.collection_slot,
                "created_at": b.created_at,
            }
            for b in rows
        ]
    }


@labs_router.get("/reports/{report_id}")
def get_report(
    report_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    ip: Annotated[str, Depends(client_ip)],
):
    report = db.get(LabReport, report_id)
    if not report or report.patient_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Report not found")
    write_audit(
        db,
        actor_id=user.id,
        action="report.access",
        resource_type="lab_report",
        resource_id=report.id,
        ip=ip,
    )
    db.commit()
    # Signed short-lived URL seam
    return {
        "id": report.id,
        "released_at": report.released_at,
        "signed_url": f"/api/v1/labs/reports/{report.id}/file?sig=dev",
        "expires_in": 300,
    }


@admin_router.get("/dashboard")
def admin_dashboard(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN, Role.ADMIN_PHARMACY, Role.ADMIN_SUPPORT))],
):
    from gwak_api.modules.clinical.models import Appointment, Doctor
    from gwak_api.modules.pharmacy.models import Order, Product

    return {
        "verified_doctors": len(list(db.scalars(select(Doctor).where(Doctor.verification_status == "verified")))),
        "appointments": len(list(db.scalars(select(Appointment)))),
        "orders": len(list(db.scalars(select(Order)))),
        "published_products": len(list(db.scalars(select(Product).where(Product.published.is_(True))))),
        "pending_rx_orders": len(
            list(db.scalars(select(Order).where(Order.status == "rx_verification_pending")))
        ),
    }


@admin_router.get("/audit")
def audit_logs(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN, Role.ADMIN_SUPPORT))],
    limit: int = Query(50, ge=1, le=200),
):
    rows = list(db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)))
    return {
        "items": [
            {
                "id": a.id,
                "actor_id": a.actor_id,
                "action": a.action,
                "resource_type": a.resource_type,
                "resource_id": a.resource_id,
                "ip": a.ip,
                "created_at": a.created_at,
            }
            for a in rows
        ]
    }


@admin_router.get("/compliance/h1-register")
def h1_register(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN, Role.ADMIN_PHARMACY, Role.PHARMACIST))],
):
    from gwak_api.modules.pharmacy.models import Order, OrderItem, Product

    rows = []
    for order in db.scalars(select(Order).where(Order.verified_at.is_not(None))):
        for item in db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)):
            product = db.get(Product, item.product_id)
            if product and product.schedule_tier.upper() == "H1":
                rows.append(
                    {
                        "order_id": order.id,
                        "product": product.name,
                        "qty": item.qty,
                        "pharmacist_id": order.pharmacist_id,
                        "verified_at": order.verified_at,
                    }
                )
    return {"items": rows}


class ProductUpsert(BaseModel):
    sku: str
    name: str
    composition: str | None = None
    manufacturer: str | None = None
    schedule_tier: str = "O"
    rx_required: bool = False
    price: float
    mrp: float
    category: str = "General"


@admin_router.post("/catalog", status_code=201)
def create_product(
    body: ProductUpsert,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.ADMIN, Role.ADMIN_PHARMACY))],
):
    from gwak_api.modules.pharmacy.models import Product

    product = Product(**body.model_dump(), published=False, approval_status="draft")
    db.add(product)
    write_audit(db, actor_id=user.id, action="catalog.create", resource_type="product", resource_id=product.id)
    db.commit()
    db.refresh(product)
    return {"id": product.id, "approval_status": product.approval_status}


@admin_router.post("/catalog/{product_id}/approve")
def approve_product(
    product_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.ADMIN, Role.ADMIN_PHARMACY))],
):
    from gwak_api.modules.pharmacy.models import Product

    product = db.get(Product, product_id)
    if not product:
        raise ApiError(404, "NOT_FOUND", "Product not found")
    product.approval_status = "approved"
    product.published = True
    write_audit(db, actor_id=user.id, action="catalog.approve", resource_type="product", resource_id=product.id)
    db.commit()
    return {"id": product.id, "published": True}
