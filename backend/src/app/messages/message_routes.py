# backend/src/app/messages/message_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Path
from firebase_admin.firestore import client as FirestoreClient # Type hint for Firestore client
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

# Import dependencies
import backend.src.db.firebase_admin_client # Ensures Firebase Admin SDK is initialized
from backend.src.db.firestore_client import get_firestore_db # NEW: Firestore client dependency
import backend.src.db.sql_client as sql_client_db # For SQL DB access (to check chat participants, chat status)
from backend.src.app.auth.auth_routes import get_current_user_uid # For user authentication
from backend.src.app.models.message_models import MessageCreate, MessageResponse # NEW: Message models
from backend.src.app.models.chat_models import Chat, ChatParticipant # For checking chat status and participation
from backend.src.app.models.user_models import User as DBUser # For getting sender's username

router = APIRouter(
    prefix="/chats/{chat_id}/messages", # Prefix includes chat_id
    tags=["Messages"]
)

@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: MessageCreate,
    chat_id: str = Path(...), # Extract chat_id from path
    current_user_uid: str = Depends(get_current_user_uid),
    db_firestore: FirestoreClient = Depends(get_firestore_db),
    db_sql: Session = Depends(sql_client_db.get_db)
):
    """
    Sends a new message to a specific chat.
    Requires authenticated user to be a participant of the chat.
    Chat must be 'active'.
    """
    # 1. Verify user is a participant of this chat
    is_participant = db_sql.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id,
        ChatParticipant.user_id == current_user_uid
    ).first()
    if not is_participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant of this chat.")

    # 2. Verify chat status (must be 'active')
    chat = db_sql.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")

    current_utc_time = datetime.now(timezone.utc)
    # Update chat status logic for active/completed/scheduled on demand
    if chat.status != "active": # Only allow messages in 'active' chats
        # Re-evaluate status just in case (e.g., if scheduled time has passed)
        if chat.start_time <= current_utc_time and chat.end_time > current_utc_time:
            # Chat should be active but database status might be old
            # You might want to update chat.status in DB here, but for now, just allow message
            pass
        elif chat.status == "scheduled" and chat.start_time > current_utc_time:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chat is scheduled and not yet active.")
        elif chat.status == "completed" or chat.end_time <= current_utc_time:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chat has ended and no longer accepts messages.")
        else:
            # Fallback for unexpected statuses, or if chat.status hasn't been re-evaluated
            # Could also indicate a chat that was scheduled and its time has passed but not yet 'active'
            if chat.start_time <= current_utc_time and chat.end_time > current_utc_time:
                # It's actually active, but DB status might be 'scheduled'. Allow message.
                # Consider adding a background task to update chat statuses.
                pass 
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Chat status is '{chat.status}' and cannot receive messages.")


    # 3. Get sender's username from SQL DB
    sender_db_user = db_sql.query(DBUser).filter(DBUser.id == current_user_uid).first()
    if not sender_db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sender user profile not found.")

    sender_username = sender_db_user.username

    # 4. Prepare message data for Firestore
    message_doc_ref = db_firestore.collection("chats").document(chat_id).collection("messages").document()

    message_data_dict = {
        "chat_id": chat_id,
        "sender_id": current_user_uid,
        "sender_username": sender_username,
        "content": message_data.content,
        "timestamp": current_utc_time # Use server's current UTC time
    }

    # 5. Add message to Firestore
    try:
        message_doc_ref.set(message_data_dict) # REMOVED 'await'
        print(f"DEBUG_MESSAGE: Message sent to chat {chat_id} by {sender_username}")
    except Exception as e:
        print(f"ERROR_MESSAGE: Failed to write message to Firestore: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send message.")

    # 6. Return response
    return MessageResponse(
        id=message_doc_ref.id,
        **message_data_dict
    )



@router.get("/", response_model=List[MessageResponse])
async def get_messages(
    chat_id: str = Path(...),
    current_user_uid: str = Depends(get_current_user_uid),
    db_firestore: FirestoreClient = Depends(get_firestore_db),
    db_sql: Session = Depends(sql_client_db.get_db)
):
    """
    Retrieves messages for a specific chat.
    Requires authenticated user to be a participant of the chat.
    """
    # 1. Verify user is a participant of this chat
    is_participant = db_sql.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id,
        ChatParticipant.user_id == current_user_uid
    ).first()
    if not is_participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant of this chat.")

    # 2. Retrieve messages from Firestore
    messages_query = db_firestore.collection("chats").document(chat_id).collection("messages").order_by("timestamp").stream()

    messages = []
    try:
        # CHANGE THIS LINE:
        # Before: async for doc in messages_query:
        # After:
        for doc in messages_query: # REMOVED 'async'
            msg_data = doc.to_dict()
            messages.append(MessageResponse(id=doc.id, **msg_data))
        print(f"DEBUG_MESSAGE: Retrieved {len(messages)} messages for chat {chat_id}")
    except Exception as e:
        print(f"ERROR_MESSAGE: Failed to retrieve messages from Firestore: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve messages.")

    return messages