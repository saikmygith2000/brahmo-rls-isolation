# BRAHMO RLS Isolation Architecture

## Purpose

BRAHMO RLS Isolation is a demonstration platform for PostgreSQL Row Level Security (RLS). It is designed to prove one central security property:

```text
Same SQL query + different user claims = different rows returned
```

The project is not primarily a CRUD application. The frontend, backend, and database migrations exist to demonstrate that access control can be enforced by PostgreSQL itself, so application bugs or direct SQL paths do not become the only security boundary.

## High-Level System

```text
Browser
  |
  | Next.js UI components
  v
Next.js API proxy: /api/*
  |
  | forwards to NEXT_PUBLIC_API_URL
  v
FastAPI backend
  |
  | asyncpg connection pool
  | per-query user claim context
  v
PostgreSQL / Supabase
  |
  | Row Level Security policies
  v
knowledge_nodes rows filtered by org, department, hierarchy, compliance
```

## Project Layout

```text
backend/
  app/
    main.py                    FastAPI app, CORS, router registration, lifecycle
    api/users.py               demo-user endpoints
    api/queries.py             query, compare, policy, RLS toggle, explain endpoints
    services/user_service.py   reads user_profiles and builds claim objects
    services/query_service.py  executes user-scoped queries and policy helpers
    database/connection.py     asyncpg pool and transaction-local RLS context
    schemas/models.py          Pydantic API models
  migrations/
    001_create_user_profiles.sql
    002_insert_demo_users.sql
    003_create_rls_policies.sql
    004_create_indexes.sql

frontend/
  src/app/page.tsx             main dashboard
  src/app/api/[[...route]]     proxy from Next.js to FastAPI
  src/components/              user selection, query, results, policies, compare, RLS toggle
```

## Core Data Model

### `user_profiles`

`user_profiles` stores the demo identity attributes used to build the claim context for each query.

Important fields:

```text
email                  stable user identifier
org_id                 tenant or organization boundary
role                   VIEWER, EDITOR, HOD, ADMIN
department             functional department, such as ortho or medicine
ceiling_level          hierarchy threshold used by RLS
compliance_clearance   text array of sensitive-data clearances
```

Demo users are inserted by `backend/migrations/002_insert_demo_users.sql`.

### `knowledge_nodes`

`knowledge_nodes` is the protected table. The repo assumes this table already exists in the database.

Expected RLS-relevant fields:

```text
org_id             organization that owns the row
type               node category, such as CONSTRAINT, DECISION, ANTI_PATTERN, FACT
department         department scope for restricted rows
zone               visibility zone; zone 2 is treated as global within org
hierarchy_level    data sensitivity or hierarchy threshold
compliance_tags    text array such as MNPI or CONTROLLED_SUBSTANCE
status             node lifecycle state, commonly ACTIVE
```

## Claim Structure

The backend represents each user's security context with the `JWTClaims` Pydantic model in `backend/app/schemas/models.py`.

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

These claims are derived from `user_profiles`, not from a real signed JWT in the current demo. The user flow is:

```text
API receives user_id email
  -> UserService.get_user_by_email()
  -> UserService.get_jwt_claims()
  -> QueryService.execute_query_as_user()
  -> db.execute_with_jwt()
  -> PostgreSQL evaluates RLS using the per-query context
```

## Runtime RLS Context

The current backend runtime in `backend/app/database/connection.py` does not set a full `request.jwt.claims` JSON value. Instead, it sets transaction-local PostgreSQL settings before executing the query:

```sql
SET LOCAL ROLE app_user;
SELECT set_config('app.current_org_id', $1, true);
SELECT set_config('app.current_role', $1, true);
SELECT set_config('app.current_department', $1, true);
SELECT set_config('app.current_ceiling', $1, true);
SELECT set_config('app.current_clearance', $1, true);
```

The transaction-local behavior matters. The settings are scoped to the transaction, which keeps one user's claim context from leaking into later requests on the same pooled database connection.

Because the backend executes `SET LOCAL ROLE app_user`, the database must have an `app_user` role, that role must be able to `SELECT` from `knowledge_nodes`, and the database role used by `DATABASE_URL` must be allowed to switch to `app_user`.

