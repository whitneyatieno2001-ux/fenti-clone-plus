import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount, MINIMUM_DEPOSIT_AMOUNT } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowDownToLine, ArrowUpFromLine, Smartphone, AlertCircle, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
}

const PAYHERO_DEPOSIT_LINK = 'https://short.payhero.co.ke/s/L9sqoCZ7EW2riRENtemoSK';
const quickAmounts = [5, 10, 25, 50];

export function TransactionModal({ isOpen, onClose, type }: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [existingPhone, setExistingPhone] = useState('');
  const { withdraw, currentBalance, accountType, isLoggedIn, user } = useAccount();
  const { toast } = useToast();

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
        description: "Please enter a valid M-Pesa phone number",
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
        description: "Your M-Pesa number has been saved for deposits",
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

    if (!phoneSaved) {
      toast({
        title: "Save Phone Number First",
        description: "Please save your M-Pesa number before depositing",
        variant: "destructive",
      });
      return;
    }
    
    // Open PayHero link in new tab
    window.open(PAYHERO_DEPOSIT_LINK, '_blank');
    toast({
      title: "Complete Payment",
      description: "Use the same M-Pesa number to receive your deposit automatically",
    });
    onClose();
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

  // Deposit UI - Save phone then redirect
  if (type === 'deposit') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
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

            {/* PayHero Info */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">PayHero</p>
                <p className="text-xs text-muted-foreground">Secure Payment Gateway</p>
              </div>
            </div>

            {/* Phone Number Input */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                M-Pesa Phone Number
              </label>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="e.g., 0712345678"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (e.target.value !== existingPhone) {
                      setPhoneSaved(false);
                    }
                  }}
                  className="text-lg h-12 bg-input border-border flex-1"
                  disabled={isLoading}
                />
                {!phoneSaved ? (
                  <Button
                    onClick={savePhoneNumber}
                    disabled={isLoading || !phoneNumber}
                    className="h-12 px-4 bg-primary"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                ) : (
                  <div className="h-12 px-4 flex items-center text-green-500">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {phoneSaved 
                  ? "Use this same number when paying via PayHero" 
                  : "Save your M-Pesa number to receive deposits automatically"}
              </p>
            </div>

            {/* Important Notice */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
              <p className="text-xs text-amber-500">
                Pay with the same M-Pesa number saved above. Your deposit will reflect automatically.
              </p>
            </div>

            {/* Deposit Button */}
            <Button
              onClick={handleDeposit}
              disabled={!phoneSaved}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ExternalLink className="h-5 w-5" />
              Deposit Now
            </Button>

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
