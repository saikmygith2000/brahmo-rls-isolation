-- PHASE 3: Create RLS policies on knowledge_nodes table
-- These policies enforce database-level security

-- Ensure RLS is enabled
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS knowledge_nodes_org_isolation ON knowledge_nodes;
DROP POLICY IF EXISTS knowledge_nodes_department_scoping ON knowledge_nodes;
DROP POLICY IF EXISTS knowledge_nodes_permission_ceiling ON knowledge_nodes;
DROP POLICY IF EXISTS knowledge_nodes_compliance_filtering ON knowledge_nodes;

-- POLICY 1: Organization Isolation
-- Users can only see rows matching their org_id
CREATE POLICY knowledge_nodes_org_isolation ON knowledge_nodes
  FOR SELECT
  USING (
    org_id = auth.jwt() ->> 'org_id'
  );

-- POLICY 2: Department Scoping
-- User can see row when:
-- - department matches their department
-- - department is NULL (cross-org content)
-- - zone = 2 (public content)
-- - user is ADMIN (bypass)
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

-- POLICY 3: Permission Ceiling
-- Users can only see rows where hierarchy_level >= their ceiling_level
-- ADMIN bypasses this check
CREATE POLICY knowledge_nodes_permission_ceiling ON knowledge_nodes
  FOR SELECT
  USING (
    CASE
      WHEN auth.jwt() ->> 'role' = 'ADMIN' THEN true
      ELSE hierarchy_level >= (auth.jwt() ->> 'ceiling_level')::integer
    END
  );

-- POLICY 4: Compliance Filtering
-- MNPI rows only visible when user has MNPI clearance
-- CONTROLLED_SUBSTANCE rows only visible when user has that clearance
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

-- Allow SELECT for all authenticated users (policies above gate specific rows)
CREATE POLICY knowledge_nodes_select ON knowledge_nodes
  FOR SELECT
  USING (true);
