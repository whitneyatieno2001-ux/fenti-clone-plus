import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { EnhancedChart } from '@/components/EnhancedChart';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, Trophy, BarChart3, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { tradingPairs, getMarketCategories, getPairsByCategory, type TradingPair } from '@/data/tradingPairs';
import { Input } from '@/components/ui/input';

const durations = [
  { label: '00:05', seconds: 5 },
  { label: '00:15', seconds: 15 },
  { label: '00:30', seconds: 30 },
  { label: '01:00', seconds: 60 },
  { label: '02:00', seconds: 120 },
  { label: '05:00', seconds: 300 },
];

export default function ManualTrade() {
  const navigate = useNavigate();
  const [selectedPair, setSelectedPair] = useState<TradingPair>(tradingPairs[0]);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [pairSearch, setPairSearch] = useState('');
  const [investment, setInvestment] = useState('10');
  const [durationIndex, setDurationIndex] = useState(0);
  const [isTrading, setIsTrading] = useState(false);
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell' | null>(null);
  const [tradeEndTime, setTradeEndTime] = useState<number | null>(null);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  
  const { currentBalance, accountType, updateBalance, isLoggedIn } = useAccount();
  const { toast } = useToast();
  const { getCryptoWithPrice } = useCryptoPrices();

  const categories = getMarketCategories();
  
  // Filter pairs by category and search
  const filteredPairs = getPairsByCategory(selectedCategory).filter(pair =>
    pair.symbol.toLowerCase().includes(pairSearch.toLowerCase()) ||
    pair.name.toLowerCase().includes(pairSearch.toLowerCase())
  );

  // Get current price - simulate prices for all pairs
  const getCurrentPrice = useCallback(() => {
    if (selectedPair.type === 'crypto') {
      const crypto = getCryptoWithPrice({ id: selectedPair.id, symbol: selectedPair.symbol.split('/')[0] } as any);
      return crypto.price;
    }
    // Use base price with small fluctuations for other pairs
    const basePrice = selectedPair.basePrice || 1.0;
    const volatility = basePrice * 0.0001;
    return basePrice + (Math.random() - 0.5) * 2 * volatility;
  }, [selectedPair, getCryptoWithPrice]);

  const [currentPrice, setCurrentPrice] = useState(getCurrentPrice());

  // Update price every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(getCurrentPrice());
    }, 500);
    return () => clearInterval(interval);
  }, [getCurrentPrice]);

  // Countdown timer for active trade
  useEffect(() => {
    if (!isTrading || !tradeEndTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((tradeEndTime - Date.now()) / 1000));
      setCountdown(remaining);

      if (remaining <= 0) {
        // Trade completed - determine result
        completeTrade();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isTrading, tradeEndTime]);

  const completeTrade = async () => {
    if (!entryPrice || !tradeDirection) return;

    const exitPrice = getCurrentPrice();
    const priceChange = exitPrice - entryPrice;
    const investmentAmount = parseFloat(investment);
    
    // Determine win/loss based on direction and price movement
    let won = false;
    if (tradeDirection === 'buy') {
      won = priceChange > 0;
    } else {
      won = priceChange < 0;
    }

    // Apply some randomness for realistic trading (82% payout shown in UI)
    const payout = 0.82;
    const profitLoss = won ? investmentAmount * payout : -investmentAmount;
    
    // Ensure minimum profit/loss of $0.15-$0.25
    const minAmount = 0.15 + Math.random() * 0.10;
    const adjustedProfitLoss = won 
      ? Math.max(profitLoss, minAmount) 
      : Math.min(profitLoss, -minAmount);

    // Update balance
    await updateBalance(accountType, adjustedProfitLoss, 'add');

    toast({
      title: won ? "Trade Won! 🎉" : "Trade Lost",
      description: won 
        ? `+$${adjustedProfitLoss.toFixed(2)} profit!`
        : `-$${Math.abs(adjustedProfitLoss).toFixed(2)} loss`,
      variant: won ? "default" : "destructive",
    });

    // Reset trade state
    setIsTrading(false);
    setTradeDirection(null);
    setTradeEndTime(null);
    setEntryPrice(null);
    setCountdown(0);
  };

  const handleTrade = async (direction: 'buy' | 'sell') => {
    if (!isLoggedIn) {
      toast({ title: "Login Required", description: "Please login to trade", variant: "destructive" });
      return;
    }

    const investmentAmount = parseFloat(investment);
    if (isNaN(investmentAmount) || investmentAmount < 1) {
      toast({ title: "Invalid Amount", description: "Minimum investment is $1", variant: "destructive" });
      return;
    }

    if (investmentAmount > currentBalance) {
      toast({ title: "Insufficient Balance", description: "Not enough funds for this trade", variant: "destructive" });
      return;
    }

    // Deduct investment from balance
    const success = await updateBalance(accountType, investmentAmount, 'subtract');
    if (!success) {
      toast({ title: "Trade Failed", description: "Could not place trade", variant: "destructive" });
      return;
    }

    // Start trade
    setIsTrading(true);
    setTradeDirection(direction);
    setEntryPrice(getCurrentPrice());
    setTradeEndTime(Date.now() + durations[durationIndex].seconds * 1000);
    setCountdown(durations[durationIndex].seconds);

    toast({
      title: `${direction.toUpperCase()} Order Placed!`,
      description: `$${investmentAmount} on ${selectedPair.symbol} for ${durations[durationIndex].label}`,
    });
  };

  const adjustInvestment = (delta: number) => {
    const current = parseFloat(investment) || 0;
    const newValue = Math.max(1, current + delta);
    setInvestment(newValue.toString());
  };

  const adjustDuration = (delta: number) => {
    const newIndex = Math.max(0, Math.min(durations.length - 1, durationIndex + delta));
    setDurationIndex(newIndex);
  };

  const formatPrice = (price: number) => {
    if (selectedPair.type === 'forex') {
      return price.toFixed(5);
    }
    return price >= 1 ? price.toFixed(2) : price.toFixed(4);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-2 space-y-3">
        {/* Top Bar - Balance + Pair Selector */}
        <div className="flex items-center justify-between">
          {/* Balance Display */}
          <div className={cn(
            "px-4 py-2 rounded-xl flex items-center gap-2",
            accountType === 'demo' ? "bg-primary text-primary-foreground" : "bg-success text-success-foreground"
          )}>
            <span className="font-bold text-lg">
              {accountType === 'demo' ? 'D' : '$'}
            </span>
            <span className="font-bold">
              {currentBalance.toFixed(0)} $
            </span>
            <ChevronDown className="h-4 w-4" />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2">
            <Link to="/bot" className="p-2 rounded-lg bg-card border border-border">
              <Trophy className="h-5 w-5 text-primary" />
            </Link>
            <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Manual Trading</span>
            </div>
          </div>
        </div>

        {/* Pair Selector */}
        <div className="relative">
          <button
            onClick={() => setShowPairSelector(!showPairSelector)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border w-full max-w-xs"
          >
            <span className="text-lg">{selectedPair.icon}</span>
            <div className="text-left">
              <p className="font-semibold text-foreground">{selectedPair.symbol}</p>
              <p className="text-xs text-muted-foreground">(OTC)</p>
            </div>
            <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", showPairSelector && "rotate-180")} />
          </button>

          {showPairSelector && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPairSelector(false)} />
              <div className="absolute left-0 top-full mt-2 z-50 bg-card rounded-xl shadow-xl border border-border overflow-hidden w-64 max-h-64 overflow-y-auto">
                {tradingPairs.map((pair) => (
                  <button
                    key={pair.id}
                    onClick={() => {
                      setSelectedPair(pair);
                      setShowPairSelector(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors",
                      selectedPair.id === pair.id && "bg-primary/10"
                    )}
                  >
                    <span className="text-lg">{pair.icon}</span>
                    <div className="text-left">
                      <p className="font-medium text-foreground">{pair.symbol}</p>
                      <p className="text-xs text-muted-foreground">{pair.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Current Price Display */}
        <div className="px-4 py-2 rounded-lg bg-success/10 border border-success/20 inline-block">
          <span className="text-success font-mono font-bold text-lg">{formatPrice(currentPrice)}</span>
        </div>

        {/* Candlestick Chart */}
        <div className="rounded-xl overflow-hidden border border-border">
          <CandlestickChart 
            symbol={selectedPair.symbol.split('/')[0]} 
            currentPrice={currentPrice} 
          />
        </div>

        {/* Trade Active Indicator */}
        {isTrading && (
          <div className={cn(
            "p-4 rounded-xl border-2 animate-pulse",
            tradeDirection === 'buy' ? "bg-success/10 border-success" : "bg-destructive/10 border-destructive"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">
                  {tradeDirection?.toUpperCase()} Active
                </p>
                <p className="text-sm text-muted-foreground">
                  Entry: {entryPrice && formatPrice(entryPrice)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{countdown}s</p>
                <p className="text-xs text-muted-foreground">remaining</p>
              </div>
            </div>
          </div>
        )}

        {/* Investment & Duration Controls */}
        <div className="grid grid-cols-2 gap-3">
          {/* Investment */}
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => adjustInvestment(-1)}
                disabled={isTrading}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">${investment}</p>
                <p className="text-xs text-muted-foreground">investment</p>
              </div>
              <button
                onClick={() => adjustInvestment(1)}
                disabled={isTrading}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => adjustDuration(-1)}
                disabled={isTrading}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{durations[durationIndex].label}</p>
                <p className="text-xs text-muted-foreground">duration</p>
              </div>
              <button
                onClick={() => adjustDuration(1)}
                disabled={isTrading}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* BUY/SELL Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleTrade('sell')}
            disabled={isTrading}
            className={cn(
              "py-4 rounded-xl font-bold text-lg text-white transition-all",
              isTrading ? "bg-destructive/50 cursor-not-allowed" : "bg-destructive hover:bg-destructive/90 active:scale-[0.98]"
            )}
          >
            <div className="flex flex-col items-center">
              <span>SELL</span>
              <span className="text-sm font-normal opacity-80">82%</span>
            </div>
          </button>
          
          <button
            onClick={() => handleTrade('buy')}
            disabled={isTrading}
            className={cn(
              "py-4 rounded-xl font-bold text-lg text-white transition-all",
              isTrading ? "bg-success/50 cursor-not-allowed" : "bg-success hover:bg-success/90 active:scale-[0.98]"
            )}
          >
            <div className="flex flex-col items-center">
              <span>BUY</span>
              <span className="text-sm font-normal opacity-80">82%</span>
            </div>
          </button>
        </div>

        {/* Time Display */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {new Date().toLocaleTimeString()}</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
