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

// Get M-Pesa credentials
const CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY");
const CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET");
const PASSKEY = Deno.env.get("MPESA_PASSKEY");
const SHORTCODE = Deno.env.get("MPESA_SHORTCODE");
const CALLBACK_URL = Deno.env.get("MPESA_CALLBACK_URL");

// M-Pesa API URLs (Sandbox - change to production when ready)
const AUTH_URL = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const STK_PUSH_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
const B2C_URL = "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest";

async function getAccessToken(): Promise<string> {
  const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
  
  const response = await fetch(AUTH_URL, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Auth error:", error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
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
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

async function initiateDeposit(amount: number, phoneNumber: string, accessToken: string) {
  const timestamp = getTimestamp();
  const password = btoa(`${SHORTCODE}${PASSKEY}${timestamp}`);
  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  const requestBody = {
    BusinessShortCode: SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(amount),
    PartyA: formattedPhone,
    PartyB: SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: CALLBACK_URL,
    AccountReference: "TradingApp",
    TransactionDesc: "Deposit to trading account",
  };

  console.log("STK Push request:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(STK_PUSH_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  console.log("STK Push response:", JSON.stringify(data, null, 2));

  if (data.ResponseCode === "0") {
    return {
      success: true,
      message: "STK Push sent successfully. Please check your phone to complete the payment.",
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
    };
  } else {
    throw new Error(data.ResponseDescription || data.errorMessage || "STK Push failed");
  }
}

async function initiateWithdrawal(amount: number, phoneNumber: string, accessToken: string) {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  const requestBody = {
    InitiatorName: "apitest",
    SecurityCredential: PASSKEY,
    CommandID: "BusinessPayment",
    Amount: Math.ceil(amount),
    PartyA: SHORTCODE,
    PartyB: formattedPhone,
    Remarks: "Withdrawal from trading account",
    QueueTimeOutURL: CALLBACK_URL,
    ResultURL: CALLBACK_URL,
    Occasion: "Withdrawal",
  };

  console.log("B2C request:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(B2C_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  console.log("B2C response:", JSON.stringify(data, null, 2));

  if (data.ResponseCode === "0") {
    return {
      success: true,
      message: "Withdrawal initiated successfully. You will receive the funds shortly.",
      conversationId: data.ConversationID,
      originatorConversationId: data.OriginatorConversationID,
    };
  } else {
    throw new Error(data.ResponseDescription || data.errorMessage || "Withdrawal failed");
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!CONSUMER_KEY || !CONSUMER_SECRET || !PASSKEY || !SHORTCODE) {
      throw new Error("M-Pesa credentials not configured");
    }

    const { action, amount, phoneNumber }: MpesaRequest = await req.json();

    if (!action || !amount || !phoneNumber) {
      throw new Error("Missing required fields: action, amount, phoneNumber");
    }

    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    console.log(`Processing ${action} request for ${amount} KES to ${phoneNumber}`);

    // Get access token
    const accessToken = await getAccessToken();

    let result;
    if (action === "deposit") {
      result = await initiateDeposit(amount, phoneNumber, accessToken);
    } else if (action === "withdraw") {
      result = await initiateWithdrawal(amount, phoneNumber, accessToken);
    } else {
      throw new Error("Invalid action. Use 'deposit' or 'withdraw'");
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("M-Pesa error:", error);
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
