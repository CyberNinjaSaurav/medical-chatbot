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
from gwak_api.modules.clinical.models import Prescription, PrescriptionItem
from gwak_api.modules.pharmacy.models import (
    Inventory,
    Order,
    OrderItem,
    Payment,
    Product,
    Subscription,
)
from gwak_api.modules.records.models import Notification

router = APIRouter(tags=["commerce"])

RX_FLOW_STATUSES = {
    "created",
    "payment_pending",
    "paid",
    "rx_verification_pending",
    "verified",
    "packed",
    "dispatched",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "refunded",
    "rx_rejected",
}

ALLOWED_TRANSITIONS = {
    "created": {"payment_pending", "cancelled"},
    "payment_pending": {"paid", "cancelled"},
    "paid": {"rx_verification_pending", "verified", "cancelled"},  # OTC can skip to verified path via helper
    "rx_verification_pending": {"verified", "rx_rejected"},
    "verified": {"packed", "cancelled"},
    "packed": {"dispatched"},
    "dispatched": {"out_for_delivery"},
    "out_for_delivery": {"delivered"},
}


class ProductOut(BaseModel):
    id: str
    sku: str
    name: str
    composition: str | None
    manufacturer: str | None
    schedule_tier: str
    rx_required: bool
    price: float
    mrp: float
    category: str

    model_config = {"from_attributes": True}


class CartItemIn(BaseModel):
    product_id: str
    qty: int = Field(ge=1, le=30)


class CreateOrder(BaseModel):
    items: list[CartItemIn] = Field(min_length=1)
    address: dict
    prescription_id: str | None = None
    delivery_slot: str | None = None


class VerifyOrder(BaseModel):
    note: str | None = None


class RejectOrder(BaseModel):
    reason: str


class SubscriptionCreate(BaseModel):
    product_id: str
    cadence_days: int = 30
    next_refill_at: str | None = None


def _transition(order: Order, new_status: str) -> None:
    allowed = ALLOWED_TRANSITIONS.get(order.status, set())
    if new_status not in allowed and new_status not in {"refunded"}:
        raise ApiError(
            409,
            "INVALID_STATE",
            f"Cannot transition from {order.status} to {new_status}",
        )
    order.status = new_status


@router.get("/products", response_model=dict)
def list_products(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: str | None = None,
    cursor: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
):
    products = list(db.scalars(select(Product).where(Product.published.is_(True), Product.approval_status == "approved")))
    if q:
        ql = q.lower()
        products = [p for p in products if ql in p.name.lower() or ql in (p.composition or "").lower()]
    if category:
        products = [p for p in products if p.category.lower() == category.lower()]
    page = products[cursor : cursor + limit]
    return {
        "items": [ProductOut.model_validate(p) for p in page],
        "next_cursor": cursor + limit if cursor + limit < len(products) else None,
        "total": len(products),
    }


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: str, db: Annotated[Session, Depends(get_db)]):
    product = db.get(Product, product_id)
    if not product or not product.published:
        raise ApiError(404, "NOT_FOUND", "Product not found")
    return product


@router.post("/orders", status_code=201)
def create_order(
    body: CreateOrder,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.PATIENT))],
):
    lines: list[tuple[Product, int]] = []
    total = 0.0
    needs_rx = False
    for item in body.items:
        product = db.get(Product, item.product_id)
        if not product or not product.published:
            raise ApiError(404, "NOT_FOUND", f"Product {item.product_id} not found")
        if product.rx_required:
            needs_rx = True
        lines.append((product, item.qty))
        total += product.price * item.qty

    if needs_rx and not body.prescription_id:
        raise ApiError(422, "PRESCRIPTION_REQUIRED", "A valid prescription is required for Schedule H/H1 items")

    if body.prescription_id:
        rx = db.get(Prescription, body.prescription_id)
        if not rx or rx.patient_id != user.id:
            raise ApiError(404, "NOT_FOUND", "Prescription not found")

    order = Order(
        patient_id=user.id,
        prescription_id=body.prescription_id,
        status="payment_pending",
        address_json=json.dumps({**body.address, "delivery_slot": body.delivery_slot}),
        total=round(total, 2),
        tracking_code=f"GWAK{uuid4().hex[:10].upper()}",
    )
    db.add(order)
    db.flush()
    for product, qty in lines:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                name=product.name,
                qty=qty,
                unit_price=product.price,
                rx_required=product.rx_required,
            )
        )
    publish("order.placed", {"order_id": order.id, "patient_id": user.id, "total": order.total}, idempotency_key=order.id)
    db.add(
        Notification(
            user_id=user.id,
            category="order",
            title="Order placed",
            body=f"Your order {order.tracking_code} is awaiting payment.",
        )
    )
    db.commit()
    return {"id": order.id, "status": order.status, "total": order.total, "tracking_code": order.tracking_code}


