import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENCRYPTION_KEY = Deno.env.get("BINANCE_ENCRYPTION_KEY");

async function getAesKey(keyStr: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(keyStr.padEnd(32, "0").slice(0, 32));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(plaintext: string, keyStr: string): Promise<string> {
  const key = await getAesKey(keyStr);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ENCRYPTION_KEY) {
      throw new Error("Encryption key not configured");
    }

    const { apiKey, apiSecret } = await req.json();
    if (!apiKey || !apiSecret || apiKey.length < 10 || apiSecret.length < 10) {
      return new Response(JSON.stringify({ error: "Invalid API keys" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encryptedKey = await encrypt(apiKey, ENCRYPTION_KEY);
    const encryptedSecret = await encrypt(apiSecret, ENCRYPTION_KEY);
    const masked = apiKey.substring(0, 6) + "****" + apiKey.substring(apiKey.length - 4);

    // Delete old connection
    await supabase.from("binance_connections").delete().eq("user_id", user.id);

    const { error } = await supabase.from("binance_connections").insert({
      user_id: user.id,
      api_key_masked: masked,
      is_connected: true,
      permissions: ["read"],
      api_key_encrypted: encryptedKey,
      api_secret_encrypted: encryptedSecret,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, maskedKey: masked }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
