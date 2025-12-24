import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount, MINIMUM_DEPOSIT_AMOUNT } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowDownToLine, ArrowUpFromLine, Smartphone, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
}

const quickAmounts = [500, 1000, 2500, 5000];

export function TransactionModal({ isOpen, onClose, type }: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { deposit, withdraw, currentBalance, accountType, isLoggedIn } = useAccount();
  const { toast } = useToast();

  const handleSubmit = async () => {
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

    if (type === 'deposit' && numAmount < MINIMUM_DEPOSIT_AMOUNT) {
      toast({
        title: "Minimum Deposit",
        description: `Minimum deposit is KES ${MINIMUM_DEPOSIT_AMOUNT}`,
        variant: "destructive",
      });
      return;
    }

    if (type === 'withdraw' && numAmount > currentBalance) {
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
          action: type,
          amount: numAmount,
          phoneNumber: phoneNumber,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: type === 'deposit' ? "STK Push Sent!" : "Withdrawal Initiated!",
          description: data.message,
        });

        // For deposits, we'll update balance after confirmation (in real app, this would be via callback)
        // For demo, we'll simulate immediate update
        if (type === 'deposit') {
          await deposit(numAmount);
        } else {
          await withdraw(numAmount);
        }

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {type === 'deposit' ? (
              <>
                <ArrowDownToLine className="h-5 w-5 text-primary" />
                Deposit via M-Pesa
              </>
            ) : (
              <>
                <ArrowUpFromLine className="h-5 w-5 text-primary" />
                Withdraw to M-Pesa
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Balance */}
          <div className="p-4 rounded-xl bg-secondary/50">
            <p className="text-sm text-muted-foreground">Current Balance ({accountType})</p>
            <p className="text-2xl font-bold text-foreground">
              KES {currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Minimum Deposit Notice */}
          {type === 'deposit' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary" />
              <p className="text-sm text-primary">Minimum deposit: KES {MINIMUM_DEPOSIT_AMOUNT}</p>
            </div>
          )}

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
              Amount (KES)
            </label>
            <Input
              type="number"
              placeholder={type === 'deposit' ? `Min KES ${MINIMUM_DEPOSIT_AMOUNT}` : 'Enter amount'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg h-12 bg-input border-border"
              min={type === 'deposit' ? MINIMUM_DEPOSIT_AMOUNT : 1}
            />
            <div className="flex gap-2 mt-3">
              {quickAmounts.map((qa) => (
                <button
                  key={qa}
                  onClick={() => setAmount(qa.toString())}
                  className="flex-1 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                >
                  KES {qa.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !amount || !phoneNumber}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              `${type === 'deposit' ? 'Deposit' : 'Withdraw'} KES ${amount ? parseInt(amount).toLocaleString() : '0'}`
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {type === 'deposit' 
              ? "You will receive an STK push on your phone to complete the payment"
              : "Funds will be sent to your M-Pesa account within a few minutes"
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
