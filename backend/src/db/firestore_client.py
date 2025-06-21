# backend/src/db/firestore_client.py
import firebase_admin
from firebase_admin import credentials, firestore
import os

# Ensure Firebase Admin SDK is initialized before trying to get Firestore client
# This import will trigger the initialization code in firebase_admin_client.py
import backend.src.db.firebase_admin_client 

# Get a Firestore client instance
# This assumes firebase_admin.initialize_app() has already been called
try:
    db = firestore.client()
    print("Firestore client initialized successfully.")
except ValueError as e:
    # This typically means initialize_app() wasn't called or failed
    print(f"Error initializing Firestore client: {e}. Ensure Firebase Admin SDK is initialized.")
    db = None # Set to None to indicate failure
except Exception as e:
    print(f"An unexpected error occurred during Firestore client initialization: {e}")
    db = None

# Dependency to get the Firestore client for FastAPI routes
def get_firestore_db():
    if db is None:
        raise Exception("Firestore client is not initialized. Cannot connect to database.")
    return db