@router.post("/orders/{order_id}/pay")
def pay_order(
    order_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.PATIENT))],
):
    order = db.get(Order, order_id)
    if not order or order.patient_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Order not found")
    _transition(order, "paid")
    payment = Payment(order_id=order.id, amount=order.total, status="confirmed", provider_ref=f"sim_{uuid4().hex[:12]}")
    db.add(payment)
    items = list(db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)))
    if any(i.rx_required for i in items):
        _transition(order, "rx_verification_pending")
        publish("rx.verification.requested", {"order_id": order.id}, idempotency_key=f"rxreq-{order.id}")
    else:
        # OTC path still goes through verified without pharmacist identity, but status machine requires verified
        order.status = "verified"
        order.verified_at = datetime.now(timezone.utc)
    publish("payment.confirmed", {"order_id": order.id}, idempotency_key=payment.id)
    db.commit()
    return {"status": order.status, "payment_id": payment.id}


@router.get("/orders")
def list_orders(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]):
    if user.role in {Role.PHARMACIST.value, Role.ADMIN.value, Role.ADMIN_PHARMACY.value}:
        orders = list(db.scalars(select(Order)))
    elif user.role == Role.DELIVERY.value:
        orders = list(
            db.scalars(
                select(Order).where(Order.status.in_(["dispatched", "out_for_delivery", "packed"]))
            )
        )
    else:
        orders = list(db.scalars(select(Order).where(Order.patient_id == user.id)))
    return {
        "items": [
            {
                "id": o.id,
                "status": o.status,
                "total": o.total,
                "tracking_code": o.tracking_code,
                "prescription_id": o.prescription_id,
                "verified_at": o.verified_at,
                "created_at": o.created_at,
            }
            for o in orders
        ]
    }


@router.get("/orders/{order_id}")
def get_order(order_id: str, db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]):
    order = db.get(Order, order_id)
    if not order:
        raise ApiError(404, "NOT_FOUND", "Order not found")
    if user.role == Role.PATIENT.value and order.patient_id != user.id:
        raise ApiError(403, "FORBIDDEN", "Not your order")
    items = list(db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)))
    return {
        "id": order.id,
        "status": order.status,
        "total": order.total,
        "tracking_code": order.tracking_code,
        "address": json.loads(order.address_json or "{}"),
        "prescription_id": order.prescription_id,
        "pharmacist_note": order.pharmacist_note,
        "verified_at": order.verified_at,
        "items": [
            {
                "id": i.id,
                "product_id": i.product_id,
                "name": i.name,
                "qty": i.qty,
                "unit_price": i.unit_price,
                "rx_required": i.rx_required,
            }
            for i in items
        ],
    }


@router.get("/orders/{order_id}/tracking")
def track_order(order_id: str, db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]):
    order = db.get(Order, order_id)
    if not order:
        raise ApiError(404, "NOT_FOUND", "Order not found")
    if user.role == Role.PATIENT.value and order.patient_id != user.id:
        raise ApiError(403, "FORBIDDEN", "Not your order")
    return {
        "order_id": order.id,
        "tracking_code": order.tracking_code,
        "status": order.status,
        "timeline": [
            s
            for s in [
                "created",
                "payment_pending",
                "paid",
                "rx_verification_pending",
                "verified",
                "packed",
                "dispatched",
                "out_for_delivery",
                "delivered",
            ]
            if True
        ],
        "current": order.status,
    }


@router.post("/orders/{order_id}/pharmacist/verify")
def pharmacist_verify(
    order_id: str,
    body: VerifyOrder,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.PHARMACIST, Role.ADMIN_PHARMACY, Role.ADMIN))],
    ip: Annotated[str, Depends(client_ip)],
):
    order = db.get(Order, order_id)
    if not order:
        raise ApiError(404, "NOT_FOUND", "Order not found")
    if order.status != "rx_verification_pending":
        raise ApiError(409, "INVALID_STATE", "Order is not awaiting pharmacist verification")
    items = list(db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)))
    if any(i.rx_required for i in items) and order.status != "rx_verification_pending":
        raise ApiError(409, "INVALID_STATE", "Verification required")
    # Reserve stock
    for item in items:
        inv = db.scalar(select(Inventory).where(Inventory.product_id == item.product_id))
        if inv is None or inv.qty < item.qty:
            publish("stock.unavailable", {"order_id": order.id, "product_id": item.product_id})
            order.status = "refunded"
            db.commit()
            raise ApiError(409, "STOCK_UNAVAILABLE", f"Insufficient stock for {item.name}")
        inv.qty -= item.qty
    order.pharmacist_id = user.id
    order.pharmacist_note = body.note
    order.verified_at = datetime.now(timezone.utc)
    _transition(order, "verified")
    write_audit(
        db,
        actor_id=user.id,
        action="pharmacist.verify",
        resource_type="order",
        resource_id=order.id,
        ip=ip,
        metadata_json=json.dumps({"note": body.note}),
    )
    publish("order.ready", {"order_id": order.id}, idempotency_key=f"ready-{order.id}")
    db.add(
        Notification(
            user_id=order.patient_id,
            category="order",
            title="Prescription verified",
            body=f"Order {order.tracking_code} was verified by a registered pharmacist.",
        )
    )
    db.commit()
    return {"status": order.status, "verified_at": order.verified_at}


