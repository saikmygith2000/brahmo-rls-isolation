"""
Setup Supabase Auth users via Python
This script creates demo users in Supabase Auth
"""

import os
import json
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Demo users
demo_users = [
    {
        "email": "priya@brahmo.supra",
        "password": "TestPass123!",
        "user_metadata": {"full_name": "Priya Sharma"},
        "app_metadata": {
            "org_id": "supra",
            "role": "VIEWER",
            "department": "ortho",
            "ceiling_level": 10,
            "compliance_clearance": []
        }
    },
    {
        "email": "vikram@brahmo.supra",
        "password": "TestPass123!",
        "user_metadata": {"full_name": "Vikram Desai"},
        "app_metadata": {
            "org_id": "supra",
            "role": "HOD",
            "department": "ortho",
            "ceiling_level": 4,
            "compliance_clearance": []
        }
    },
    {
        "email": "suresh@brahmo.supra",
        "password": "TestPass123!",
        "user_metadata": {"full_name": "Suresh Menon"},
        "app_metadata": {
            "org_id": "supra",
            "role": "ADMIN",
            "department": "admin",
            "ceiling_level": 1,
            "compliance_clearance": ["MNPI"]
        }
    },
    {
        "email": "ananya@brahmo.supra",
        "password": "TestPass123!",
        "user_metadata": {"full_name": "Ananya Kapoor"},
        "app_metadata": {
            "org_id": "supra",
            "role": "EDITOR",
            "department": "medicine",
            "ceiling_level": 8,
            "compliance_clearance": []
        }
    },
    {
        "email": "ravi@brahmo.supra",
        "password": "TestPass123!",
        "user_metadata": {"full_name": "Ravi Patel"},
        "app_metadata": {
            "org_id": "supra",
            "role": "VIEWER",
            "department": "pharmacy",
            "ceiling_level": 12,
            "compliance_clearance": ["CONTROLLED_SUBSTANCE"]
        }
    },
    {
        "email": "citydoctor@city.clinic",
        "password": "TestPass123!",
        "user_metadata": {"full_name": "Dr. City Clinic"},
        "app_metadata": {
            "org_id": "city_clinic",
            "role": "EDITOR",
            "department": "medicine",
            "ceiling_level": 8,
            "compliance_clearance": []
        }
    }
]

async def create_auth_users():
    """Create demo users in Supabase Auth"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Error: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        return
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    for user in demo_users:
        try:
            response = supabase.auth.admin.create_user(
                email=user["email"],
                password=user["password"],
                user_metadata=user["user_metadata"],
                app_metadata=user["app_metadata"],
                email_confirm=True
            )
            print(f"✓ Created user: {user['email']}")
        except Exception as e:
            print(f"✗ Failed to create {user['email']}: {str(e)}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(create_auth_users())
