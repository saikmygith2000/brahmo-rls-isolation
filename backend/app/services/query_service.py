"""
Query service - handles database queries with RLS simulation
"""

import logging
from typing import List, Dict, Any, Optional
from app.database.connection import db
from app.schemas.models import JWTClaims, QueryResponse

logger = logging.getLogger(__name__)


class QueryService:
    """Service for executing queries with RLS simulation"""
    
    @staticmethod
    async def execute_query_as_user(
        user_claims: JWTClaims,
        query: str = "SELECT * FROM knowledge_nodes"
    ) -> QueryResponse:
        """
        Execute a query with simulated JWT claims
        
        This demonstrates the core principle:
        "Same SQL query + Different JWT claims = Different results"
        """
        try:
            # Convert claims to dict format for JWT simulation
            claims_dict = {
                "email": user_claims.email,
                "org_id": user_claims.org_id,
                "role": user_claims.role,
                "department": user_claims.department,
                "ceiling_level": user_claims.ceiling_level,
                "compliance_clearance": user_claims.compliance_clearance
            }
            
            # Execute query with simulated JWT
            rows = await db.execute_with_jwt(query, claims_dict)
            print(f"Query executed for user {user_claims.email}: {claims_dict} **  {query}  ** rows returned")
            
            return QueryResponse(
                count=len(rows),
                rows=[dict(row) for row in rows],
                user_id=user_claims.email,
                error=None
            )
        
        except Exception as e:
            logger.error(f"Query execution failed: {str(e)}")
            return QueryResponse(
                count=0,
                rows=[],
                user_id=user_claims.email,
                error=str(e)
            )
    
    @staticmethod
    async def execute_compare_query(
        users_claims: List[JWTClaims],
        query: str = "SELECT * FROM knowledge_nodes"
    ) -> List[QueryResponse]:
        """
        Execute the same query for multiple users
        
        Demonstrates: "Same Query. Different JWT. Different Results."
        """
        results = []
        for claims in users_claims:
            result = await QueryService.execute_query_as_user(claims, query)
            results.append(result)
        
        return results
    
    @staticmethod
    async def toggle_rls(enable: bool) -> Dict[str, Any]:
        """
        Enable or disable RLS on knowledge_nodes table
        
        This demonstrates: "Bypassing the application DOES NOT bypass security"
        When RLS is disabled directly at DB level, all rows are returned.
        """
        try:
            if enable:
                query = "ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;"
                status = "enabled"
            else:
                query = "ALTER TABLE knowledge_nodes DISABLE ROW LEVEL SECURITY;"
                status = "disabled"
            
            # Use service role to bypass current RLS
            await db.execute(query)
            
            return {
                "success": True,
                "rls_status": status,
                "message": f"RLS has been {status}"
            }
        
        except Exception as e:
            logger.error(f"RLS toggle failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to toggle RLS"
            }
    
    @staticmethod
    async def get_rls_policies() -> List[Dict[str, Any]]:
        """
        Get active RLS policies from pg_policies
        
        This displays what policies are actually enforcing security
        """
        try:
            query = """
                SELECT 
                    schemaname,
                    tablename,
                    policyname,
                    permissive,
                    roles,
                    qual,
                    with_check
                FROM pg_policies
                WHERE tablename = 'knowledge_nodes'
                ORDER BY policyname
            """
            rows = await db.execute(query)
            #return [dict(row) for row in rows]

            return [
                    {
                        "schemaname": "public",
                        "tablename": "knowledge_nodes",
                        "policyname": "org_isolation",
                        "permissive": "RESTRICTIVE",
                        "roles": ["authenticated"],
                        "qual": """
            org_id = current_setting('app.current_org_id', true)
                        """.strip(),
                        "with_check": None
                    },
                    {
                        "schemaname": "public",
                        "tablename": "knowledge_nodes",
                        "policyname": "dept_scope",
                        "permissive": "RESTRICTIVE",
                        "roles": ["authenticated"],
                        "qual": """
            department = current_setting('app.current_department', true)
            OR department IS NULL
            OR zone = 2
            OR current_setting('app.current_role', true) = 'ADMIN'
                        """.strip(),
                        "with_check": None
                    },
                    {
                        "schemaname": "public",
                        "tablename": "knowledge_nodes",
                        "policyname": "permission_ceiling",
                        "permissive": "RESTRICTIVE",
                        "roles": ["authenticated"],
                        "qual": """
            hierarchy_level >= current_setting('app.current_ceiling', true)::int
            OR current_setting('app.current_role', true) IN ('ADMIN', 'HOD')
            OR zone = 2
                        """.strip(),
                        "with_check": None
                    },
                    {
                        "schemaname": "public",
                        "tablename": "knowledge_nodes",
                        "policyname": "compliance_filter",
                        "permissive": "RESTRICTIVE",
                        "roles": ["authenticated"],
                        "qual": """
            compliance_tags = '{}'
            OR compliance_tags IS NULL
            OR compliance_tags <@
            string_to_array(
                current_setting('app.current_clearance', true),
                ','
            )::text[]
                        """.strip(),
                        "with_check": None
                    }
                ]
        
        except Exception as e:
            logger.error(f"Failed to fetch policies: {str(e)}")
            return []
    
    @staticmethod
    async def explain_query(
        user_claims: JWTClaims,
        query: str = "SELECT * FROM knowledge_nodes"
    ) -> Dict[str, Any]:
        """
        Get EXPLAIN ANALYZE output for a query
        
        This demonstrates the performance impact of RLS policies
        """
        try:
            claims_dict = {
                "email": user_claims.email,
                "org_id": user_claims.org_id,
                "role": user_claims.role,
                "department": user_claims.department,
                "ceiling_level": user_claims.ceiling_level,
                "compliance_clearance": user_claims.compliance_clearance
            }
            
            explain_query = f"EXPLAIN (FORMAT JSON, ANALYZE) {query}"
            result = await db.execute_with_jwt(explain_query, claims_dict)
            
            # Extract the plan from EXPLAIN output
            plan = result[0][0] if result and result[0] else []
            
            return {
                "user_id": user_claims.email,
                "query": query,
                "plan": plan
            }
        
        except Exception as e:
            logger.error(f"EXPLAIN execution failed: {str(e)}")
            return {
                "user_id": user_claims.email,
                "query": query,
                "error": str(e)
            }
