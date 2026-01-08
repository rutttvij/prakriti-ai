# backend/app/models/contact.py
from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base  # adjust import if Base is defined elsewhere

class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
