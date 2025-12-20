import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cryptoAssets, formatPrice } from '@/data/cryptoData';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle, Zap } from 'lucide-react';

const leverageOptions = [5, 10, 20, 50, 100];

export default function Futures() {
  const [selectedCrypto, setSelectedCrypto] = useState(cryptoAssets[0]);
  const [positionType, setPositionType] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState(10);
  const [margin, setMargin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentBalance, withdraw, accountType } = useAccount();
  const { toast } = useToast();

  const handleOpenPosition = async () => {
    const numMargin = parseFloat(margin);
    if (isNaN(numMargin) || numMargin <= 0) {
      toast({
        title: "Invalid margin",
        description: "Please enter a valid margin amount",
        variant: "destructive",
      });
      return;
    }

    if (numMargin > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough funds",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    withdraw(numMargin);
    const positionSize = numMargin * leverage;
    
    toast({
      title: "Position Opened!",
      description: `${positionType.toUpperCase()} ${selectedCrypto.symbol} with ${leverage}x leverage. Position size: $${positionSize.toLocaleString()}`,
    });

    setIsLoading(false);
    setMargin('');
  };

  const positionSize = parseFloat(margin || '0') * leverage;
  const liquidationPrice = positionType === 'long' 
    ? selectedCrypto.price * (1 - 1/leverage)
    : selectedCrypto.price * (1 + 1/leverage);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-5">
        {/* Warning Banner */}
        <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">High Risk Trading</p>
            <p className="text-xs text-muted-foreground">Futures trading involves significant risk. Trade responsibly.</p>
          </div>
        </div>

        {/* Balance */}
        <div className="p-4 rounded-xl bg-card border border-border/50">
          <p className="text-sm text-muted-foreground">Available Margin ({accountType})</p>
          <p className="text-2xl font-bold text-foreground">
            ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Crypto Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {cryptoAssets.slice(0, 5).map((crypto) => (
            <button
              key={crypto.id}
              onClick={() => setSelectedCrypto(crypto)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap",
                selectedCrypto.id === crypto.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: crypto.color }}
              >
                {crypto.icon}
              </div>
              <span className="text-sm font-medium text-foreground">{crypto.symbol}</span>
            </button>
          ))}
        </div>

        {/* Price Display */}
        <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Mark Price</p>
              <p className="text-2xl font-bold text-foreground">{formatPrice(selectedCrypto.price)}</p>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              selectedCrypto.change24h >= 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
            )}>
              {selectedCrypto.change24h >= 0 ? '+' : ''}{selectedCrypto.change24h.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Position Type */}
        <div className="flex bg-secondary rounded-xl p-1">
          <button
            onClick={() => setPositionType('long')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
              positionType === 'long'
                ? "bg-success text-success-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="h-4 w-4" />
            Long
          </button>
          <button
            onClick={() => setPositionType('short')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
              positionType === 'short'
                ? "bg-destructive text-destructive-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingDown className="h-4 w-4" />
            Short
          </button>
        </div>

        {/* Leverage Selector */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              Leverage
            </label>
            <span className="text-lg font-bold text-primary">{leverage}x</span>
          </div>
          <div className="flex gap-2">
            {leverageOptions.map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                  leverage === lev
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* Margin Input */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Margin (USD)
          </label>
          <Input
            type="number"
            placeholder="Enter margin amount"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            className="text-lg h-12 bg-input border-border"
          />
        </div>

        {/* Position Info */}
        <div className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Position Size</span>
            <span className="font-medium text-foreground">${positionSize.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Liquidation Price</span>
            <span className={cn(
              "font-medium",
              positionType === 'long' ? "text-destructive" : "text-success"
            )}>
              {formatPrice(liquidationPrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Entry Price</span>
            <span className="font-medium text-foreground">{formatPrice(selectedCrypto.price)}</span>
          </div>
        </div>

        {/* Open Position Button */}
        <Button
          onClick={handleOpenPosition}
          disabled={isLoading || !margin}
          className={cn(
            "w-full h-14 font-bold text-lg",
            positionType === 'long'
              ? "bg-success hover:bg-success/90 text-success-foreground"
              : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          )}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="h-5 w-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              Opening Position...
            </span>
          ) : (
            `Open ${positionType.toUpperCase()} Position`
          )}
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
