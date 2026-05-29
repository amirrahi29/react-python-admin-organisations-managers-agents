from pydantic import BaseModel, EmailStr, Field, field_validator

from app.utils.account_ref import parse_account_ref
from app.utils.names import validate_first_name, validate_last_name
from app.utils.validation import normalize_email, validate_new_password


class ActorInfo(BaseModel):
    name: str
    email: EmailStr

    model_config = {"from_attributes": True}


def _strip_required(value: object, *, field_name: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field_name} is required")
    stripped = value.strip()
    if not stripped:
        raise ValueError(f"{field_name} is required")
    return stripped


def _validate_manager_account_id(value: str) -> str:
    role, _ = parse_account_ref(value)
    if role != "manager":
        raise ValueError("Invalid manager account ID")
    return value.strip().upper()


class ManagerCreateRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=60)
    last_name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str = Field(min_length=7, max_length=20)
    job_title: str = Field(min_length=1, max_length=120)
    organization_id: int = Field(gt=0, description="Required — organization ID")

    @field_validator("first_name", mode="before")
    @classmethod
    def normalize_first_name(cls, value: object) -> str:
        return validate_first_name(value)

    @field_validator("last_name", mode="before")
    @classmethod
    def normalize_last_name(cls, value: object) -> str:
        return validate_last_name(value)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_manager_email(cls, value: object) -> str:
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def validate_manager_password(cls, value: str) -> str:
        return validate_new_password(value)

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: object) -> str:
        phone = _strip_required(value, field_name="Phone")
        if len(phone) < 7:
            raise ValueError("Phone must be at least 7 characters")
        return phone

    @field_validator("job_title", mode="before")
    @classmethod
    def validate_job_title(cls, value: object) -> str:
        return _strip_required(value, field_name="Job title")


class AgentCreateRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=60)
    last_name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str = Field(min_length=7, max_length=20)
    job_title: str = Field(min_length=1, max_length=120)
    manager_account_id: str = Field(
        min_length=12,
        max_length=12,
        description="Required — manager account reference (e.g. AVM-00000001)",
    )

    @field_validator("first_name", mode="before")
    @classmethod
    def normalize_first_name(cls, value: object) -> str:
        return validate_first_name(value)

    @field_validator("last_name", mode="before")
    @classmethod
    def normalize_last_name(cls, value: object) -> str:
        return validate_last_name(value)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_agent_email(cls, value: object) -> str:
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def validate_agent_password(cls, value: str) -> str:
        return validate_new_password(value)

    @field_validator("manager_account_id")
    @classmethod
    def validate_manager_account_id(cls, value: str) -> str:
        return _validate_manager_account_id(value)

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: object) -> str:
        phone = _strip_required(value, field_name="Phone")
        if len(phone) < 7:
            raise ValueError("Phone must be at least 7 characters")
        return phone

    @field_validator("job_title", mode="before")
    @classmethod
    def validate_job_title(cls, value: object) -> str:
        return _strip_required(value, field_name="Job title")


class ManagerUpdateRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=60)
    last_name: str = Field(min_length=2, max_length=60)
    phone: str = Field(min_length=7, max_length=20)
    job_title: str = Field(min_length=1, max_length=120)

    @field_validator("first_name", mode="before")
    @classmethod
    def normalize_first_name(cls, value: object) -> str:
        return validate_first_name(value)

    @field_validator("last_name", mode="before")
    @classmethod
    def normalize_last_name(cls, value: object) -> str:
        return validate_last_name(value)

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: object) -> str:
        phone = _strip_required(value, field_name="Phone")
        if len(phone) < 7:
            raise ValueError("Phone must be at least 7 characters")
        return phone

    @field_validator("job_title", mode="before")
    @classmethod
    def validate_job_title(cls, value: object) -> str:
        return _strip_required(value, field_name="Job title")


class AgentUpdateRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=60)
    last_name: str = Field(min_length=2, max_length=60)
    phone: str = Field(min_length=7, max_length=20)
    job_title: str = Field(min_length=1, max_length=120)
    manager_account_id: str = Field(min_length=12, max_length=12)

    @field_validator("first_name", mode="before")
    @classmethod
    def normalize_first_name(cls, value: object) -> str:
        return validate_first_name(value)

    @field_validator("last_name", mode="before")
    @classmethod
    def normalize_last_name(cls, value: object) -> str:
        return validate_last_name(value)

    @field_validator("manager_account_id")
    @classmethod
    def validate_manager_account_id(cls, value: str) -> str:
        return _validate_manager_account_id(value)

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: object) -> str:
        phone = _strip_required(value, field_name="Phone")
        if len(phone) < 7:
            raise ValueError("Phone must be at least 7 characters")
        return phone

    @field_validator("job_title", mode="before")
    @classmethod
    def validate_job_title(cls, value: object) -> str:
        return _strip_required(value, field_name="Job title")


class StatusUpdateRequest(BaseModel):
    is_active: bool


class ManagerAgentCreateRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=60)
    last_name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str = Field(min_length=7, max_length=20)
    job_title: str = Field(min_length=1, max_length=120)

    @field_validator("first_name", mode="before")
    @classmethod
    def normalize_first_name(cls, value: object) -> str:
        return validate_first_name(value)

    @field_validator("last_name", mode="before")
    @classmethod
    def normalize_last_name(cls, value: object) -> str:
        return validate_last_name(value)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_manager_agent_email(cls, value: object) -> str:
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def validate_manager_agent_password(cls, value: str) -> str:
        return validate_new_password(value)

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: object) -> str:
        phone = _strip_required(value, field_name="Phone")
        if len(phone) < 7:
            raise ValueError("Phone must be at least 7 characters")
        return phone

    @field_validator("job_title", mode="before")
    @classmethod
    def validate_job_title(cls, value: object) -> str:
        return _strip_required(value, field_name="Job title")


class ManagerAgentUpdateRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=60)
    last_name: str = Field(min_length=2, max_length=60)
    phone: str = Field(min_length=7, max_length=20)
    job_title: str = Field(min_length=1, max_length=120)

    @field_validator("first_name", mode="before")
    @classmethod
    def normalize_first_name(cls, value: object) -> str:
        return validate_first_name(value)

    @field_validator("last_name", mode="before")
    @classmethod
    def normalize_last_name(cls, value: object) -> str:
        return validate_last_name(value)

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: object) -> str:
        phone = _strip_required(value, field_name="Phone")
        if len(phone) < 7:
            raise ValueError("Phone must be at least 7 characters")
        return phone

    @field_validator("job_title", mode="before")
    @classmethod
    def validate_job_title(cls, value: object) -> str:
        return _strip_required(value, field_name="Job title")


class ManagerScopedAgentResponse(BaseModel):
    account_id: str
    email: EmailStr
    name: str
    phone: str | None = None
    job_title: str | None = None
    is_active: int
    created_at: str
    updated_at: str
    created_by: str
    manager: ActorInfo

    model_config = {"from_attributes": True}


class ManagerResponse(BaseModel):
    account_id: str
    email: EmailStr
    name: str
    phone: str | None = None
    job_title: str | None = None
    organization_id: int
    organization_name: str
    is_active: int
    agent_count: int = 0
    created_at: str
    updated_at: str
    created_by: str

    model_config = {"from_attributes": True}


class AgentResponse(BaseModel):
    account_id: str
    email: EmailStr
    name: str
    phone: str | None = None
    job_title: str | None = None
    organization_id: int | None = None
    organization_name: str | None = None
    is_active: int
    created_at: str
    updated_at: str
    created_by: str
    manager: ActorInfo

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    message: str


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class PaginatedManagersResponse(BaseModel):
    items: list[ManagerResponse]
    pagination: PaginationMeta


class PaginatedAgentsResponse(BaseModel):
    items: list[AgentResponse]
    pagination: PaginationMeta
