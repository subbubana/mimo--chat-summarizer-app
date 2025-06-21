# backend/src/app/auth/auth_routes.py
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session # For database session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError # Import specific SQLAlchemy errors

from firebase_admin import auth

# Import firebase_admin_client to ensure Firebase Admin SDK is initialized
import backend.src.db.firebase_admin_client 

# Import sql_client_db for access to get_db dependency
import backend.src.db.sql_client as sql_client_db

# Import our User model for SQL operations
from backend.src.app.models.user_models import User as DBUser

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

# Pydantic models for request body validation
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    id_token: str

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserRegister, db: Session = Depends(sql_client_db.get_db)):
    """
    Registers a new user with Firebase Authentication and stores their details in SQL DB.
    """
    try:
        # 1. Create user in Firebase Auth
        firebase_user = auth.create_user(
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.username,
            email_verified=False,
            disabled=False
        )
        print(f"DEBUG_SIGNUP: Firebase user created: UID={firebase_user.uid}, Email={firebase_user.email}")

        # 2. Prepare user for SQL database
        new_db_user = DBUser(
            id=firebase_user.uid,
            email=user_data.email,
            username=user_data.username
        )
        print(f"DEBUG_SIGNUP: SQLAlchemy DBUser object prepared: {new_db_user}")

        # 3. Store user in SQL database - INNER TRY-EXCEPT BLOCK FOR DATABASE OPERATIONS
        try:
            db.add(new_db_user)
            print("DEBUG_SIGNUP: DBUser added to session.")
            db.commit()
            print("DEBUG_SIGNUP: DB session committed.")
            db.refresh(new_db_user) # Refresh to get auto-generated fields like created_at, if any
            print(f"DEBUG_SIGNUP: DBUser refreshed: {new_db_user.username} (ID: {new_db_user.id})")

        except IntegrityError as e: # Catch specifically for unique constraint violations
            db.rollback() # Rollback the session on error
            print(f"ERROR_SIGNUP_DB: IntegrityError (e.g., duplicate key) caught: {e}")
            # Depending on the specific constraint, you can give more specific messages
            if "duplicate key value violates unique constraint" in str(e) or "UNIQUE constraint failed" in str(e):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email or username already exists in the database.")
            else:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database integrity error during user registration.")

        except SQLAlchemyError as e: # Catch other SQLAlchemy-related errors
            db.rollback() # Rollback the session on error
            print(f"ERROR_SIGNUP_DB: SQLAlchemyError caught: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"A database error occurred during user registration: {e}")

        except Exception as db_other_error: # Catch any other unexpected errors during DB operations
            db.rollback() # Rollback the session on error
            print(f"ERROR_SIGNUP_DB: Unexpected database error caught: {db_other_error}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred during database interaction.")

        # If we reach here, DB operations were successful
        print(f"DEBUG_SIGNUP: Successfully stored user in SQL DB: {new_db_user.username}")

        return {"message": "User registered successfully", "uid": firebase_user.uid, "username": new_db_user.username}

    except Exception as e:
        # This block catches errors *before* DB interaction (e.g., Firebase Auth errors)
        print(f"ERROR_SIGNUP_GENERAL: General signup exception caught: {e}")
        if "EMAIL_ALREADY_EXISTS" in str(e) or "auth/email-already-in-use" in str(e):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered in Firebase.")
        if "auth/invalid-password" in str(e):
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password should be at least 6 characters.")
        
        # Catch if Firebase Admin SDK was not initialized (though we've addressed that)
        if "The default Firebase app does not exist" in str(e):
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Firebase Admin SDK not initialized correctly.")

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Registration failed: {e}")


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """
    Placeholder for login. In a real app, client-side Firebase SDK handles login
    and sends the ID Token to the backend for verification.
    For this demo, we'll assume the client-side Firebase SDK
    handles password-based login and sends the ID token after successful auth.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Login (password-based) is handled on the frontend client using Firebase SDK. "
               "The backend expects ID tokens for authenticated requests."
    )

# Dependency to get current authenticated user's Firebase UID
async def get_current_user_uid(id_token: str = Depends(lambda token: token)): # token will be passed in Authorization header
    """
    Verifies the Firebase ID token and returns the user's UID.
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        return uid
    except Exception as e:
        print(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )

# Example of a protected route (for testing)
@router.get("/protected-route")
async def protected_route(uid: str = Depends(get_current_user_uid)):
    return {"message": f"Welcome, authenticated user with UID: {uid}!"}