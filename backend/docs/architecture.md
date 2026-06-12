# BRAHMO RLS Demonstration Platform - Architecture Documentation

## System Overview

The BRAHMO RLS Demonstration Platform showcases how PostgreSQL Row Level Security (RLS) enforces data access control at the database layer, completely independent of the application layer.

### Core Principle

**Same SQL query + Different JWT claims = Different results**

This demonstrates that security is not achieved through application logic, but through database-level policy enforcement that cannot be bypassed by application bugs or direct SQL access.

## Architecture Layers

### Layer 1: Database Security (PostgreSQL)

#### Organization Isolation Policy

**Principle**: Data belongs to organizations. Users from one organization cannot see data from another.

```sql
CREATE POLICY knowledge_nodes_org_isolation ON knowledge_nodes
  FOR SELECT
  USING (
    org_id = auth.jwt() ->> 'org_id'
  );
```

- Users can ONLY see rows where `org_id` matches their JWT claim
- Example: Priya (org_id='supra') can never see rows with org_id='city_clinic'

#### Department Scoping Policy

**Principle**: Users access department-specific content unless they're admins or the content is public.

```sql
CREATE POLICY knowledge_nodes_department_scoping ON knowledge_nodes
  FOR SELECT
  USING (
    CASE
      WHEN auth.jwt() ->> 'role' = 'ADMIN' THEN true
      WHEN department IS NULL THEN true
      WHEN zone = 2 THEN true
      ELSE department = auth.jwt() ->> 'department'
    END
  );
```

- ADMIN users bypass department restrictions
- NULL department = cross-departmental content
- Zone 2 = publicly available content
- Otherwise, must match user's department

#### Permission Ceiling Policy

**Principle**: Information is tiered by hierarchy level. Users have a ceiling_level that determines what they can access.

```sql
CREATE POLICY knowledge_nodes_permission_ceiling ON knowledge_nodes
  FOR SELECT
  USING (
    CASE
      WHEN auth.jwt() ->> 'role' = 'ADMIN' THEN true
      ELSE hierarchy_level >= (auth.jwt() ->> 'ceiling_level')::integer
    END
  );
```

- Suresh (ADMIN, ceiling=1): Access ALL hierarchy levels
- Priya (VIEWER, ceiling=10): Access only levels 10+ (more permissive)
- Vikram (HOD, ceiling=4): Access only levels 4+
- ADMIN bypass applies

#### Compliance Filtering Policy

**Principle**: Sensitive data tagged with compliance requirements is protected.

```sql
CREATE POLICY knowledge_nodes_compliance_filtering ON knowledge_nodes
  FOR SELECT
  USING (
    CASE
      WHEN auth.jwt() ->> 'role' = 'ADMIN' THEN true
      WHEN 'MNPI' = ANY(compliance_tags) THEN 'MNPI' = ANY((auth.jwt() ->> 'compliance_clearance')::text[])
      WHEN 'CONTROLLED_SUBSTANCE' = ANY(compliance_tags) THEN 'CONTROLLED_SUBSTANCE' = ANY((auth.jwt() ->> 'compliance_clearance')::text[])
      ELSE true
    END
  );
```

- Rows tagged with 'MNPI' visible only to users with MNPI clearance
- Rows tagged with 'CONTROLLED_SUBSTANCE' visible only to users with that clearance
- ADMIN bypass applies

### Layer 2: JWT Claim Injection (Backend)

#### JWT Claim Structure

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

#### Simulation Strategy

The backend simulates JWT claims for demonstration purposes:

```python
async def execute_with_jwt(self, query: str, jwt_claims: dict, *args):
    """Execute query with simulated JWT claims"""
    async with self.pool.acquire() as conn:
        jwt_json = json.dumps(jwt_claims)
        set_jwt = f"SELECT set_config('request.jwt.claims', '{jwt_json}', true);"
        await conn.execute(set_jwt)
        result = await conn.fetch(query, *args)
        return result
```

