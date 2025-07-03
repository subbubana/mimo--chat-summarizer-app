# Chat creation, management, participant handling routes
# backend/src/app/chats/chat_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Path
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime, timezone

# New: Import get_db and models
from backend.src.db.sql_client import get_db
from backend.src.app.models.chat_models import Chat, ChatParticipant
from backend.src.app.models.user_models import User as DBUser # To find users by email/username
from backend.src.app.auth.auth_routes import get_current_user_uid # For protected routes

router = APIRouter(
    prefix="/chats",
    tags=["Chats"]
)

class ChatCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    # Optional start time (if not provided, defaults to creation time)
    start_time: Optional[datetime] = None 
    # Mandatory end time
    end_time: datetime 
    
    invited_uids: Optional[List[str]] = None
    invited_emails: Optional[List[EmailStr]] = None

class ChatResponse(BaseModel):
    id: str
    name: str
    creator_id: str
    creator_username: str
    description: Optional[str] = None
    created_at: str
    status: str             # UPDATED: Explicitly include status
    start_time: Optional[str]
    end_time: str
    participants_count: int

    class Config:
        from_attributes = True

# NEW: Pydantic model for adding a participant
class AddParticipantRequest(BaseModel):
    username: str = Field(..., description="Username of the user to add.")

# NEW: Pydantic model for removing a participant (can use path param too, but for consistency)
class RemoveParticipantRequest(BaseModel):
    user_uid: str = Field(..., description="Firebase UID of the user to remove.")

@router.post("/", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(
    chat_data: ChatCreate,
    current_user_uid: str = Depends(get_current_user_uid),
    db: Session = Depends(get_db)
):
    """
    Creates a new chat with scheduled start and end times, and sets initial status.
    """
    current_utc_time = datetime.now(timezone.utc) # Get current time in UTC

    # --- 1. Validate and Determine Actual Start/End Times ---
    actual_start_time = chat_data.start_time
    # Ensure start_time (if provided) is timezone-aware
    if actual_start_time is not None and actual_start_time.tzinfo is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provided start time must be timezone-aware (e.g., include 'Z' or '+00:00')."
        )
    # Ensure end_time is timezone-aware
    if chat_data.end_time.tzinfo is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be timezone-aware (e.g., include 'Z' or '+00:00')."
        )

    # Set default start_time if not provided by user
    if actual_start_time is None:
        actual_start_time = current_utc_time
    
    # --- 2. Perform Time Validations (for Backend Integrity) ---
    # End time must be after start time
    if actual_start_time >= chat_data.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time."
        )
    
    # Scheduled start time cannot be in the past (if explicitly provided)
    # If actual_start_time was defaulted to current_utc_time, this check is implicitly handled
    if chat_data.start_time is not None and actual_start_time < current_utc_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scheduled start time cannot be in the past."
        )
    
    # End time cannot be in the past (only if start_time is now/past. If start_time is future, this can be future too)
    if chat_data.end_time <= current_utc_time and actual_start_time <= current_utc_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time cannot be in the past for an immediately starting chat."
        )

    # --- 3. Determine Initial Chat Status ---
    initial_status = "active" # Default
    if actual_start_time > current_utc_time:
        initial_status = "scheduled"
    elif chat_data.end_time <= current_utc_time:
        initial_status = "completed" # This case should ideally be prevented by validation above

    new_chat_id = str(uuid.uuid4())
    
    # 4. Create the Chat entry with new time fields and status
    new_chat = Chat(
        id=new_chat_id,
        name=chat_data.name,
        creator_id=current_user_uid,
        start_time=actual_start_time,
        end_time=chat_data.end_time,
        status=initial_status # Set initial status
    )
    db.add(new_chat)
    db.flush()

    # ... (rest of the participant creation logic is unchanged) ...
    # 5. Add creator as a participant
    creator_participant = ChatParticipant(
        id=str(uuid.uuid4()),
        chat_id=new_chat_id,
        user_id=current_user_uid
    )
    db.add(creator_participant)

    all_participants_uids = {current_user_uid}

    # 6. Add invited registered users (by UID)
    if chat_data.invited_uids:
        invited_db_users = db.query(DBUser).filter(DBUser.id.in_(chat_data.invited_uids)).all()
        for user in invited_db_users:
            if user.id not in all_participants_uids:
                participant = ChatParticipant(
                    id=str(uuid.uuid4()),
                    chat_id=new_chat_id,
                    user_id=user.id
                )
                db.add(participant)
                all_participants_uids.add(user.id)

    # 7. Handle invited non-registered users (by Email) - For now, just print/log.
    if chat_data.invited_emails:
        for email in chat_data.invited_emails:
            existing_user = db.query(DBUser).filter(DBUser.email == email).first()
            if existing_user and existing_user.id not in all_participants_uids:
                participant = ChatParticipant(
                    id=str(uuid.uuid4()),
                    chat_id=new_chat_id,
                    user_id=existing_user.id
                )
                db.add(participant)
                all_participants_uids.add(existing_user.id)
            elif not existing_user:
                print(f"DEBUG: Inviting unregistered user by email: {email} to chat {new_chat.name}")

    db.commit()
    db.refresh(new_chat)

    creator_user = db.query(DBUser).filter(DBUser.id == new_chat.creator_id).first()
    creator_username = creator_user.username if creator_user else "undefined"

    return ChatResponse(
        id=new_chat.id,
        name=new_chat.name,
        creator_id=new_chat.creator_id,
        creator_username=creator_username,
        description=new_chat.description if hasattr(new_chat, 'description') else None,
        created_at=new_chat.created_at.isoformat(),
        status=new_chat.status, # NEW: Include actual status
        start_time=new_chat.start_time.isoformat() if new_chat.start_time else None,
        end_time=new_chat.end_time.isoformat(),
        participants_count=len(all_participants_uids)
    )

