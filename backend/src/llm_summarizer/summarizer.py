# Main entry point for summarization requests
# backend/src/llm_summarizer/summarizer.py
from typing import List, Dict, Optional
from firebase_admin.firestore import client as FirestoreClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from firebase_admin import firestore

# Local imports for LangGraph agent and state
from backend.src.llm_summarizer.langgraph_agent import summary_graph_app, AgentState
from backend.src.app.models.chat_models import Chat
from backend.src.app.models.message_models import MessageResponse # For type hinting/formatting

# Define the buffer size for messages to send to the LLM
MESSAGE_BUFFER_SIZE = 1000 # As agreed, 10 for initial testing

async def generate_chat_summary(
    chat_id: str,
    db_sql: Session,
    db_firestore: FirestoreClient
) -> str:
    """
    Orchestrates the process of fetching messages and chat context,
    and then invoking the LangGraph summarization agent.
    """
    print(f"DEBUG_SUMMARIZER: Starting summary generation for chat_id: {chat_id}")

    # 1. Fetch Chat Metadata from SQL DB (for context)
    chat = db_sql.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        print(f"ERROR_SUMMARIZER: Chat not found for ID: {chat_id}")
        return "Error: Chat not found." # Or raise HTTPException

    chat_name = chat.name
    # Assuming Chat model has a description field if we add one later
    # For now, default description is None
    chat_description = None # You can add chat.description if you add it to Chat model

    # 2. Fetch Messages from Firestore (using buffer size)
    # Order by timestamp and limit to the last MESSAGE_BUFFER_SIZE
    messages_query_ref = db_firestore.collection("chats").document(chat_id).collection("messages").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(MESSAGE_BUFFER_SIZE)

    raw_messages_docs = []
    try:
        # Firestore client is synchronous by default, so use regular for loop
        for doc in messages_query_ref.stream():
            raw_messages_docs.append(doc.to_dict())
        print(f"DEBUG_SUMMARIZER: Fetched {len(raw_messages_docs)} messages from Firestore.")
    except Exception as e:
        print(f"ERROR_SUMMARIZER: Failed to fetch messages from Firestore: {e}")
        return f"Error: Failed to fetch messages: {e}"

    # Reverse the order to get chronological order for transcript
    messages_chronological = raw_messages_docs[::-1]

    # 3. Format Messages for LangGraph AgentState
    # Ensure we only pass necessary keys for prompt formatting (sender_username, content)
    formatted_messages_for_llm = [
        {"sender_username": msg.get("sender_username", "Unknown"), "content": msg.get("content", "")}
        for msg in messages_chronological
    ]

    if not formatted_messages_for_llm:
        print(f"DEBUG_SUMMARIZER: No messages found for chat_id: {chat_id}. Cannot summarize.")
        return "No messages to summarize."

    # 4. Prepare AgentState
    initial_state: AgentState = {
        "chat_name": chat_name,
        "chat_description": chat_description,
        "messages_raw": formatted_messages_for_llm,
        "summary": None # Will be populated by the LLM
    }

    # 5. Invoke LangGraph Agent
    final_state = None
    try:
        # LangGraph app.invoke is synchronous
        final_state = summary_graph_app.invoke(initial_state)
        generated_summary = final_state.get("summary")
        if not generated_summary:
            print("ERROR_SUMMARIZER: LLM returned empty summary.")
            generated_summary = "Error: LLM failed to generate a summary."

        print(f"DEBUG_SUMMARIZER: Summary generated for chat {chat_id}: {generated_summary[:100]}...")
        return generated_summary
    except Exception as e:
        print(f"ERROR_SUMMARIZER: Failed to invoke LangGraph agent: {e}")
        return f"Error: Failed to generate summary: {e}"