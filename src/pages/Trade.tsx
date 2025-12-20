import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cryptoAssets, formatPrice } from '@/data/cryptoData';
import { cn } from '@/lib/utils';
import { ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';

export default function Trade() {
  const [selectedCrypto, setSelectedCrypto] = useState(cryptoAssets[0]);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentBalance, deposit, withdraw, accountType } = useAccount();
  const { toast } = useToast();

  const handleTrade = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const totalCost = numAmount * selectedCrypto.price;

    if (tradeType === 'buy' && totalCost > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You need $${totalCost.toFixed(2)} but only have $${currentBalance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (tradeType === 'buy') {
      withdraw(totalCost);
      toast({
        title: "Buy Order Executed!",
        description: `Bought ${numAmount} ${selectedCrypto.symbol} for $${totalCost.toFixed(2)}`,
      });
    } else {
      deposit(totalCost);
      toast({
        title: "Sell Order Executed!",
        description: `Sold ${numAmount} ${selectedCrypto.symbol} for $${totalCost.toFixed(2)}`,
      });
    }

    setIsLoading(false);
    setAmount('');
  };

  const estimatedTotal = parseFloat(amount || '0') * selectedCrypto.price;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-6">
        {/* Balance */}
        <div className="p-4 rounded-xl bg-card border border-border/50">
          <p className="text-sm text-muted-foreground">Available Balance ({accountType})</p>
          <p className="text-2xl font-bold text-foreground">
            ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Crypto Selector */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-3 block">
            Select Cryptocurrency
          </label>
          <div className="grid grid-cols-4 gap-2 max-h-32 overflow-x-auto">
            {cryptoAssets.slice(0, 8).map((crypto) => (
              <button
                key={crypto.id}
                onClick={() => setSelectedCrypto(crypto)}
                className={cn(
                  "p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                  selectedCrypto.id === crypto.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: crypto.color }}
                >
                  {crypto.icon}
                </div>
                <span className="text-xs font-medium text-foreground">{crypto.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Crypto Info */}
        <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: selectedCrypto.color }}
              >
                {selectedCrypto.icon}
              </div>
              <div>
                <p className="font-bold text-foreground">{selectedCrypto.name}</p>
                <p className="text-sm text-muted-foreground">{selectedCrypto.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatPrice(selectedCrypto.price)}</p>
              <p className={cn(
                "text-sm font-medium flex items-center justify-end gap-1",
                selectedCrypto.change24h >= 0 ? "text-success" : "text-destructive"
              )}>
                {selectedCrypto.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(selectedCrypto.change24h).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Trade Type Toggle */}
        <div className="flex bg-secondary rounded-xl p-1">
          <button
            onClick={() => setTradeType('buy')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
              tradeType === 'buy'
                ? "bg-success text-success-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="h-4 w-4" />
            Buy
          </button>
          <button
            onClick={() => setTradeType('sell')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
              tradeType === 'sell'
                ? "bg-destructive text-destructive-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingDown className="h-4 w-4" />
            Sell
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Amount ({selectedCrypto.symbol})
          </label>
          <Input
            type="number"
            placeholder={`Enter ${selectedCrypto.symbol} amount`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg h-12 bg-input border-border"
          />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>Estimated Total</span>
            <span className="font-medium text-foreground">${estimatedTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Quick Amounts */}
        <div className="flex gap-2">
          {['25%', '50%', '75%', '100%'].map((pct) => (
            <button
              key={pct}
              onClick={() => {
                const percent = parseInt(pct) / 100;
                const maxAmount = currentBalance / selectedCrypto.price;
                setAmount((maxAmount * percent).toFixed(6));
              }}
              className="flex-1 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            >
              {pct}
            </button>
          ))}
        </div>

        {/* Trade Button */}
        <Button
          onClick={handleTrade}
          disabled={isLoading || !amount}
          className={cn(
            "w-full h-14 font-bold text-lg",
            tradeType === 'buy'
              ? "bg-success hover:bg-success/90 text-success-foreground"
              : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          )}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="h-5 w-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            <>
              <ArrowRightLeft className="h-5 w-5 mr-2" />
              {tradeType === 'buy' ? 'Buy' : 'Sell'} {selectedCrypto.symbol}
            </>
          )}
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
