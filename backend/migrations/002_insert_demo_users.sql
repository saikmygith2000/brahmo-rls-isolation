-- PHASE 1: Insert demo users into user_profiles
-- These users will be matched with Supabase Auth users

INSERT INTO user_profiles (email, full_name, org_id, role, department, ceiling_level, compliance_clearance)
VALUES
  ('priya@brahmo.supra', 'Priya Sharma', 'supra', 'VIEWER', 'ortho', 10, '{}'),
  ('vikram@brahmo.supra', 'Vikram Desai', 'supra', 'HOD', 'ortho', 4, '{}'),
  ('suresh@brahmo.supra', 'Suresh Menon', 'supra', 'ADMIN', 'admin', 1, '{"MNPI"}'),
  ('ananya@brahmo.supra', 'Ananya Kapoor', 'supra', 'EDITOR', 'medicine', 8, '{}'),
  ('ravi@brahmo.supra', 'Ravi Patel', 'supra', 'VIEWER', 'pharmacy', 12, '{"CONTROLLED_SUBSTANCE"}'),
  ('citydoctor@city.clinic', 'Dr. City Clinic', 'city_clinic', 'EDITOR', 'medicine', 8, '{}')
ON CONFLICT (email) DO NOTHING;
