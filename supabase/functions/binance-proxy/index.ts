import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BINANCE_API = "https://data-api.binance.vision/api/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    const symbols = url.searchParams.get("symbols");
    const symbol = url.searchParams.get("symbol");
    const interval = url.searchParams.get("interval");
    const limit = url.searchParams.get("limit");

    let binanceUrl = "";

    switch (endpoint) {
      case "ticker24hr": {
        if (symbols) {
          binanceUrl = `${BINANCE_API}/ticker/24hr?symbols=${encodeURIComponent(symbols)}`;
        } else {
          binanceUrl = `${BINANCE_API}/ticker/24hr`;
        }
        break;
      }
      case "klines": {
        if (!symbol || !interval) {
          return new Response(JSON.stringify({ error: "symbol and interval required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        binanceUrl = `${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 100}`;
        break;
      }
      case "depth": {
        if (!symbol) {
          return new Response(JSON.stringify({ error: "symbol required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        binanceUrl = `${BINANCE_API}/depth?symbol=${symbol}&limit=${limit || 20}`;
        break;
      }
      case "ticker": {
        binanceUrl = symbols
          ? `${BINANCE_API}/ticker/price?symbols=${encodeURIComponent(symbols)}`
          : `${BINANCE_API}/ticker/price`;
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Invalid endpoint. Use: ticker24hr, klines, depth, ticker" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch(binanceUrl);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Binance proxy error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch from Binance" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
