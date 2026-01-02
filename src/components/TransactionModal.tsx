import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount, MINIMUM_DEPOSIT_AMOUNT } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowDownToLine, ArrowUpFromLine, Smartphone, AlertCircle, Loader2, ExternalLink, Bitcoin, Wallet, ChevronLeft, CreditCard, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
}

type PaymentCategory = 'select' | 'crypto' | 'mobile' | 'card';
type PaymentMethod = 'binance' | 'mpesa' | 'airtel' | 'paypal' | 'card' | null;

const PAYHERO_DEPOSIT_LINK = 'https://short.payhero.co.ke/s/L9sqoCZ7EW2riRENtemoSK';
const quickAmounts = [5, 10, 25, 50];

export function TransactionModal({ isOpen, onClose, type }: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [existingPhone, setExistingPhone] = useState('');
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>('select');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const { withdraw, currentBalance, accountType, isLoggedIn, user } = useAccount();
  const { toast } = useToast();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPaymentCategory('select');
      setPaymentMethod(null);
    }
  }, [isOpen]);

  // Load user's saved phone number
  useEffect(() => {
    const loadPhoneNumber = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.phone_number) {
        setExistingPhone(data.phone_number);
        setPhoneNumber(data.phone_number);
        setPhoneSaved(true);
      }
    };
    
    if (isOpen) {
      loadPhoneNumber();
    }
  }, [user, isOpen]);

  const savePhoneNumber = async () => {
    if (!user || !phoneNumber || phoneNumber.length < 9) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: phoneNumber })
        .eq('user_id', user.id);

      if (error) throw error;

      setPhoneSaved(true);
      setExistingPhone(phoneNumber);
      toast({
        title: "Phone Saved!",
        description: "Your phone number has been saved for deposits",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save phone number",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = () => {
    if (!isLoggedIn) {
      toast({
        title: "Login Required",
        description: "Please login to make deposits",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === 'binance') {
      toast({
        title: "Coming Soon",
        description: "Binance payments will be available soon",
      });
      return;
    }

    if (paymentMethod === 'mpesa') {
      window.open(PAYHERO_DEPOSIT_LINK, '_blank');
      toast({
        title: "Complete Payment",
        description: "Complete your M-Pesa payment on the PayHero page",
      });
      onClose();
      return;
    }

    if (paymentMethod === 'airtel') {
      toast({
        title: "Coming Soon",
        description: "Airtel Money payments will be available soon",
      });
      return;
    }

    if (paymentMethod === 'paypal') {
      toast({
        title: "Coming Soon",
        description: "PayPal payments will be available soon",
      });
      return;
    }

    if (paymentMethod === 'card') {
      toast({
        title: "Coming Soon",
        description: "Card payments will be available soon",
      });
      return;
    }
  };

  const handleWithdraw = async () => {
    if (!isLoggedIn) {
      toast({
        title: "Login Required",
        description: "Please login to make transactions",
        variant: "destructive",
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber || phoneNumber.length < 9) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid M-Pesa phone number",
        variant: "destructive",
      });
      return;
    }

    if (numAmount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough funds for this withdrawal",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('mpesa-payment', {
        body: {
          action: 'withdraw',
          amount: numAmount,
          phoneNumber: phoneNumber,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Withdrawal Initiated!",
          description: data.message,
        });

        await withdraw(numAmount);
        setAmount('');
        setPhoneNumber('');
        onClose();
      } else {
        throw new Error(data.error || 'Transaction failed');
      }
    } catch (error: any) {
      console.error('M-Pesa error:', error);
      toast({
        title: "Transaction Failed",
        description: error.message || "An error occurred while processing your request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (paymentMethod) {
      setPaymentMethod(null);
    } else {
      setPaymentCategory('select');
    }
  };

  // Deposit UI
  if (type === 'deposit') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {(paymentCategory !== 'select' || paymentMethod) && (
                <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8 mr-1">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <ArrowDownToLine className="h-5 w-5 text-primary" />
              Deposit Funds
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Balance */}
            <div className="p-4 rounded-xl bg-secondary/50">
              <p className="text-sm text-muted-foreground">Current Balance ({accountType})</p>
              <p className="text-2xl font-bold text-foreground">
                ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Payment Category Selection */}
            {paymentCategory === 'select' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Select Payment Method</p>
                
                {/* Crypto Option */}
                <button
                  onClick={() => setPaymentCategory('crypto')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
                    <Bitcoin className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Crypto Payments</p>
                    <p className="text-xs text-muted-foreground">Pay with cryptocurrency</p>
                  </div>
                </button>

                {/* Mobile Money Option */}
                <button
                  onClick={() => setPaymentCategory('mobile')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Mobile Money</p>
                    <p className="text-xs text-muted-foreground">M-Pesa, Airtel Money, PayPal</p>
                  </div>
                </button>

                {/* Card Payment Option */}
                <button
                  onClick={() => setPaymentCategory('card')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Card Payment</p>
                    <p className="text-xs text-muted-foreground">Visa, Mastercard, etc.</p>
                  </div>
                </button>
              </div>
            )}

            {/* Crypto Options */}
            {paymentCategory === 'crypto' && !paymentMethod && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Select Crypto Provider</p>
                
                <button
                  onClick={() => setPaymentMethod('binance')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-yellow-500 flex items-center justify-center">
                    <span className="text-xl font-bold text-black">B</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Binance</p>
                    <p className="text-xs text-muted-foreground">Pay with Binance Pay</p>
                  </div>
                </button>
              </div>
            )}

            {/* Mobile Money Options */}
            {paymentCategory === 'mobile' && !paymentMethod && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Select Payment Provider</p>
                
                {/* M-Pesa */}
                <button
                  onClick={() => setPaymentMethod('mpesa')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">M-Pesa</p>
                    <p className="text-xs text-muted-foreground">Safaricom Mobile Money</p>
                  </div>
                </button>

                {/* Airtel Money */}
                <button
                  onClick={() => setPaymentMethod('airtel')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Airtel Money</p>
                    <p className="text-xs text-muted-foreground">Airtel Mobile Money</p>
                  </div>
                </button>

                {/* PayPal */}
                <button
                  onClick={() => setPaymentMethod('paypal')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">P</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">PayPal</p>
                    <p className="text-xs text-muted-foreground">Pay with PayPal</p>
                  </div>
                </button>

              </div>
            )}

            {/* Card Payment Category */}
            {paymentCategory === 'card' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Card Payment</p>
                    <p className="text-xs text-muted-foreground">Coming Soon</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <p className="text-xs text-amber-500">
                    Card payments (Visa, Mastercard) will be available soon. Please use M-Pesa for now.
                  </p>
                </div>

                <Button
                  onClick={handleDeposit}
                  disabled
                  className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Coming Soon
                </Button>
              </div>
            )}

            {/* Binance Selected */}
            {paymentMethod === 'binance' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <div className="h-12 w-12 rounded-full bg-yellow-500 flex items-center justify-center">
                    <span className="text-xl font-bold text-black">B</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Binance Pay</p>
                    <p className="text-xs text-muted-foreground">Coming Soon</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <p className="text-xs text-amber-500">
                    Binance Pay integration is coming soon. Please use M-Pesa for now.
                  </p>
                </div>

                <Button
                  onClick={handleDeposit}
                  disabled
                  className="w-full h-14 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Coming Soon
                </Button>
              </div>
            )}

            {/* M-Pesa Selected */}
            {paymentMethod === 'mpesa' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">M-Pesa via PayHero</p>
                    <p className="text-xs text-muted-foreground">Secure Payment Gateway</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <AlertCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <p className="text-xs text-green-400">
                    You will be redirected to PayHero to complete your M-Pesa payment securely.
                  </p>
                </div>

                <Button
                  onClick={handleDeposit}
                  className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-5 w-5" />
                  Pay with M-Pesa
                </Button>
              </div>
            )}

            {/* Airtel Money Selected */}
            {paymentMethod === 'airtel' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Airtel Money</p>
                    <p className="text-xs text-muted-foreground">Coming Soon</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <p className="text-xs text-amber-500">
                    Airtel Money integration is coming soon. Please use M-Pesa for now.
                  </p>
                </div>

                <Button
                  onClick={handleDeposit}
                  disabled
                  className="w-full h-14 bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Coming Soon
                </Button>
              </div>
            )}

            {/* PayPal Selected */}
            {paymentMethod === 'paypal' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">P</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">PayPal</p>
                    <p className="text-xs text-muted-foreground">Coming Soon</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <p className="text-xs text-amber-500">
                    PayPal integration is coming soon. Please use M-Pesa for now.
                  </p>
                </div>

                <Button
                  onClick={handleDeposit}
                  disabled
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Coming Soon
                </Button>
              </div>
            )}


            <p className="text-xs text-center text-muted-foreground">
              Minimum deposit: ${MINIMUM_DEPOSIT_AMOUNT}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Withdraw UI - Keep M-Pesa flow
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ArrowUpFromLine className="h-5 w-5 text-primary" />
            Withdraw to M-Pesa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Balance */}
          <div className="p-4 rounded-xl bg-secondary/50">
            <p className="text-sm text-muted-foreground">Current Balance ({accountType})</p>
            <p className="text-2xl font-bold text-foreground">
              ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* M-Pesa Info */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">M-Pesa</p>
              <p className="text-xs text-muted-foreground">Safaricom Mobile Money</p>
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              M-Pesa Phone Number
            </label>
            <Input
              type="tel"
              placeholder="e.g., 0712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="text-lg h-12 bg-input border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the phone number registered with M-Pesa
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Amount (USD)
            </label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg h-12 bg-input border-border"
              min={1}
            />
            <div className="flex gap-2 mt-3">
              {quickAmounts.map((qa) => (
                <button
                  key={qa}
                  onClick={() => setAmount(qa.toString())}
                  className="flex-1 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                >
                  ${qa}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleWithdraw}
            disabled={isLoading || !amount || !phoneNumber}
            className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              <span>Withdraw ${amount ? parseFloat(amount).toFixed(2) : '0.00'}</span>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Funds will be sent to your M-Pesa account within a few minutes
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
