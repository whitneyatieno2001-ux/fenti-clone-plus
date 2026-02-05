import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { TradingViewWidget } from '@/components/TradingViewWidget';
import { cn } from '@/lib/utils';
import { Search, Menu, Plus, X, ChevronUp, ChevronDown, Clock, MessageSquare, TrendingUp, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tradingPairs, getMarketCategories, getPairsByCategory, type TradingPair } from '@/data/tradingPairs';
import { Input } from '@/components/ui/input';
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
  const [selectedPair, setSelectedPair] = useState<TradingPair>(tradingPairs.find(p => p.symbol === 'EUR/USD') || tradingPairs[0]);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [pairSearch, setPairSearch] = useState('');
  const [lotSize, setLotSize] = useState(0.5);
  const [lotInput, setLotInput] = useState('0.50');
  const [positions, setPositions] = useState<ActivePosition[]>([]);
  
  const { currentBalance, accountType, updateBalance, isLoggedIn, user, userEmail } = useAccount();
  const { toast } = useToast();
  const { getCryptoWithPrice } = useCryptoPrices();
  const positionsRef = useRef(positions);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

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

  const [sellPrice, setSellPrice] = useState(getCurrentPrice());
  const [buyPrice, setBuyPrice] = useState(getCurrentPrice() * 1.0002);

  useEffect(() => {
    const basePrice = selectedPair.basePrice || 1.0;
    const spread = selectedPair.symbol.includes('XAU') ? 0.14 : 0.0002;
    setSellPrice(basePrice);
    setBuyPrice(basePrice + spread);
  }, [selectedPair]);

  useEffect(() => {
    const interval = setInterval(() => {
      const volatility = selectedPair.symbol.includes('XAU') ? 0.3 : 0.0001;
      setSellPrice(prev => prev + (Math.random() - 0.5) * volatility);
      setBuyPrice(prev => prev + (Math.random() - 0.5) * volatility);
    }, 500);
    return () => clearInterval(interval);
  }, [selectedPair]);

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

    const entryPrice = direction === 'buy' ? buyPrice : sellPrice;
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
    const position = positionsRef.current.find(p => p.id === positionId);
    if (!position) return;

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

  const adjustLotSize = (direction: 'up' | 'down') => {
    const step = 0.01;
    let newVal: number;
    if (direction === 'up') {
      newVal = Math.min(lotSize + step, 10);
    } else {
      newVal = Math.max(lotSize - step, 0.01);
    }
    setLotSize(newVal);
    setLotInput(newVal.toFixed(2));
  };

  const handleLotInputChange = (val: string) => {
    setLotInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.01 && num <= 10) {
      setLotSize(num);
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#1a1a2e' }}>
      {/* MT5 Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ backgroundColor: '#252547', borderColor: '#3d3d6b' }}>
        <div className="flex items-center gap-3">
          <button className="p-1">
            <Menu className="h-5 w-5" style={{ color: '#9ca3af' }} />
          </button>
          <button className="p-1">
            <Plus className="h-5 w-5" style={{ color: '#9ca3af' }} />
          </button>
          <button className="p-1">
            <svg className="h-5 w-5" style={{ color: '#9ca3af' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l7 7m0 0l-7 7m7-7H20"/>
            </svg>
          </button>
        </div>
        <span className="font-medium" style={{ color: 'white' }}>H4</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#f97316' }} />
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1"
          >
            <div className="w-3 h-3" style={{ backgroundColor: '#ef4444' }} />
            <div className="w-3 h-3" style={{ backgroundColor: '#22c55e' }} />
          </button>
        </div>
      </div>

      {/* Price Bar with SELL/BUY */}
      <div className="flex items-center justify-between px-2 py-1.5" style={{ backgroundColor: '#1e1e3f' }}>
        {/* SELL Button */}
        <button 
          onClick={() => handleTrade('sell')}
          className="flex-1 max-w-[140px] py-2.5 px-3 rounded-md flex flex-col items-center"
          style={{ backgroundColor: '#2563eb' }}
        >
          <span className="text-[10px] opacity-80" style={{ color: 'white' }}>SELL</span>
          <span className="text-lg font-bold tabular-nums" style={{ color: 'white' }}>{formatPrice(sellPrice)}</span>
        </button>

        {/* Lot Size with arrows */}
        <div className="flex items-center gap-1 px-2">
          <button onClick={() => adjustLotSize('down')} className="p-1" style={{ color: '#9ca3af' }}>
            <ChevronDown className="h-4 w-4" />
          </button>
          <span className="font-bold text-lg tabular-nums w-12 text-center" style={{ color: 'white' }}>{lotSize.toFixed(2)}</span>
          <button onClick={() => adjustLotSize('up')} className="p-1" style={{ color: '#9ca3af' }}>
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>

        {/* BUY Button */}
        <button 
          onClick={() => handleTrade('buy')}
          className="flex-1 max-w-[140px] py-2.5 px-3 rounded-md flex flex-col items-center"
          style={{ backgroundColor: '#22c55e' }}
        >
          <span className="text-[10px] opacity-80" style={{ color: 'white' }}>BUY</span>
          <span className="text-lg font-bold tabular-nums" style={{ color: 'white' }}>{formatPrice(buyPrice)}</span>
        </button>
      </div>

      {/* Symbol Info Bar */}
      <div className="px-3 py-1 flex items-center gap-2 text-xs border-b" style={{ backgroundColor: '#252547', borderColor: '#3d3d6b' }}>
        <button 
          onClick={() => setShowPairSelector(true)}
          className="font-medium" style={{ color: 'white' }}
        >
          {selectedPair.symbol.replace('/', '')} • H4
        </button>
        <span className="ml-auto" style={{ color: '#9ca3af' }}>{selectedPair.name}</span>
      </div>

      {/* TradingView Chart - Full Screen */}
      <div className="flex-1 relative" style={{ backgroundColor: '#131326' }}>
        <TradingViewWidget 
          symbol={selectedPair.symbol}
          theme="dark"
          height={window.innerHeight - 220}
        />
      </div>

      {/* MT5 Bottom Navigation */}
      <div className="border-t px-2 py-2 safe-area-inset-bottom" style={{ backgroundColor: '#252547', borderColor: '#3d3d6b' }}>
        <div className="flex items-center justify-around">
          <button 
            onClick={() => navigate('/markets')}
            className="flex flex-col items-center gap-0.5"
          >
            <BarChart3 className="h-5 w-5" style={{ color: '#9ca3af' }} />
            <span className="text-[10px]" style={{ color: '#9ca3af' }}>Quotes</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <TrendingUp className="h-5 w-5" style={{ color: '#3b82f6' }} />
            <span className="text-[10px] font-bold" style={{ color: '#3b82f6' }}>Charts</span>
          </button>
          <button 
            onClick={() => navigate('/positions')}
            className="flex flex-col items-center gap-0.5"
          >
            <svg className="h-5 w-5" style={{ color: '#9ca3af' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18"/>
              <path d="M7 16l4-8 4 4 4-8"/>
            </svg>
            <span className="text-[10px]" style={{ color: '#9ca3af' }}>Trade</span>
          </button>
          <button 
            onClick={() => navigate('/history')}
            className="flex flex-col items-center gap-0.5"
          >
            <Clock className="h-5 w-5" style={{ color: '#9ca3af' }} />
            <span className="text-[10px]" style={{ color: '#9ca3af' }}>History</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 relative">
            <MessageSquare className="h-5 w-5" style={{ color: '#9ca3af' }} />
            <span className="text-[10px]" style={{ color: '#9ca3af' }}>Messages</span>
            <span className="absolute -top-1 -right-1 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ef4444' }}>2</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto" style={{ backgroundColor: '#1e1e3f' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-lg" style={{ color: 'white' }}>Settings</span>
              <button onClick={() => setShowSettings(false)}>
                <X className="h-5 w-5" style={{ color: '#9ca3af' }} />
              </button>
            </div>
            
            {/* Lot Size Input */}
            <div className="mb-4">
              <label className="text-sm mb-2 block" style={{ color: '#9ca3af' }}>Lot Size</label>
              <input
                type="text"
                inputMode="decimal"
                value={lotInput}
                onChange={(e) => handleLotInputChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-lg"
                style={{ backgroundColor: '#252547', borderColor: '#3d3d6b', color: 'white', border: '1px solid #3d3d6b' }}
                placeholder="0.01"
              />
            </div>

            {/* Open Positions */}
            <div className="mb-4">
              <span className="font-bold mb-2 block" style={{ color: 'white' }}>Open Positions ({positions.length})</span>
              {positions.length === 0 ? (
                <p className="text-sm" style={{ color: '#9ca3af' }}>No open positions</p>
              ) : (
                <div className="space-y-2">
                  {positions.map(pos => (
                    <div key={pos.id} className="p-3 rounded-lg" style={{ backgroundColor: '#252547' }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium" style={{ color: 'white' }}>{pos.symbol}</span>
                          <span className={cn("ml-2 text-sm", pos.type === 'buy' ? "text-green-500" : "text-blue-500")}>
                            {pos.type.toUpperCase()} {pos.lotSize}
                          </span>
                        </div>
                        <span className={cn("font-bold", pos.profitLoss >= 0 ? "text-green-500" : "text-red-500")}>
                          {pos.profitLoss >= 0 ? '+' : ''}{pos.profitLoss.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs" style={{ color: '#9ca3af' }}>
                          {formatPrice(pos.entryPrice)} → {formatPrice(pos.currentPrice)}
                        </span>
                        <button 
                          onClick={() => closePosition(pos.id)}
                          className="text-white text-sm px-3 py-1 rounded"
                          style={{ backgroundColor: '#ef4444' }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pair Selector Modal */}
      {showPairSelector && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: '#1e1e3f' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-lg" style={{ color: 'white' }}>Select Market</span>
              <button onClick={() => setShowPairSelector(false)}>
                <X className="h-5 w-5" style={{ color: '#9ca3af' }} />
              </button>
            </div>
            
            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search markets..."
                value={pairSearch}
                onChange={(e) => setPairSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg"
                style={{ backgroundColor: '#252547', borderColor: '#3d3d6b', color: 'white', border: '1px solid #3d3d6b' }}
              />
            </div>
            
            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm whitespace-nowrap",
                    selectedCategory === cat.id 
                      ? "bg-blue-600 text-white" 
                      : ""
                  )}
                  style={selectedCategory !== cat.id ? { backgroundColor: '#252547', color: '#9ca3af' } : {}}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            {/* Pairs List */}
            <div className="space-y-2">
              {filteredPairs.map(pair => (
                <button
                  key={pair.id}
                  onClick={() => {
                    setSelectedPair(pair);
                    setShowPairSelector(false);
                    setPairSearch('');
                  }}
                  className={cn(
                    "w-full p-3 rounded-lg flex items-center justify-between",
                    selectedPair.id === pair.id ? "border" : ""
                  )}
                  style={selectedPair.id === pair.id 
                    ? { backgroundColor: 'rgba(37, 99, 235, 0.2)', borderColor: '#3b82f6' }
                    : { backgroundColor: '#252547' }
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{pair.icon}</span>
                    <div className="text-left">
                      <div className="font-medium" style={{ color: 'white' }}>{pair.symbol}</div>
                      <div className="text-xs" style={{ color: '#9ca3af' }}>{pair.name}</div>
                    </div>
                  </div>
                  {selectedPair.id === pair.id && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
