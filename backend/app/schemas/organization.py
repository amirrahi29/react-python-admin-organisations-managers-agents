from pydantic import BaseModel, EmailStr, Field, field_validator

from app.utils.validation import normalize_email, validate_new_password


class OrganizationCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: object) -> str:
        if not isinstance(value, str):
            raise ValueError("Organization name is required")
        stripped = value.strip()
        if len(stripped) < 2:
            raise ValueError("Organization name must be at least 2 characters")
        return stripped

    @field_validator("email", mode="before")
    @classmethod
    def normalize_org_email(cls, value: object) -> str:
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def validate_org_password(cls, value: str) -> str:
        return validate_new_password(value)


class OrganizationUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: object) -> str:
        if not isinstance(value, str):
            raise ValueError("Organization name is required")
        stripped = value.strip()
        if len(stripped) < 2:
            raise ValueError("Organization name must be at least 2 characters")
        return stripped


class StatusUpdateRequest(BaseModel):
    is_active: bool


class OrganizationResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: int
    manager_count: int = 0
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class PaginatedOrganizationsResponse(BaseModel):
    items: list[OrganizationResponse]
    pagination: dict
