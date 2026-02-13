import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount, MINIMUM_DEPOSIT_AMOUNT } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowDownToLine, ArrowUpFromLine, Smartphone, AlertCircle, Loader2, ExternalLink, Bitcoin, Wallet, ChevronLeft, CreditCard, CheckCircle2, Copy, Clock, QrCode, Star, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
}

type PaymentCategory = 'select' | 'crypto' | 'mobile' | 'card';
type PaymentMethod = 'binance' | 'mpesa' | 'airtel' | 'paypal' | 'card' | null;
type WithdrawCategory = 'select' | 'crypto' | 'mobile' | 'card';
type WithdrawMethod = 'binance' | 'mpesa' | 'airtel' | 'card' | null;
type MpesaStatus = 'idle' | 'processing' | 'waiting' | 'success' | 'failed';
type DepositStatus = 'form' | 'success';

const quickAmounts = [5, 10, 25, 50];

export function TransactionModal({ isOpen, onClose, type }: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [existingPhone, setExistingPhone] = useState('');
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>('select');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [withdrawCategory, setWithdrawCategory] = useState<WithdrawCategory>('select');
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod>(null);
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cryptoGenerated, setCryptoGenerated] = useState(false);
  const [cryptoTimer, setCryptoTimer] = useState(900); // 15 minutes
  const [paymentId, setPaymentId] = useState('');
  const [mpesaStatus, setMpesaStatus] = useState<MpesaStatus>('idle');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('form');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [lastDepositAmount, setLastDepositAmount] = useState('');
  const [lastPaymentMethod, setLastPaymentMethod] = useState('');
  const [withdrawStatus, setWithdrawStatus] = useState<'form' | 'success'>('form');
  const [lastWithdrawAmount, setLastWithdrawAmount] = useState('');
  const [lastWithdrawMethod, setLastWithdrawMethod] = useState('');
  const { withdraw, currentBalance, accountType, isLoggedIn, user, deposit } = useAccount();
  const { toast } = useToast();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPaymentCategory('select');
      setPaymentMethod(null);
      setWithdrawCategory('select');
      setWithdrawMethod(null);
      setAmount('');
      setCryptoAmount('');
      setCryptoGenerated(false);
      setCryptoTimer(900);
      setPaymentId('');
      setMpesaStatus('idle');
      setMpesaAmount('');
      setMpesaPhone('');
      setDepositStatus('form');
      setFeedbackRating(0);
      setFeedbackText('');
      setLastDepositAmount('');
      setLastPaymentMethod('');
      setWithdrawStatus('form');
      setLastWithdrawAmount('');
      setLastWithdrawMethod('');
    }
  }, [isOpen]);

  // Crypto payment timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cryptoGenerated && cryptoTimer > 0) {
      interval = setInterval(() => {
        setCryptoTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cryptoGenerated, cryptoTimer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generatePaymentAddress = () => {
    const numAmount = parseFloat(cryptoAmount);
    if (isNaN(numAmount) || numAmount < 28) {
      toast({
        title: "Invalid Amount",
        description: "Minimum deposit is $28.00",
        variant: "destructive",
      });
      return;
    }
    // Generate a random payment ID
    setPaymentId(Math.floor(1000000000 + Math.random() * 9000000000).toString());
    setCryptoGenerated(true);
    setCryptoTimer(900);
  };

  const cancelCryptoPayment = () => {
    setCryptoGenerated(false);
    setCryptoTimer(900);
    setPaymentId('');
  };

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

  const handleMpesaDeposit = async () => {
    if (!isLoggedIn) {
      toast({
        title: "Login Required",
        description: "Please login to make deposits",
        variant: "destructive",
      });
      return;
    }

    const numAmount = parseFloat(mpesaAmount);
    if (isNaN(numAmount) || numAmount < 1) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount (minimum KES 1)",
        variant: "destructive",
      });
      return;
    }

    if (!mpesaPhone || mpesaPhone.length < 9) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid M-Pesa phone number",
        variant: "destructive",
      });
      return;
    }

    setMpesaStatus('processing');

    try {
      // Mock mode - simulate STK push without calling PayHero
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
      
      setMpesaStatus('waiting');
      setPaymentId('MOCK-' + Math.floor(1000000000 + Math.random() * 9000000000).toString());
      toast({
        title: "STK Push Sent!",
        description: "Check your phone and enter your M-Pesa PIN to complete payment",
      });
    } catch (error: any) {
      console.error('M-Pesa error:', error);
      setMpesaStatus('failed');
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate M-Pesa payment",
        variant: "destructive",
      });
    }
  };

  const resetMpesaPayment = () => {
    setMpesaStatus('idle');
    setMpesaAmount('');
    setMpesaPhone('');
    setPaymentId('');
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
        await withdraw(numAmount);
        setLastWithdrawAmount(numAmount.toFixed(2));
        setLastWithdrawMethod(withdrawMethod === 'mpesa' ? 'M-Pesa' : 'Crypto Wallet');
        setWithdrawStatus('success');
        setAmount('');
        setPhoneNumber('');
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
    if (type === 'deposit') {
      if (paymentMethod) {
        setPaymentMethod(null);
      } else {
        setPaymentCategory('select');
      }
    } else {
      if (withdrawMethod) {
        setWithdrawMethod(null);
      } else {
        setWithdrawCategory('select');
      }
    }
  };

  // Deposit UI
  if (type === 'deposit') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          {depositStatus === 'success' ? (
            <div className="flex flex-col items-center px-2 py-6" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
              {/* Icon Composition */}
              <div className="relative flex justify-center items-center mb-6" style={{ width: 90, height: 90 }}>
                {/* Outer ring */}
                <div className="absolute rounded-full" style={{ width: 80, height: 80, background: 'linear-gradient(180deg, rgba(14, 203, 129, 0.15) 0%, rgba(14, 203, 129, 0.05) 100%)' }} />
                {/* Particles */}
                <div className="absolute rounded-full" style={{ width: 4, height: 4, top: 15, left: 18, backgroundColor: '#0ECB81', opacity: 0.4 }} />
                <div className="absolute rounded-full" style={{ width: 3, height: 3, top: 10, right: 20, backgroundColor: '#0ECB81', opacity: 0.6 }} />
                <div className="absolute rounded-full" style={{ width: 4, height: 4, bottom: 15, right: 15, backgroundColor: '#0ECB81', opacity: 0.5 }} />
                {/* Main circle */}
                <div className="relative z-10 flex justify-center items-center rounded-full" style={{ width: 56, height: 56, backgroundColor: '#0ECB81', boxShadow: '0 4px 10px rgba(14, 203, 129, 0.25)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              </div>

              {/* Status text */}
              <div className="text-base font-medium text-foreground mb-2">Payment Successful</div>

              {/* Amount */}
              <div className="flex items-baseline justify-center mb-8">
                <span className="text-[32px] font-bold text-foreground" style={{ letterSpacing: '-0.5px' }}>
                  {lastDepositAmount || '0.00'}
                </span>
                <span className="text-lg font-medium text-foreground ml-0.5">USD</span>
              </div>

              {/* Details Card */}
              <div className="w-full rounded-lg p-5 mb-8" style={{ backgroundColor: 'var(--bg-alt, #F5F5F5)' }}>
                <div className="flex justify-between items-start mb-4 text-[13px]">
                  <span className="text-muted-foreground">Merchant Name</span>
                  <span className="font-medium text-foreground">Crypto Wave</span>
                </div>
                <div className="flex justify-between items-start mb-4 text-[13px]">
                  <span className="text-muted-foreground">Product Name</span>
                  <span className="font-medium text-foreground">Deposit</span>
                </div>
                <div className="flex justify-between items-start mb-4 text-[13px]">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium text-foreground">{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
                </div>
                <div className="flex justify-between items-start mb-4 text-[13px]">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-medium text-foreground">{lastPaymentMethod || 'Spot Wallet'}</span>
                </div>
                <div className="flex justify-between items-start text-[13px]">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-medium text-foreground">{lastDepositAmount || '0.00'} USD</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={onClose}
                className="w-full py-4 rounded font-medium text-[15px] mb-6 transition-colors"
                style={{ backgroundColor: '#FCD535', color: '#1E2329' }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F0CA30')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#FCD535')}
              >
                Back to Wallet
              </button>

              {/* Footer */}
              <div className="text-[13px] text-muted-foreground text-center">
                Need help? <a href="/support" className="font-medium" style={{ color: '#C99400' }}>Contact Support</a>
              </div>
            </div>
          ) : (
            // Normal Deposit Form
            <>
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
                    
                    <button
                      onClick={() => setPaymentCategory('crypto')}
                      className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Bitcoin className="h-5 w-5 text-success" />
                        </div>
                        <div className="text-left">
                          <p className="text-[15px] font-semibold text-foreground">Crypto Payments</p>
                          <p className="text-[13px] text-muted-foreground">≈ 0.5% Fee</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentCategory('mobile')}
                      className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-success" />
                        </div>
                        <div className="text-left">
                          <p className="text-[15px] font-semibold text-foreground">Mobile Money</p>
                          <p className="text-[13px] text-muted-foreground">≈ 0 Fee</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentCategory('card')}
                      className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="text-[15px] font-semibold text-foreground">Card Payment</p>
                          <p className="text-[13px] text-muted-foreground">≈ 1.8% Fee</p>
                        </div>
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
                      className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">B</span>
                        </div>
                        <div className="text-left">
                          <p className="text-[15px] font-semibold text-foreground">Binance</p>
                          <p className="text-[13px] text-muted-foreground">≈ 0 Fee</p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Mobile Money Options */}
                {paymentCategory === 'mobile' && !paymentMethod && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Select Payment Provider</p>
                    <button
                      onClick={() => setPaymentMethod('mpesa')}
                      className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Smartphone className="h-5 w-5 text-success" />
                        </div>
                        <div className="text-left">
                          <p className="text-[15px] font-semibold text-foreground">M-Pesa</p>
                          <p className="text-[13px] text-muted-foreground">≈ 0 Fee</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('airtel')}
                      className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Smartphone className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="text-[15px] font-semibold text-foreground">Airtel Money</p>
                          <p className="text-[13px] text-muted-foreground">≈ 0 Fee</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('paypal')}
                      className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">P</span>
                        </div>
                        <div className="text-left">
                          <p className="text-[15px] font-semibold text-foreground">PayPal</p>
                          <p className="text-[13px] text-muted-foreground">≈ 1% Fee</p>
                        </div>
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
                    <Button disabled className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50">
                      Coming Soon
                    </Button>
                  </div>
                )}

                {/* Binance/Crypto Selected */}
                {paymentMethod === 'binance' && !cryptoGenerated && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                      <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
                        <Bitcoin className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Crypto Deposit</p>
                        <p className="text-xs text-muted-foreground">Enter amount and generate payment address</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Amount (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="28"
                          value={cryptoAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setCryptoAmount(val);
                            }
                          }}
                          className="pl-8 h-12 bg-secondary/50 border-border text-foreground"
                        />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
                      <p className="text-sm font-medium text-primary">Transaction Information</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Processing Fee:</span>
                        <span className="text-foreground">0.5%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Processing Time:</span>
                        <span className="text-foreground">~30 minutes</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Min. Deposit:</span>
                        <span className="text-foreground">$28.00</span>
                      </div>
                    </div>
                    <Button
                      onClick={generatePaymentAddress}
                      className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      Generate Payment Address
                    </Button>
                  </div>
                )}

                {/* Crypto Payment Generated */}
                {paymentMethod === 'binance' && cryptoGenerated && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border text-center space-y-2">
                      <p className="font-semibold text-foreground text-lg">Payment Created</p>
                      <p className="text-sm text-muted-foreground">Status: <span className="text-amber-400">Waiting</span></p>
                      <p className="text-sm text-muted-foreground">
                        Please send exactly <span className="font-bold text-foreground">{(parseFloat(cryptoAmount) / 95000).toFixed(8)} BTC</span>
                      </p>
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono font-bold">{formatTimer(cryptoTimer)} remaining</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                      <code className="flex-1 text-xs text-foreground break-all font-mono">
                        0x89887304cc8bfb8e8f529740eb4ab08feb246196
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText('0x89887304cc8bfb8e8f529740eb4ab08feb246196');
                          toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
                      <p className="text-sm font-medium text-primary">Payment Information</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount in USD:</span>
                        <span className="text-foreground">${cryptoAmount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount in BTC:</span>
                        <span className="text-foreground">{(parseFloat(cryptoAmount) / 95000).toFixed(8)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment ID:</span>
                        <span className="text-foreground">{paymentId}</span>
                      </div>
                    </div>
                    <Button
                      onClick={cancelCryptoPayment}
                      variant="destructive"
                      className="w-full h-14 font-semibold"
                    >
                      Cancel Payment
                    </Button>
                  </div>
                )}

                {/* M-Pesa Selected - Idle State */}
                {paymentMethod === 'mpesa' && mpesaStatus === 'idle' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                        <Smartphone className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">M-Pesa Deposit</p>
                        <p className="text-xs text-muted-foreground">Enter details to receive STK push</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Amount (KES)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">KES</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="1000"
                          value={mpesaAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*$/.test(val)) {
                              setMpesaAmount(val);
                            }
                          }}
                          className="pl-12 h-12 bg-secondary/50 border-border text-foreground"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[100, 500, 1000, 2000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setMpesaAmount(amt.toString())}
                          className="flex-1 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">M-Pesa Phone Number</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          type="tel"
                          inputMode="tel"
                          placeholder="0712345678"
                          value={mpesaPhone}
                          onChange={(e) => setMpesaPhone(e.target.value)}
                          className="pl-10 h-12 bg-secondary/50 border-border text-foreground"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Enter Safaricom number (e.g., 0712345678)</p>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <p className="text-xs text-green-400">
                        You'll receive an STK push on your phone. Enter your M-Pesa PIN to complete payment.
                      </p>
                    </div>
                    <Button
                      onClick={handleMpesaDeposit}
                      className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-2"
                    >
                      <Smartphone className="h-5 w-5" />
                      Send STK Push
                    </Button>
                  </div>
                )}

                {/* M-Pesa Processing State */}
                {paymentMethod === 'mpesa' && mpesaStatus === 'processing' && (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-12 w-12 text-green-500 animate-spin mb-4" />
                      <p className="text-lg font-semibold text-foreground">Initiating Payment...</p>
                      <p className="text-sm text-muted-foreground">Please wait while we send STK push to your phone</p>
                    </div>
                  </div>
                )}

                {/* M-Pesa Waiting State */}
                {paymentMethod === 'mpesa' && mpesaStatus === 'waiting' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-green-500/20 mx-auto flex items-center justify-center">
                        <Smartphone className="h-8 w-8 text-green-500 animate-pulse" />
                      </div>
                      <p className="font-semibold text-foreground text-lg">Check Your Phone</p>
                      <p className="text-sm text-muted-foreground">
                        An M-Pesa prompt has been sent to <span className="font-semibold text-foreground">{mpesaPhone}</span>
                      </p>
                      <p className="text-sm text-green-400">Enter your M-Pesa PIN to complete payment</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
                      <p className="text-sm font-medium text-primary">Payment Details</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="text-foreground font-semibold">KES {mpesaAmount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="text-foreground">{mpesaPhone}</span>
                      </div>
                      {paymentId && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Reference:</span>
                          <span className="text-foreground font-mono text-xs">{paymentId}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Clock className="h-4 w-4 text-amber-500 mt-0.5" />
                      <p className="text-xs text-amber-500">
                        Waiting for confirmation. Your balance will update automatically once payment is received.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={resetMpesaPayment}
                        variant="outline"
                        className="h-12 font-semibold"
                      >
                        Try Again
                      </Button>
                      <Button
                        onClick={() => {
                          setLastDepositAmount(mpesaAmount ? (parseFloat(mpesaAmount) / 130).toFixed(2) : cryptoAmount || '0.00');
                          setLastPaymentMethod(paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'binance' ? 'Crypto Wallet' : 'Spot Wallet');
                          setDepositStatus('success');
                        }}
                        className="h-12 font-semibold bg-success hover:bg-success/90 text-success-foreground"
                      >
                        Payment Done
                      </Button>
                    </div>
                  </div>
                )}

                {/* M-Pesa Failed State */}
                {paymentMethod === 'mpesa' && mpesaStatus === 'failed' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-destructive/20 mx-auto flex items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                      </div>
                      <p className="font-semibold text-foreground text-lg">Payment Failed</p>
                      <p className="text-sm text-muted-foreground">
                        We couldn't initiate the M-Pesa payment. Please try again.
                      </p>
                    </div>
                    <Button
                      onClick={resetMpesaPayment}
                      className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold"
                    >
                      Try Again
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
                    <Button disabled className="w-full h-14 bg-red-500 hover:bg-red-600 text-white font-semibold disabled:opacity-50">
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
                    <Button disabled className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                      Coming Soon
                    </Button>
                  </div>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  Minimum deposit: ${MINIMUM_DEPOSIT_AMOUNT}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Withdraw UI with category/method flow like deposit
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        {withdrawStatus === 'success' ? (
          <div className="flex flex-col items-center px-2 py-6" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
            {/* Icon Composition */}
            <div className="relative flex justify-center items-center mb-6" style={{ width: 90, height: 90 }}>
              <div className="absolute rounded-full" style={{ width: 80, height: 80, background: 'linear-gradient(180deg, rgba(14, 203, 129, 0.15) 0%, rgba(14, 203, 129, 0.05) 100%)' }} />
              <div className="absolute rounded-full" style={{ width: 4, height: 4, top: 15, left: 18, backgroundColor: '#0ECB81', opacity: 0.4 }} />
              <div className="absolute rounded-full" style={{ width: 3, height: 3, top: 10, right: 20, backgroundColor: '#0ECB81', opacity: 0.6 }} />
              <div className="absolute rounded-full" style={{ width: 4, height: 4, bottom: 15, right: 15, backgroundColor: '#0ECB81', opacity: 0.5 }} />
              <div className="relative z-10 flex justify-center items-center rounded-full" style={{ width: 56, height: 56, backgroundColor: '#0ECB81', boxShadow: '0 4px 10px rgba(14, 203, 129, 0.25)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </div>

            <div className="text-base font-medium text-foreground mb-2">Withdrawal Successful</div>

            <div className="flex items-baseline justify-center mb-8">
              <span className="text-[32px] font-bold text-foreground" style={{ letterSpacing: '-0.5px' }}>
                {lastWithdrawAmount || '0.00'}
              </span>
              <span className="text-lg font-medium text-foreground ml-0.5">USD</span>
            </div>

            <div className="w-full rounded-lg p-5 mb-8" style={{ backgroundColor: 'var(--bg-alt, #F5F5F5)' }}>
              <div className="flex justify-between items-start mb-4 text-[13px]">
                <span className="text-muted-foreground">Merchant Name</span>
                <span className="font-medium text-foreground">Crypto Wave</span>
              </div>
              <div className="flex justify-between items-start mb-4 text-[13px]">
                <span className="text-muted-foreground">Product Name</span>
                <span className="font-medium text-foreground">Withdrawal</span>
              </div>
              <div className="flex justify-between items-start mb-4 text-[13px]">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium text-foreground">{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
              </div>
              <div className="flex justify-between items-start mb-4 text-[13px]">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium text-foreground">{lastWithdrawMethod || 'Spot Wallet'}</span>
              </div>
              <div className="flex justify-between items-start text-[13px]">
                <span className="text-muted-foreground">Currency</span>
                <span className="font-medium text-foreground">{lastWithdrawAmount || '0.00'} USD</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 rounded font-medium text-[15px] mb-6 transition-colors"
              style={{ backgroundColor: '#FCD535', color: '#1E2329' }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F0CA30')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#FCD535')}
            >
              Back to Wallet
            </button>

            <div className="text-[13px] text-muted-foreground text-center">
              Need help? <a href="/support" className="font-medium" style={{ color: '#C99400' }}>Contact Support</a>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                {(withdrawCategory !== 'select' || withdrawMethod) && (
                  <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8 mr-1">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <ArrowUpFromLine className="h-5 w-5 text-primary" />
                Withdraw Funds
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Demo Account Warning */}
              {accountType === 'demo' && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-500">Demo Account</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Withdrawals are only available from your Real account. Please switch to your Real account to withdraw funds.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Balance */}
              <div className="p-4 rounded-xl bg-secondary/50">
                <p className="text-sm text-muted-foreground">Current Balance ({accountType})</p>
                <p className="text-2xl font-bold text-foreground">
                  ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Category Selection - Only show if Real account */}
              {withdrawCategory === 'select' && accountType === 'real' && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Select Withdrawal Method</p>

                  <button
                    onClick={() => setWithdrawCategory('crypto')}
                    className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bitcoin className="h-5 w-5 text-success" />
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-semibold text-foreground">Crypto Payments</p>
                        <p className="text-[13px] text-muted-foreground">≈ 0.5% Fee</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setWithdrawCategory('mobile')}
                    className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-success" />
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-semibold text-foreground">Mobile Money</p>
                        <p className="text-[13px] text-muted-foreground">≈ 0 Fee</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setWithdrawCategory('card')}
                    className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-semibold text-foreground">Card / Bank</p>
                        <p className="text-[13px] text-muted-foreground">≈ 1.8% Fee</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Crypto Options */}
              {withdrawCategory === 'crypto' && !withdrawMethod && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Select Crypto Provider</p>
                  <button
                    onClick={() => setWithdrawMethod('binance')}
                    className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">B</span>
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-semibold text-foreground">Binance</p>
                        <p className="text-[13px] text-muted-foreground">≈ 0 Fee</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Card Category */}
              {withdrawCategory === 'card' && !withdrawMethod && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Card / Bank Withdrawal</p>
                      <p className="text-xs text-muted-foreground">Coming Soon</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                    <p className="text-xs text-amber-500">
                      Card and bank withdrawals will be available soon. Please use M-Pesa for now.
                    </p>
                  </div>
                  <Button disabled className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50">
                    Coming Soon
                  </Button>
                </div>
              )}

              {/* Binance Withdraw (Coming Soon) */}
              {withdrawMethod === 'binance' && (
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
                      Binance Pay withdrawals will be available soon. Please use M-Pesa for now.
                    </p>
                  </div>
                  <Button disabled className="w-full h-14 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold disabled:opacity-50">
                    Coming Soon
                  </Button>
                </div>
              )}

              {/* Mobile Money Options */}
              {withdrawCategory === 'mobile' && !withdrawMethod && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Select Provider</p>
                  <button
                    onClick={() => setWithdrawMethod('mpesa')}
                    className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-success" />
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-semibold text-foreground">M-Pesa</p>
                        <p className="text-[13px] text-muted-foreground">≈ 0 Fee</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setWithdrawMethod('airtel')}
                    className="w-full relative bg-card border border-border rounded hover:-translate-y-0.5 hover:shadow-lg hover:border-primary transition-all"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-semibold text-foreground">Airtel Money</p>
                        <p className="text-[13px] text-muted-foreground">Coming Soon</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* M-Pesa Withdraw Form */}
              {withdrawMethod === 'mpesa' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">M-Pesa</p>
                      <p className="text-xs text-muted-foreground">Safaricom Mobile Money</p>
                    </div>
                  </div>

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

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Amount (USD)
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setAmount(val);
                        }
                      }}
                      className="text-lg h-12 bg-input border-border"
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
              )}

              {/* Airtel Money (Coming Soon) */}
              {withdrawMethod === 'airtel' && (
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
                      Airtel Money withdrawals will be available soon. Please use M-Pesa for now.
                    </p>
                  </div>
                  <Button disabled className="w-full h-14 bg-red-500 hover:bg-red-600 text-white font-semibold disabled:opacity-50">
                    Coming Soon
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
