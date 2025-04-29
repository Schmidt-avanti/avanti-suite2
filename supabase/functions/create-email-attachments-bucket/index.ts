
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
    
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const bucketName = 'email-attachments';
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);

    if (!bucketExists) {
      // Create the bucket
      const { error: createError } = await supabase
        .storage
        .createBucket(bucketName, {
          public: true, // Make the bucket public
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
        });

      if (createError) {
        throw new Error(`Failed to create bucket: ${createError.message}`);
      }

      console.log(`Created bucket: ${bucketName}`);
      return new Response(
        JSON.stringify({ message: `Bucket '${bucketName}' created successfully` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`Bucket '${bucketName}' already exists`);
      return new Response(
        JSON.stringify({ message: `Bucket '${bucketName}' already exists` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
