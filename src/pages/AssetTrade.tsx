import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cryptoAssets, formatPrice } from '@/data/cryptoData';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { CandlestickChart } from '@/components/CandlestickChart';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';

export default function AssetTrade() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentBalance, deposit, withdraw, accountType } = useAccount();
  const { toast } = useToast();
  const { getCryptoWithPrice } = useCryptoPrices();

  const crypto = cryptoAssets.find(c => c.id === assetId);
  
  if (!crypto) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Asset not found</p>
      </div>
    );
  }

  const cryptoWithPrice = getCryptoWithPrice(crypto);
  const livePrice = cryptoWithPrice.price;

  const handleTrade = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    const totalCost = numAmount * livePrice;
    if (tradeType === 'buy' && totalCost > currentBalance) {
      toast({ title: "Insufficient Balance", description: `You need $${totalCost.toFixed(2)}`, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (tradeType === 'buy') {
      withdraw(totalCost);
      toast({ title: "Buy Order Executed!", description: `Bought ${numAmount} ${crypto.symbol} for $${totalCost.toFixed(2)}` });
    } else {
      deposit(totalCost);
      toast({ title: "Sell Order Executed!", description: `Sold ${numAmount} ${crypto.symbol} for $${totalCost.toFixed(2)}` });
    }

    setIsLoading(false);
    setAmount('');
  };

  const estimatedTotal = parseFloat(amount || '0') * livePrice;

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/markets')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: crypto.color, color: 'white' }}
            >
              {crypto.icon}
            </div>
            <div>
              <h1 className="font-bold text-foreground">{crypto.symbol}/USDT</h1>
              <p className="text-sm text-muted-foreground">{crypto.name}</p>
            </div>
          </div>
          <div className="ml-auto text-right">
            <p className="font-bold text-foreground">{formatPrice(livePrice)}</p>
            <p className={cn(
              "text-sm font-medium",
              cryptoWithPrice.change24h >= 0 ? "text-success" : "text-destructive"
            )}>
              {cryptoWithPrice.change24h >= 0 ? '+' : ''}{cryptoWithPrice.change24h.toFixed(2)}%
            </p>
          </div>
        </div>
      </header>
      
      <main className="px-4 py-4 space-y-4">
        {/* Balance */}
        <div className="p-3 rounded-xl bg-card border border-border/50">
          <p className="text-sm text-muted-foreground">Balance ({accountType})</p>
          <p className="text-xl font-bold text-foreground">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>

        {/* Live Chart */}
        <CandlestickChart symbol={crypto.symbol} currentPrice={livePrice} />

        {/* Trade Controls */}
        <div className="flex bg-secondary rounded-xl p-1">
          <button
            onClick={() => setTradeType('buy')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
              tradeType === 'buy' ? "bg-success text-success-foreground" : "text-muted-foreground"
            )}
          >
            <TrendingUp className="h-4 w-4" /> Buy
          </button>
          <button
            onClick={() => setTradeType('sell')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
              tradeType === 'sell' ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"
            )}
          >
            <TrendingDown className="h-4 w-4" /> Sell
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <Input
            type="number"
            placeholder={`Amount (${crypto.symbol})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg h-12 bg-input border-border"
          />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>Total</span>
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
                const maxAmount = currentBalance / livePrice;
                setAmount((maxAmount * percent).toFixed(6));
              }}
              className="flex-1 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground"
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
            tradeType === 'buy' ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90"
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
              {tradeType === 'buy' ? 'Buy' : 'Sell'} {crypto.symbol}
            </>
          )}
        </Button>
      </main>
    </div>
  );
}
