-- PHASE 1: Create user_profiles table
-- This table stores user information with RLS-relevant metadata

CREATE TABLE IF NOT EXISTS user_profiles (
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON user_profiles(org_id);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own profile
CREATE POLICY user_profiles_select ON user_profiles
  FOR SELECT
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY user_profiles_update ON user_profiles
  FOR UPDATE
  USING (email = auth.jwt() ->> 'email' OR auth.jwt() ->> 'role' = 'ADMIN');
