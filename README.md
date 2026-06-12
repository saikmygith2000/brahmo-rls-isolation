# BRAHMO RLS Isolation - Complete Project

A production-quality demonstration platform showcasing PostgreSQL Row Level Security (RLS) as the foundation for database-level access control.

## Project Overview

**BRAHMO RLS** is **NOT** a CRUD application. It's a security demonstration that proves:

1. **Same SQL query + Different JWT claims = Different results**
2. **Bypassing the application DOES NOT bypass security**

## Project Structure

```
brahmo-rls-isolation/
├── backend/                          # FastAPI backend
│   ├── app/
│   │   ├── main.py                   # FastAPI application
│   │   ├── api/
│   │   │   ├── users.py              # User endpoints
│   │   │   └── queries.py            # Query execution endpoints
│   │   ├── services/
│   │   │   ├── user_service.py       # User operations
│   │   │   └── query_service.py      # Query execution with RLS
│   │   ├── schemas/
│   │   │   └── models.py             # Pydantic schemas
│   │   └── database/
│   │       └── connection.py         # Database connection pool
│   ├── migrations/
│   │   ├── 001_create_user_profiles.sql       # User table
│   │   ├── 002_insert_demo_users.sql          # Demo data
│   │   ├── 003_create_rls_policies.sql        # Security policies
│   │   └── 004_create_indexes.sql             # Performance indexes
│   ├── docs/
│   │   └── architecture.md           # Detailed architecture documentation
│   ├── requirements.txt              # Python dependencies
│   ├── .env.example                  # Environment template
│   ├── setup_supabase_auth.py        # Auth user setup
│   └── setup_supabase_auth.sh        # Auth user setup (bash)
│
├── frontend/                         # Next.js React frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Main dashboard
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── globals.css           # Global styles
│   │   │   └── api/[[...route]]/     # API proxy routes
│   │   └── components/
│   │       ├── UserSelector.tsx      # User selection cards
│   │       ├── QueryPanel.tsx        # Query execution UI
│   │       ├── ResultGrid.tsx        # Results table
│   │       ├── PolicyViewer.tsx      # RLS policy display
│   │       ├── DirectQueryPanel.tsx  # Direct SQL demo
│   │       ├── ComparisonPanel.tsx   # Multi-user comparison
│   │       └── RLSControl.tsx        # RLS toggle
│   ├── package.json                  # NPM dependencies
│   ├── next.config.ts                # Next.js config
│   ├── tailwind.config.ts            # Tailwind CSS config
│   ├── tsconfig.json                 # TypeScript config
│   ├── .env.example                  # Environment template
│   ├── .env.local                    # Local environment
│   └── README.md                     # Frontend docs
│
├── SETUP.md                          # Complete setup guide
└── README.md                         # This file

```

## Technology Stack

### Backend
- **FastAPI** - Async Python web framework
- **asyncpg** - PostgreSQL async driver
- **Pydantic** - Data validation
- **Uvicorn** - ASGI application server

### Database
- **PostgreSQL 12+** (via Supabase)
- **Row Level Security (RLS)** - Four comprehensive policies
- **Indexes** - Optimized for RLS policy evaluation

### Frontend
- **Next.js 16** - React framework
- **React 19** - UI library
- **Tailwind CSS 4** - Styling
- **TypeScript** - Type safety

## Quick Start

### Prerequisites
- PostgreSQL 12+ (Supabase)
- Python 3.9+
- Node.js 18+

### 1. Database Setup

```bash
# Apply migrations to Supabase database
psql postgresql://user:password@host/database < backend/migrations/001_create_user_profiles.sql
psql postgresql://user:password@host/database < backend/migrations/002_insert_demo_users.sql
psql postgresql://user:password@host/database < backend/migrations/003_create_rls_policies.sql
psql postgresql://user:password@host/database < backend/migrations/004_create_indexes.sql
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run server
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run server
npm run dev
```

**Access at**: http://localhost:3000

## Core Demonstrations

### 1. Same Query, Different Results

