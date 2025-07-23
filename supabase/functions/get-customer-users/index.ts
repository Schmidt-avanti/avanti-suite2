import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request data
    const { customer_id, is_forwarding = false } = await req.json();

    if (!customer_id) {
      return new Response(
        JSON.stringify({ error: 'customer_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Getting users for customer: ${customer_id}, is_forwarding: ${is_forwarding}`);

    // Get all users assigned to this customer
    const { data: assignments, error: assignError } = await supabase
      .from('user_customer_assignments')
      .select(`
        user_id,
        profiles!inner (
          id,
          "Full Name",
          role,
          is_active
        )
      `)
      .eq('customer_id', customer_id)
      .eq('profiles.is_active', true);

    if (assignError) {
      console.error('Error fetching user assignments:', assignError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user assignments' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!assignments || assignments.length === 0) {
      console.log('No assignments found for customer');
      return new Response(
        JSON.stringify({ users: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Transform and filter users based on forwarding rules
    let users = assignments
      .map(assignment => ({
        id: assignment.profiles.id,
        fullName: assignment.profiles["Full Name"],
        role: assignment.profiles.role,
        email: "", // Not needed for dropdown
        createdAt: ""
      }))
      .filter(user => {
        // When forwarding: exclude admins, include agents and customers
        // When assigning: include all roles
        if (is_forwarding) {
          return user.role === 'agent' || user.role === 'customer';
        }
        return true; // Include all roles for regular assignment
      });

    console.log(`Returning ${users.length} users for customer ${customer_id}`);
    users.forEach(user => {
      console.log(`- ${user.fullName} (${user.role})`);
    });

    return new Response(
      JSON.stringify({ users }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-customer-users function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
