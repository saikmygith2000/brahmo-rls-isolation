"""
User service - handles user-related operations
"""

import logging
from typing import Optional, List
from app.database.connection import db
from app.schemas.models import UserProfile, JWTClaims

logger = logging.getLogger(__name__)


class UserService:
    """Service for user operations"""
    
    @staticmethod
    async def get_all_users() -> List[UserProfile]:
        """Fetch all demo users"""
        query = """
            SELECT 
                id, email, full_name, org_id, role, department, 
                ceiling_level, compliance_clearance, created_at
            FROM user_profiles
            ORDER BY full_name
        """
        rows = await db.execute(query)
        
        return [
            UserProfile(
                id=row['id'],
                email=row['email'],
                full_name=row['full_name'],
                org_id=row['org_id'],
                role=row['role'],
                department=row['department'],
                ceiling_level=row['ceiling_level'],
                compliance_clearance=row['compliance_clearance'] or [],
                created_at=row['created_at']
            )
            for row in rows
        ]
    
    @staticmethod
    async def get_user_by_email(email: str) -> Optional[UserProfile]:
        """Fetch user by email"""
        query = """
            SELECT 
                id, email, full_name, org_id, role, department, 
                ceiling_level, compliance_clearance, created_at
            FROM user_profiles
            WHERE email = $1
        """
        row = await db.execute(query, email)
        
        if not row:
            return None
        
        row = row[0]
        return UserProfile(
            id=row['id'],
            email=row['email'],
            full_name=row['full_name'],
            org_id=row['org_id'],
            role=row['role'],
            department=row['department'],
            ceiling_level=row['ceiling_level'],
            compliance_clearance=row['compliance_clearance'] or [],
            created_at=row['created_at']
        )
    
    @staticmethod
    async def get_jwt_claims(user_email: str) -> Optional[JWTClaims]:
        """Build JWT claims for a user"""
        user = await UserService.get_user_by_email(user_email)
        print(f"Building JWT claims for user: {user_email} -> {user}")  
        if not user:
            return None
        
        return JWTClaims(
            email=user.email,
            org_id=user.org_id,
            role=user.role,
            department=user.department,
            ceiling_level=user.ceiling_level,
            compliance_clearance=user.compliance_clearance or []
        )
