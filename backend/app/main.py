"""
BRAHMO RLS Demonstration Platform - Backend
FastAPI application with PostgreSQL Row Level Security
"""

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.connection import db
from app.api import users, queries

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    try:
        await db.initialize()
        logger.info("Application started successfully")
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise
    
    yield
    
    # Shutdown
    try:
        await db.close()
        logger.info("Application shutdown successfully")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


# Create FastAPI app
app = FastAPI(
    title="BRAHMO RLS Demonstration Platform",
    description="Database-level security enforcement using PostgreSQL Row Level Security",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router)
app.include_router(queries.router)


@app.get("/", tags=["health"])
async def root():
    """Root endpoint"""
    return {
        "name": "BRAHMO RLS Demonstration Platform",
        "version": "1.0.0",
        "description": "Database-level security enforcement using PostgreSQL Row Level Security",
        "docs": "/docs",
        "principles": [
            "Same SQL query + Different JWT claims = Different results",
            "Bypassing the application DOES NOT bypass security"
        ]
    }


@app.get("/health", tags=["health"])
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "BRAHMO RLS Backend"
    }


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("ENV", "development") == "development"
    )
