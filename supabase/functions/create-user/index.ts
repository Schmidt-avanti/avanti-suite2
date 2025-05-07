
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface UserData {
  role: string
  "Full Name": string
  needs_password_reset: boolean
  is_active: boolean
  [key: string]: any
}

interface CreateUserRequest {
  action: 'create'
  email: string
  password: string
  userData: UserData
  skipDuplicateCheck?: boolean // New option to skip duplicate check
}

interface DeleteUserRequest {
  action: 'delete'
  userId: string
}

type RequestBody = CreateUserRequest | DeleteUserRequest

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    // Create a Supabase client with the Admin key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check for valid request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get request body as text first to validate JSON
    const bodyText = await req.text()
    if (!bodyText || bodyText.trim() === '') {
      console.error('Empty request body received')
      return new Response(
        JSON.stringify({ error: 'Empty request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body, with proper error handling for invalid JSON
    let requestData: RequestBody
    try {
      requestData = JSON.parse(bodyText)
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError.message)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle based on action type
    if (requestData.action === 'create') {
      return await handleCreateUser(requestData, supabaseAdmin, corsHeaders)
    } else if (requestData.action === 'delete') {
      return await handleDeleteUser(requestData, supabaseAdmin, corsHeaders)
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action specified' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: err instanceof Error ? err.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleCreateUser(
  requestData: CreateUserRequest, 
  supabaseAdmin: any, 
  corsHeaders: HeadersInit
): Promise<Response> {
  const { email, password, userData, skipDuplicateCheck } = requestData;
  
  // Validate required fields
  if (!email || !password || !userData) {
    console.error('Missing required fields:', { email: !!email, password: !!password, userData: !!userData })
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Validate role value to ensure it matches allowed values in the database
  if (userData.role && !['admin', 'agent', 'client'].includes(userData.role)) {
    console.error('Invalid role value:', userData.role);
    return new Response(
      JSON.stringify({ error: 'Invalid role value. Must be admin, agent, or client' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  console.log(`Processing user creation request for email: ${email}`)
  console.log(`Skip duplicate check: ${skipDuplicateCheck ? 'Yes' : 'No'}`)

  // Only perform duplicate check if not explicitly skipped
  if (!skipDuplicateCheck) {
    try {
      // Use direct database query to check for existing user by email
      // This is more reliable than using the Auth API
      const { count, error: countError } = await supabaseAdmin
        .from('auth_users_view')  // Using a view that maps to auth.users
        .select('email', { count: 'exact', head: true })
        .eq('email', email);
      
      if (countError) {
        console.error('Error checking existing user via DB:', countError);
        // Fall back to regular auth check
        const { data: existingUsers, error: getUserError } = await supabaseAdmin.auth.admin.listUsers({
          filter: { email }
        });

        if (getUserError) {
          console.error('Error with fallback check:', getUserError);
          // Continue anyway since we failed to check
        } else if (existingUsers && existingUsers.users && existingUsers.users.length > 0) {
          console.log('User already exists (fallback check):', email);
          return new Response(
            JSON.stringify({ 
              error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits',
              code: 'EMAIL_EXISTS' 
            }),
            { 
              status: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      } else if (count && count > 0) {
        console.log('User already exists (db check):', email, 'count:', count);
        return new Response(
          JSON.stringify({ 
            error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits',
            code: 'EMAIL_EXISTS' 
          }),
          { 
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        console.log('No existing user found with email:', email);
      }
    } catch (checkError) {
      console.error('Error during existence check:', checkError);
      // Continue anyway since we failed to check
    }
  }

  // Create the user
  try {
    console.log('Creating new user with email:', email);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userData
    });

    if (error) {
      console.error('Error creating user:', error);
      
      // Handle specific error types
      if (error.message && error.message.includes('already been registered')) {
        return new Response(
          JSON.stringify({ 
            error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits',
            code: 'EMAIL_EXISTS'
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User created successfully:', data.user.id);
    
    // Ensure the email is stored in profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        email: email
      })
      .eq('id', data.user.id);

    if (profileError) {
      // Just log this error but continue - the user was created successfully
      console.error("Error ensuring email in profile:", profileError);
    }

    // Return the user ID
    return new Response(
      JSON.stringify({ 
        userId: data.user.id,
        message: 'User created successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (createError: any) {
    console.error('Error in user creation:', createError);
    return new Response(
      JSON.stringify({ 
        error: createError.message || 'Failed to create user', 
        details: createError.code || 'Unknown error code'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleDeleteUser(
  requestData: DeleteUserRequest, 
  supabaseAdmin: any, 
  corsHeaders: HeadersInit
): Promise<Response> {
  const { userId } = requestData
  
  // Validate required fields
  if (!userId) {
    console.error('Missing required userId')
    return new Response(
      JSON.stringify({ error: 'Missing required userId' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  console.log(`Processing user deletion request for userId: ${userId}`)

  // Delete the user
  const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (error) {
    console.error('Error deleting user:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  console.log('User deleted successfully:', userId)

  // Return success response
  return new Response(
    JSON.stringify({ 
      userId: userId,
      message: 'User deleted successfully' 
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}
