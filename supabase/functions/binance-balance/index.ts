import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { encode as encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function createHmacSignature(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new TextDecoder().decode(encodeHex(new Uint8Array(signature)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;

    // Get stored API keys
    const { data: conn, error: connError } = await supabase
      .from("binance_connections")
      .select("api_key_encrypted, api_secret_encrypted")
      .eq("user_id", userId)
      .maybeSingle();

    if (connError || !conn?.api_key_encrypted || !conn?.api_secret_encrypted) {
      return new Response(JSON.stringify({ error: "No Binance connection found", balance: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = conn.api_key_encrypted;
    const apiSecret = conn.api_secret_encrypted;

    // Call Binance account API
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = await createHmacSignature(apiSecret, queryString);

    const binanceUrl = `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`;
    const response = await fetch(binanceUrl, {
      headers: { "X-MBX-APIKEY": apiKey },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Binance API error:", errorData);
      return new Response(JSON.stringify({ error: "Failed to fetch Binance balance", balance: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountData = await response.json();
    
    // Calculate total USDT equivalent balance
    let totalUsdBalance = 0;
    for (const asset of accountData.balances || []) {
      const free = parseFloat(asset.free) || 0;
      const locked = parseFloat(asset.locked) || 0;
      const total = free + locked;
      if (total <= 0) continue;

      if (asset.asset === "USDT" || asset.asset === "BUSD" || asset.asset === "USD") {
        totalUsdBalance += total;
      } else if (asset.asset === "BTC") {
        totalUsdBalance += total * 98000; // approximate
      } else if (asset.asset === "ETH") {
        totalUsdBalance += total * 3400;
      } else if (asset.asset === "BNB") {
        totalUsdBalance += total * 580;
      } else if (asset.asset === "SOL") {
        totalUsdBalance += total * 180;
      }
    }

    return new Response(JSON.stringify({ balance: totalUsdBalance }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal error", balance: 0 }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
