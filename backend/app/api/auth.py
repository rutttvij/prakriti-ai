# app/api/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
)
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserRead
from app.schemas.auth import Token
from app.api import deps


router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------
# REGISTER USER
# ---------------------------------------------------------
@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Register new users (Citizen, Waste Worker, Bulk Generator).
    Super Admin cannot self-register.
    """

    # 1) Block creation of SUPER_ADMIN through public API
    if user_in.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admin accounts cannot be created via public registration.",
        )

    # 2) Email must be unique
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    # 3) Government ID must be unique
    if user_in.government_id:
        if (
            db.query(User)
            .filter(User.government_id == user_in.government_id)
            .first()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This government ID is already registered.",
            )

    # 4) Hash password
    hashed_pw = get_password_hash(user_in.password)

    # 5) Create DB user object
    db_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        role=user_in.role,
        hashed_password=hashed_pw,
        government_id=user_in.government_id,
        pincode=user_in.pincode,
        meta=user_in.meta or {},
        is_active=False,  # Requires admin approval
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


# ---------------------------------------------------------
# LOGIN (JWT)
# ---------------------------------------------------------
@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Standard email/password login that returns a JWT token.
    """

    # Username field holds email in OAuth2PasswordRequestForm
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password.",
        )

    # OPTIONAL: Block login for inactive accounts
    # Uncomment whenever you want:
    #
    # if not user.is_active:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Account is pending approval by admin.",
    #     )

    token = create_access_token(subject=user.id)

    return Token(access_token=token)


# ---------------------------------------------------------
# GET CURRENT USER
# ---------------------------------------------------------
@router.get("/me", response_model=UserRead)
def read_me(
    current_user: User = Depends(deps.get_current_user),
):
    """Return currently authenticated user."""
    return current_user
