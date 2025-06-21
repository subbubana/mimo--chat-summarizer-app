# Firestore specific operations
# backend/src/db/firebase_admin_client.py
import firebase_admin
from firebase_admin import credentials, auth
import os
import sys

# Add the project root to the sys.path to allow imports from config
# This helps when running from different directories or in complex environments
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..', '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.config.settings import FIREBASE_ADMIN_CREDENTIALS_PATH

# Initialize Firebase Admin SDK
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(FIREBASE_ADMIN_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
    else:
        print("Firebase Admin SDK already initialized.")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    # Depending on the error, you might want to exit or handle gracefully
    # For now, we'll just print the error and let the app potentially continue
    # with limited functionality or fail if auth is required.

# You can now import and use 'auth' from firebase_admin in other parts of your app
# Example: firebase_admin_client.auth.verify_id_token(id_token)