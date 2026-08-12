from datetime import datetime
from pydantic import BaseModel, Field


class OtpRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15)
    purpose: str = "login"


class OtpVerify(BaseModel):
    phone: str
    code: str = Field(min_length=4, max_length=8)
    purpose: str = "login"
    full_name: str | None = None


class PasswordLogin(BaseModel):
    email: str
    password: str
    totp_code: str | None = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AbhaLinkRequest(BaseModel):
    abha_id: str = Field(min_length=14, max_length=14, pattern=r"^\d{14}$")


class UserOut(BaseModel):
    id: str
    phone: str
    email: str | None
    role: str
    full_name: str | None
    abha_id: str | None
    language: str
    totp_enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    language: str | None = None
    dob: str | None = None
    gender: str | None = None
    allergies: str | None = None
    chronic_conditions: str | None = None


class FamilyMemberCreate(BaseModel):
    full_name: str
    relation: str
    dob: str | None = None


class FamilyMemberOut(BaseModel):
    id: str
    full_name: str
    relation: str
    dob: str | None

    model_config = {"from_attributes": True}


class TotpEnableRequest(BaseModel):
    code: str
