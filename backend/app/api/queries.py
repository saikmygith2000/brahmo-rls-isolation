"""
Query routes - core RLS demonstration endpoints
"""

from fastapi import APIRouter, HTTPException
from app.services.user_service import UserService
from app.services.query_service import QueryService
from app.schemas.models import (
    QueryRequest,
    QueryResponse,
    CompareRequest,
    CompareResponse,
    DirectQueryRequest,
    ExplainRequest,
    ExplainResponse,
    PolicyInfo,
    RLSTogglePayload
)
from typing import List, Dict, Any

router = APIRouter(prefix="/queries", tags=["queries"])


@router.post("/query", response_model=QueryResponse)
async def run_query(request: QueryRequest):
    """
    Run SELECT * FROM knowledge_nodes as a specific user
    
    Demonstrates: Same query, different JWT claims = different results
    """
    try:
        # Get user's JWT claims
        jwt_claims = await UserService.get_jwt_claims(request.user_id)
        if not jwt_claims:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Execute query with simulated JWT
        result = await QueryService.execute_query_as_user(jwt_claims)
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare", response_model=CompareResponse)
async def compare_queries(request: CompareRequest):
    """
    Run the same query for all demo users
    
    Shows different result counts based on RLS policies
    """
    try:
        # Get all users
        users = await UserService.get_all_users()
        if not users:
            raise HTTPException(status_code=500, detail="No users found")
        
        # Get JWT claims for all users
        users_claims = [
            await UserService.get_jwt_claims(user.email)
            for user in users
        ]
        users_claims = [c for c in users_claims if c]  # Filter out None
        
        # Execute compare
        query = request.query or "SELECT * FROM knowledge_nodes"
        results = await QueryService.execute_compare_query(users_claims, query)
        
        return CompareResponse(
            query=query,
            results=results
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/direct-query", response_model=QueryResponse)
async def direct_query(request: DirectQueryRequest):
    """
    Run arbitrary SQL query as a specific user
    
    Demonstrates database-level enforcement:
    Even with direct SQL, RLS policies are enforced
    """
    try:
        jwt_claims = await UserService.get_jwt_claims(request.user_id)
        if not jwt_claims:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Execute arbitrary query with RLS simulation
        result = await QueryService.execute_query_as_user(jwt_claims, request.query)
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/policies", response_model=List[PolicyInfo])
async def get_policies():
    """
    Get active RLS policies from pg_policies
    
    Shows what policies are enforcing security
    """
    try:
        policies = await QueryService.get_rls_policies()
        # Filter for knowledge_nodes policies
        policies = [p for p in policies if p.get('tablename') == 'knowledge_nodes']
        return policies
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/toggle-rls")
async def toggle_rls(payload: RLSTogglePayload) -> Dict[str, Any]:
    """
    Enable or disable RLS on knowledge_nodes table
    
    WARNING: This is for demonstration only.
    Shows that security can be toggled at database level.
    """
    try:
        result = await QueryService.toggle_rls(payload.enable)
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain", response_model=ExplainResponse)
async def explain_query(request: ExplainRequest):
    """
    Get EXPLAIN ANALYZE output
    
    Shows performance impact of RLS policies
    """
    try:
        jwt_claims = await UserService.get_jwt_claims(request.user_id)
        if not jwt_claims:
            raise HTTPException(status_code=404, detail="User not found")
        
        result = await QueryService.explain_query(jwt_claims, request.query)
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