- Before each query execution, set PostgreSQL session variable
- `request.jwt.claims` contains the user's claims
- RLS policies evaluate `auth.jwt()` which reads this variable
- After query execution, claims are reset (per-transaction scope)

### Layer 3: API Layer (FastAPI)

#### Endpoints

**Query Execution**
- `POST /queries/query` - Execute query as specific user
- `POST /queries/direct-query` - Execute arbitrary SQL as user
- `POST /queries/compare` - Compare results across all users

**Policy Management**
- `POST /queries/policies` - View active RLS policies
- `POST /queries/toggle-rls` - Enable/disable RLS (admin only)

**Analysis**
- `POST /queries/explain` - EXPLAIN ANALYZE output

#### User Management

- `GET /users` - Get all demo users
- `GET /users/{email}` - Get specific user

### Layer 4: Frontend (React + Next.js)

#### Components

1. **UserSelector**: Browse and select users
2. **QueryPanel**: Write and execute queries
3. **ResultGrid**: Display results with count
4. **ComparisonPanel**: Run same query for all users
5. **PolicyViewer**: View active RLS policies
6. **DirectQueryPanel**: Demonstrate database-level enforcement
7. **RLSControl**: Toggle RLS on/off

#### Key Demonstrations

**Same Query, Different Results**
- Query: `SELECT * FROM knowledge_nodes`
- Priya sees 28 rows
- Vikram sees 74 rows
- Suresh sees all rows
- Reason: Different JWT claims trigger different RLS policies

## Database Schema

### user_profiles Table

