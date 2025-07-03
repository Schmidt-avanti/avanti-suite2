
-- Create a view that allows the edge function to access auth.users without direct references
CREATE OR REPLACE VIEW auth_users_view AS
SELECT id, email, email_confirmed_at, last_sign_in_at, created_at
FROM auth.users;


