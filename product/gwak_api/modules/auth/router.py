import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

import pyotp
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from gwak_api.core.audit import write_audit
from gwak_api.core.config import get_settings
from gwak_api.core.db import get_db
from gwak_api.core.errors import ApiError
from gwak_api.core.rbac import Role, client_ip, get_current_user, require_roles
from gwak_api.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from gwak_api.core.timeutils import as_utc, utc_now
from gwak_api.modules.auth.models import (
    AbhaLink,
    FamilyMember,
    OtpChallenge,
    PatientProfile,
    RefreshToken,
    User,
)
from gwak_api.modules.auth.schemas import (
    AbhaLinkRequest,
    FamilyMemberCreate,
    FamilyMemberOut,
    OtpRequest,
    OtpVerify,
    PasswordLogin,
    ProfileUpdate,
    RefreshRequest,
    TokenPair,
    TotpEnableRequest,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _hash_otp(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _issue_tokens(db: Session, user: User) -> TokenPair:
    access = create_access_token(user.id, user.role)
    refresh = create_refresh_token(user.id, user.role)
    payload = decode_token(refresh)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_jti=payload["jti"],
            expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
    )
    db.commit()
    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        role=user.role,
        user_id=user.id,
    )


@router.post("/otp/request")
def request_otp(body: OtpRequest, db: Annotated[Session, Depends(get_db)], ip: Annotated[str, Depends(client_ip)]):
    code = f"{secrets.randbelow(10**6):06d}"
    challenge = OtpChallenge(
        phone=body.phone,
        code_hash=_hash_otp(code),
        purpose=body.purpose,
        expires_at=utc_now() + timedelta(seconds=settings.otp_ttl_seconds),
    )
    db.add(challenge)
    write_audit(db, actor_id=None, action="otp.request", resource_type="otp", ip=ip)
    db.commit()
    resp = {"status": "sent", "expires_in": settings.otp_ttl_seconds}
    if settings.otp_dev_echo and settings.environment != "production":
        resp["dev_code"] = code
    return resp


@router.post("/otp/verify", response_model=TokenPair)
def verify_otp(body: OtpVerify, db: Annotated[Session, Depends(get_db)], ip: Annotated[str, Depends(client_ip)]):
    challenge = db.scalar(
        select(OtpChallenge)
        .where(
            OtpChallenge.phone == body.phone,
            OtpChallenge.purpose == body.purpose,
            OtpChallenge.consumed.is_(False),
        )
        .order_by(OtpChallenge.expires_at.desc())
    )
    if challenge is None or as_utc(challenge.expires_at) < utc_now():
        raise ApiError(400, "OTP_INVALID", "OTP expired or not found")
    if challenge.code_hash != _hash_otp(body.code):
        raise ApiError(400, "OTP_INVALID", "Incorrect OTP")
    challenge.consumed = True
    user = db.scalar(select(User).where(User.phone == body.phone))
    if user is None:
        user = User(phone=body.phone, full_name=body.full_name, role=Role.PATIENT.value)
        db.add(user)
        db.flush()
        db.add(PatientProfile(user_id=user.id))
    write_audit(db, actor_id=user.id, action="otp.verify", resource_type="user", resource_id=user.id, ip=ip)
    return _issue_tokens(db, user)


@router.post("/login", response_model=TokenPair)
def password_login(body: PasswordLogin, db: Annotated[Session, Depends(get_db)], ip: Annotated[str, Depends(client_ip)]):
    user = db.scalar(select(User).where(User.email == body.email))
    if user is None or not user.password_hash or not verify_password(body.password, user.password_hash):
        write_audit(db, actor_id=None, action="auth.failed", resource_type="user", ip=ip)
        db.commit()
        raise ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password")
    if user.role.startswith("admin") and user.totp_enabled:
        if not body.totp_code or not user.totp_secret:
            raise ApiError(401, "TOTP_REQUIRED", "Two-factor authentication required")
        if not pyotp.TOTP(user.totp_secret).verify(body.totp_code, valid_window=1):
            raise ApiError(401, "TOTP_INVALID", "Invalid authenticator code")
    write_audit(db, actor_id=user.id, action="auth.login", resource_type="user", resource_id=user.id, ip=ip)
    return _issue_tokens(db, user)


