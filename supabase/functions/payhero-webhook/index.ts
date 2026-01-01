import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('PayHero webhook received:', JSON.stringify(payload));

    // PayHero sends payment details - extract relevant fields
    // Adjust these based on actual PayHero webhook payload structure
    const {
      status,
      amount,
      phone_number,
      reference,
      transaction_id,
      CheckoutRequestID,
      MpesaReceiptNumber,
      PhoneNumber,
      Amount,
      ResultCode,
    } = payload;

    // Handle different payload formats from PayHero
    const paymentStatus = status || (ResultCode === 0 ? 'Success' : 'Failed');
    const paymentAmount = amount || Amount;
    const payerPhone = phone_number || PhoneNumber;

    console.log('Parsed payment:', { paymentStatus, paymentAmount, payerPhone });

    // Only process successful payments
    if (paymentStatus !== 'Success' && paymentStatus !== 'success' && ResultCode !== 0) {
      console.log('Payment not successful, skipping');
      return new Response(JSON.stringify({ success: true, message: 'Payment not successful' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!paymentAmount || !payerPhone) {
      console.error('Missing required fields:', { paymentAmount, payerPhone });
      return new Response(JSON.stringify({ success: false, error: 'Missing amount or phone number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format phone number for matching (remove country code, normalize)
    const normalizedPhone = payerPhone.toString().replace(/^\+?254/, '0').replace(/\s/g, '');
    console.log('Looking for user with phone:', normalizedPhone);

    // Find user by phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, real_balance, phone_number')
      .or(`phone_number.eq.${normalizedPhone},phone_number.eq.${payerPhone}`)
      .maybeSingle();

    if (profileError) {
      console.error('Error finding profile:', profileError);
      return new Response(JSON.stringify({ success: false, error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!profile) {
      console.error('No user found with phone number:', normalizedPhone);
      return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Found user:', profile.user_id);

    // Convert KES to USD (or use as-is based on your needs)
    const USD_TO_KES_RATE = 130;
    const amountUSD = paymentAmount / USD_TO_KES_RATE;

    // Update user's real balance
    const newBalance = (profile.real_balance || 0) + amountUSD;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ real_balance: newBalance })
      .eq('user_id', profile.user_id);

    if (updateError) {
      console.error('Error updating balance:', updateError);
      return new Response(JSON.stringify({ success: false, error: 'Failed to update balance' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record the transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: profile.user_id,
        type: 'deposit',
        amount: amountUSD,
        currency: 'USD',
        status: 'completed',
        description: `PayHero deposit - KES ${paymentAmount} (Ref: ${reference || transaction_id || MpesaReceiptNumber || 'N/A'})`,
        account_type: 'real',
      });

    if (txError) {
      console.error('Error recording transaction:', txError);
    }

    console.log('Successfully processed deposit:', { user_id: profile.user_id, amount: amountUSD, newBalance });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Deposit processed successfully',
      amount: amountUSD,
      new_balance: newBalance 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});