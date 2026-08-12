from collections.abc import Callable
from enum import Enum
from typing import Annotated

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from gwak_api.core.db import get_db
from gwak_api.core.errors import ApiError
from gwak_api.core.security import decode_token
from gwak_api.modules.auth.models import User

bearer = HTTPBearer(auto_error=False)


class Role(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    PHARMACIST = "pharmacist"
    DELIVERY = "delivery"
    ADMIN = "admin"
    ADMIN_PHARMACY = "admin_pharmacy"
    ADMIN_CONTENT = "admin_content"
    ADMIN_SUPPORT = "admin_support"


ADMIN_ROLES = {
    Role.ADMIN,
    Role.ADMIN_PHARMACY,
    Role.ADMIN_CONTENT,
    Role.ADMIN_SUPPORT,
}


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None:
        raise ApiError(401, "UNAUTHORIZED", "Authentication required")
    try:
        payload = decode_token(credentials.credentials)
    except ValueError as exc:
        raise ApiError(401, "UNAUTHORIZED", str(exc)) from exc
    if payload.get("type") != "access":
        raise ApiError(401, "UNAUTHORIZED", "Access token required")
    user = db.get(User, payload["sub"])
    if user is None or user.status != "active":
        raise ApiError(401, "UNAUTHORIZED", "User not found or inactive")
    return user


def require_roles(*roles: Role) -> Callable:
    allowed = {r.value for r in roles}

    def _dep(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in allowed:
            raise ApiError(403, "FORBIDDEN", "Insufficient permissions")
        return user

    return _dep


def optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User | None:
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except ApiError:
        return None


def client_ip(x_forwarded_for: Annotated[str | None, Header()] = None) -> str:
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return "unknown"
