# BRAHMO RLS Isolation

BRAHMO RLS Isolation is a full-stack demonstration of PostgreSQL Row Level Security (RLS). It shows how the same SQL query can return different rows for different users because access control is enforced inside the database.

This is not a generic CRUD app. The project is built around two security ideas:

```text
Same SQL query + different user claims = different results
Bypassing application UI does not bypass database-level RLS
```

## What This Project Contains

```text
brahmo-rls-isolation/
  backend/
    app/
      main.py                    FastAPI app setup
      api/users.py               user endpoints
      api/queries.py             query, compare, policy, RLS toggle, explain endpoints
      services/user_service.py   loads demo users and builds claims
      services/query_service.py  runs user-scoped queries
      database/connection.py     asyncpg pool and per-query RLS context
      schemas/models.py          Pydantic request/response models
    migrations/
      001_create_user_profiles.sql
      002_insert_demo_users.sql
      003_create_rls_policies.sql
      004_create_indexes.sql
    requirements.txt

  frontend/
    src/app/page.tsx
    src/app/api/[[...route]]/route.ts
    src/components/
      UserSelector.tsx
      QueryPanel.tsx
      ResultGrid.tsx
      ComparisonPanel.tsx
      PolicyViewer.tsx
      DirectQueryPanel.tsx
      RLSControl.tsx
    package.json

  docs/
    architecture.md

  SETUP.md
  README.md
```

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | FastAPI, asyncpg, Pydantic, Uvicorn |
| Database | PostgreSQL / Supabase, Row Level Security |

No LLM API key is required. This project demonstrates database security only.

## How The Demo Works

1. The frontend loads demo users from the backend.
2. A user is selected in the dashboard.
3. The backend reads that user's profile from `user_profiles`.
4. The backend builds a claim object containing org, role, department, ceiling level, and compliance clearance.
5. The backend opens a PostgreSQL transaction and sets the user context for that query.
6. PostgreSQL RLS policies filter `knowledge_nodes` before rows are returned.
7. The UI displays only the rows that PostgreSQL allowed.

The important point: the backend does not fetch all rows and filter them in Python. PostgreSQL is the enforcement layer.

## What The Assessment Is Proving

The finished demo should make three things obvious:

```text
Same SQL, different user context, different rows.
Restricted rows are silently excluded, not returned as errors.
Direct database access with the same user context is still filtered by RLS.
```

Silent exclusion is important. A restricted user should not receive `403` rows, placeholders, hidden counts, or metadata that hints at protected records. They should only receive the rows they are allowed to see.

## Claim Shape

Each demo user is represented by a claim object like this:

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

The current backend derives this from the `user_profiles` table. For a production system, these claims should come from a real signed authentication token or from one consistent trusted database session context.

## RLS Security Model

The protected table is `knowledge_nodes`. Rows are filtered by four security dimensions.

### 1. Organization Isolation

Users can only see rows for their own organization.

```text
row.org_id must match user.org_id
```

Example: a `supra` user should not see `city_clinic` rows.

### 2. Department Scoping

Department-specific content is limited to matching departments, unless the row is public/cross-department or the user has an admin role.

```text
row.department matches user.department
OR row.department is null
OR row.zone = 2
OR user.role = ADMIN
```

### 3. Permission Ceiling

Rows have a `hierarchy_level`, and users have a `ceiling_level`.

```text
row.hierarchy_level >= user.ceiling_level
```

The demo also treats some elevated roles and public-zone rows as broader visibility cases.

### 4. Compliance Filtering

Rows tagged with compliance labels require matching user clearances.

```text
untagged rows are visible
tagged rows require matching compliance_clearance values
```

Example tags include `MNPI` and `CONTROLLED_SUBSTANCE`.

## Important Implementation Note

There are two RLS-context patterns present in the repository:

| Area | Pattern |
| --- | --- |
| `backend/migrations/003_create_rls_policies.sql` | Supabase-style `auth.jwt()` claims |
| Current backend runtime | transaction-local `app.current_*` settings and `SET LOCAL ROLE app_user` |
| Current backend policy viewer | hardcoded split-policy display text |

The architecture doc explains this in detail. For a production deployment, choose one pattern and make the database policies and backend runtime match exactly.

For the Option A demo described in the setup guide, use the `current_setting('app.current_*')` policy pattern because the backend runtime sets those values before each query.

Read: [docs/architecture.md](docs/architecture.md)

## Demo Users

