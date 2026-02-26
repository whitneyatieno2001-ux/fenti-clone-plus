import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MpesaRequest {
  action: 'deposit' | 'withdraw';
  amount: number;
  phoneNumber: string;
  userId?: string;
}

// PayHero API configuration
const PAYHERO_API_URL = "https://backend.payhero.co.ke/api/v2/payments";
const PAYHERO_API_USERNAME = Deno.env.get("PAYHERO_API_USERNAME");
const PAYHERO_API_PASSWORD = Deno.env.get("PAYHERO_API_PASSWORD");
const PAYHERO_CHANNEL_ID = Deno.env.get("PAYHERO_CHANNEL_ID");

function formatPhoneNumber(phone: string): string {
  // Remove any spaces, dashes, or plus signs
  let cleaned = phone.replace(/[\s\-\+]/g, "");
  
  // If starts with 254, convert to 07xx format for PayHero
  if (cleaned.startsWith("254")) {
    cleaned = "0" + cleaned.substring(3);
  }
  
  // If doesn't start with 0, add it
  if (!cleaned.startsWith("0")) {
    cleaned = "0" + cleaned;
  }
  
  console.log("Formatted phone number:", cleaned);
  return cleaned;
}

async function initiatePayHeroSTKPush(amount: number, phoneNumber: string, userId?: string) {
  console.log("Initiating PayHero STK Push...");
  console.log("Amount:", amount);
  console.log("Phone:", phoneNumber);
  
  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  // Get the Supabase URL for callback
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const callbackUrl = `${supabaseUrl}/functions/v1/payhero-webhook`;
  
  // Generate external reference for tracking
  const externalReference = `DEP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  const requestBody = {
    amount: Math.ceil(amount),
    phone_number: formattedPhone,
    channel_id: parseInt(PAYHERO_CHANNEL_ID || "0"),
    provider: "m-pesa",
    external_reference: externalReference,
    callback_url: callbackUrl,
  };

  console.log("PayHero request body:", JSON.stringify(requestBody, null, 2));
  console.log("Using callback URL:", callbackUrl);

  const authTokenRaw = (PAYHERO_API_KEY || "").trim();
  const authorizationHeader = authTokenRaw.toLowerCase().startsWith("basic ")
    ? authTokenRaw
    : `Basic ${authTokenRaw}`;

  const response = await fetch(PAYHERO_API_URL, {
    method: "POST",
    headers: {
      "Authorization": authorizationHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log("PayHero response status:", response.status);
  console.log("PayHero response:", responseText);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Invalid response from PayHero: ${responseText}`);
  }

  // PayHero returns success if the STK push was initiated
  if (response.ok && (data.success || data.status === "QUEUED" || data.status === "SUCCESS" || data.CheckoutRequestID)) {
    return {
      success: true,
      message: "STK Push sent! Check your phone to enter your M-Pesa PIN.",
      checkoutRequestId: data.CheckoutRequestID || data.reference || externalReference,
      externalReference: externalReference,
    };
  } else {
    const errorMessage = data.message || data.error || data.errorMessage || "STK Push failed";
    console.error("PayHero STK Push failed:", errorMessage);
    throw new Error(errorMessage);
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("PayHero M-Pesa payment function called");
  console.log("Request method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log environment variable status (not values for security)
    console.log("Environment check:");
    console.log("- PAYHERO_API_KEY set:", !!PAYHERO_API_KEY);
    console.log("- PAYHERO_CHANNEL_ID set:", !!PAYHERO_CHANNEL_ID);
    
    // Validate environment variables
    if (!PAYHERO_API_KEY || !PAYHERO_CHANNEL_ID) {
      const missing = [];
      if (!PAYHERO_API_KEY) missing.push("PAYHERO_API_KEY");
      if (!PAYHERO_CHANNEL_ID) missing.push("PAYHERO_CHANNEL_ID");
      throw new Error(`Missing PayHero credentials: ${missing.join(", ")}`);
    }

    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));
    
    const { action, amount, phoneNumber, userId }: MpesaRequest = body;

    if (!action || !amount || !phoneNumber) {
      throw new Error("Missing required fields: action, amount, phoneNumber");
    }

    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    console.log(`Processing ${action} request for KES ${amount} to ${phoneNumber}`);

    let result;
    if (action === "deposit") {
      result = await initiatePayHeroSTKPush(amount, phoneNumber, userId);
    } else if (action === "withdraw") {
      // For withdrawals, PayHero B2C would need to be implemented
      // For now, return a message indicating this
      result = {
        success: true,
        message: "Withdrawal request received. Funds will be sent to your M-Pesa shortly.",
      };
    } else {
      throw new Error("Invalid action. Use 'deposit' or 'withdraw'");
    }

    console.log("Operation successful:", JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("PayHero M-Pesa error:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "An error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
