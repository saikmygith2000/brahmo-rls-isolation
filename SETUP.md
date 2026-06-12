# BRAHMO RLS Demonstration Platform - Complete Setup Guide

## Quick Start

This comprehensive setup guide walks you through deploying the complete BRAHMO RLS Demonstration Platform.

**Estimated time: 30-45 minutes**

## Prerequisites

- PostgreSQL 12+ with Supabase
- Python 3.9+
- Node.js 18+
- Git

## Step 1: Database Schema Setup

### 1.1 Connect to Your Supabase Database

```bash
# Using psql
psql postgresql://[user]:[password]@[host]:[port]/[database]
```

### 1.2 Run Migrations in Order

Execute these migrations in your Supabase database:

```bash
# Migration 1: Create user_profiles table
\i backend/migrations/001_create_user_profiles.sql

# Migration 2: Insert demo users
\i backend/migrations/002_insert_demo_users.sql

# Migration 3: Create RLS policies
\i backend/migrations/003_create_rls_policies.sql

# Migration 4: Create performance indexes
\i backend/migrations/004_create_indexes.sql
```

### 1.3 Verify Schema

```sql
-- Check user_profiles table
SELECT * FROM user_profiles;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'knowledge_nodes';

-- Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'knowledge_nodes';
```

## Step 2: Backend Setup

### 2.1 Install Dependencies

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install packages
pip install -r requirements.txt
```

### 2.2 Configure Environment

```bash
# Copy example to local
cp .env.example .env

# Edit .env with your credentials
```

Required in `.backend/.env`:

```env
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENV=development
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```

### 2.3 Test Database Connection

```bash
python -c "
from app.database.connection import db
import asyncio

async def test():
    await db.initialize()
    result = await db.execute('SELECT COUNT(*) FROM user_profiles')
    print(f'Users in database: {result[0][0]}')
    await db.close()

asyncio.run(test())
"
```

### 2.4 Start Backend Server

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Backend running at: **http://localhost:8000**
API docs at: **http://localhost:8000/docs**

## Step 3: Frontend Setup

### 3.1 Install Dependencies

```bash
cd frontend

npm install
```

### 3.2 Configure Environment

```bash
# Create local env file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

### 3.3 Start Frontend Server

```bash
npm run dev
```

Frontend running at: **http://localhost:3000**

## Step 4: Verify Complete Setup

### 4.1 Test Backend APIs

```bash
# Health check
curl http://localhost:8000/health

# Get all users
curl http://localhost:8000/users

# Test query execution
curl -X POST http://localhost:8000/queries/query \
  -H "Content-Type: application/json" \
  -d '{"user_id": "priya@brahmo.supra"}'
```

### 4.2 Test Frontend

Open **http://localhost:3000** and:

1. Select "Priya Sharma" from user cards
2. Click "Execute Query"
3. Verify rows are returned
4. Click "Compare All Users" to see different result counts
5. Check "RLS Policies" tab to view enforcement policies

## Step 5: Create Supabase Auth Users (Optional)

### 5.1 Using Supabase Dashboard

Go to: **Supabase Project → Authentication → Users → Add User**

Create these 6 users with app_metadata:

| Email | app_metadata |
|-------|--------------|
| priya@brahmo.supra | `{"org_id":"supra","role":"VIEWER","department":"ortho","ceiling_level":10,"compliance_clearance":[]}` |
| vikram@brahmo.supra | `{"org_id":"supra","role":"HOD","department":"ortho","ceiling_level":4,"compliance_clearance":[]}` |
| suresh@brahmo.supra | `{"org_id":"supra","role":"ADMIN","department":"admin","ceiling_level":1,"compliance_clearance":["MNPI"]}` |
| ananya@brahmo.supra | `{"org_id":"supra","role":"EDITOR","department":"medicine","ceiling_level":8,"compliance_clearance":[]}` |
| ravi@brahmo.supra | `{"org_id":"supra","role":"VIEWER","department":"pharmacy","ceiling_level":12,"compliance_clearance":["CONTROLLED_SUBSTANCE"]}` |
| citydoctor@city.clinic | `{"org_id":"city_clinic","role":"EDITOR","department":"medicine","ceiling_level":8,"compliance_clearance":[]}` |

### 5.2 Using Python Script

```bash
cd backend

# Install Supabase SDK
pip install supabase

# Configure environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run setup script
python setup_supabase_auth.py
```

## Understanding the Demo