```
User: Priya (VIEWER, ceiling_level=10, org_id=supra)
Query: SELECT * FROM knowledge_nodes
Result: 28 rows

User: Vikram (HOD, ceiling_level=4, org_id=supra)
Query: SELECT * FROM knowledge_nodes
Result: 74 rows

User: Suresh (ADMIN, ceiling_level=1, org_id=supra)
Query: SELECT * FROM knowledge_nodes
Result: 300+ rows (all)
```

**Why different?** RLS policies enforce four security boundaries:

#### 1. Organization Isolation
- Users see ONLY rows matching their `org_id`
- Priya (org_id='supra') cannot see rows with org_id='city_clinic'

#### 2. Department Scoping
- Users see department-specific rows
- ADMIN bypasses department restrictions
- Zone 2 rows are publicly accessible

#### 3. Permission Ceiling
- `hierarchy_level >= user.ceiling_level`
- Priya (ceiling=10) sees more rows than Vikram (ceiling=4)
- ADMIN bypasses ceiling restrictions

#### 4. Compliance Filtering
- MNPI rows visible only to users with MNPI clearance
- CONTROLLED_SUBSTANCE rows filtered similarly
- ADMIN bypasses compliance checks

### 2. Direct Query Enforcement

Try the **Direct Query** panel:

```sql
SELECT * FROM knowledge_nodes
```

Run as Priya:
- With RLS enabled: 28 rows
- With RLS disabled: All rows (policy enforcement gone)

**Key insight**: RLS is evaluated at the database layer, not the application layer.

### 3. Multi-User Comparison

Click **"Compare All Users"** to see:

```
Query: SELECT * FROM knowledge_nodes

Priya:      28 rows ✓ RLS enforced
Vikram:     74 rows ✓ RLS enforced
Suresh:    345 rows ✓ RLS enforced (ADMIN)
Ananya:     45 rows ✓ RLS enforced
Ravi:       52 rows ✓ RLS enforced
CityDoctor: 18 rows ✓ RLS enforced (different org)
```

Same query. Same database. Different results. **RLS in action.**

### 4. Policy Viewer

See the actual PostgreSQL policy SQL:

```sql
CREATE POLICY knowledge_nodes_org_isolation ON knowledge_nodes
  FOR SELECT
  USING (
    org_id = auth.jwt() ->> 'org_id'
  );
```

These are **real database policies** that PostgreSQL evaluates for every row.

### 5. RLS Toggle

**WARNING: For demonstration only**

- Disable RLS: All security policies removed → All rows returned
- Enable RLS: Policies restored → Filtering re-enabled

This demonstrates that security is genuinely at the database layer.

## API Endpoints

### Users
```
GET  /users                           Get all demo users
GET  /users/{email}                   Get specific user
```

### Queries
```
POST /queries/query                   Execute query as user
POST /queries/compare                 Compare results across users
POST /queries/direct-query            Run arbitrary SQL as user
POST /queries/policies                View active RLS policies
POST /queries/toggle-rls              Enable/disable RLS
POST /queries/explain                 EXPLAIN ANALYZE output
```

## Demo Users

| Name | Email | Role | Org | Ceiling | Clearance |
|------|-------|------|-----|---------|-----------|
| Priya Sharma | priya@brahmo.supra | VIEWER | supra | 10 | - |
| Vikram Desai | vikram@brahmo.supra | HOD | supra | 4 | - |
| Suresh Menon | suresh@brahmo.supra | ADMIN | supra | 1 | MNPI |
| Ananya Kapoor | ananya@brahmo.supra | EDITOR | supra | 8 | - |
| Ravi Patel | ravi@brahmo.supra | VIEWER | supra | 12 | CONTROLLED_SUBSTANCE |
| Dr. City Clinic | citydoctor@city.clinic | EDITOR | city_clinic | 8 | - |

## Database Schema

### user_profiles

