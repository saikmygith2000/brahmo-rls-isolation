# BRAHMO RLS Demonstration Platform

## Overview

This application demonstrates how PostgreSQL **Row Level Security (RLS)** enforces access control at the database layer, independent of the application layer.

### Core Principles

1. **Same Query, Different Results**: The same SQL query returns different results based on the user's JWT claims.
2. **Database-Level Enforcement**: Bypassing the application doesn't bypass security—RLS policies are enforced at the database layer.

## Architecture

### Backend (FastAPI)

```
backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── api/                 # API route handlers
│   │   ├── users.py         # User endpoints
│   │   └── queries.py       # Query execution endpoints
│   ├── services/            # Business logic
│   │   ├── user_service.py  # User operations
│   │   └── query_service.py # Query execution with RLS
│   ├── schemas/             # Pydantic models
│   └── database/            # Database connection
└── migrations/              # SQL migrations
```

### Frontend (Next.js + React)

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx         # Main dashboard
│   │   ├── layout.tsx       # Root layout
│   │   └── api/[[...route]]/ # API proxy
│   └── components/
│       ├── UserSelector.tsx
│       ├── QueryPanel.tsx
│       ├── ResultGrid.tsx
│       ├── PolicyViewer.tsx
│       ├── DirectQueryPanel.tsx
│       ├── ComparisonPanel.tsx
│       └── RLSControl.tsx
```

## Database Security Model

### Four RLS Policies

1. **Organization Isolation**
   - Users can only see rows matching their `org_id`
   - Prevents cross-organization data leakage

2. **Department Scoping**
   - Users see rows matching their department OR
   - Department is NULL (cross-dept content) OR
   - Zone = 2 (public content) OR
   - User is ADMIN (bypass)

3. **Permission Ceiling**
   - Users can only see rows where `hierarchy_level >= ceiling_level`
   - ADMIN bypasses this check

4. **Compliance Filtering**
   - MNPI rows visible only to users with MNPI clearance
   - CONTROLLED_SUBSTANCE rows visible only with that clearance

## Setup Instructions

### Prerequisites

- PostgreSQL 12+
- Python 3.9+
- Node.js 18+
- Supabase project

### 1. Database Setup

```bash
# Connect to your Supabase database
psql postgresql://user:password@host:port/database

# Run migrations in order
\i backend/migrations/001_create_user_profiles.sql
\i backend/migrations/002_insert_demo_users.sql
\i backend/migrations/003_create_rls_policies.sql
\i backend/migrations/004_create_indexes.sql
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Run development server
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

Visit http://localhost:3000 to see the application.

## API Endpoints

### Users

- `GET /users` - Get all demo users
- `GET /users/{email}` - Get user by email

### Queries

- `POST /queries/query` - Execute query as user
- `POST /queries/compare` - Compare results across all users
- `POST /queries/direct-query` - Run arbitrary SQL as user
- `POST /queries/policies` - Get active RLS policies
- `POST /queries/toggle-rls` - Enable/disable RLS (admin only)
- `POST /queries/explain` - Get EXPLAIN ANALYZE output

## Demo Users

| Name | Email | Role | Org | Ceiling | Clearance |
|------|-------|------|-----|---------|-----------|
| Priya | priya@brahmo.supra | VIEWER | supra | 10 | - |
| Vikram | vikram@brahmo.supra | HOD | supra | 4 | - |
| Suresh | suresh@brahmo.supra | ADMIN | supra | 1 | MNPI |
| Ananya | ananya@brahmo.supra | EDITOR | supra | 8 | - |
| Ravi | ravi@brahmo.supra | VIEWER | supra | 12 | CONTROLLED_SUBSTANCE |
| CityDoctor | citydoctor@city.clinic | EDITOR | city_clinic | 8 | - |

## Key Demonstrations

### 1. Same Query, Different Results

Run `SELECT * FROM knowledge_nodes` as different users. You'll see:
- Priya: See rows with org_id='supra' and ceiling_level ≥ 10
- Vikram: See rows with org_id='supra' and ceiling_level ≥ 4
- Suresh: See all rows (ADMIN)
- CityDoctor: See rows with org_id='city_clinic'

### 2. Direct Query Enforcement

Use the Direct Query panel to run arbitrary SQL. RLS policies still apply:
- Even with direct `SELECT *`, only authorized rows are returned
- Policies are enforced at the database layer

### 3. RLS Toggle

Disable RLS to show what happens without policies:
- All rows are returned regardless of user
- Re-enable to restore security

### 4. Policy Viewer

See the actual RLS policy SQL that PostgreSQL is evaluating for each query.

## Performance Considerations

### Indexes

Created indexes optimize RLS policy evaluation:

```sql
CREATE INDEX idx_nodes_org ON knowledge_nodes(org_id);
CREATE INDEX idx_nodes_department ON knowledge_nodes(department);
CREATE INDEX idx_nodes_level ON knowledge_nodes(hierarchy_level);
CREATE INDEX idx_nodes_compliance ON knowledge_nodes USING GIN(compliance_tags);
```

### EXPLAIN ANALYZE

Use the Performance panel to see query plans and understand how policies affect performance.

## Security Best Practices

1. **Never disable RLS in production**
2. **Use service role key only for admin operations**
3. **Always validate JWT claims at the database layer**
4. **Test policies with multiple user contexts**
5. **Monitor policy performance with EXPLAIN ANALYZE**
6. **Keep RLS policies simple and auditable**

## Troubleshooting

### Query Returns No Rows

- Check user has correct `org_id`
- Verify `ceiling_level` is appropriate
- Check `compliance_clearance` for restricted content

### RLS Not Enforcing

- Ensure RLS is enabled: `ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;`
- Check policies exist: `SELECT * FROM pg_policies WHERE tablename = 'knowledge_nodes';`
- Verify JWT claims are being set

### Performance Issues

- Check indexes are created
- Run `EXPLAIN ANALYZE` to see query plans
- Consider simplifying policy conditions

## License

This project is provided for educational and demonstration purposes.

## Questions?

This demonstration is designed to showcase the power of database-level security enforcement using PostgreSQL RLS. All security decisions are made at the database layer, making it impossible for application bugs to compromise data access control.
