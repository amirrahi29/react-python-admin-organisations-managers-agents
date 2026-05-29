from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.utils.validation import normalize_email, validate_login_password, validate_new_password


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_login_email(cls, value: object) -> str:
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def validate_login_password_field(cls, value: str) -> str:
        return validate_login_password(value)


class AgentLoginRequest(LoginRequest):
    pass


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_register_email(cls, value: object) -> str:
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def validate_register_password(cls, value: str) -> str:
        return validate_new_password(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class AdminResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    phone: str | None = None
    job_title: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    job_title: str | None = Field(default=None, max_length=120)

    @field_validator("phone", "job_title", mode="before")
    @classmethod
    def empty_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("current_password")
    @classmethod
    def validate_current(cls, value: str) -> str:
        return validate_login_password(value)

    @field_validator("new_password")
    @classmethod
    def validate_new(cls, value: str) -> str:
        return validate_new_password(value)

    @model_validator(mode="after")
    def check_passwords(self) -> "ChangePasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("New passwords do not match")
        if self.new_password == self.current_password:
            raise ValueError("New password must be different from your current password")
        return self


class MessageResponse(BaseModel):
    message: str


class RoleHierarchyMember(BaseModel):
    role: str
    name: str
    email: EmailStr


class OrganizationSessionResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime
    updated_at: datetime
    admin: RoleHierarchyMember


class ManagerSessionResponse(BaseModel):
    account_id: str
    email: EmailStr
    name: str
    phone: str | None = None
    job_title: str | None = None
    created_at: datetime
    updated_at: datetime
    admin: RoleHierarchyMember
    organization: RoleHierarchyMember


class AgentSessionResponse(BaseModel):
    account_id: str
    email: EmailStr
    name: str
    phone: str | None = None
    job_title: str | None = None
    created_at: datetime
    updated_at: datetime
    admin: RoleHierarchyMember
    organization: RoleHierarchyMember
    manager: RoleHierarchyMember
