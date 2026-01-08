from datetime import datetime
import hashlib

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Float,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.user import User


class TokenAccount(Base):
    __tablename__ = "token_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    balance = Column(Float, nullable=False, default=0.0)

    user = relationship(User, backref="token_account")
    transactions = relationship("TokenTransaction", back_populates="account")


class TokenTransaction(Base):
    __tablename__ = "token_transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("token_accounts.id"), nullable=False)

    # positive for credit, negative for debit
    amount = Column(Float, nullable=False)
    type = Column(String, nullable=False)  # "MINT", "BURN", "TRANSFER_IN", "TRANSFER_OUT"
    description = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship(TokenAccount, back_populates="transactions")


class TokenBlock(Base):
    """
    Optional simple blockchain-like structure to record blocks of transactions.
    """
    __tablename__ = "token_blocks"

    id = Column(Integer, primary_key=True, index=True)
    previous_hash = Column(String, nullable=True)
    hash = Column(String, nullable=False)
    data = Column(String, nullable=False)  # could store JSON stringified
    created_at = Column(DateTime, default=datetime.utcnow)

    @staticmethod
    def compute_hash(previous_hash: str | None, data: str) -> str:
        payload = (previous_hash or "") + data
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()
