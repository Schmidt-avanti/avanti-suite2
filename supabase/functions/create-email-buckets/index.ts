
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Create email-attachments bucket if it doesn't exist
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
      
    const emailAttachmentsBucketExists = buckets?.some(bucket => bucket.name === 'email-attachments');
    
    if (bucketsError) {
      throw new Error(`Error checking buckets: ${bucketsError.message}`);
    }
    
    let createdBucket = false;
    if (!emailAttachmentsBucketExists) {
      const { data, error } = await supabase
        .storage
        .createBucket('email-attachments', {
          public: true,
          fileSizeLimit: 50 * 1024 * 1024, // 50MB
        });
        
      if (error) {
        throw new Error(`Error creating email-attachments bucket: ${error.message}`);
      }
      
      createdBucket = true;
    }

    return new Response(JSON.stringify({
      status: 'success',
      message: createdBucket ? 'Created email-attachments bucket' : 'email-attachments bucket already exists',
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});
