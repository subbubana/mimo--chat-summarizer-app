# backend/src/app/summary_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from firebase_admin.firestore import client as FirestoreClient

# Import dependencies
from backend.src.app.auth.auth_routes import get_current_user_uid # For user authentication
import backend.src.db.sql_client as sql_client_db # For SQL DB access
from backend.src.db.firestore_client import get_firestore_db # For Firestore client access
from backend.src.app.models.chat_models import Chat, ChatParticipant # To check chat participation
from backend.src.llm_summarizer.summarizer import generate_chat_summary # NEW: Our summarization logic

router = APIRouter(
    prefix="/chats/{chat_id}/summary", # Endpoint path includes chat_id
    tags=["Summarization"]
)

@router.get("/", response_model=str) # Return type is just a string (the summary)
async def get_summary(
    chat_id: str = Path(...), # Get chat_id from the URL path
    current_user_uid: str = Depends(get_current_user_uid),
    db_sql: Session = Depends(sql_client_db.get_db),
    db_firestore: FirestoreClient = Depends(get_firestore_db)
):
    """
    Generates and returns a summary for a specific chat.
    Requires authenticated user to be a participant of the chat.
    """
    # 1. Verify user is a participant of this chat
    is_participant = db_sql.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id,
        ChatParticipant.user_id == current_user_uid
    ).first()
    if not is_participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant of this chat.")

    # 2. Verify chat exists (optional, generate_chat_summary also checks, but good to have early exit)
    chat_exists = db_sql.query(Chat).filter(Chat.id == chat_id).first()
    if not chat_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")

    # 3. Invoke the summarization logic
    summary = await generate_chat_summary(
        chat_id=chat_id,
        db_sql=db_sql,
        db_firestore=db_firestore
    )

    # Handle potential errors from summarization
    if "Error:" in summary: # Crude check, refine error handling later
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=summary)

    return summary