@router.post("/refresh", response_model=TokenPair)
def refresh(body: RefreshRequest, db: Annotated[Session, Depends(get_db)]):
    try:
        payload = decode_token(body.refresh_token)
    except ValueError as exc:
        raise ApiError(401, "UNAUTHORIZED", str(exc)) from exc
    if payload.get("type") != "refresh":
        raise ApiError(401, "UNAUTHORIZED", "Refresh token required")
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_jti == payload["jti"]))
    if stored is None or stored.revoked:
        raise ApiError(401, "UNAUTHORIZED", "Refresh token revoked")
    user = db.get(User, payload["sub"])
    if user is None:
        raise ApiError(401, "UNAUTHORIZED", "User not found")
    stored.revoked = True
    return _issue_tokens(db, user)


@router.post("/logout")
def logout(
    body: RefreshRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    try:
        payload = decode_token(body.refresh_token)
        stored = db.scalar(select(RefreshToken).where(RefreshToken.token_jti == payload["jti"]))
        if stored:
            stored.revoked = True
            db.commit()
    except ValueError:
        pass
    return {"status": "ok"}


@router.get("/me", response_model=UserOut)
def me(user: Annotated[User, Depends(get_current_user)]):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    body: ProfileUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.email is not None:
        user.email = body.email
    if body.language is not None:
        user.language = body.language
    profile = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if profile is None:
        profile = PatientProfile(user_id=user.id)
        db.add(profile)
    if body.dob is not None:
        profile.dob = body.dob
    if body.gender is not None:
        profile.gender = body.gender
    if body.allergies is not None:
        profile.allergies = body.allergies
    if body.chronic_conditions is not None:
        profile.chronic_conditions = body.chronic_conditions
    db.commit()
    db.refresh(user)
    return user


@router.post("/abha/link")
def link_abha(
    body: AbhaLinkRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    ip: Annotated[str, Depends(client_ip)],
):
    existing = db.scalar(select(AbhaLink).where(AbhaLink.abha_id == body.abha_id))
    if existing and existing.user_id != user.id:
        raise ApiError(409, "ABHA_IN_USE", "ABHA ID already linked to another account")
    link = db.scalar(select(AbhaLink).where(AbhaLink.user_id == user.id))
    if link is None:
        link = AbhaLink(user_id=user.id, abha_id=body.abha_id)
        db.add(link)
    else:
        link.abha_id = body.abha_id
    link.verified_at = utc_now()
    link.status = "verified"
    user.abha_id = body.abha_id
    write_audit(
        db,
        actor_id=user.id,
        action="abha.link",
        resource_type="abha",
        resource_id=body.abha_id,
        ip=ip,
    )
    db.commit()
    return {"status": "linked", "abha_id": body.abha_id, "milestone": "M1"}


@router.post("/2fa/setup")
def setup_2fa(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.ADMIN, Role.ADMIN_PHARMACY, Role.ADMIN_CONTENT, Role.ADMIN_SUPPORT))],
):
    secret = pyotp.random_base32()
    user.totp_secret = secret
    user.totp_enabled = False
    db.commit()
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email or user.phone, issuer_name="GWAK Admin")
    return {"secret": secret, "otpauth_uri": uri}


@router.post("/2fa/enable")
def enable_2fa(
    body: TotpEnableRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.ADMIN, Role.ADMIN_PHARMACY, Role.ADMIN_CONTENT, Role.ADMIN_SUPPORT))],
):
    if not user.totp_secret or not pyotp.TOTP(user.totp_secret).verify(body.code, valid_window=1):
        raise ApiError(400, "TOTP_INVALID", "Invalid authenticator code")
    user.totp_enabled = True
    db.commit()
    return {"status": "enabled"}


@router.get("/family", response_model=list[FamilyMemberOut])
def list_family(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]):
    return list(db.scalars(select(FamilyMember).where(FamilyMember.owner_user_id == user.id)))


@router.post("/family", response_model=FamilyMemberOut, status_code=201)
def add_family(
    body: FamilyMemberCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    member = FamilyMember(owner_user_id=user.id, **body.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.post("/bootstrap-admin", include_in_schema=False)
def bootstrap_admin(db: Annotated[Session, Depends(get_db)]):
    """Dev-only helper to create an admin if none exists."""
    if settings.environment == "production":
        raise ApiError(404, "NOT_FOUND", "Not found")
    existing = db.scalar(select(User).where(User.role == Role.ADMIN.value))
    if existing:
        return {"status": "exists", "email": existing.email}
    user = User(
        phone="+910000000000",
        email="admin@gwak.health",
        full_name="GWAK Admin",
        role=Role.ADMIN.value,
        password_hash=hash_password("ChangeMeAdmin1!"),
    )
    db.add(user)
    db.commit()
    return {"status": "created", "email": user.email, "password": "ChangeMeAdmin1!"}
