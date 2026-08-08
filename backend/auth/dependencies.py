from fastapi import Depends, HTTPException, WebSocket, status, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from backend.database.session import get_db
from backend.auth.jwt import decode_access_token
from backend.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).options(joinedload(User.role_rel)).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception

    return user


def require_roles(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        role_name = current_user.role_rel.name if (current_user and current_user.role_rel) else ""
        user_role = role_name.lower()
        allowed = [r.lower() for r in allowed_roles]
        if user_role not in allowed and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{role_name}'"
            )
        return current_user
    return role_checker



async def get_ws_current_user(websocket: WebSocket):
    """
    Authenticate a WebSocket connection using a JWT token from query params.
    Returns the User object or None if authentication fails.
    """
    token = websocket.query_params.get("token")
    if not token:
        return None

    payload = decode_access_token(token)
    if payload is None:
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    from sqlalchemy.orm import joinedload
    from backend.database.session import SessionLocal
    db = SessionLocal()
    try:
        user = db.query(User).options(joinedload(User.role_rel)).filter(User.id == user_id).first()
        if user is None or not user.is_active:
            return None
        return user
    finally:
        db.close()
