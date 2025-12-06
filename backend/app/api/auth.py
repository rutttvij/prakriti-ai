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
from app.schemas.user import UserCreate, UserRead, UserProfileUpdate
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

    # Block super-admin self-registration
    if user_in.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admin accounts cannot be created via public registration.",
        )

    # Email unique
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    # Govt ID unique
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

    hashed_pw = get_password_hash(user_in.password)

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
    """Standard email/password login."""

    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password.",
        )

    token = create_access_token(subject=user.id)

    return Token(access_token=token)


# ---------------------------------------------------------
# GET CURRENT USER
# ---------------------------------------------------------
@router.get("/me", response_model=UserRead)
def read_me(
    current_user: User = Depends(deps.get_current_user),
):
    return current_user


# ---------------------------------------------------------
# UPDATE CURRENT USER PROFILE
# ---------------------------------------------------------
@router.put("/me", response_model=UserRead)
def update_me(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Updates:
      - full_name
      - pincode (only if valid 6-digit; ignore empty)
      - meta fields: phone, city, address, ward (stored in JSONB `meta`)
    """

    data = payload.dict(exclude_unset=True)

    # 1) Direct columns --------------------------

    # full_name – update only if provided and non-empty
    full_name = data.get("full_name", None)
    if full_name is not None:
        cleaned_name = full_name.strip()
        if cleaned_name:
          current_user.full_name = cleaned_name

    # pincode – must be exactly 6 digits; ignore empty string
    pincode = data.get("pincode", None)
    if pincode is not None:
        cleaned_pin = pincode.strip()
        if cleaned_pin == "":
            # User sent empty string; do not touch existing pincode
            pass
        else:
            if len(cleaned_pin) == 6 and cleaned_pin.isdigit():
                current_user.pincode = cleaned_pin
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Pincode must be exactly 6 digits.",
                )

    # 2) Meta JSON -------------------------------

    meta = dict(current_user.meta or {})

    # These can be empty strings; no DB constraint on meta
    if "phone" in data:
        meta["phone"] = (data["phone"] or "").strip()
    if "city" in data:
        meta["city"] = (data["city"] or "").strip()
    if "address" in data:
        meta["address"] = (data["address"] or "").strip()
    if "ward" in data:
        meta["ward"] = (data["ward"] or "").strip()

    current_user.meta = meta

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user