```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  org_id text NOT NULL,
  role text NOT NULL,                    -- VIEWER, EDITOR, HOD, ADMIN
  department text,
  ceiling_level integer NOT NULL,
  compliance_clearance text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

### knowledge_nodes (Existing)

Expected schema:
```sql
CREATE TABLE knowledge_nodes (
  id uuid PRIMARY KEY,
  org_id text NOT NULL,
  title text NOT NULL,
  content text,
  department text,
  zone integer DEFAULT 1,                -- 1=restricted, 2=public
  hierarchy_level integer DEFAULT 1,
  compliance_tags text[] DEFAULT '{}',   -- MNPI, CONTROLLED_SUBSTANCE, etc.
  created_at timestamptz DEFAULT now()
);
```

## RLS Policies

Four independent policies enforce security:

### Policy 1: Organization Isolation
```sql
org_id = auth.jwt() ->> 'org_id'
```

### Policy 2: Department Scoping
```sql
WHEN role = 'ADMIN' THEN true
WHEN department IS NULL THEN true
WHEN zone = 2 THEN true
ELSE department = auth.jwt() ->> 'department'
```

### Policy 3: Permission Ceiling
```sql
WHEN role = 'ADMIN' THEN true
ELSE hierarchy_level >= auth.jwt() ->> 'ceiling_level'
```

### Policy 4: Compliance Filtering
```sql
WHEN role = 'ADMIN' THEN true
WHEN 'MNPI' IN compliance_tags AND 'MNPI' NOT IN user_clearances THEN false
WHEN 'CONTROLLED_SUBSTANCE' IN compliance_tags AND no clearance THEN false
ELSE true
```

## JWT Claim Structure

Backend simulates JWT claims for demonstration:

```json
{
  "email": "priya@brahmo.supra",
  "org_id": "supra",
  "role": "VIEWER",
  "department": "ortho",
  "ceiling_level": 10,
  "compliance_clearance": []
}
```

PostgreSQL reads these via `auth.jwt()` for policy evaluation.

## Performance

### Indexes
```sql
CREATE INDEX idx_nodes_org ON knowledge_nodes(org_id);
CREATE INDEX idx_nodes_department ON knowledge_nodes(department);
CREATE INDEX idx_nodes_level ON knowledge_nodes(hierarchy_level);
CREATE INDEX idx_nodes_compliance ON knowledge_nodes USING GIN(compliance_tags);
```

### EXPLAIN ANALYZE
Use the Performance panel to see query plans and how RLS affects performance.

## Production Readiness

### ✓ Implemented
- [x] Async FastAPI backend
- [x] Comprehensive RLS policies
- [x] JWT claim simulation
- [x] Performance indexes
- [x] Responsive React UI
- [x] TypeScript throughout
- [x] Error handling
- [x] Environment configuration
- [x] Architecture documentation

### ⚠️ Before Production
- [ ] Use real JWT tokens (not simulated)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up monitoring and logging
- [ ] Regular backups
- [ ] Query performance testing
- [ ] Security audit
- [ ] Load testing

## Security Best Practices

1. **Never disable RLS in production**
2. **Always validate JWT claims at database layer**
3. **Use service role key only for admin operations**
4. **Test with multiple user contexts**
5. **Monitor policy performance**
6. **Keep RLS policies simple and auditable**
7. **Rotate credentials regularly**

## Troubleshooting

See [SETUP.md](SETUP.md) for detailed troubleshooting guide.

Common issues:
- Backend can't connect to database → Check DATABASE_URL
- Frontend can't reach backend → Check NEXT_PUBLIC_API_URL
- RLS not enforcing → Verify policies are created and RLS is enabled
- Users see all rows → Check if RLS was accidentally disabled

## Documentation

- [SETUP.md](SETUP.md) - Complete setup and deployment guide
- [backend/README.md](backend/README.md) - Backend documentation
- [backend/docs/architecture.md](backend/docs/architecture.md) - Detailed architecture
- [frontend/README.md](frontend/README.md) - Frontend documentation

## Key Insight

This platform proves that **database-level security is fundamentally more secure than application-level security** because:

1. **Single source of truth** - Policies defined once in the database
2. **Bypass prevention** - Application bugs cannot bypass RLS
3. **Transparent enforcement** - Works with all query methods (SQL, ORM, etc.)
4. **Audit trail** - All RLS evaluations can be logged and audited
5. **Performance optimization** - Policies pushed down to query planner

## License

This project is provided for educational and demonstration purposes.

---

**BRAHMO RLS Demonstration Platform** © 2024

*Demonstrating how PostgreSQL Row Level Security enforces database-level access control that cannot be bypassed.*
