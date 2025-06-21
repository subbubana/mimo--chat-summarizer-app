# backend/src/app/models/chat_models.py
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from backend.src.db.base import Base # This import stays
print(f"DEBUG CHAT_MODELS Base ID: {id(Base)}")
# REMOVED: from backend.src.app.models.user_models import User

class Chat(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    creator_id = Column(String, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="active", nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True) # Optional start time
    end_time = Column(DateTime(timezone=True), nullable=False)

    creator = relationship("backend.src.app.models.user_models.User", backref="created_chats", foreign_keys=[creator_id])
    participants = relationship("backend.src.app.models.chat_models.ChatParticipant", back_populates="chat", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Chat(id='{self.id}', name='{self.name}', status='{self.status}')>"

class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    id = Column(String, primary_key=True, index=True)
    chat_id = Column(String, ForeignKey('chats.id'), nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    

    # CHANGE THIS LINE:
    # Before: user = relationship("User", backref="chat_memberships")
    # After:
    user = relationship("backend.src.app.models.user_models.User", backref="chat_memberships")
    # Before: chat = relationship("Chat", back_populates="participants")
    # After (already string, but confirming full path):
    chat = relationship("backend.src.app.models.chat_models.Chat", back_populates="participants")


    def __repr__(self):
        return f"<ChatParticipant(chat_id='{self.chat_id}', user_id='{self.user_id}')>"