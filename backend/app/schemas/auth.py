from pydantic import BaseModel, EmailStr, ConfigDict
from app.schemas.user import UserMinimal


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserMinimal

    model_config = ConfigDict(from_attributes=True)
