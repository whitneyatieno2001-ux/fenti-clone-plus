import { useState, useEffect, useCallback } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { TradingViewWidget } from '@/components/TradingViewWidget';
import { cn } from '@/lib/utils';
import { ChevronDown, Search, Menu, Plus, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tradingPairs, getMarketCategories, getPairsByCategory, type TradingPair } from '@/data/tradingPairs';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';

export default function ManualTrade() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [selectedPair, setSelectedPair] = useState<TradingPair>(tradingPairs.find(p => p.symbol === 'XAU/USD') || tradingPairs[0]);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [pairSearch, setPairSearch] = useState('');
  const [lotSize, setLotSize] = useState(0.5);
  
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

    // Calculate investment based on lot size (simplified for binary options style)
    const investmentAmount = lotSize * 20; // $10 per 0.5 lot
    
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
        duration: 300, // 5 minutes default
      }
    });

    toast({
      title: `${direction.toUpperCase()} Order Placed!`,
      description: `${lotSize} lot on ${selectedPair.symbol}`,
    });
  };

  const formatPrice = (price: number) => {
    if (selectedPair.symbol.includes('XAU') || selectedPair.symbol.includes('GOLD')) {
      return price.toFixed(2);
    }
    if (selectedPair.symbol.includes('JPY')) {
      return price.toFixed(3);
    }
    if (selectedPair.type === 'forex') {
      return price.toFixed(5);
    }
    return price >= 1 ? price.toFixed(2) : price.toFixed(4);
  };

  const sellPrice = currentPrice - (currentPrice * 0.0001);
  const buyPrice = currentPrice + (currentPrice * 0.0001);

  const adjustLotSize = (delta: number) => {
    const newSize = Math.max(0.01, Math.min(10, lotSize + delta));
    setLotSize(parseFloat(newSize.toFixed(2)));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar - MetaTrader Style */}
      <div className="bg-card border-b border-border px-3 py-2 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-1">
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        
        <div className="flex items-center gap-3">
          <button className="p-1">
            <Plus className="h-5 w-5 text-foreground" />
          </button>
          <button className="p-1">
            <svg className="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18"/>
              <path d="M7 16l4-8 4 4 4-8"/>
            </svg>
          </button>
          <button 
            onClick={() => setShowPairSelector(!showPairSelector)}
            className="px-2 py-1 text-sm font-medium text-foreground"
          >
            H4
          </button>
          <button className="p-1">
            <svg className="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </button>
          <button className="p-1 bg-primary rounded">
            <svg className="h-4 w-4 text-primary-foreground" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="6" cy="6" r="3"/>
              <circle cx="18" cy="18" r="3"/>
              <line x1="8" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Price Bar - Exact MetaTrader Style */}
      <div className="bg-card flex items-center justify-between px-2 py-1.5 border-b border-border">
        {/* SELL Price */}
        <button 
          onClick={() => handleTrade('sell')}
          className="bg-destructive px-4 py-2 rounded active:scale-95 transition-transform"
        >
          <div className="text-[10px] text-white/80 uppercase">Sell</div>
          <div className="text-lg font-bold text-white">{formatPrice(sellPrice)}</div>
        </button>

        {/* Lot Size Control */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => adjustLotSize(-0.1)}
            className="px-2 py-1 text-muted-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <span className="text-lg font-bold text-foreground min-w-[40px] text-center">{lotSize.toFixed(1)}</span>
          <button 
            onClick={() => adjustLotSize(0.1)}
            className="px-2 py-1 text-muted-foreground rotate-180"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* BUY Price */}
        <button 
          onClick={() => handleTrade('buy')}
          className="bg-[#22c55e] px-4 py-2 rounded active:scale-95 transition-transform"
        >
          <div className="text-[10px] text-white/80 uppercase">Buy</div>
          <div className="text-lg font-bold text-white">{formatPrice(buyPrice)}</div>
        </button>
      </div>

      {/* Pair Info */}
      <button 
        onClick={() => setShowPairSelector(!showPairSelector)}
        className="bg-card px-3 py-1.5 border-b border-border text-left"
      >
        <div className="text-xs text-muted-foreground">
          {selectedPair.symbol.replace('/', '')} • H4
        </div>
        <div className="text-xs text-muted-foreground">
          {selectedPair.name}
        </div>
      </button>

      {/* TradingView Chart - Full Height */}
      <div className="flex-1 relative min-h-[400px]">
        <TradingViewWidget 
          symbol={selectedPair.symbol}
          theme={theme === 'dark' ? 'dark' : 'light'}
          height={500}
        />
      </div>

      {/* Bottom Navigation - MetaTrader Style */}
      <div className="bg-card border-t border-border px-2 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => navigate('/markets')}
            className="flex flex-col items-center gap-0.5 py-1 px-3"
          >
            <span className="text-muted-foreground text-lg">↕</span>
            <span className="text-xs text-muted-foreground">Quotes</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 py-1 px-3">
            <span className="text-primary text-lg font-bold">00</span>
            <span className="text-xs text-primary font-bold">Charts</span>
          </button>
          <button 
            onClick={() => navigate('/positions')}
            className="flex flex-col items-center gap-0.5 py-1 px-3"
          >
            <span className="text-muted-foreground text-lg">↗</span>
            <span className="text-xs text-muted-foreground">Trade</span>
          </button>
          <button 
            onClick={() => navigate('/history')}
            className="flex flex-col items-center gap-0.5 py-1 px-3"
          >
            <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span className="text-xs text-muted-foreground">History</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 py-1 px-3 relative">
            <div className="relative">
              <span className="text-muted-foreground text-lg">💬</span>
              <div className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">3</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Messages</span>
          </button>
        </div>
      </div>

      {/* Pair Selector Modal */}
      {showPairSelector && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowPairSelector(false)} />
          <div className="fixed inset-x-4 top-16 z-50 bg-card rounded-xl shadow-xl border border-border overflow-hidden max-h-[70vh]">
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
    </div>
  );
}