```sql
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT ON knowledge_nodes TO app_user;
GRANT app_user TO backend_connection_role;
```

Conceptually, the runtime claim mapping is:

| Claim field | PostgreSQL setting |
| --- | --- |
| `org_id` | `app.current_org_id` |
| `role` | `app.current_role` |
| `department` | `app.current_department` |
| `ceiling_level` | `app.current_ceiling` |
| `compliance_clearance` | `app.current_clearance` as comma-separated text |

## Active RLS Design

The current Supabase setup uses one combined `knowledge_nodes_access` policy. The policy uses `current_setting('app.current_*', true)` values set by the backend and joins the four security dimensions with `AND`.

```sql
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

The protected row must satisfy the combined policy. Zone 2 has a deliberate exception: it bypasses department scoping and the permission ceiling, but it does not bypass organization isolation or compliance filtering.

### 1. Organization Isolation

Users should only see rows owned by their organization.

Policy condition:

```sql
org_id = current_setting('app.current_org_id', true)
```

Security effect:

```text
supra users cannot see city_clinic rows
city_clinic users cannot see supra rows
```

### 2. Department Scoping

Department-specific rows are visible only to matching departments, except for public/cross-department/admin cases.

Policy condition:

```sql
department = current_setting('app.current_department', true)
OR department IS NULL
OR zone = 2
OR current_setting('app.current_role', true) = 'ADMIN'
```

Security effect:

```text
same department     visible
department is null  visible as cross-department content
zone = 2            visible as public content within org
ADMIN               visible within remaining boundaries
```

### 3. Permission Ceiling

Rows are filtered by hierarchy level, unless the user has an elevated role or the row is Zone 2.

Policy condition:

```sql
hierarchy_level >= current_setting('app.current_ceiling', true)::int
OR current_setting('app.current_role', true) IN ('ADMIN', 'HOD')
OR zone = 2
```

Security effect:

```text
lower privilege users receive fewer hierarchy bands
HOD and ADMIN have broader visibility
zone 2 content bypasses the ceiling check
```

### 4. Compliance Filtering

Rows tagged with compliance labels require matching user clearances.

Policy condition:

```sql
compliance_tags IS NULL
OR compliance_tags = '{}'
OR compliance_tags <@ string_to_array(
     current_setting('app.current_clearance', true),
     ','
   )::text[]
```

Security effect:

```text
untagged rows are visible
tagged rows require all tags to be present in user clearance
```

## Migration Policy Contract

`backend/migrations/003_create_rls_policies.sql` defines a Supabase-style policy contract using `auth.jwt()`:

```sql
org_id = auth.jwt() ->> 'org_id'
department = auth.jwt() ->> 'department'
hierarchy_level >= (auth.jwt() ->> 'ceiling_level')::integer
```

It also checks `auth.jwt() ->> 'role'` and `auth.jwt() ->> 'compliance_clearance'`.

This is the intended JWT-claim shape if the system uses Supabase Auth directly. In that mode, claims should be present in the signed JWT, commonly via app metadata:

```json
{
  "org_id": "supra",
  "role": "VIEWER",
  "department": "ortho",
  "ceiling_level": 10,
  "compliance_clearance": []
}
```

## Current Implementation Note

There is an important difference between repository layers:

```text
migrations/003_create_rls_policies.sql
  uses auth.jwt()

backend runtime
  use app.current_* current_setting values

active Supabase setup
  uses one combined knowledge_nodes_access policy

backend policy viewer
  currently returns hardcoded split-policy descriptions
```

That means the documentation should be read as two related designs:

1. The migration files describe the Supabase JWT policy contract.
2. The running FastAPI demo currently simulates user context through transaction-local PostgreSQL settings and an `app_user` role.
3. The active Supabase policy used for the demo should be the combined `knowledge_nodes_access` policy shown above.

For the runtime demo to enforce correctly, the database policy must read `current_setting('app.current_*', true)`, or the backend must instead set Supabase-compatible JWT claims that `auth.jwt()` can read. As written, the repo contains both patterns, and the policy-viewer endpoint currently displays hardcoded split-policy examples rather than querying the active combined database policy.

## Backend API Flow

### User endpoints

```text
GET /users
  returns all demo users from user_profiles

