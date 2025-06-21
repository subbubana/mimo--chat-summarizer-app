# Message handling, real-time updates routes
# backend/src/app/models/message_models.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

# Pydantic model for incoming messages from frontend
class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000) # Message text

# Pydantic model for outgoing messages (what we send back)
class MessageResponse(BaseModel):
    id: str                 # Firestore Document ID
    chat_id: str
    sender_id: str          # Firebase UID of sender
    sender_username: str    # Display name of sender (denormalized for convenience)
    content: str
    timestamp: datetime     # When the message was sent (UTC)

    class Config:
        # Allows Pydantic to work with non-dict properties, like converting Firestore DocumentSnapshot
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() + "Z" if dt.tzinfo is None else dt.isoformat()
        }