| Name | Email | Role | Org | Department | Ceiling | Clearance |
| --- | --- | --- | --- | --- | --- | --- |
| Priya Sharma | priya@brahmo.supra | VIEWER | supra | ortho | 10 | none |
| Vikram Desai | vikram@brahmo.supra | HOD | supra | ortho | 4 | none |
| Suresh Menon | suresh@brahmo.supra | ADMIN | supra | admin | 1 | MNPI |
| Ananya Kapoor | ananya@brahmo.supra | EDITOR | supra | medicine | 8 | none |
| Ravi Patel | ravi@brahmo.supra | VIEWER | supra | pharmacy | 12 | CONTROLLED_SUBSTANCE |
| Dr. City Clinic | citydoctor@city.clinic | EDITOR | city_clinic | medicine | 8 | none |

## Quick Start

### Prerequisites

- PostgreSQL 12+ or a Supabase PostgreSQL database
- Python 3.11+ recommended
- Node.js 18+
- `psql` for running migrations

### 1. Prepare the Database

Connect to your PostgreSQL database:

```bash
psql postgresql://user:password@host:port/database
```

Create or verify the protected table first. The repo migrations create users, policies, and indexes, but the demo also needs `knowledge_nodes` data.

```sql
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id text PRIMARY KEY,
  org_id text NOT NULL,
  type text CHECK (type IN ('CONSTRAINT', 'DECISION', 'ANTI_PATTERN', 'FACT')),
  title text NOT NULL,
  content text,
  hierarchy_level integer NOT NULL,
  department text,
  zone integer DEFAULT 1,
  compliance_tags text[] DEFAULT '{}',
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now()
);
```

Then load data and policies in this order:

1. Create `user_profiles`: `\i backend/migrations/001_create_user_profiles.sql`
2. Insert demo users: `\i backend/migrations/002_insert_demo_users.sql`
3. Insert the 30 `knowledge_nodes` seed rows from the setup guide.
4. Apply the hierarchy-level normalization updates shown below.
5. Create or verify the `app_user` database role shown below.
6. Enable RLS and create the combined `knowledge_nodes_access` policy that reads `current_setting('app.current_*', true)`.
7. Create indexes: `\i backend/migrations/004_create_indexes.sql`
8. Add the `zone` index shown below.

Important: seed `knowledge_nodes` before enabling RLS policies, otherwise inserts may be blocked or unexpectedly filtered.

Apply these seed-data adjustments so the demo counts line up with the intended visibility examples:

```sql
UPDATE knowledge_nodes SET hierarchy_level = 10
WHERE id IN ('S-O01','S-O02','S-O03','S-O06');

UPDATE knowledge_nodes SET hierarchy_level = 8
WHERE id IN ('S-M01', 'S-M02');
```

The backend executes user-scoped queries after `SET LOCAL ROLE app_user`, so Supabase/PostgreSQL must have that role. The backend connection role also needs permission to switch to it.

```sql
DO $$
BEGIN
  CREATE ROLE app_user;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT ON knowledge_nodes TO app_user;

-- Replace backend_connection_role with the actual database role used by DATABASE_URL.
GRANT app_user TO backend_connection_role;
```

For this runtime demo, use this combined Supabase RLS policy. It keeps the four boundaries in one policy, joined by `AND`, so every returned row must pass organization, department, ceiling, and compliance checks.

```sql
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS knowledge_nodes_access ON knowledge_nodes;

CREATE POLICY knowledge_nodes_access
ON knowledge_nodes
FOR SELECT
USING (
  org_id = current_setting('app.current_org_id', true)

  AND

  (
    department = current_setting('app.current_department', true)
    OR department IS NULL
    OR zone = 2
    OR current_setting('app.current_role', true) = 'ADMIN'
  )

  AND

  (
    hierarchy_level >= current_setting('app.current_ceiling', true)::int
    OR current_setting('app.current_role', true) IN ('ADMIN', 'HOD')
    OR zone = 2
  )

  AND

  (
    compliance_tags IS NULL
    OR compliance_tags = '{}'
    OR compliance_tags <@
       string_to_array(
         current_setting('app.current_clearance', true),
         ','
       )::text[]
  )
);
```

`backend/migrations/004_create_indexes.sql` creates the main RLS indexes. Add this extra index for the `zone = 2` predicate used by the active policy:

```sql
CREATE INDEX IF NOT EXISTS idx_nodes_zone
ON knowledge_nodes(zone);
```

Verify the demo users and policies:

```sql
SELECT email, org_id, role, department, ceiling_level, compliance_clearance
FROM user_profiles
ORDER BY full_name;

SELECT policyname, tablename, qual
FROM pg_policies
WHERE tablename = 'knowledge_nodes';
```

Note: `backend/migrations/003_create_rls_policies.sql` currently contains a Supabase `auth.jwt()` version of the policies. That version is useful for a real Supabase Auth setup, but the included FastAPI runtime currently simulates user context with `app.current_*` settings. Use one pattern consistently.

