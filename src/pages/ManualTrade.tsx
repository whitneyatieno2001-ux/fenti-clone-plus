import { useState, useEffect, useCallback } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { TradingViewWidget } from '@/components/TradingViewWidget';
import { cn } from '@/lib/utils';
import { Search, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tradingPairs, getMarketCategories, getPairsByCategory, type TradingPair } from '@/data/tradingPairs';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { getTradeOutcome } from '@/lib/tradeOutcome';

interface ActivePosition {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  lotSize: number;
  entryPrice: number;
  currentPrice: number;
  profitLoss: number;
  investment: number;
}

export default function ManualTrade() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [selectedPair, setSelectedPair] = useState<TradingPair>(tradingPairs.find(p => p.symbol === 'EUR/USD') || tradingPairs[0]);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [pairSearch, setPairSearch] = useState('');
  const [lotSize, setLotSize] = useState(0.08);
  const [showPositionsMenu, setShowPositionsMenu] = useState(false);
  const [positions, setPositions] = useState<ActivePosition[]>([]);
  
  const { currentBalance, accountType, updateBalance, isLoggedIn, user, userEmail } = useAccount();
  const { toast } = useToast();
  const { getCryptoWithPrice } = useCryptoPrices();

  const categories = getMarketCategories();
  
  const filteredPairs = getPairsByCategory(selectedCategory).filter(pair =>
    pair.symbol.toLowerCase().includes(pairSearch.toLowerCase()) ||
    pair.name.toLowerCase().includes(pairSearch.toLowerCase())
  );

  const getCurrentPrice = useCallback(() => {
    if (selectedPair.type === 'crypto') {
      const crypto = getCryptoWithPrice({ id: selectedPair.id, symbol: selectedPair.symbol.split('/')[0] } as any);
      return crypto.price;
    }
    const basePrice = selectedPair.basePrice || 1.0;
    const volatility = basePrice * 0.0001;
    return basePrice + (Math.random() - 0.5) * 2 * volatility;
  }, [selectedPair, getCryptoWithPrice]);

  const [currentPrice, setCurrentPrice] = useState(getCurrentPrice());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(getCurrentPrice());
    }, 500);
    return () => clearInterval(interval);
  }, [getCurrentPrice]);

  // Update positions P/L
  useEffect(() => {
    if (positions.length === 0) return;

    const interval = setInterval(() => {
      setPositions(prev => prev.map(pos => {
        const pair = tradingPairs.find(p => p.symbol === pos.symbol);
        if (!pair) return pos;

        const outcome = getTradeOutcome({ accountType, userEmail });
        const bias = outcome === 'win' ? 0.55 : 0.42;
        
        const volatility = (pair.basePrice || 1) * 0.0002;
        const change = (Math.random() - bias) * volatility;
        const newPrice = pos.currentPrice + change;
        
        const priceDiff = pos.type === 'buy' 
          ? newPrice - pos.entryPrice 
          : pos.entryPrice - newPrice;
        
        // 90% payout for manual trading
        const percentChange = priceDiff / pos.entryPrice;
        const profitLoss = percentChange > 0 
          ? pos.investment * 0.90 * (percentChange * 100)
          : -pos.investment * Math.abs(percentChange * 100);

        return {
          ...pos,
          currentPrice: newPrice,
          profitLoss: parseFloat(profitLoss.toFixed(2)),
        };
      }));
    }, 400);

    return () => clearInterval(interval);
  }, [positions.length, accountType, userEmail]);

  const handleTrade = async (direction: 'buy' | 'sell') => {
    if (!isLoggedIn) {
      toast({ title: "Login Required", description: "Please login to trade", variant: "destructive" });
      return;
    }

    const investmentAmount = lotSize * 100;
    
    if (investmentAmount > currentBalance) {
      toast({ title: "Insufficient Balance", description: "Not enough funds for this trade", variant: "destructive" });
      return;
    }

    const success = await updateBalance(accountType, investmentAmount, 'subtract');
    if (!success) {
      toast({ title: "Trade Failed", description: "Could not place trade", variant: "destructive" });
      return;
    }

    const entryPrice = getCurrentPrice();
    const newPosition: ActivePosition = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      symbol: selectedPair.symbol,
      type: direction,
      lotSize: lotSize,
      entryPrice: entryPrice,
      currentPrice: entryPrice,
      profitLoss: 0,
      investment: investmentAmount,
    };

    setPositions(prev => [...prev, newPosition]);

    if (user) {
      try {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'trade',
          amount: investmentAmount,
          currency: 'USD',
          status: 'completed',
          description: `Manual: ${direction.toUpperCase()} ${selectedPair.symbol} @ ${formatPrice(entryPrice)}`,
          account_type: accountType,
          profit_loss: 0,
        });
      } catch (err) {
        console.error('Error logging trade:', err);
      }
    }

    toast({
      title: `${direction.toUpperCase()} Order Placed!`,
      description: `${lotSize.toFixed(2)} lot on ${selectedPair.symbol}`,
    });
  };

  const closePosition = async (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) return;

    // Return investment + profit/loss
    const totalReturn = position.investment + position.profitLoss;
    if (totalReturn > 0) {
      await updateBalance(accountType, totalReturn, 'add');
    }

    if (user) {
      try {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'trade',
          amount: Math.abs(position.profitLoss),
          currency: 'USD',
          status: 'completed',
          description: `Closed ${position.type.toUpperCase()} ${position.symbol} P/L: ${position.profitLoss >= 0 ? '+' : ''}$${position.profitLoss.toFixed(2)}`,
          account_type: accountType,
          profit_loss: position.profitLoss,
        });
      } catch (err) {
        console.error('Error logging close:', err);
      }
    }

    setPositions(prev => prev.filter(p => p.id !== positionId));
    
    toast({
      title: position.profitLoss >= 0 ? "Profit Taken! 💰" : "Position Closed",
      description: `${position.symbol} P/L: ${position.profitLoss >= 0 ? '+' : ''}$${position.profitLoss.toFixed(2)}`,
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

  const adjustLotSize = (delta: number) => {
    const newSize = Math.max(0.01, Math.min(10, lotSize + delta));
    setLotSize(parseFloat(newSize.toFixed(2)));
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Toolbar - MT Style */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between">
        <button 
          onClick={() => setShowPairSelector(!showPairSelector)}
          className="text-blue-600 font-medium"
        >
          H4
        </button>
        
        <div className="flex items-center gap-4">
          <button className="text-gray-600">+</button>
          <button className="text-gray-600 italic font-serif">f</button>
          <button className="text-blue-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </button>
          <button 
            onClick={() => navigate('/positions')}
            className="text-blue-600 font-medium"
          >
            Trade
          </button>
        </div>
      </div>

      {/* Pair Info Bar */}
      <div className="bg-white border-b border-gray-200 px-3 py-1">
        <div className="text-xs text-gray-600 font-mono">
          {selectedPair.symbol.replace('/', '')}.m, H4, {formatPrice(currentPrice)} {formatPrice(currentPrice)} {formatPrice(currentPrice)} {formatPrice(currentPrice)}
        </div>
        {positions.length > 0 && (
          <div className="text-xs text-gray-500 mt-0.5">
            buy {positions.filter(p => p.type === 'buy').reduce((s, p) => s + p.lotSize, 0).toFixed(2)}
          </div>
        )}
      </div>

      {/* TradingView Chart - Full Screen */}
      <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <TradingViewWidget 
          symbol={selectedPair.symbol}
          theme="light"
          height={window.innerHeight - 200}
        />
      </div>

      {/* Bottom Navigation - MT Style */}
      <div className="bg-white border-t border-gray-200 px-2 py-3 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => navigate('/markets')}
            className="flex flex-col items-center gap-0.5"
          >
            <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17l-4-4 4-4M17 7l4 4-4 4M3 13h18"/>
            </svg>
            <span className="text-xs text-gray-500">Quotes</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
            <span className="text-xs text-blue-600 font-bold">Chart</span>
          </button>
          <button 
            onClick={() => navigate('/positions')}
            className="flex flex-col items-center gap-0.5"
          >
            <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18"/>
              <path d="M7 16l4-8 4 4 4-8"/>
            </svg>
            <span className="text-xs text-gray-500">Trade</span>
          </button>
          <button 
            onClick={() => navigate('/history')}
            className="flex flex-col items-center gap-0.5"
          >
            <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="16" rx="2"/>
              <path d="M3 10h18"/>
            </svg>
            <span className="text-xs text-gray-500">History</span>
          </button>
          <button 
            onClick={() => setShowPositionsMenu(!showPositionsMenu)}
            className="flex flex-col items-center gap-0.5 relative"
          >
            <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
            </svg>
            <span className="text-xs text-gray-500">Settings</span>
          </button>
        </div>
      </div>

      {/* Positions Menu Overlay */}
      {showPositionsMenu && positions.length > 0 && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowPositionsMenu(false)} />
          <div className="fixed bottom-20 left-4 right-4 z-50 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex justify-between items-center">
              <span className="font-bold text-gray-800">Open Positions ({positions.length})</span>
              <button onClick={() => setShowPositionsMenu(false)} className="text-gray-500">✕</button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {positions.map((pos) => (
                <div key={pos.id} className="flex items-center justify-between p-3 border-b border-gray-50">
                  <div>
                    <div className="font-medium text-gray-900">{pos.symbol}</div>
                    <div className="text-xs text-gray-500">{pos.type} {pos.lotSize.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "font-bold",
                      pos.profitLoss >= 0 ? "text-blue-600" : "text-red-600"
                    )}>
                      {pos.profitLoss >= 0 ? '+' : ''}{pos.profitLoss.toFixed(2)}
                    </span>
                    <button 
                      onClick={() => closePosition(pos.id)}
                      className="px-3 py-1 bg-red-500 text-white text-xs rounded font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Pair Selector Modal */}
      {showPairSelector && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowPairSelector(false)} />
          <div className="fixed inset-x-4 top-16 z-50 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-[70vh]">
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search markets..."
                  value={pairSearch}
                  onChange={(e) => setPairSearch(e.target.value)}
                  className="pl-9 border-gray-300"
                />
              </div>
            </div>
            
            <div className="flex gap-1 p-2 border-b border-gray-200 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
            
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
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
                    selectedPair.id === pair.id && "bg-blue-50"
                  )}
                >
                  <span className="text-xl">{pair.icon}</span>
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-900">{pair.symbol}</p>
                    <p className="text-xs text-gray-500">{pair.name}</p>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{pair.type}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Floating Trade Controls */}
      <div className="fixed bottom-24 left-4 right-4 z-30">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between gap-2">
            <button 
              onClick={() => handleTrade('sell')}
              className="flex-1 bg-red-500 py-3 rounded-lg active:scale-95 transition-transform"
            >
              <div className="text-[10px] text-white/80 uppercase">Sell</div>
              <div className="text-lg font-bold text-white">{formatPrice(currentPrice * 0.9999)}</div>
            </button>

            <div className="flex flex-col items-center px-2">
              <button onClick={() => adjustLotSize(0.01)} className="text-gray-400 text-lg">▲</button>
              <span className="text-lg font-bold text-gray-900">{lotSize.toFixed(2)}</span>
              <button onClick={() => adjustLotSize(-0.01)} className="text-gray-400 text-lg">▼</button>
            </div>

            <button 
              onClick={() => handleTrade('buy')}
              className="flex-1 bg-green-500 py-3 rounded-lg active:scale-95 transition-transform"
            >
              <div className="text-[10px] text-white/80 uppercase">Buy</div>
              <div className="text-lg font-bold text-white">{formatPrice(currentPrice * 1.0001)}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