# NEW: Endpoint to add a participant to a chat
@router.post("/{chat_id}/participants", status_code=status.HTTP_200_OK)
async def add_participant(
    request_data: AddParticipantRequest,
    chat_id: str = Path(...),
    current_user_uid: str = Depends(get_current_user_uid),
    db: Session = Depends(get_db)
):
    """
    Adds a user as a participant to a chat. Only the chat creator can do this.
    """
    # 1. Verify chat exists and current user is the creator
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")

    if chat.creator_id != current_user_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the chat creator can add participants.")

    # 2. Find the user by username
    user_to_add = db.query(DBUser).filter(DBUser.username == request_data.username).first()
    if not user_to_add:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with username '{request_data.username}' not found.")

    # 3. Check if user is already a participant
    existing_participant = db.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id,
        ChatParticipant.user_id == user_to_add.id
    ).first()
    if existing_participant:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a participant of this chat.")

    # 4. Add the new participant
    new_participant = ChatParticipant(
        id=str(uuid.uuid4()), # Generate a unique ID for the participant entry
        chat_id=chat_id,
        user_id=user_to_add.id
    )
    db.add(new_participant)
    db.commit()
    db.refresh(new_participant)

    print(f"DEBUG_CHAT_MANAGEMENT: User {user_to_add.username} (UID: {user_to_add.id}) added to chat {chat_id} by creator {current_user_uid}.")
    return {"message": f"User {user_to_add.username} added to chat successfully."}


# NEW: Endpoint to remove a participant from a chat
@router.delete("/{chat_id}/participants/{user_uid}", status_code=status.HTTP_200_OK)
async def remove_participant(
    chat_id: str = Path(...),
    user_uid: str = Path(...), # User to remove from path
    current_user_uid: str = Depends(get_current_user_uid),
    db: Session = Depends(get_db)
):
    """
    Removes a user as a participant from a chat. Only the chat creator can do this.
    The creator cannot remove themselves.
    """
    # 1. Verify chat exists and current user is the creator
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")

    if chat.creator_id != current_user_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the chat creator can remove participants.")

    # 2. Prevent creator from removing themselves
    if user_uid == current_user_uid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The chat creator cannot remove themselves from the chat.")

    # 3. Find the participant entry to remove
    participant_to_remove = db.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id,
        ChatParticipant.user_id == user_uid
    ).first()

    if not participant_to_remove:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not a participant of this chat.")

    # 4. Remove the participant
    db.delete(participant_to_remove)
    db.commit()

    print(f"DEBUG_CHAT_MANAGEMENT: User {user_uid} removed from chat {chat_id} by creator {current_user_uid}.")
    return {"message": f"User {user_uid} removed from chat successfully."}

@router.get("/my", response_model=List[ChatResponse])
async def get_my_chats(
    current_user_uid: str = Depends(get_current_user_uid),
    db: Session = Depends(get_db)
):
    """
    Retrieves all chats the current user is a participant of.
    """
    user_memberships = db.query(ChatParticipant).filter(ChatParticipant.user_id == current_user_uid).all()
    
    chats = []
    now = datetime.now(timezone.utc)
    for membership in user_memberships:
        chat = db.query(Chat).filter(Chat.id == membership.chat_id).first()
        if chat:
            creator_user = db.query(DBUser).filter(DBUser.id == chat.creator_id).first()
            creator_username = creator_user.username if creator_user else "undefined"
            # --- Ensure status is up-to-date ---
            if chat.end_time <= now:
                status = "completed"
            elif chat.start_time and chat.start_time > now:
                status = "scheduled"
            else:
                status = "active"
            participants_count = db.query(ChatParticipant).filter(ChatParticipant.chat_id == chat.id).count()
            chats.append(ChatResponse(
                id=chat.id,
                name=chat.name,
                creator_id=chat.creator_id,
                creator_username=creator_username,
                description=chat.description if hasattr(chat, 'description') else None,
                created_at=chat.created_at.isoformat(),
                status=status, # Use computed status
                start_time=chat.start_time.isoformat() if chat.start_time else None,
                end_time=chat.end_time.isoformat(),
                participants_count=participants_count
            ))
    return chats