```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  org_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('VIEWER', 'EDITOR', 'HOD', 'ADMIN')),
  department text,
  ceiling_level integer NOT NULL DEFAULT 10,
  compliance_clearance text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### knowledge_nodes Table (Existing)

Assumed schema:
```sql
CREATE TABLE knowledge_nodes (
  id uuid PRIMARY KEY,
  org_id text NOT NULL,
  title text NOT NULL,
  content text,
  department text,
  zone integer DEFAULT 1,
  hierarchy_level integer DEFAULT 1,
  compliance_tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Indexes for Performance

```sql
CREATE INDEX idx_nodes_org ON knowledge_nodes(org_id);
CREATE INDEX idx_nodes_department ON knowledge_nodes(department);
CREATE INDEX idx_nodes_level ON knowledge_nodes(hierarchy_level);
CREATE INDEX idx_nodes_compliance ON knowledge_nodes USING GIN(compliance_tags);
CREATE INDEX idx_nodes_org_dept ON knowledge_nodes(org_id, department);
CREATE INDEX idx_nodes_org_level ON knowledge_nodes(org_id, hierarchy_level);
```

These indexes ensure RLS policy evaluation is fast even with large datasets.

## Admin Bypass Design

The ADMIN role has special significance:

```sql
WHEN auth.jwt() ->> 'role' = 'ADMIN' THEN true
```

In each policy:
- Department scoping: ADMIN bypasses department restrictions
- Permission ceiling: ADMIN bypasses ceiling level restrictions
- Compliance filtering: ADMIN bypasses compliance checks

**Important**: Even with ADMIN bypass, organization isolation still applies. An ADMIN from one organization cannot see data from another organization.

## Zone 2 Handling

Zone 2 rows are publicly accessible within an organization:

```sql
WHEN zone = 2 THEN true
```

- Zone 1: Restricted (department-scoped)
- Zone 2: Public (accessible to all in organization)
- Zone 3+: Custom zones (handled by application logic)

## Compliance Filtering Strategy

Two-tier compliance model:

1. **Array-based**: Rows have `compliance_tags` array (e.g., `{'MNPI', 'PII'}`)
2. **User-based**: Users have `compliance_clearance` array (e.g., `{'MNPI'}`)

Policy:
```sql
'MNPI' = ANY(compliance_tags) THEN 'MNPI' = ANY(compliance_clearance)
```

- If row has MNPI tag AND user lacks MNPI clearance → Row hidden
- If row has no compliance tags → Row visible
- If user is ADMIN → Always visible

## Why Direct SQL Still Respects RLS

Key insight: RLS is **not** a firewall between the application and database.

RLS is **policy enforcement** at the row level:

1. User executes: `SELECT * FROM knowledge_nodes`
2. PostgreSQL evaluates RLS policies
3. Only rows passing all policies are returned
4. This happens **regardless of how the query is submitted**

Direct SQL from a client → Still goes through RLS
Application SQL → Still goes through RLS
Stored procedure → Still goes through RLS

RLS is evaluated **before** rows are returned, not after.

## Performance Considerations

### Query Planning

When RLS is enabled, PostgreSQL:
1. Parses the query
2. Evaluates RLS policies
3. Rewrites the query to include policy conditions
4. Executes the optimized query

Example:
```sql
-- Original query
SELECT * FROM knowledge_nodes

-- After RLS rewrite (conceptually)
SELECT * FROM knowledge_nodes
WHERE org_id = 'supra'
  AND (department = 'ortho' OR department IS NULL OR zone = 2 OR role = 'ADMIN')
  AND (hierarchy_level >= 10 OR role = 'ADMIN')
  AND (... compliance checks ...)
```

### Index Strategy

**Composite indexes** for common patterns:
- `(org_id, department)` - For org + dept scoping
- `(org_id, hierarchy_level)` - For org + permission filtering
- GIN index on `compliance_tags` - For array operations

### EXPLAIN ANALYZE

Use EXPLAIN ANALYZE to understand query performance:
```
Seq Scan on knowledge_nodes  (cost=0.00..1000.00 rows=28 width=100)
  Filter: (org_id = 'supra'::text) AND ...
```

RLS policies add filter conditions that optimizer uses with indexes.

## Security Best Practices

1. **Never disable RLS in production**
   - RLS disabled = All security removed
   - Use for testing only

2. **Validate policies regularly**
   - `SELECT * FROM pg_policies`
   - Review policy logic for gaps

3. **Test with multiple user contexts**
   - Use demo users to verify each policy
   - Check EXPLAIN plans for each user

4. **Use service role key carefully**
   - Required for admin operations only
   - Never expose in frontend
   - Rotate periodically

5. **Monitor RLS performance**
   - Track query execution times
   - Identify slow policies
   - Add indexes as needed

6. **Keep policies simple**
   - Complex policies become hard to audit
   - Combine simple conditions
   - Add comments

## Deployment Checklist

- [ ] Database schema created and normalized
- [ ] All migrations applied
- [ ] RLS enabled on all sensitive tables
- [ ] All four policies implemented
- [ ] Indexes created
- [ ] Demo users created
- [ ] Backend environment variables set
- [ ] Frontend API URL configured
- [ ] CORS origins configured
- [ ] SSL/TLS enabled in production
- [ ] Service role key secured
- [ ] Monitoring and logging configured
- [ ] Backup strategy in place

## Testing Strategy

### Unit Tests
- Test JWT claim extraction
- Test query parameter validation

### Integration Tests
- Test each RLS policy independently
- Test policy combinations
- Test admin bypass
- Test compliance filtering

### Security Tests
- Attempt to access other org data
- Attempt to exceed ceiling level
- Attempt to access restricted compliance data
- Verify direct SQL respects RLS

### Performance Tests
- Run EXPLAIN ANALYZE for each user
- Measure query execution times
- Load test with multiple concurrent users

## Summary

This architecture demonstrates that **database-level security is fundamentally more secure than application-level security** because:

1. **Single source of truth**: Policies defined once in database
2. **Unenforced bypass prevention**: Application bugs cannot bypass RLS
3. **Transparent enforcement**: Works with all query methods
4. **Audit trail**: All RLS evaluations can be logged
5. **Performance optimization**: Policies pushed down to query planner

The BRAHMO RLS Demonstration Platform proves that PostgreSQL's Row Level Security is a production-ready security mechanism that should be the foundation of data access control in any secure application.
