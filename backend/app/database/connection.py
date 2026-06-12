"""
Database connection management for Supabase
"""

import os
import json
import logging
from typing import Any
import asyncpg
from asyncpg.pool import Pool
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

class SupabaseConnection:
    """Manages PostgreSQL connection to Supabase"""
    
    def __init__(self):
        self.pool: Pool | None = None
        self.url = os.getenv("DATABASE_URL")
        
    async def initialize(self):
        """Initialize connection pool"""
        if not self.url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        try:
            self.pool = await asyncpg.create_pool(
                self.url,
                min_size=2,
                max_size=10,
                command_timeout=60,
            )
            logger.info("Database pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            raise
    
    async def close(self):
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database pool closed")
    
    async def execute(self, query: str, *args):
        """Execute a query"""
        if not self.pool:
            raise RuntimeError("Database pool not initialized")
        
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)
    
    async def execute_single(self, query: str, *args):
        """Execute a query and return single row"""
        if not self.pool:
            raise RuntimeError("Database pool not initialized")
        
        async with self.pool.acquire() as conn:
            return await conn.fetchval(query, *args)
    
    async def execute_many(self, query: str, args_list):
        """Execute a query multiple times"""
        if not self.pool:
            raise RuntimeError("Database pool not initialized")
        
        async with self.pool.acquire() as conn:
            return await conn.executemany(query, args_list)
    
    async def execute_with_jwt(self, query: str, jwt_claims: dict, *args):
        if not self.pool:
            raise RuntimeError("Database pool not initialized")

        async with self.pool.acquire() as conn:
            async with conn.transaction():
                # Drop to app_user — RLS now applies
                await conn.execute("SET LOCAL ROLE app_user;")

                await conn.execute(
                    "SELECT set_config('app.current_org_id', $1, true);",
                    jwt_claims["org_id"]
                )
                await conn.execute(
                    "SELECT set_config('app.current_role', $1, true);",
                    jwt_claims["role"]
                )
                await conn.execute(
                    "SELECT set_config('app.current_department', $1, true);",
                    jwt_claims["department"]
                )
                await conn.execute(
                    "SELECT set_config('app.current_ceiling', $1, true);",
                    str(jwt_claims["ceiling_level"])
                )
                await conn.execute(
                    "SELECT set_config('app.current_clearance', $1, true);",
                    ",".join(jwt_claims["compliance_clearance"])
                )

                result = await conn.fetch(query, *args)
                print(
                    f"[RLS] User={jwt_claims.get('email')} "
                    f"org={jwt_claims['org_id']} "
                    f"role={jwt_claims['role']} "
                    f"→ {len(result)} rows"
                )
                return result


# Global connection instance
db = SupabaseConnection()
