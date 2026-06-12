-- PHASE 10: Create indexes for performance optimization

CREATE INDEX IF NOT EXISTS idx_nodes_org
ON knowledge_nodes(org_id);

CREATE INDEX IF NOT EXISTS idx_nodes_department
ON knowledge_nodes(department);

CREATE INDEX IF NOT EXISTS idx_nodes_level
ON knowledge_nodes(hierarchy_level);

CREATE INDEX IF NOT EXISTS idx_nodes_compliance
ON knowledge_nodes
USING GIN(compliance_tags);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_nodes_org_dept
ON knowledge_nodes(org_id, department);

CREATE INDEX IF NOT EXISTS idx_nodes_org_level
ON knowledge_nodes(org_id, hierarchy_level);
