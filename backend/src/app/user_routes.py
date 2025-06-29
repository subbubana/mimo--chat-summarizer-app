# backend/src/app/user_routes.py
from fastapi import APIRouter, Depends, Query, HTTPException, status, Path
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

# Import dependencies
import backend.src.db.sql_client as sql_client_db
from backend.src.app.models.user_models import User as DBUser # Our SQL User model
from backend.src.app.auth.auth_routes import get_current_user_uid # For authentication

router = APIRouter(
    prefix="/users", # Base prefix for user-related endpoints
    tags=["Users"]
)

# Pydantic model for User search response (simplified)
class UserSearchResponse(BaseModel):
    id: str
    username: str
    email: str

    class Config:
        from_attributes = True # Allow conversion from SQLAlchemy model

@router.get("/search", response_model=List[UserSearchResponse])
async def search_users(
    query: str = Query(..., min_length=1, description="Search query for username or email"),
    current_user_uid: str = Depends(get_current_user_uid), # Protect this endpoint
    db: Session = Depends(sql_client_db.get_db)
):
    """
    Searches for registered users by username or email (case-insensitive, partial match).
    Returns basic user details.
    """
    search_pattern = f"%{query.lower()}%" # Case-insensitive partial match

    users = db.query(DBUser).filter(
        (DBUser.username.ilike(search_pattern)) |  # Case-insensitive LIKE for username
        (DBUser.email.ilike(search_pattern))      # Case-insensitive LIKE for email
    ).limit(10).all() # Limit results for performance

    # Filter out the current user from search results (optional, but good UX)
    filtered_users = [user for user in users if user.id != current_user_uid]

    return filtered_users

# Optional: Get a user by UID (if needed for internal lookup based on invited_uids)
@router.get("/{user_uid}", response_model=UserSearchResponse)
async def get_user_by_uid(
    user_uid: str = Path(...),
    current_user_uid: str = Depends(get_current_user_uid), # Protect this endpoint
    db: Session = Depends(sql_client_db.get_db)
):
    """
    Retrieves a user's details by their UID.
    """
    user = db.query(DBUser).filter(DBUser.id == user_uid).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    return user