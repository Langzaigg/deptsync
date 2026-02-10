from pydantic import BaseModel


class LoginRequest(BaseModel):
    job_number: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    job_number: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    role: str
