"""
User routes
"""

from fastapi import APIRouter, HTTPException, Depends
from app.services.user_service import UserService
from app.schemas.models import UserProfile
from typing import List

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserProfile])
async def get_users():
    """Get all demo users"""
    try:
        users = await UserService.get_all_users()
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_email}", response_model=UserProfile)
async def get_user(user_email: str):
    """Get user by email"""
    try:
        user = await UserService.get_user_by_email(user_email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
