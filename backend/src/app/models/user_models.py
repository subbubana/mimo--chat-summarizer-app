# backend/src/app/models/user_models.py
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func

from backend.src.db.base import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<User(id='{self.id}', email='{self.email}', username='{self.username}')>"