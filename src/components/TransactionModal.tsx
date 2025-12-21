import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount, MINIMUM_DEPOSIT_AMOUNT } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowDownToLine, ArrowUpFromLine, CreditCard, Building2, Smartphone, Wallet, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
}

const paymentMethods = [
  { id: 'card', name: 'Credit/Debit Card', icon: CreditCard },
  { id: 'bank', name: 'Bank Transfer', icon: Building2 },
  { id: 'mobile', name: 'Mobile Money', icon: Smartphone },
  { id: 'crypto', name: 'Crypto Wallet', icon: Wallet },
];

const quickAmounts = [10, 50, 100, 500];

export function TransactionModal({ isOpen, onClose, type }: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('card');
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

    if (type === 'deposit' && numAmount < MINIMUM_DEPOSIT_AMOUNT) {
      toast({
        title: "Minimum Deposit",
        description: `Minimum deposit is $${MINIMUM_DEPOSIT_AMOUNT}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (type === 'deposit') {
      await deposit(numAmount);
      toast({
        title: "Deposit Successful!",
        description: `$${numAmount.toLocaleString()} has been added to your ${accountType} account`,
      });
    } else {
      const success = await withdraw(numAmount);
      if (success) {
        toast({
          title: "Withdrawal Successful!",
          description: `$${numAmount.toLocaleString()} has been withdrawn from your ${accountType} account`,
        });
      } else {
        toast({
          title: "Insufficient Balance",
          description: "You don't have enough funds for this withdrawal",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(false);
    setAmount('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {type === 'deposit' ? (
              <>
                <ArrowDownToLine className="h-5 w-5 text-primary" />
                Deposit Funds
              </>
            ) : (
              <>
                <ArrowUpFromLine className="h-5 w-5 text-primary" />
                Withdraw Funds
              </>
            )}
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

          {/* Minimum Deposit Notice */}
          {type === 'deposit' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary" />
              <p className="text-sm text-primary">Minimum deposit: ${MINIMUM_DEPOSIT_AMOUNT}</p>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Amount (USD)
            </label>
            <Input
              type="number"
              placeholder={type === 'deposit' ? `Min $${MINIMUM_DEPOSIT_AMOUNT}` : 'Enter amount'}
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
                  ${qa}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={cn(
                      "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                      selectedMethod === method.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5",
                      selectedMethod === method.id ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-xs font-medium",
                      selectedMethod === method.id ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {method.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !amount}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `${type === 'deposit' ? 'Deposit' : 'Withdraw'} $${amount || '0'}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