GET /users/{user_email}
  returns one demo user
```

### Query endpoints

```text
POST /queries/query
  request: { "user_id": "priya@brahmo.supra" }
  runs SELECT * FROM knowledge_nodes as that user

POST /queries/direct-query
  request: { "user_id": "...", "query": "SELECT * FROM knowledge_nodes" }
  runs caller-provided SQL under that user's RLS context

POST /queries/compare
  request: { "query": "SELECT * FROM knowledge_nodes" }
  runs the same query for every demo user

GET /queries/policies
  returns policy metadata shown in the UI

POST /queries/toggle-rls
  request: { "enable": true | false }
  enables or disables RLS on knowledge_nodes

POST /queries/explain
  returns EXPLAIN JSON for a user-scoped query
```

## Frontend Flow

The frontend is a Next.js dashboard that uses `/api/*` proxy routes. The proxy forwards requests to the FastAPI backend using `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:8000`.

Main user workflows:

```text
UserSelector
  fetches /api/users and lets the operator choose a demo identity

QueryPanel
  calls /api/queries/query for the selected identity

ResultGrid
  renders returned rows and total count

ComparisonPanel
  calls /api/queries/compare and displays row-count differences

PolicyViewer
  calls /api/queries/policies and displays policy conditions

DirectQueryPanel
  calls /api/queries/direct-query with arbitrary SQL

RLSControl
  calls /api/queries/toggle-rls
```

## Why Direct SQL Still Demonstrates RLS

The important property is that the backend does not filter rows after the query returns. It sends SQL to PostgreSQL after establishing a user context. PostgreSQL applies RLS before returning rows.

Conceptually:

```sql
SELECT * FROM knowledge_nodes;
```

becomes:

```sql
SELECT *
FROM knowledge_nodes
WHERE org_id matches user context
  AND department policy passes
  AND permission ceiling passes
  AND compliance policy passes;
```

The application receives only rows that PostgreSQL allowed.

## Performance Design

`backend/migrations/004_create_indexes.sql` adds indexes for columns used by RLS predicates:

```sql
CREATE INDEX idx_nodes_org ON knowledge_nodes(org_id);
CREATE INDEX idx_nodes_department ON knowledge_nodes(department);
CREATE INDEX idx_nodes_level ON knowledge_nodes(hierarchy_level);
CREATE INDEX idx_nodes_compliance ON knowledge_nodes USING GIN(compliance_tags);
CREATE INDEX idx_nodes_org_dept ON knowledge_nodes(org_id, department);
CREATE INDEX idx_nodes_org_level ON knowledge_nodes(org_id, hierarchy_level);
```

The active combined policy also uses `zone = 2`, so the Supabase setup should add:

```sql
CREATE INDEX IF NOT EXISTS idx_nodes_zone
ON knowledge_nodes(zone);
```

These indexes support common RLS filters and reduce the cost of policy evaluation on larger tables.

## Security Boundaries

Strong parts of the design:

```text
RLS is intended to live in PostgreSQL, not in React or FastAPI filtering.
User context is set per transaction.
The comparison endpoint makes policy differences observable.
The direct-query panel demonstrates that SQL still flows through RLS.
```

Production gaps to resolve before relying on this outside a demo:

```text
Use real signed JWTs or a single consistent current_setting-based policy design.
Do not expose arbitrary SQL execution to normal users.
Do not expose RLS toggling except to tightly controlled admin tooling.
Do not use service-role or owner connections for user-scoped reads.
Ensure app_user cannot BYPASSRLS.
Validate that all protected tables have RLS enabled and forced where appropriate.
Add automated tests for org, department, ceiling, and compliance isolation.
```

## Summary

The architecture demonstrates database-enforced row isolation through user claims. The intended access decision is the intersection of:

```text
organization isolation
department scope
permission ceiling
compliance clearance
```

In the active demo policy, Zone 2 is a deliberate exception to department scope and permission ceiling only. It still remains inside organization isolation and compliance filtering.

The most important implementation detail is consistency between the claim source and the database policies. The repo currently documents and migrates a Supabase `auth.jwt()` approach while the runtime backend simulates claims through `app.current_*` transaction settings. Either approach can support the RLS design, but the project should use one consistently for production-grade behavior.
