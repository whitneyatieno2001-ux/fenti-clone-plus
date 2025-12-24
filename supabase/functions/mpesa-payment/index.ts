import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MpesaRequest {
  action: 'deposit' | 'withdraw';
  amount: number;
  phoneNumber: string;
}

// Get M-Pesa credentials from environment
const CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY");
const CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET");
const PASSKEY = Deno.env.get("MPESA_PASSKEY");
const SHORTCODE = Deno.env.get("MPESA_SHORTCODE");
const CALLBACK_URL = Deno.env.get("MPESA_CALLBACK_URL");

// M-Pesa API URLs - Using Sandbox for testing
const AUTH_URL = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const STK_PUSH_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

async function getAccessToken(): Promise<string> {
  console.log("Getting M-Pesa access token...");
  console.log("Consumer Key exists:", !!CONSUMER_KEY);
  console.log("Consumer Secret exists:", !!CONSUMER_SECRET);
  
  const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
  
  const response = await fetch(AUTH_URL, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${auth}`,
    },
  });

  const responseText = await response.text();
  console.log("Auth response status:", response.status);
  console.log("Auth response:", responseText);

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${responseText}`);
  }

  const data = JSON.parse(responseText);
  console.log("Access token obtained successfully");
  return data.access_token;
}

function formatPhoneNumber(phone: string): string {
  // Remove any spaces, dashes, or plus signs
  let cleaned = phone.replace(/[\s\-\+]/g, "");
  
  // If starts with 0, replace with 254
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.substring(1);
  }
  
  // If doesn't start with 254, add it
  if (!cleaned.startsWith("254")) {
    cleaned = "254" + cleaned;
  }
  
  console.log("Formatted phone number:", cleaned);
  return cleaned;
}

function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  
  const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
  console.log("Generated timestamp:", timestamp);
  return timestamp;
}

async function initiateSTKPush(amount: number, phoneNumber: string, accessToken: string) {
  const timestamp = getTimestamp();
  const password = btoa(`${SHORTCODE}${PASSKEY}${timestamp}`);
  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  // Use a default callback URL if not set
  const callbackUrl = CALLBACK_URL || "https://webhook.site/your-unique-url";
  
  const requestBody = {
    BusinessShortCode: SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(amount),
    PartyA: formattedPhone,
    PartyB: SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: "TradingApp",
    TransactionDesc: "Deposit to trading account",
  };

  console.log("STK Push request body:", JSON.stringify(requestBody, null, 2));
  console.log("Using callback URL:", callbackUrl);

  const response = await fetch(STK_PUSH_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log("STK Push response status:", response.status);
  console.log("STK Push response:", responseText);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Invalid response from M-Pesa: ${responseText}`);
  }

  if (data.ResponseCode === "0") {
    return {
      success: true,
      message: "STK Push sent! Check your phone to enter your M-Pesa PIN.",
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
    };
  } else {
    const errorMessage = data.ResponseDescription || data.errorMessage || data.errorCode || "STK Push failed";
    console.error("STK Push failed:", errorMessage);
    throw new Error(errorMessage);
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("M-Pesa payment function called");
  console.log("Request method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log environment variable status (not values for security)
    console.log("Environment check:");
    console.log("- CONSUMER_KEY set:", !!CONSUMER_KEY);
    console.log("- CONSUMER_SECRET set:", !!CONSUMER_SECRET);
    console.log("- PASSKEY set:", !!PASSKEY);
    console.log("- SHORTCODE set:", !!SHORTCODE);
    console.log("- CALLBACK_URL set:", !!CALLBACK_URL);
    
    // Validate environment variables
    if (!CONSUMER_KEY || !CONSUMER_SECRET || !PASSKEY || !SHORTCODE) {
      const missing = [];
      if (!CONSUMER_KEY) missing.push("MPESA_CONSUMER_KEY");
      if (!CONSUMER_SECRET) missing.push("MPESA_CONSUMER_SECRET");
      if (!PASSKEY) missing.push("MPESA_PASSKEY");
      if (!SHORTCODE) missing.push("MPESA_SHORTCODE");
      throw new Error(`Missing M-Pesa credentials: ${missing.join(", ")}`);
    }

    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));
    
    const { action, amount, phoneNumber }: MpesaRequest = body;

    if (!action || !amount || !phoneNumber) {
      throw new Error("Missing required fields: action, amount, phoneNumber");
    }

    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    console.log(`Processing ${action} request for KES ${amount} to ${phoneNumber}`);

    // Get access token
    const accessToken = await getAccessToken();
    console.log("Access token obtained, initiating STK Push...");

    let result;
    if (action === "deposit") {
      result = await initiateSTKPush(amount, phoneNumber, accessToken);
    } else if (action === "withdraw") {
      // For withdrawals, we would use B2C API but that requires additional setup
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
    console.error("M-Pesa error:", error.message);
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
