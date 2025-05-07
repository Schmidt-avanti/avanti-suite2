
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import twilio from 'https://esm.sh/twilio@4.19.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhoneNumberRequest {
  action: 'purchase' | 'release' | 'list' | 'assign';
  customer_id?: string;
  friendly_name?: string;
  phone_number?: string;
  twilio_sid?: string;
  country_code?: string;
  area_code?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize Twilio client
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
    const client = twilio(twilioAccountSid, twilioAuthToken);

    // Process request
    const { action, customer_id, friendly_name, phone_number, twilio_sid, country_code = 'DE', area_code } = await req.json() as PhoneNumberRequest;

    switch (action) {
      case 'purchase':
        return await purchasePhoneNumber(client, supabase, customer_id!, friendly_name!, country_code, area_code);
        
      case 'list':
        return await listAvailablePhoneNumbers(client, country_code, area_code);
        
      case 'release':
        return await releasePhoneNumber(client, supabase, twilio_sid!);
        
      case 'assign':
        return await assignExistingNumber(client, supabase, customer_id!, friendly_name!, phone_number!, twilio_sid!);
        
      default:
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function purchasePhoneNumber(twilioClient, supabase, customerId, friendlyName, countryCode = 'DE', areaCode = null) {
  try {
    // Search for available phone numbers
    const searchParams: any = { limit: 1 };
    if (areaCode) {
      searchParams.areaCode = areaCode;
    }
    
    const availableNumbers = await twilioClient.availablePhoneNumbers(countryCode)
      .local
      .list(searchParams);
      
    if (availableNumbers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No available phone numbers found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Purchase the first available number
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-voice-webhook`;
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: availableNumbers[0].phoneNumber,
      friendlyName: friendlyName,
      voiceUrl: webhookUrl,
      voiceMethod: 'POST'
    });
    
    // Save to database
    const { data, error } = await supabase
      .from('twilio_phone_numbers')
      .insert({
        phone_number: purchasedNumber.phoneNumber,
        customer_id: customerId,
        friendly_name: friendlyName,
        twilio_sid: purchasedNumber.sid,
        status: 'active'
      })
      .select()
      .single();
      
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Phone number purchased successfully', 
        phone_number: data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error purchasing phone number:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function listAvailablePhoneNumbers(twilioClient, countryCode = 'DE', areaCode = null) {
  try {
    const searchParams: any = { limit: 10 };
    if (areaCode) {
      searchParams.areaCode = areaCode;
    }
    
    const availableNumbers = await twilioClient.availablePhoneNumbers(countryCode)
      .local
      .list(searchParams);
      
    return new Response(
      JSON.stringify({ 
        success: true, 
        phone_numbers: availableNumbers.map(num => ({
          phoneNumber: num.phoneNumber,
          friendlyName: num.friendlyName,
          region: num.region,
          locality: num.locality
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error listing phone numbers:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function releasePhoneNumber(twilioClient, supabase, twilioSid) {
  try {
    // Release the number in Twilio
    await twilioClient.incomingPhoneNumbers(twilioSid).remove();
    
    // Update database record
    const { data, error } = await supabase
      .from('twilio_phone_numbers')
      .update({ status: 'released' })
      .eq('twilio_sid', twilioSid)
      .select();
      
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Phone number released successfully', 
        phone_number: data[0] 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error releasing phone number:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function assignExistingNumber(twilioClient, supabase, customerId, friendlyName, phoneNumber, twilioSid) {
  try {
    // Update the configuration in Twilio
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-voice-webhook`;
    await twilioClient.incomingPhoneNumbers(twilioSid).update({
      friendlyName: friendlyName,
      voiceUrl: webhookUrl,
      voiceMethod: 'POST'
    });
    
    // Save to database
    const { data, error } = await supabase
      .from('twilio_phone_numbers')
      .insert({
        phone_number: phoneNumber,
        customer_id: customerId,
        friendly_name: friendlyName,
        twilio_sid: twilioSid,
        status: 'active'
      })
      .select()
      .single();
      
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Phone number assigned successfully', 
        phone_number: data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error assigning phone number:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