### Core Demonstration: Same Query, Different Results

**Scenario**: Execute `SELECT * FROM knowledge_nodes` as different users

**Results**:
- Priya (VIEWER, ceiling=10): ~28 rows
- Vikram (HOD, ceiling=4): ~74 rows
- Suresh (ADMIN, ceiling=1): ALL rows (300+)
- CityDoctor (org_id=city_clinic): ~18 rows

**Why?** RLS policies enforce:

1. **Organization Isolation** - Can only see rows with matching org_id
2. **Department Scoping** - Can only see department-specific rows
3. **Permission Ceiling** - Can only see rows at or above ceiling_level
4. **Compliance Filtering** - Can only see rows they're cleared for

### Key Features to Try

**1. Live Demo**
- Select user → Execute query → See RLS in action

**2. Compare Users**
- Run same query for all users simultaneously
- See dramatically different result counts

**3. RLS Policies Tab**
- View the actual SQL policies
- See exactly what PostgreSQL is evaluating

**4. Direct Query Panel**
- Run arbitrary SQL as a user
- Watch RLS enforce policies on direct SQL
- Disable RLS to show difference (ALL rows returned)

**5. RLS Control**
- Toggle RLS on/off (admin only)
- Demonstrates database-level security
- When disabled: All rows visible
- When enabled: Policies enforced

## Architecture Summary

### Backend (FastAPI)

```
GET  /users                    → Get all demo users
GET  /users/{email}            → Get user by email
POST /queries/query            → Execute query as user
POST /queries/compare          → Compare across all users
POST /queries/direct-query     → Arbitrary SQL as user
POST /queries/policies         → View active policies
POST /queries/toggle-rls       → Enable/disable RLS
POST /queries/explain          → EXPLAIN ANALYZE output
```

### Frontend (React)

- **UserSelector** - Browse demo users
- **QueryPanel** - Execute queries
- **ResultGrid** - Display results
- **ComparisonPanel** - Side-by-side comparison
- **PolicyViewer** - Show active policies
- **DirectQueryPanel** - Demonstrate enforcement
- **RLSControl** - Toggle RLS

## Production Deployment

### Backend (FastAPI)

```bash
# Using Gunicorn + Uvicorn
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend (Next.js)

```bash
# Build production bundle
npm run build

# Start production server
npm run start
```

### Environment Variables

Set in production:

**Backend**:
```env
DATABASE_URL=postgresql://user:password@host:port/database
ENV=production
CORS_ORIGINS=https://yourdomain.com
```

**Frontend**:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Troubleshooting

### Backend Connection Issues

```
Error: DATABASE_URL not set
Solution: Check backend/.env has DATABASE_URL
```

```
Error: Policy not found
Solution: Verify all migrations executed in order
```

### Frontend API Errors

```
Error: Failed to fetch from backend
Solution: Verify NEXT_PUBLIC_API_URL in .env.local
Solution: Check backend server is running on correct port
```

### RLS Not Enforcing

```
Solution: Verify RLS is enabled: SELECT row_security FROM pg_tables WHERE tablename = 'knowledge_nodes'
Solution: Check policies exist: SELECT * FROM pg_policies
Solution: Restart backend after schema changes
```

### Users See All Rows

```
Likely: RLS is disabled
Solution: Re-run migration 003_create_rls_policies.sql
Solution: Execute: ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;
```

## Security Notes

- Never disable RLS in production
- Service role key should never be in frontend code
- Database credentials should be in environment variables
- Use HTTPS in production
- Enable SSL/TLS for database connection
- Regularly audit RLS policies

## Next Steps

1. **Read Architecture Documentation**: [docs/architecture.md](docs/architecture.md)
2. **Explore RLS Policies**: Check `backend/migrations/003_create_rls_policies.sql`
3. **Test with Real Data**: Seed `knowledge_nodes` with test data
4. **Monitor Performance**: Use EXPLAIN ANALYZE in Performance tab
5. **Extend Security**: Add more policies or modify existing ones

## Support

For questions about:
- **PostgreSQL RLS**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Supabase**: https://supabase.com/docs
- **FastAPI**: https://fastapi.tiangolo.com/
- **Next.js**: https://nextjs.org/docs

## License

This project is provided for educational and demonstration purposes.

---

**BRAHMO RLS Demonstration Platform** © 2024

Demonstrating how PostgreSQL Row Level Security enforces database-level security that cannot be bypassed.
