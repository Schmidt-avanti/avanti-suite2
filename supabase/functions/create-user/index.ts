
// Edge function to create users with admin privileges
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client with the service role key
const createServiceClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment');
  }
  
  return createClient(supabaseUrl, serviceRoleKey);
};

// Check if an email address already exists in auth.users
async function userExistsByEmail(email: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    
    // Query our custom view to check if the user exists
    const { data, error } = await supabase
      .from('auth_users_view')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking for existing user:', error);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error('Exception checking for existing user:', err);
    return false;
  }
}

// Delete a user and their profile
async function deleteUser(userId: string) {
  try {
    const supabase = createServiceClient();
    
    // First attempt to delete the auth user
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
    
    console.log(`User deleted successfully: ${userId}`);
    return { success: true };
  } catch (err) {
    console.error(`Exception deleting user ${userId}:`, err);
    throw err;
  }
}

// Create a new user with the provided details
async function handleCreateUser(email: string, password: string, userData: any, skipDuplicateCheck: boolean = false) {
  try {
    // Check if we should skip the duplicate email check
    if (!skipDuplicateCheck) {
      // Check if user exists
      const userExists = await userExistsByEmail(email);
      
      if (userExists) {
        console.log(`User with email ${email} already exists`);
        return {
          error: `Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.`,
          code: 'EMAIL_EXISTS'
        };
      }
      
      console.log(`No existing user found with email: ${email}`);
    }
    
    // Validate user data
    if (userData.role && !['admin', 'agent', 'customer'].includes(userData.role)) {
      return { 
        error: `Invalid role. Must be one of: admin, agent, customer` 
      };
    }
    
    console.log(`Creating new user with email: ${email}`);
    
    const supabase = createServiceClient();
    
    // Create the user in auth.users
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userData
    });
    
    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }
    
    console.log(`User created successfully: ${data.user.id}`);
    
    return {
      userId: data.user.id,
      email: data.user.email
    };
  } catch (err) {
    console.error('Error creating user:', err);
    throw err;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { action, email, password, userData, userId, skipDuplicateCheck } = await req.json();
    
    // Handle different actions
    if (action === 'create') {
      console.log(`Processing user creation request for email: ${email}`);
      console.log(`Skip duplicate check: ${skipDuplicateCheck ? 'Yes' : 'No'}`);
      
      const result = await handleCreateUser(email, password, userData, skipDuplicateCheck);
      
      return new Response(
        JSON.stringify(result),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    } 
    else if (action === 'delete') {
      console.log(`Processing user deletion request for userId: ${userId}`);
      const result = await deleteUser(userId);
      
      return new Response(
        JSON.stringify(result),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    else {
      return new Response(
        JSON.stringify({ error: 'Invalid action specified' }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