@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: str = Path(...),
    current_user_uid: str = Depends(get_current_user_uid),
    db: Session = Depends(get_db)
):
    """
    Get details for a single chat by ID (only if user is a participant).
    """
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found.")
    # Check if user is a participant
    is_participant = db.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id,
        ChatParticipant.user_id == current_user_uid
    ).first()
    if not is_participant:
        raise HTTPException(status_code=403, detail="You are not a participant of this chat.")
    participants_count = db.query(ChatParticipant).filter(ChatParticipant.chat_id == chat.id).count()
    creator_user = db.query(DBUser).filter(DBUser.id == chat.creator_id).first()
    creator_username = creator_user.username if creator_user else "undefined"
    now = datetime.now(timezone.utc)
    if chat.end_time <= now:
        status = "completed"
    elif chat.start_time and chat.start_time > now:
        status = "scheduled"
    else:
        status = "active"
    return ChatResponse(
        id=chat.id,
        name=chat.name,
        creator_id=chat.creator_id,
        creator_username=creator_username,
        description=chat.description if hasattr(chat, 'description') else None,
        created_at=chat.created_at.isoformat(),
        status=status,
        start_time=chat.start_time.isoformat() if chat.start_time else None,
        end_time=chat.end_time.isoformat(),
        participants_count=participants_count
    )

@router.get("/{chat_id}/participants", response_model=List[str])
async def get_chat_participants(
    chat_id: str = Path(...),
    current_user_uid: str = Depends(get_current_user_uid),
    db: Session = Depends(get_db)
):
    """
    Get the list of participant usernames for a chat.
    """
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found.")
    # Only allow participants to view the list
    is_participant = db.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id,
        ChatParticipant.user_id == current_user_uid
    ).first()
    if not is_participant:
        raise HTTPException(status_code=403, detail="You are not a participant of this chat.")
    participant_links = db.query(ChatParticipant).filter(ChatParticipant.chat_id == chat_id).all()
    usernames = []
    for link in participant_links:
        user = db.query(DBUser).filter(DBUser.id == link.user_id).first()
        if user:
            usernames.append(user.username)
    return usernames

# NEW: Endpoint for a user to exit a chat (remove themselves as participant)
@router.delete("/{chat_id}/exit", status_code=status.HTTP_200_OK)
async def exit_chat(
    chat_id: str = Path(...),
    current_user_uid: str = Depends(get_current_user_uid),
    db: Session = Depends(get_db)
):
    """
    Allows a user to exit a chat by removing themselves as a participant.
    If the creator exits, the chat is marked as completed.
    """
    # 1. Verify chat exists
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")

    # 2. Check if user is a participant
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id,
        ChatParticipant.user_id == current_user_uid
    ).first()
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You are not a participant of this chat.")

    # 3. Remove the participant
    db.delete(participant)

    # 4. If the creator is exiting, mark the chat as completed
    if chat.creator_id == current_user_uid:
        chat.status = "completed"
        print(f"DEBUG_CHAT_MANAGEMENT: Creator {current_user_uid} exited chat {chat_id}, marking as completed.")

    db.commit()

    print(f"DEBUG_CHAT_MANAGEMENT: User {current_user_uid} exited chat {chat_id}.")
    return {"message": "Successfully exited chat."}

# NEW: Endpoint for a user to delete a chat (only creator can do this)
@router.delete("/{chat_id}/delete", status_code=status.HTTP_200_OK)
async def delete_chat(
    chat_id: str = Path(...),
    current_user_uid: str = Depends(get_current_user_uid),
    db: Session = Depends(get_db)
):
    """
    Allows the chat creator to delete a chat entirely.
    This removes all participants and marks the chat as completed.
    """
    # 1. Verify chat exists
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")

    # 2. Check if current user is the creator
    if chat.creator_id != current_user_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the chat creator can delete the chat.")

    # 3. Remove all participants
    participants = db.query(ChatParticipant).filter(ChatParticipant.chat_id == chat_id).all()
    for participant in participants:
        db.delete(participant)

    # 4. Mark chat as completed
    chat.status = "completed"

    db.commit()

    print(f"DEBUG_CHAT_MANAGEMENT: Chat {chat_id} deleted by creator {current_user_uid}.")
    return {"message": "Chat deleted successfully."}