### 2. Start the Backend

From the repository root:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment.

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

macOS or Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `backend/.env` and set at least:

```env
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENV=development
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```

Start FastAPI:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Useful backend URLs:

```text
http://localhost:8000
http://localhost:8000/health
http://localhost:8000/docs
```

### 3. Start the Frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start Next.js:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## What To Try In The UI

### Scenario 1: Same Query, Multiple Users

Select a user and run:

```sql
SELECT * FROM knowledge_nodes
```

Different users should receive different row counts because their claim values are different.

With the 30-node setup-guide seed, expected counts are approximate:

| User | Expected result |
| --- | --- |
| Priya | around 10 rows, no Medicine/Cardiology, no restricted Level 4 department rows, no MNPI |
| Vikram | around 15 rows, broader Ortho/HOD visibility, no MNPI |
| Suresh | 25 Supra rows, zero City Clinic rows |
| Ananya | around 10 Medicine-visible rows, no MNPI |
| City Clinic Doctor | around 4 rows, zero Supra rows |

Click `Compare All Users` to run the same query across every demo user. This is the clearest proof of the RLS behavior.

### Scenario 2: Silent Exclusion

Inspect Priya's result set. It should look complete from her point of view:

```text
no access denied rows
no restricted_count field
no placeholders for hidden nodes
no indication that Cardiology, HOD-level, MNPI, or City Clinic rows exist
```

### Scenario 3: Direct Query Enforcement

Run SQL directly through the direct-query panel. RLS should still apply because enforcement happens in PostgreSQL.

For a manual SQL-editor demonstration, set the user context first, then run the same query:

```sql
SELECT set_config('app.current_org_id', 'supra', true);
SELECT set_config('app.current_role', 'VIEWER', true);
SELECT set_config('app.current_department', 'ortho', true);
SELECT set_config('app.current_ceiling', '10', true);
SELECT set_config('app.current_clearance', '', true);

SELECT COUNT(*), array_agg(id ORDER BY id)
FROM knowledge_nodes;
```

Disabling RLS should show all seeded rows, which proves RLS was the enforcement mechanism:

```sql
ALTER TABLE knowledge_nodes DISABLE ROW LEVEL SECURITY;
SELECT COUNT(*) FROM knowledge_nodes;
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;
```

### Scenario 4: Zone 2 Edge Case

In the active Supabase policy for this project, Zone 2 rows bypass department scoping and the permission ceiling. They are still filtered by organization and compliance clearance.

```text
Priya can see allowed Zone 2 Supra globals.
Priya should not see Zone 2 MNPI rows without clearance.
Priya can see Zone 2 rows even when they are above her normal ceiling.
City Clinic users should never see Supra Zone 2 rows.
```

### Policies

Open the policy viewer to see the RLS conditions currently shown by the backend.

### RLS Control

The toggle demonstrates the impact of enabling or disabling RLS on `knowledge_nodes`.

Do not expose this kind of control in a real user-facing production app.

## API Reference

### Users

| Method | Path | Description |
| --- | --- | --- |
| GET | `/users` | List demo users |
| GET | `/users/{user_email}` | Fetch one demo user |

### Queries

| Method | Path | Description |
| --- | --- | --- |
| POST | `/queries/query` | Run the default query as one user |
| POST | `/queries/compare` | Run one query for all demo users |
| POST | `/queries/direct-query` | Run caller-provided SQL as one user |
| GET | `/queries/policies` | Show RLS policy metadata |
| POST | `/queries/toggle-rls` | Enable or disable RLS on `knowledge_nodes` |
| POST | `/queries/explain` | Return `EXPLAIN` output for a user-scoped query |

Example:

```bash
curl -X POST http://localhost:8000/queries/query \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"priya@brahmo.supra\"}"
```

## Database Expectations

The migrations create `user_profiles`, demo users, policies, and indexes. The protected `knowledge_nodes` table is expected to exist already.
The setup-guide demo expects 30 rows: 25 for `supra` and 5 for `city_clinic`.

Expected RLS-relevant columns:

```sql
org_id text NOT NULL,
type text,
title text NOT NULL,
content text,
department text,
zone integer DEFAULT 1,
hierarchy_level integer DEFAULT 1,
compliance_tags text[] DEFAULT '{}',
status text DEFAULT 'ACTIVE'
```

Indexes used by the RLS predicates:

```sql
CREATE INDEX idx_nodes_org ON knowledge_nodes(org_id);
CREATE INDEX idx_nodes_department ON knowledge_nodes(department);
CREATE INDEX idx_nodes_zone ON knowledge_nodes(zone);
CREATE INDEX idx_nodes_level ON knowledge_nodes(hierarchy_level);
CREATE INDEX idx_nodes_compliance ON knowledge_nodes USING GIN(compliance_tags);
CREATE INDEX idx_nodes_org_dept ON knowledge_nodes(org_id, department);
CREATE INDEX idx_nodes_org_level ON knowledge_nodes(org_id, hierarchy_level);
```

## Troubleshooting

### Backend cannot connect to the database

Check `backend/.env` and confirm `DATABASE_URL` is present and valid.

### Frontend says it cannot fetch from backend

Confirm the backend is running on port `8000`, then check `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Restart the frontend after changing `.env.local`.

### `/queries/query` returns zero rows

Check that `knowledge_nodes` has rows for the selected user's `org_id`, department, hierarchy level, and compliance clearance.

Also check that the installed RLS policies read the same context that the backend sets:

```sql
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'knowledge_nodes';
```

For this demo runtime, policy conditions should reference `current_setting('app.current_org_id', true)`, `app.current_department`, `app.current_role`, `app.current_ceiling`, and `app.current_clearance`.

If the backend error mentions `app_user`, confirm the role exists and the `DATABASE_URL` role can switch to it:

```sql
GRANT app_user TO backend_connection_role;
GRANT SELECT ON knowledge_nodes TO app_user;
```

### Users can see too many rows

Check that RLS is enabled:

```sql
SELECT relrowsecurity
FROM pg_class
WHERE relname = 'knowledge_nodes';
```

Check policies:

```sql
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'knowledge_nodes';
```

Also confirm the backend's runtime context pattern matches the policies installed in the database. If the policies use `auth.jwt()` but the backend sets `app.current_*`, RLS will not behave as the demo expects. See [docs/architecture.md](docs/architecture.md).

### Policy viewer does not match database policies

The current backend has a hardcoded policy display in `QueryService.get_rls_policies()`. Treat it as the runtime demo explanation unless you change the service to return `pg_policies` directly.

## Pre-Demo Checklist

Use this before showing the project:

- 2 organizations loaded: 25 `supra` rows and 5 `city_clinic` rows.
- 6 demo users loaded with different roles, departments, ceilings, and clearances.
- RLS enabled on `knowledge_nodes`.
- `app_user` role exists, can select `knowledge_nodes`, and the backend connection role can `SET ROLE app_user`.
- Organization isolation verified: City Clinic sees zero Supra rows.
- Department scoping verified: Priya sees zero Cardiology/Medicine department rows.
- Permission ceiling verified: Priya sees zero Level 4 HOD rows.
- Compliance filtering verified: Priya sees zero MNPI rows.
- Zone 2 globals verified: department and ceiling bypass work, but org/compliance still apply.
- Admin verified: admin can bypass department and ceiling within org, but not org isolation.
- Same SQL returns different counts for multiple users.
- Direct query path still returns filtered rows.
- Disabling RLS returns all seeded rows.
- Results use silent exclusion: no errors, hidden counts, or restricted-row hints.
- Indexes exist on `org_id`, `department`, `zone`, `hierarchy_level`, and `compliance_tags`.

## Common Pitfalls

- Filtering rows in application code instead of PostgreSQL RLS.
- Returning access-denied errors for hidden rows instead of silently excluding them.
- Letting ADMIN bypass organization isolation.
- Forgetting `department IS NULL` or `zone = 2` for hospital-wide/global rows.
- Allowing Zone 2 to bypass organization or compliance checks.
- Missing the GIN index for `compliance_tags`.
- Mixing `auth.jwt()` policies with a backend that sets `app.current_*` values.
- Testing only through the UI and never through the direct-query path.

## Production Notes

Before using this architecture in production:

- Use real authentication and signed claims.
- Keep the backend and database policy claim strategy consistent.
- Do not expose arbitrary SQL execution to normal users.
- Do not expose RLS toggling to normal users.
- Ensure application roles do not have `BYPASSRLS`.
- Consider `ALTER TABLE knowledge_nodes FORCE ROW LEVEL SECURITY`.
- Add automated tests for org isolation, department scoping, ceiling checks, and compliance filtering.
- Monitor query plans with `EXPLAIN ANALYZE`.

## More Documentation

- [docs/architecture.md](docs/architecture.md) - detailed architecture, RLS design, and claim flow
- [SETUP.md](SETUP.md) - longer setup walkthrough
- [backend/README.md](backend/README.md) - backend-focused notes
- [frontend/README.md](frontend/README.md) - frontend starter notes

## License

This project is provided for educational and demonstration purposes.
