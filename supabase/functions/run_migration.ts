// This is a helper script to execute the SQL migration
// You would need to run this via the Supabase dashboard or CLI

// Migration History:
// 1. Added endkunde_id column to tasks table
// 2. Added user profile triggers:
//    - handle_new_user: Creates a profile when a user is created
//    - sync_user_email: Keeps email in sync between auth.users and profiles
//    - handle_deleted_user: Cleans up profiles when users are deleted
