from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.schemas.auth import LoginRequest, RegisterRequest, RefreshTokenRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest
from backend.schemas.user import UserResponse
from backend.services.auth_service import AuthService
from backend.auth.dependencies import get_current_user
from backend.models.user import User
from backend.utils.response import api_response

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    result = service.login(req)
    return api_response(
        success=True,
        message="Login successful",
        data={
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": result.token_type,
            "user": result.user
        }
    )

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    result = service.register(req)
    return api_response(
        success=True,
        message="Registration successful",
        data={
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": result.token_type,
            "user": result.user
        },
        status_code=201
    )

@router.post("/refresh")
def refresh(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    result = service.refresh(req.refresh_token)
    return api_response(
        success=True,
        message="Token refreshed",
        data={
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": result.token_type,
            "user": result.user
        }
    )

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    token = service.request_password_reset(req.email)
    return api_response(
        success=True,
        message="Password reset instructions have been generated.",
        data={"reset_token": token}
    )

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    service.reset_password(req.token, req.new_password)
    return api_response(
        success=True,
        message="Password has been reset successfully. You can now log in.",
        data={}
    )

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return api_response(
        success=True,
        message="Current user retrieved",
        data={
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "phone_number": current_user.phone_number,
            "role": current_user.role_rel.name,
            "is_active": current_user.is_active,
            "avatar_url": current_user.avatar_url
        }
    )

