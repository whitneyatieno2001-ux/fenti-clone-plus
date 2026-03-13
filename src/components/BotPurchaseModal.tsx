import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock, Unlock, ChevronLeft, Bitcoin, Wallet, Smartphone, AlertCircle, ExternalLink, Copy, Clock, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import binanceQrPay from '@/assets/binance-qr-pay.png';

interface BotPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: {
    id: string;
    name: string;
    price: number;
    winRate: number;
  } | null;
  onPurchaseSuccess: () => void;
}

type PaymentCategory = 'select' | 'crypto' | 'mobile';
type PaymentMethod = 'binance' | 'mpesa' | 'airtel' | null;

const PAYHERO_DEPOSIT_LINK = 'https://short.payhero.co.ke/s/L9sqoCZ7EW2riRENtemoSK';

export function BotPurchaseModal({ isOpen, onClose, bot, onPurchaseSuccess }: BotPurchaseModalProps) {
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>('select');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cryptoGenerated, setCryptoGenerated] = useState(false);
  const [cryptoTimer, setCryptoTimer] = useState(900);
  const [paymentId, setPaymentId] = useState('');
  const { toast } = useToast();
  const { user } = useAccount();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPaymentCategory('select');
      setPaymentMethod(null);
      setCryptoAmount('');
      setCryptoGenerated(false);
      setCryptoTimer(900);
      setPaymentId('');
    } else if (bot) {
      setCryptoAmount(String(bot.price));
    }
  }, [isOpen, bot]);

  // Crypto payment timer countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
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
    if (!bot) return;
    setPaymentId(Math.floor(1000000000 + Math.random() * 9000000000).toString());
    setCryptoGenerated(true);
    setCryptoTimer(900);
  };

  const cancelCryptoPayment = () => {
    setCryptoGenerated(false);
    setCryptoTimer(900);
    setPaymentId('');
  };

  const handlePayment = () => {
    if (!bot) return;

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
        description: `Complete your M-Pesa payment of $${bot.price} on the PayHero page to unlock ${bot.name}`,
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
  };

  const goBack = () => {
    if (paymentMethod) {
      setPaymentMethod(null);
      setCryptoGenerated(false);
    } else {
      setPaymentCategory('select');
    }
  };

  if (!bot) return null;

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
            <Lock className="h-5 w-5 text-warning" />
            Unlock {bot.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Bot Info */}
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-foreground">{bot.name}</p>
                <p className="text-sm text-muted-foreground">{bot.winRate}% target win rate</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-warning">${bot.price}</p>
                <p className="text-xs text-muted-foreground">One-time payment</p>
              </div>
            </div>
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
                  <p className="text-xs text-muted-foreground">Pay with Binance</p>
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
                  <p className="text-xs text-muted-foreground">M-Pesa, Airtel Money</p>
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
                  <p className="font-semibold text-foreground">Crypto Payment</p>
                  <p className="text-xs text-muted-foreground">Pay ${bot.price} to unlock {bot.name}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
                <p className="text-sm font-medium text-primary">Transaction Information</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bot Price:</span>
                  <span className="text-foreground font-bold">${bot.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Fee:</span>
                  <span className="text-foreground">0.5%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Time:</span>
                  <span className="text-foreground">~30 minutes</span>
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
                  Please send <span className="font-bold text-foreground">${bot.price} USDT</span>
                </p>
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono font-bold">{formatTimer(cryptoTimer)} remaining</span>
                </div>
              </div>

              <div className="flex flex-col items-center p-4 rounded-xl bg-white">
                <p className="text-sm font-medium text-gray-700 mb-3">Scan with Binance App to pay</p>
                <img src={binanceQrPay} alt="Scan with Binance App to pay" className="w-56 h-56 object-contain" />
                <p className="mt-2 text-sm font-semibold text-gray-800">Cryptwave</p>
              </div>

              <a
                href="https://s.binance.com/lF01TlEF"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#F0B90B] text-black font-semibold hover:bg-[#F0B90B]/90 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Pay with Binance
              </a>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                <code className="flex-1 text-xs text-foreground break-all font-mono">
                  https://s.binance.com/lF01TlEF
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText('https://s.binance.com/lF01TlEF');
                    toast({
                      title: "Copied!",
                      description: "Payment link copied to clipboard",
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {/* Payment Info */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
                <p className="text-sm font-medium text-primary">Payment Information</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bot:</span>
                  <span className="text-foreground">{bot.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-foreground">${bot.price} USDT</span>
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

              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
                <p className="text-sm font-medium text-primary">Payment Details</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bot:</span>
                  <span className="text-foreground">{bot.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Win Rate:</span>
                  <span className="text-foreground">{bot.winRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-warning">${bot.price}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <AlertCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <p className="text-xs text-green-400">
                  You will be redirected to PayHero to complete your M-Pesa payment securely.
                </p>
              </div>

              <Button
                onClick={handlePayment}
                className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-5 w-5" />
                Pay ${bot.price} with M-Pesa
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
                onClick={handlePayment}
                disabled
                className="w-full h-14 bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Coming Soon
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
