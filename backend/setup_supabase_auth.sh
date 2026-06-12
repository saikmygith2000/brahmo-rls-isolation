#!/bin/bash

# BRAHMO RLS Demonstration - Supabase Auth Setup Script
# This script creates demo users in your Supabase Auth service

# Set your Supabase project credentials
SUPABASE_URL="https://zvyuknoljnfdwnagjzhp.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2eXVrbm9sam5mZHduYWdqemhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzcxMjcsImV4cCI6MjA5NjgxMzEyN30.u6kxisYl0H_4hScVPhN1sNrvqnIgPWQGYAeRmmbl1V8"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2eXVrbm9sam5mZHduYWdqemhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTIzNzEyNywiZXhwIjoyMDk2ODEzMTI3fQ.OcH7BODq_GxH8WbsiwBBiabzssIWYUcJuLFYcA2yaHU"

# Demo users to create
declare -a users=(
  '{"email":"priya@brahmo.supra","password":"TestPass123!","user_metadata":{"full_name":"Priya Sharma"},"app_metadata":{"org_id":"supra","role":"VIEWER","department":"ortho","ceiling_level":10,"compliance_clearance":[]}}'
  '{"email":"vikram@brahmo.supra","password":"TestPass123!","user_metadata":{"full_name":"Vikram Desai"},"app_metadata":{"org_id":"supra","role":"HOD","department":"ortho","ceiling_level":4,"compliance_clearance":[]}}'
  '{"email":"suresh@brahmo.supra","password":"TestPass123!","user_metadata":{"full_name":"Suresh Menon"},"app_metadata":{"org_id":"supra","role":"ADMIN","department":"admin","ceiling_level":1,"compliance_clearance":["MNPI"]}}'
  '{"email":"ananya@brahmo.supra","password":"TestPass123!","user_metadata":{"full_name":"Ananya Kapoor"},"app_metadata":{"org_id":"supra","role":"EDITOR","department":"medicine","ceiling_level":8,"compliance_clearance":[]}}'
  '{"email":"ravi@brahmo.supra","password":"TestPass123!","user_metadata":{"full_name":"Ravi Patel"},"app_metadata":{"org_id":"supra","role":"VIEWER","department":"pharmacy","ceiling_level":12,"compliance_clearance":["CONTROLLED_SUBSTANCE"]}}'
  '{"email":"citydoctor@city.clinic","password":"TestPass123!","user_metadata":{"full_name":"Dr. City Clinic"},"app_metadata":{"org_id":"city_clinic","role":"EDITOR","department":"medicine","ceiling_level":8,"compliance_clearance":[]}}'
)

echo "Creating demo users in Supabase Auth..."

# Note: This script demonstrates the user creation process
# In practice, use Supabase CLI or the admin API
# Example with Supabase CLI:
# supabase link --project-ref YOUR_PROJECT_ID
# supabase functions deploy create-demo-users

echo "1. Set your Supabase credentials in this script"
echo "2. For each user, create them via:"
echo "   - Supabase Dashboard (Authentication > Users > Add user)"
echo "   - OR Supabase CLI: supabase auth users create"
echo "   - OR API call with service role key"
echo ""
echo "3. Ensure app_metadata matches the following structure:"
echo "{"
echo '  "org_id": "supra or city_clinic",'
echo '  "role": "VIEWER, EDITOR, HOD, or ADMIN",'
echo '  "department": "ortho, medicine, pharmacy, or admin",'
echo '  "ceiling_level": integer,'
echo '  "compliance_clearance": array of strings'
echo "}"
echo ""
echo "Users to create:"
for user in "${users[@]}"; do
  echo "  - $(echo $user | grep -o '"email":"[^"]*' | cut -d'"' -f4)"
done
