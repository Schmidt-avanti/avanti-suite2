
-- Create a view that allows the edge function to access auth.users without direct references
CREATE OR REPLACE VIEW auth_users_view AS
SELECT id, email, email_confirmed_at, last_sign_in_at, created_at
FROM auth.users;

-- Grant access to the service role
GRANT SELECT ON auth_users_view TO service_role;

-- Important: Since this is a view that accesses auth.users, we need strict RLS policies
ALTER VIEW auth_users_view DISABLE ROW LEVEL SECURITY;

-- Only allow the service role to access this view
CREATE POLICY "Service role can select from auth_users_view"
  ON auth_users_view
  FOR SELECT
  USING (auth.role() = 'service_role');
