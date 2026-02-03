import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { TradingViewWidget } from '@/components/TradingViewWidget';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, Trophy, BarChart3, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { tradingPairs, getMarketCategories, getPairsByCategory, type TradingPair } from '@/data/tradingPairs';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';

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
  const { theme } = useTheme();
  const [selectedPair, setSelectedPair] = useState<TradingPair>(tradingPairs[0]);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [pairSearch, setPairSearch] = useState('');
  const [investment, setInvestment] = useState('10');
  const [durationIndex, setDurationIndex] = useState(0);
  const [lotSize, setLotSize] = useState('0.5');
  
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

    // Navigate to active positions page
    navigate('/positions', {
      state: {
        symbol: selectedPair.symbol,
        direction,
        investment: investmentAmount,
        entryPrice: getCurrentPrice(),
        duration: durations[durationIndex].seconds,
      }
    });

    toast({
      title: `${direction.toUpperCase()} Order Placed!`,
      description: `$${investmentAmount} on ${selectedPair.symbol}`,
    });
  };

  const formatPrice = (price: number) => {
    if (selectedPair.type === 'forex') {
      return price.toFixed(5);
    }
    return price >= 1 ? price.toFixed(2) : price.toFixed(4);
  };

  const spread = 0.5;
  const sellPrice = currentPrice - (currentPrice * 0.0001);
  const buyPrice = currentPrice + (currentPrice * 0.0001);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="space-y-0">
        {/* Top Trading Bar - MetaTrader Style */}
        <div className="flex items-center justify-between px-2 py-2 bg-card border-b border-border">
          <button onClick={() => navigate(-1)} className="p-2">
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          
          {/* Pair Selector */}
          <button
            onClick={() => setShowPairSelector(!showPairSelector)}
            className="flex items-center gap-2"
          >
            <span className="text-sm text-muted-foreground">{selectedPair.symbol} • H4</span>
          </button>

          <div className="flex items-center gap-2">
            <Link to="/bot" className="p-2">
              <Trophy className="h-5 w-5 text-primary" />
            </Link>
          </div>
        </div>

        {/* Price Display Bar */}
        <div className="flex items-center justify-between px-2 py-2 bg-card border-b border-border">
          {/* SELL Price */}
          <div className="bg-destructive px-4 py-2 rounded">
            <div className="text-xs text-destructive-foreground/70">SELL</div>
            <div className="text-lg font-bold text-white">{formatPrice(sellPrice)}</div>
          </div>

          {/* Spread / Lot Size */}
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 text-sm bg-secondary rounded">
              <ChevronDown className="h-3 w-3 inline" />
            </button>
            <span className="text-lg font-bold text-foreground">{lotSize}</span>
            <button className="px-2 py-1 text-sm bg-secondary rounded">
              <ChevronDown className="h-3 w-3 inline" />
            </button>
          </div>

          {/* BUY Price */}
          <div className="bg-success px-4 py-2 rounded">
            <div className="text-xs text-success-foreground/70">BUY</div>
            <div className="text-lg font-bold text-white">{formatPrice(buyPrice)}</div>
          </div>
        </div>

        {/* Pair Info */}
        <div className="px-3 py-1 bg-card border-b border-border">
          <div className="text-xs text-muted-foreground">
            {selectedPair.symbol} • {selectedPair.name}
          </div>
        </div>

        {/* TradingView Chart */}
        <div className="relative">
          <TradingViewWidget 
            symbol={selectedPair.symbol}
            theme={theme === 'dark' ? 'dark' : 'light'}
            height={350}
          />
        </div>

        {/* Investment & Duration Controls */}
        <div className="px-4 py-3 bg-card border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Investment */}
            <div className="bg-secondary rounded-xl p-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const current = parseFloat(investment) || 0;
                    setInvestment(Math.max(1, current - 1).toString());
                  }}
                  className="p-2 rounded-lg bg-background hover:bg-background/80"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">${investment}</p>
                  <p className="text-xs text-muted-foreground">investment</p>
                </div>
                <button
                  onClick={() => {
                    const current = parseFloat(investment) || 0;
                    setInvestment((current + 1).toString());
                  }}
                  className="p-2 rounded-lg bg-background hover:bg-background/80"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Duration */}
            <div className="bg-secondary rounded-xl p-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setDurationIndex(Math.max(0, durationIndex - 1))}
                  className="p-2 rounded-lg bg-background hover:bg-background/80"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{durations[durationIndex].label}</p>
                  <p className="text-xs text-muted-foreground">duration</p>
                </div>
                <button
                  onClick={() => setDurationIndex(Math.min(durations.length - 1, durationIndex + 1))}
                  className="p-2 rounded-lg bg-background hover:bg-background/80"
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
              className="py-4 rounded-xl font-bold text-lg text-white bg-destructive hover:bg-destructive/90 active:scale-[0.98] transition-all"
            >
              <div className="flex flex-col items-center">
                <span>SELL</span>
                <span className="text-sm font-normal opacity-80">90%</span>
              </div>
            </button>
            
            <button
              onClick={() => handleTrade('buy')}
              className="py-4 rounded-xl font-bold text-lg text-white bg-success hover:bg-success/90 active:scale-[0.98] transition-all"
            >
              <div className="flex flex-col items-center">
                <span>BUY</span>
                <span className="text-sm font-normal opacity-80">90%</span>
              </div>
            </button>
          </div>
        </div>

        {/* Pair Selector Modal */}
        {showPairSelector && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowPairSelector(false)} />
            <div className="fixed inset-x-4 top-20 z-50 bg-card rounded-xl shadow-xl border border-border overflow-hidden max-h-[70vh]">
              {/* Search */}
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search markets..."
                    value={pairSearch}
                    onChange={(e) => setPairSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              {/* Categories */}
              <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
                      selectedCategory === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
              
              {/* Pairs List */}
              <div className="overflow-y-auto max-h-[50vh]">
                {filteredPairs.map((pair) => (
                  <button
                    key={pair.id}
                    onClick={() => {
                      setSelectedPair(pair);
                      setShowPairSelector(false);
                      setPairSearch('');
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors",
                      selectedPair.id === pair.id && "bg-primary/10"
                    )}
                  >
                    <span className="text-xl">{pair.icon}</span>
                    <div className="text-left flex-1">
                      <p className="font-medium text-foreground">{pair.symbol}</p>
                      <p className="text-xs text-muted-foreground">{pair.name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{pair.type}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function Menu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="4" x2="20" y1="12" y2="12"/>
      <line x1="4" x2="20" y1="6" y2="6"/>
      <line x1="4" x2="20" y1="18" y2="18"/>
    </svg>
  );
}