@router.post("/orders/{order_id}/pharmacist/reject")
def pharmacist_reject(
    order_id: str,
    body: RejectOrder,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.PHARMACIST, Role.ADMIN_PHARMACY, Role.ADMIN))],
    ip: Annotated[str, Depends(client_ip)],
):
    order = db.get(Order, order_id)
    if not order:
        raise ApiError(404, "NOT_FOUND", "Order not found")
    if order.status != "rx_verification_pending":
        raise ApiError(409, "INVALID_STATE", "Order is not awaiting pharmacist verification")
    order.status = "rx_rejected"
    order.pharmacist_id = user.id
    order.pharmacist_note = body.reason
    write_audit(
        db,
        actor_id=user.id,
        action="pharmacist.reject",
        resource_type="order",
        resource_id=order.id,
        ip=ip,
        metadata_json=json.dumps({"reason": body.reason}),
    )
    publish("rx.rejected", {"order_id": order.id, "reason": body.reason}, idempotency_key=f"rej-{order.id}")
    # Compensating refund
    order.status = "refunded"
    db.add(
        Notification(
            user_id=order.patient_id,
            category="order",
            title="Prescription rejected",
            body=f"Order {order.tracking_code} was rejected: {body.reason}. Refund initiated.",
        )
    )
    db.commit()
    return {"status": order.status, "reason": body.reason}


@router.post("/orders/{order_id}/advance")
def advance_order(
    order_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.PHARMACIST, Role.DELIVERY, Role.ADMIN, Role.ADMIN_PHARMACY))],
):
    order = db.get(Order, order_id)
    if not order:
        raise ApiError(404, "NOT_FOUND", "Order not found")
    sequence = ["verified", "packed", "dispatched", "out_for_delivery", "delivered"]
    if order.status not in sequence[:-1]:
        raise ApiError(409, "INVALID_STATE", f"Cannot advance from {order.status}")
    nxt = sequence[sequence.index(order.status) + 1]
    _transition(order, nxt)
    if nxt == "out_for_delivery":
        publish("out.for.delivery", {"order_id": order.id})
    if nxt == "delivered":
        publish("delivered", {"order_id": order.id})
    db.commit()
    return {"status": order.status}


class OrderFromRx(BaseModel):
    address: dict
    delivery_slot: str | None = None


@router.post("/orders/from-prescription/{prescription_id}", status_code=201)
def order_from_prescription(
    prescription_id: str,
    body: OrderFromRx,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.PATIENT))],
):
    rx = db.get(Prescription, prescription_id)
    if not rx or rx.patient_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Prescription not found")
    items = list(db.scalars(select(PrescriptionItem).where(PrescriptionItem.prescription_id == rx.id)))
    cart: list[CartItemIn] = []
    for item in items:
        if item.product_id:
            cart.append(CartItemIn(product_id=item.product_id, qty=1))
    if not cart:
        raise ApiError(422, "NO_LINKED_PRODUCTS", "Prescription items are not linked to catalog products")
    return create_order(
        CreateOrder(
            items=cart,
            address=body.address,
            prescription_id=prescription_id,
            delivery_slot=body.delivery_slot,
        ),
        db,
        user,
    )


@router.get("/subscriptions")
def list_subscriptions(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]):
    subs = list(db.scalars(select(Subscription).where(Subscription.patient_id == user.id)))
    return {
        "items": [
            {
                "id": s.id,
                "product_id": s.product_id,
                "cadence_days": s.cadence_days,
                "status": s.status,
                "next_refill_at": s.next_refill_at,
            }
            for s in subs
        ]
    }


@router.post("/subscriptions", status_code=201)
def create_subscription(
    body: SubscriptionCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.PATIENT))],
):
    product = db.get(Product, body.product_id)
    if not product:
        raise ApiError(404, "NOT_FOUND", "Product not found")
    sub = Subscription(
        patient_id=user.id,
        product_id=body.product_id,
        cadence_days=body.cadence_days,
        next_refill_at=body.next_refill_at,
        status="active",
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"id": sub.id, "status": sub.status, "cadence_days": sub.cadence_days}
