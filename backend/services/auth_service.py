from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.repositories.user_repository import UserRepository
from backend.models.user import User
from backend.auth.jwt import verify_password, hash_password, create_access_token, create_refresh_token, decode_refresh_token
from backend.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

class AuthService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)

    def login(self, req: LoginRequest) -> TokenResponse:
        user = self.user_repo.get_by_email(req.email)
        if not user or not verify_password(req.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated"
            )

        token_data = {
            "sub": user.id,
            "email": user.email,
            "role": user.role_rel.name
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"sub": user.id})

        user_info = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role_rel.name,
            "avatar_url": user.avatar_url
        }

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_info
        )

    def register(self, req: RegisterRequest) -> TokenResponse:
        existing = self.user_repo.get_by_email(req.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already registered"
            )

        role_name = req.role or "Citizen"
        role = self.user_repo.get_role_by_name(role_name)
        if not role:
            role = self.user_repo.db.query(Role).filter(Role.name.ilike(f"%{role_name}%")).first()
        if not role:
            role = self.user_repo.get_role_by_name("Citizen")

        new_user = User(
            email=req.email,
            hashed_password=hash_password(req.password),
            full_name=req.full_name,
            phone_number=req.phone_number,
            role_id=role.id,
            is_active=True
        )

        created_user = self.user_repo.create(new_user)
        return self.login(LoginRequest(email=req.email, password=req.password))

    def refresh(self, refresh_token: str) -> TokenResponse:
        payload = decode_refresh_token(refresh_token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
            
        user_id = payload.get("sub")
        user = self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )

        token_data = {
            "sub": user.id,
            "email": user.email,
            "role": user.role_rel.name
        }

        access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token({"sub": user.id})

        user_info = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role_rel.name,
            "avatar_url": user.avatar_url
        }

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            user=user_info
        )

    def request_password_reset(self, email: str) -> str:
        import secrets
        from datetime import datetime, timedelta
        from backend.models.user import PasswordResetToken

        user = self.user_repo.get_by_email(email)
        if not user:
            # Return pseudo token for security
            return secrets.token_urlsafe(16)

        token_str = secrets.token_urlsafe(16)
        token_obj = PasswordResetToken(
            email=email,
            token=token_str,
            expires_at=datetime.utcnow() + timedelta(hours=1),
            is_used=False
        )
        self.user_repo.db.add(token_obj)
        self.user_repo.db.commit()
        return token_str

    def reset_password(self, token: str, new_password: str) -> bool:
        from datetime import datetime
        from backend.models.user import PasswordResetToken

        token_obj = self.user_repo.db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token,
            PasswordResetToken.is_used == False,
            PasswordResetToken.expires_at > datetime.utcnow()
        ).first()

        if not token_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )

        user = self.user_repo.get_by_email(token_obj.email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.hashed_password = hash_password(new_password)
        token_obj.is_used = True
        self.user_repo.db.commit()
        return True

