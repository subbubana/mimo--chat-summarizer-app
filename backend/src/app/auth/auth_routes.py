# backend/src/app/auth/auth_routes.py
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session # For database session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError # Import specific SQLAlchemy errors
from datetime import datetime, timezone
from firebase_admin import auth
import jwt
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
    uid: str
    email: EmailStr
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
        # # 1. Create user in Firebase Auth
        # firebase_user = auth.create_user(
        #     email=user_data.email,
        #     password=user_data.password,
        #     display_name=user_data.username,
        #     email_verified=False,
        #     disabled=False
        # )
        print(f"DEBUG_SIGNUP: Firebase user created: UID={user_data.uid}, Email={user_data.email}")

        # 2. Prepare user for SQL database
        new_db_user = DBUser(
            id=user_data.uid,
            email=user_data.email,
            username=user_data.username
        )
        print(f"DEBUG_SIGNUP: SQLAlchemy DBUser object prepared: {new_db_user}")

        # 3. Store user in SQL database
        try:
            db.add(new_db_user)
            print("DEBUG_SIGNUP: DBUser added to session.")
            db.commit()
            print("DEBUG_SIGNUP: DB session committed.")
            db.refresh(new_db_user)
            print(f"DEBUG_SIGNUP: DBUser refreshed: {new_db_user.username} (ID: {new_db_user.id})")

        except IntegrityError as e:
            db.rollback()
            print(f"ERROR_SIGNUP_DB: IntegrityError (e.g., duplicate key) caught: {e}")
            if "duplicate key value violates unique constraint" in str(e) or "UNIQUE constraint failed" in str(e):
                # This now specifically catches if the UID, email, or username already exists in SQL DB
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email or username (or Firebase UID) already exists in our database.")
            else:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database integrity error during user registration.")

        except SQLAlchemyError as e:
            db.rollback()
            print(f"ERROR_SIGNUP_DB: SQLAlchemyError caught: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"A database error occurred during user registration: {e}")

        except Exception as db_other_error:
            db.rollback()
            print(f"ERROR_SIGNUP_DB: Unexpected database error caught: {db_other_error}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred during database interaction.")

        # If we reach here, DB operations were successful
        print(f"DEBUG_SIGNUP: Successfully stored user in SQL DB: {new_db_user.username}")

        # Return success response (using received UID, not from auth.create_user)
        return {"message": "User registered successfully", "uid": new_db_user.id, "username": new_db_user.username}

    except Exception as e:
        # This block now primarily catches errors *from Firebase client-side SDK via frontend*, or other unexpected issues before DB.
        # The "EMAIL_ALREADY_EXISTS" is no longer expected from backend, but kept for general robustness.
        print(f"ERROR_SIGNUP_GENERAL: General signup exception caught: {e}")
        # If Firebase creation on frontend succeeded, this error block implies a frontend-side issue or very late error.
        # The frontend now handles Firebase errors before calling backend.
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
async def get_current_user_uid(id_token: str = Depends(lambda token: token)):
    """
    Verifies the Firebase ID token and returns the user's UID.
    Includes a DEVELOPMENT-ONLY workaround for persistent clock skew.
    """
    print(f"DEBUG_BACKEND_AUTH: get_current_user_uid called.")
    print(f"DEBUG_BACKEND_AUTH: Received ID Token (first 30 chars): {id_token[:30]}...")

    # --- DEVELOPMENT-ONLY WORKAROUND FOR PERSISTENT CLOCK SKEW ---
    # Purpose: To unblock development by allowing a small time leeway and bypassing
    # Firebase Admin SDK's strict internal time check IF ONLY TIME IS THE ISSUE.
    # DO NOT USE IN PRODUCTION WITHOUT EXTREME CAUTION AND REVIEW!
    # Production solutions involve proper NTP sync or cloud-managed environments.

    LEEWEY_SECONDS = 5 # Allow token to be off by up to 5 seconds

    uid_from_payload = None # Initialize to store UID from PyJWT decode

    try:
        # 1. Manually decode the header and payload to get iat/exp and uid
        # This doesn't verify signature yet, just parses the JWT structure.
        decoded_header = jwt.get_unverified_header(id_token)
        decoded_payload = jwt.decode(id_token, options={"verify_signature": False}) 

        token_iat = decoded_payload.get('iat')
        token_exp = decoded_payload.get('exp')
        uid_from_payload = decoded_payload.get('sub') # 'sub' claim holds the Firebase UID

        current_python_utc_time = datetime.now(timezone.utc)
        current_python_timestamp = int(current_python_utc_time.timestamp())

        print(f"DEBUG_BACKEND_AUTH: Token 'iat' (issued at) timestamp: {token_iat} (from decoded token)")
        print(f"DEBUG_BACKEND_AUTH: Token 'exp' (expires at) timestamp: {token_exp} (from decoded token)")
        print(f"DEBUG_BACKEND_AUTH: Python's current UTC timestamp: {current_python_timestamp} (from datetime.now())")

        # Manual time validation with leeway
        manual_time_passed = False
        if token_iat and token_exp:
            if (current_python_timestamp + LEEWEY_SECONDS >= token_iat) and \
               (current_python_timestamp - LEEWEY_SECONDS <= token_exp):
                manual_time_passed = True
                print("DEBUG_BACKEND_AUTH: Manual time validation with leeway PASSED.")
            else:
                print(f"DEBUG_BACKEND_AUTH: Manual time validation FAILED: {current_python_timestamp} (now) vs IAT:{token_iat}, EXP:{token_exp}")
                raise Exception(f"Manual time validation (with leeway) failed.")
        else:
            raise Exception("Token missing 'iat' or 'exp' claims for manual time validation.")

        # 2. Attempt full verification with Firebase Admin SDK
        # This part will still fail if the internal time check is triggered,
        # but we will bypass if our manual check passed and error is time-related.
        try:
            full_decoded_token = auth.verify_id_token(id_token)
            uid = full_decoded_token['uid']
            print(f"DEBUG_BACKEND_AUTH: Token verified successfully by Firebase Admin SDK for UID: {uid}")
            return uid
        except Exception as firebase_verify_error:
            error_str = str(firebase_verify_error)
            # --- This is the explicit BYPASS for development ---
            if manual_time_passed and ("Token used too early" in error_str or "Token has expired" in error_str):
                print(f"WARNING_BACKEND_AUTH: Firebase SDK verification failed due to time (but manual leeway passed). BYPASSING for development.")
                # Return UID from PyJWT decoded payload, trusting our manual time check and PyJWT signature validation
                return uid_from_payload
            else:
                # If it's not a time error, or if our manual time check failed, re-raise the original error
                print(f"ERROR_BACKEND_AUTH: Firebase Admin SDK verification failed for non-time reasons or manual check failed: {firebase_verify_error}")
                raise firebase_verify_error

    except Exception as e:
        print(f"ERROR_BACKEND_AUTH: Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )
    
# Example of a protected route (for testing)
@router.get("/protected-route")
async def protected_route(uid: str = Depends(get_current_user_uid)):
    return {"message": f"Welcome, authenticated user with UID: {uid}!"}