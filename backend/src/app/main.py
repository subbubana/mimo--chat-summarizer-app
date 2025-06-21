# backend/src/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add the project root to the sys.path for module imports
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..', '..', '..')) # Adjust path to reach chat_summarizer_app/
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import and ensure Firebase Admin SDK is initialized
import backend.src.db.firebase_admin_client # This import ensures initialization
from backend.src.app.auth.auth_routes import router as auth_router # Import our auth router
from backend.src.app.chats.chat_routes import router as chat_router # New: Import chat router
from backend.src.app.messages.message_routes import router as message_router # New: Import message router
from backend.src.app.summary_routes import router as summary_router # New: Import summary router

app = FastAPI(
    title="Chat Summarizer Backend",
    description="API for managing chats, messages, and summarization.",
    version="0.0.1"
)

# CORS Middleware for frontend communication
# IMPORTANT: Adjust origins in production
origins = [
    "http://localhost",
    "http://localhost:3000", # Default React dev server port
    # Add your frontend production URL here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(message_router)
app.include_router(summary_router)

@app.get("/")
async def read_root():
    return {"message": "Chat Summarizer Backend is running!"}
