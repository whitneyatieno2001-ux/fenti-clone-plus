import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount, MINIMUM_DEPOSIT_AMOUNT } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowDownToLine, ArrowUpFromLine, Smartphone, AlertCircle, Loader2, Bitcoin, ChevronLeft, CheckCircle2, Copy, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
}

type DepositMethod = 'select' | 'mpesa' | 'bitcoin';
type WithdrawMethod = 'select' | 'mpesa' | 'bitcoin';
type MpesaStatus = 'idle' | 'processing' | 'waiting' | 'success' | 'failed';
type FlowStatus = 'form' | 'success';

const MPESA_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1200px-M-PESA_LOGO-01.svg.png';
const BTC_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/800px-Bitcoin.svg.png';

export function TransactionModal({ isOpen, onClose, type }: TransactionModalProps) {
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('select');
  const [withdrawMethodState, setWithdrawMethodState] = useState<WithdrawMethod>('select');
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cryptoGenerated, setCryptoGenerated] = useState(false);
  const [cryptoTimer, setCryptoTimer] = useState(900);
  const [paymentId, setPaymentId] = useState('');
  const [mpesaStatus, setMpesaStatus] = useState<MpesaStatus>('idle');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [flowStatus, setFlowStatus] = useState<FlowStatus>('form');
  const [lastAmount, setLastAmount] = useState('');
  const [lastMethod, setLastMethod] = useState('');
  const { withdraw, currentBalance, accountType, isLoggedIn, user, deposit, userEmail } = useAccount();
  const { toast } = useToast();
  const isKycVerified = userEmail === 'whitneyatieno86@gmail.com';

  useEffect(() => {
    if (!isOpen) {
      setDepositMethod('select');
      setWithdrawMethodState('select');
      setAmount('');
      setCryptoAmount('');
      setCryptoGenerated(false);
      setCryptoTimer(900);
      setPaymentId('');
      setMpesaStatus('idle');
      setMpesaAmount('');
      setMpesaPhone('');
      setFlowStatus('form');
      setLastAmount('');
      setLastMethod('');
      setPhoneNumber('');
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cryptoGenerated && cryptoTimer > 0) {
      interval = setInterval(() => setCryptoTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [cryptoGenerated, cryptoTimer]);

  useEffect(() => {
    const loadPhone = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('phone_number').eq('user_id', user.id).maybeSingle();
      if (data?.phone_number) { setPhoneNumber(data.phone_number); setMpesaPhone(data.phone_number); }
    };
    if (isOpen) loadPhone();
  }, [user, isOpen]);

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const generatePaymentAddress = () => {
    const numAmount = parseFloat(cryptoAmount);
    if (isNaN(numAmount) || numAmount < 29) {
      toast({ title: "Invalid Amount", description: "Minimum deposit is $29.00", variant: "destructive" });
      return;
    }
    setPaymentId(Math.floor(1000000000 + Math.random() * 9000000000).toString());
    setCryptoGenerated(true);
    setCryptoTimer(900);
  };

  const handleMpesaDeposit = async () => {
    if (!isLoggedIn) { toast({ title: "Login Required", variant: "destructive" }); return; }
    const numAmount = parseFloat(mpesaAmount);
    if (isNaN(numAmount) || numAmount < 1) { toast({ title: "Invalid Amount", description: "Minimum is KES 1", variant: "destructive" }); return; }
    if (!mpesaPhone || mpesaPhone.length < 9) { toast({ title: "Invalid Phone", variant: "destructive" }); return; }
    setMpesaStatus('processing');
    try {
      const { data, error } = await supabase.functions.invoke('mpesa-payment', {
        body: {
          action: 'deposit',
          amount: numAmount,
          phoneNumber: mpesaPhone,
          userId: user?.id,
        },
      });
      if (error) throw error;
      if (data?.success) {
        setMpesaStatus('waiting');
        setPaymentId(data.checkoutRequestId || data.externalReference || '');
        toast({ title: "STK Push Sent!", description: "Check your phone and enter your M-Pesa PIN" });
      } else {
        throw new Error(data?.error || 'STK Push failed');
      }
    } catch (error: any) {
      console.error('M-Pesa deposit error:', error);
      setMpesaStatus('failed');
      toast({ title: "Payment Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleWithdraw = async () => {
    if (!isLoggedIn) { toast({ title: "Login Required", variant: "destructive" }); return; }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    if (!phoneNumber || phoneNumber.length < 9) { toast({ title: "Invalid phone", variant: "destructive" }); return; }
    if (numAmount > currentBalance) { toast({ title: "Insufficient Balance", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mpesa-payment', { body: { action: 'withdraw', amount: numAmount, phoneNumber } });
      if (error) throw error;
      if (data.success) {
        await withdraw(numAmount);
        setLastAmount(numAmount.toFixed(2));
        setLastMethod(withdrawMethodState === 'mpesa' ? 'M-Pesa' : 'Bitcoin');
        setFlowStatus('success');
      } else throw new Error(data.error || 'Failed');
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const goBack = () => {
    if (type === 'deposit') setDepositMethod('select');
    else setWithdrawMethodState('select');
  };

  // Full-page success screen matching the screenshot exactly
  const SuccessScreen = ({ label }: { label: string }) => {
    const isDeposit = label.toLowerCase().includes('payment') || label.toLowerCase().includes('deposit');
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
        {/* Close button */}
        <div className="flex justify-end p-4">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors text-foreground text-2xl">
            ×
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Green check circle */}
          <div className="relative flex justify-center items-center mb-8" style={{ width: 90, height: 90 }}>
            <div className="absolute rounded-full" style={{ width: 80, height: 80, background: 'radial-gradient(circle, rgba(14,203,129,0.25) 0%, rgba(14,203,129,0.05) 100%)' }} />
            <div className="relative z-10 flex justify-center items-center rounded-full" style={{ width: 60, height: 60, backgroundColor: '#0ECB81' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          </div>

          {isDeposit ? (
            <>
              <div className="flex items-baseline justify-center mb-2">
                <span className="text-[42px] font-bold text-foreground">{lastAmount || '0.00'}</span>
                <span className="text-xl font-medium text-muted-foreground ml-2">USDT</span>
              </div>
              <p className="text-base text-muted-foreground mb-6 text-center">Deposited into your Funding Account</p>
              <button onClick={onClose} className="text-[#fcd535] font-semibold text-lg mb-12 hover:opacity-80 transition-opacity">Check Assets</button>
              
              <p className="text-base text-foreground mb-5">Review Counterparty</p>
              <div className="flex gap-4 w-full max-w-sm">
                <button onClick={onClose} className="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border border-border text-foreground hover:bg-muted/50 transition-all duration-200 text-base font-medium">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  Positive
                </button>
                <button onClick={onClose} className="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border border-border text-foreground hover:bg-muted/50 transition-all duration-200 text-base font-medium">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 15V19a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
                  Negative
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-center mb-2">
                <span className="text-[42px] font-bold text-foreground">{lastAmount || '0.00'}</span>
                <span className="text-xl font-medium text-muted-foreground ml-2">USDT</span>
              </div>
              <p className="text-base text-muted-foreground mb-6 text-center">Withdrawn from your Funding Account</p>
              <button onClick={onClose} className="text-[#fcd535] font-semibold text-lg mb-12 hover:opacity-80 transition-opacity">Check Asset</button>
              
              <p className="text-base text-foreground mb-5">Review Counterparty</p>
              <div className="flex gap-4 w-full max-w-sm">
                <button onClick={onClose} className="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border border-border text-foreground hover:bg-muted/50 transition-all duration-200 text-base font-medium">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  Positive
                </button>
                <button onClick={onClose} className="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border border-border text-foreground hover:bg-muted/50 transition-all duration-200 text-base font-medium">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 15V19a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
                  Negative
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Method card matching screenshot style
  const MethodCard = ({ title, subtitle, description, minAmount, logo, onClick, buttonLabel }: {
    title: string; subtitle: string; description: string; minAmount: string; logo: string; onClick: () => void; buttonLabel: string;
  }) => (
    <div className="rounded-xl border border-border bg-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <img src={logo} alt={title} className="h-10 w-auto object-contain" />
      </div>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <p className="text-sm text-foreground">{description}</p>
      <p className="text-sm font-medium text-primary">Min: {minAmount}</p>
      <Button onClick={onClick} variant="outline" className="w-full h-12 text-base font-semibold border-border hover:bg-secondary">
        {buttonLabel}
      </Button>
    </div>
  );

  // Full-page success (outside Dialog)
  if (flowStatus === 'success') {
    return <SuccessScreen label={type === 'deposit' ? 'Payment' : 'Withdrawal'} />;
  }

  // DEPOSIT
  if (type === 'deposit') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
          {false ? null : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  {depositMethod !== 'select' && (
                    <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8 mr-1"><ChevronLeft className="h-4 w-4" /></Button>
                  )}
                  <ArrowDownToLine className="h-5 w-5 text-primary" />
                  Deposit Funds
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="p-4 rounded-xl bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Current Balance ({accountType})</p>
                  <p className="text-2xl font-bold text-foreground">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>

                {/* Method Selection */}
                {depositMethod === 'select' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-foreground">Mobile Money</h3>
                    <MethodCard
                      title="M-Pesa"
                      subtitle="Quick mobile payments"
                      description="Fast and secure mobile money transfers."
                      minAmount="$19.00"
                      logo={MPESA_LOGO}
                      onClick={() => setDepositMethod('mpesa')}
                      buttonLabel="Select"
                    />

                    <h3 className="text-lg font-bold text-foreground">Cryptocurrency</h3>
                    <MethodCard
                      title="Bitcoin (BTC)"
                      subtitle="Pay with Bitcoin"
                      description="Deposit using Bitcoin cryptocurrency."
                      minAmount="$29.00"
                      logo={BTC_LOGO}
                      onClick={() => setDepositMethod('bitcoin')}
                      buttonLabel="Select"
                    />
                  </div>
                )}

                {/* Bitcoin deposit */}
                {depositMethod === 'bitcoin' && !cryptoGenerated && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                      <img src={BTC_LOGO} alt="BTC" className="h-12 w-12" />
                      <div>
                        <p className="font-semibold text-foreground">Bitcoin Deposit</p>
                        <p className="text-xs text-muted-foreground">Enter amount and generate payment address</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Amount (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input type="text" inputMode="decimal" placeholder="29" value={cryptoAmount}
                          onChange={(e) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setCryptoAmount(e.target.value); }}
                          className="pl-8 h-12 bg-secondary/50 border-border" />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fee:</span><span className="text-foreground">0.5%</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Processing:</span><span className="text-foreground">~30 min</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Min:</span><span className="text-foreground">$29.00</span></div>
                    </div>
                    <Button onClick={generatePaymentAddress} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                      Generate Payment Address
                    </Button>
                  </div>
                )}

                {/* Bitcoin payment generated */}
                {depositMethod === 'bitcoin' && cryptoGenerated && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border text-center space-y-2">
                      <p className="font-semibold text-foreground text-lg">Payment Created</p>
                      <p className="text-sm text-muted-foreground">Send <span className="font-bold text-foreground">{(parseFloat(cryptoAmount) / 95000).toFixed(8)} BTC</span></p>
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <Clock className="h-4 w-4" /><span className="font-mono font-bold">{formatTimer(cryptoTimer)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                      <code className="flex-1 text-xs text-foreground break-all font-mono">0x89887304cc8bfb8e8f529740eb4ab08feb246196</code>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText('0x89887304cc8bfb8e8f529740eb4ab08feb246196'); toast({ title: "Copied!" }); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button onClick={() => { setCryptoGenerated(false); setCryptoTimer(900); setPaymentId(''); }} variant="destructive" className="w-full h-14 font-semibold">
                      Cancel Payment
                    </Button>
                  </div>
                )}

                {/* M-Pesa deposit */}
                {depositMethod === 'mpesa' && mpesaStatus === 'idle' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <img src={MPESA_LOGO} alt="M-Pesa" className="h-12 w-auto" />
                      <div>
                        <p className="font-semibold text-foreground">M-Pesa Deposit</p>
                        <p className="text-xs text-muted-foreground">Enter details to receive STK push</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Amount (KES)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">KES</span>
                        <Input type="text" inputMode="numeric" placeholder="1000" value={mpesaAmount}
                          onChange={(e) => { if (e.target.value === '' || /^\d*$/.test(e.target.value)) setMpesaAmount(e.target.value); }}
                          className="pl-12 h-12 bg-secondary/50 border-border" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[100, 500, 1000, 2000].map(a => (
                        <button key={a} onClick={() => setMpesaAmount(a.toString())} className="flex-1 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors">{a}</button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">M-Pesa Phone</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="tel" inputMode="tel" placeholder="0712345678" value={mpesaPhone}
                          onChange={(e) => setMpesaPhone(e.target.value)} className="pl-10 h-12 bg-secondary/50 border-border" />
                      </div>
                    </div>
                    <Button onClick={handleMpesaDeposit} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold">
                      <Smartphone className="h-5 w-5 mr-2" />Send STK Push
                    </Button>
                  </div>
                )}

                {depositMethod === 'mpesa' && mpesaStatus === 'processing' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-12 w-12 text-green-500 animate-spin mb-4" />
                    <p className="text-lg font-semibold text-foreground">Initiating Payment...</p>
                  </div>
                )}

                {depositMethod === 'mpesa' && mpesaStatus === 'waiting' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center space-y-3">
                      <Smartphone className="h-8 w-8 text-green-500 animate-pulse mx-auto" />
                      <p className="font-semibold text-foreground text-lg">Check Your Phone</p>
                      <p className="text-sm text-muted-foreground">STK push sent to <span className="font-semibold text-foreground">{mpesaPhone}</span></p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => { setMpesaStatus('idle'); setMpesaAmount(''); setMpesaPhone(''); }} variant="outline" className="h-12">Try Again</Button>
                      <Button onClick={() => {
                        setLastAmount(mpesaAmount ? (parseFloat(mpesaAmount) / 130).toFixed(2) : '0.00');
                        setLastMethod('M-Pesa');
                        setFlowStatus('success');
                      }} className="h-12 bg-success hover:bg-success/90 text-success-foreground">Payment Done</Button>
                    </div>
                  </div>
                )}

                {depositMethod === 'mpesa' && mpesaStatus === 'failed' && (
                  <div className="space-y-4 text-center py-4">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                    <p className="font-semibold text-foreground">Payment Failed</p>
                    <Button onClick={() => { setMpesaStatus('idle'); setMpesaAmount(''); }} className="w-full h-14 bg-green-600 text-white">Try Again</Button>
                  </div>
                )}

                <p className="text-xs text-center text-muted-foreground">Minimum deposit: ${MINIMUM_DEPOSIT_AMOUNT}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // WITHDRAW
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
        {false ? null : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                {withdrawMethodState !== 'select' && (
                  <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8 mr-1"><ChevronLeft className="h-4 w-4" /></Button>
                )}
                <ArrowUpFromLine className="h-5 w-5 text-primary" />
                Withdraw Funds
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {accountType === 'demo' && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-500">Demo Account</p>
                      <p className="text-sm text-muted-foreground mt-1">Switch to Real account to withdraw.</p>
                    </div>
                  </div>
                </div>
              )}

              {accountType === 'real' && !isKycVerified && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">KYC Not Verified</p>
                      <p className="text-sm text-muted-foreground mt-1">Complete KYC verification to enable withdrawals.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-secondary/50">
                <p className="text-sm text-muted-foreground">Balance ({accountType})</p>
                <p className="text-2xl font-bold text-foreground">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>

              {withdrawMethodState === 'select' && accountType === 'real' && isKycVerified && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-foreground">Mobile Money</h3>
                  <MethodCard
                    title="M-Pesa"
                    subtitle="Quick mobile payments"
                    description="Withdraw to your M-Pesa account."
                    minAmount="$5.00"
                    logo={MPESA_LOGO}
                    onClick={() => setWithdrawMethodState('mpesa')}
                    buttonLabel="Select"
                  />

                  <h3 className="text-lg font-bold text-foreground">Cryptocurrency</h3>
                  <MethodCard
                    title="Bitcoin (BTC)"
                    subtitle="Withdraw to wallet"
                    description="Withdraw to your Bitcoin wallet."
                    minAmount="$29.00"
                    logo={BTC_LOGO}
                    onClick={() => setWithdrawMethodState('bitcoin')}
                    buttonLabel="Select"
                  />
                </div>
              )}

              {/* M-Pesa Withdraw */}
              {withdrawMethodState === 'mpesa' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <img src={MPESA_LOGO} alt="M-Pesa" className="h-12 w-auto" />
                    <div><p className="font-semibold text-foreground">M-Pesa</p><p className="text-xs text-muted-foreground">Safaricom Mobile Money</p></div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                    <Input type="tel" placeholder="0712345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-12 bg-input border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Amount (USD)</label>
                    <Input type="text" inputMode="decimal" placeholder="Enter amount" value={amount}
                      onChange={(e) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setAmount(e.target.value); }}
                      className="h-12 bg-input border-border" />
                    <div className="flex gap-2 mt-2">
                      {[5, 10, 25, 50].map(a => (
                        <button key={a} onClick={() => setAmount(a.toString())} className="flex-1 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors">${a}</button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleWithdraw} disabled={isLoading || !amount || !phoneNumber} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold">
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : `Withdraw $${amount ? parseFloat(amount).toFixed(2) : '0.00'}`}
                  </Button>
                </div>
              )}

              {/* Bitcoin Withdraw (Coming Soon) */}
              {withdrawMethodState === 'bitcoin' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <img src={BTC_LOGO} alt="BTC" className="h-12 w-12" />
                    <div><p className="font-semibold text-foreground">Bitcoin Withdrawal</p><p className="text-xs text-muted-foreground">Coming Soon</p></div>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                    <p className="text-xs text-amber-500">Bitcoin withdrawals coming soon. Use M-Pesa for now.</p>
                  </div>
                  <Button disabled className="w-full h-14 bg-orange-500 text-white font-semibold disabled:opacity-50">Coming Soon</Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
