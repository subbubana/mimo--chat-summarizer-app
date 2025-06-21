# backend/config/settings.py
import os
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_file_path = os.path.join(current_dir, '..', '.env') # Go up one level to 'backend', then find .env
# Load environment variables from .env file
load_dotenv(dotenv_path=dotenv_file_path)

# --- Firebase Admin SDK Settings ---
# IMPORTANT: Place your firebase-admin-sdk-key.json in the 'config/' directory at the project root.
# This path is relative to the backend's root directory when the app runs.
FIREBASE_ADMIN_CREDENTIALS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'config',
    'firebase-admin-sdk-key.json'
)

# --- Gemini API Key ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY is None:
    print("WARNING: GEMINI_API_KEY environment variable not set. LLM features may fail.")

# --- Database Settings (placeholders for now) ---
SQL_DATABASE_URL = os.getenv("SQL_DATABASE_URL", "postgresql+psycopg2://user:password@host:port/dbname")
# Add Firestore settings if needed, but Firestore client handles auth via admin SDK

# --- Other Settings ---
APP_NAME = "Chat Summarizer Backend"