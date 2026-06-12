"""
Data models for the application
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from uuid import UUID


class UserProfile(BaseModel):
    """User profile model"""
    id: UUID
    email: str
    full_name: str
    org_id: str
    role: str  # VIEWER, EDITOR, HOD, ADMIN
    department: Optional[str] = None
    ceiling_level: int
    compliance_clearance: List[str] = Field(default_factory=list)
    created_at: datetime


class KnowledgeNode(BaseModel):
    """Knowledge node model"""
    id: str = Field(..., description="UUID")
    org_id: str
    title: str
    content: str
    department: Optional[str] = None
    zone: int = 1  # 1=restricted, 2=public, 3=internal
    hierarchy_level: int
    compliance_tags: List[str] = Field(default_factory=list)
    created_at: datetime


class JWTClaims(BaseModel):
    """JWT claims for RLS policy evaluation"""
    email: str
    org_id: str
    role: str
    department: Optional[str] = None
    ceiling_level: int
    compliance_clearance: List[str] = Field(default_factory=list)


class QueryRequest(BaseModel):
    """Request to run a query as a specific user"""
    user_id: str = Field(..., description="User email")


class CompareRequest(BaseModel):
    """Request to compare query results across users"""
    query: Optional[str] = Field(default="SELECT * FROM knowledge_nodes", description="SQL query")


class DirectQueryRequest(BaseModel):
    """Direct SQL query request"""
    user_id: str = Field(..., description="User email")
    query: str = Field(..., description="SQL query")


class QueryResponse(BaseModel):
    """Response from a query"""
    count: int
    rows: List[dict]
    user_id: str
    error: Optional[str] = None


class PolicyInfo(BaseModel):
    """RLS Policy information"""
    schemaname: str
    tablename: str
    policyname: str
    permissive: str
    roles: List[str]
    qual: Optional[str]
    with_check: Optional[str]


class ExplainRequest(BaseModel):
    """Request for EXPLAIN ANALYZE"""
    user_id: str = Field(..., description="User email")
    query: str = Field(default="SELECT * FROM knowledge_nodes", description="SQL query")


class ExplainResponse(BaseModel):
    """EXPLAIN ANALYZE response"""
    user_id: str
    query: str
    plan: List[dict]


class CompareResponse(BaseModel):
    """Response from compare endpoint"""
    query: str
    results: List[QueryResponse]

class RLSTogglePayload(BaseModel):
    enable: bool
