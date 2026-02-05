import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getTradeOutcome } from '@/lib/tradeOutcome';
import { TradingViewWidget } from '@/components/TradingViewWidget';
import {
  Menu,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  TrendingUp,
  Clock,
  MessageSquare,
  BarChart3,
} from 'lucide-react';

interface ForexPosition {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  lotSize: number;
  entryPrice: number;
  currentPrice: number;
  profitLoss: number;
  openTime: number;
}

const FOREX_PAIRS = [
  { symbol: 'XAU/USD', name: 'Gold vs US Dollar', basePrice: 2778.50, decimals: 2 },
  { symbol: 'EUR/USD', name: 'Euro vs US Dollar', basePrice: 1.0862, decimals: 5 },
  { symbol: 'GBP/USD', name: 'Pound vs US Dollar', basePrice: 1.2645, decimals: 5 },
  { symbol: 'USD/JPY', name: 'US Dollar vs Yen', basePrice: 149.85, decimals: 3 },
];

export default function ForexBot() {
  const navigate = useNavigate();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();
  const { toast } = useToast();
  
  const [isRunning, setIsRunning] = useState(false);
  const [positions, setPositions] = useState<ForexPosition[]>([]);
  const [selectedPair, setSelectedPair] = useState(FOREX_PAIRS[0]);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [buyPrice, setBuyPrice] = useState(selectedPair.basePrice + 0.14);
  const [sellPrice, setSellPrice] = useState(selectedPair.basePrice);
  const [lotSize, setLotSize] = useState(0.5);
  const [equity, setEquity] = useState(currentBalance);
  const [margin, setMargin] = useState(0);
  const [freeMargin, setFreeMargin] = useState(currentBalance);
  
  const tradingInterval = useRef<NodeJS.Timeout | null>(null);
  const positionsRef = useRef(positions);
  
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  // Update prices
  useEffect(() => {
    const basePrice = selectedPair.basePrice;
    const spread = selectedPair.symbol.includes('XAU') ? 0.14 : 0.0002;
    setBuyPrice(basePrice + spread);
    setSellPrice(basePrice);
  }, [selectedPair]);

  // Real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      const volatility = selectedPair.symbol.includes('XAU') ? 0.5 : 0.0001;
      setBuyPrice(prev => prev + (Math.random() - 0.5) * volatility);
      setSellPrice(prev => prev + (Math.random() - 0.5) * volatility);
    }, 500);
    return () => clearInterval(interval);
  }, [selectedPair]);

  // Calculate account metrics
  useEffect(() => {
    const totalPL = positions.reduce((sum, pos) => sum + pos.profitLoss, 0);
    const usedMargin = positions.reduce((sum, pos) => sum + (pos.lotSize * 1000), 0);
    
    setEquity(currentBalance + totalPL);
    setMargin(usedMargin);
    setFreeMargin(currentBalance + totalPL - usedMargin);
  }, [positions, currentBalance]);

  // Real-time position updates with win/loss bias
  useEffect(() => {
    if (positions.length === 0) return;

    const interval = setInterval(() => {
      setPositions(prev => prev.map(pos => {
        const pair = FOREX_PAIRS.find(p => p.symbol === pos.symbol);
        if (!pair) return pos;

        const outcome = getTradeOutcome({ accountType, userEmail });
        const bias = outcome === 'win' ? 0.55 : 0.42;
        
        const volatility = pos.symbol.includes('XAU') ? 0.8 : 0.0003;
        const change = (Math.random() - bias) * volatility;
        const newPrice = pos.currentPrice + change;
        
        const priceDiff = pos.type === 'buy' 
          ? newPrice - pos.entryPrice 
          : pos.entryPrice - newPrice;
        
        const multiplier = pos.symbol.includes('XAU') ? 100 : 100000;
        const profitLoss = priceDiff * pos.lotSize * multiplier;

        return {
          ...pos,
          currentPrice: newPrice,
          profitLoss: parseFloat(profitLoss.toFixed(2)),
        };
      }));
    }, 400);

    return () => clearInterval(interval);
  }, [positions.length, accountType, userEmail]);

  // Auto-close profitable positions
  useEffect(() => {
    positions.forEach(async (pos) => {
      const targetProfit = pos.lotSize * 40;
      
      if (pos.profitLoss >= targetProfit) {
        await closePosition(pos.id);
        toast({
          title: "Profit Taken! 💰",
          description: `${pos.symbol} closed at +$${pos.profitLoss.toFixed(2)}`,
        });
      }
    });
  }, [positions]);

  const openPosition = useCallback(async (direction: 'buy' | 'sell') => {
    if (currentBalance < 1) return;
    
    const entryPrice = direction === 'buy' ? buyPrice : sellPrice;
    
    const newPosition: ForexPosition = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      symbol: selectedPair.symbol,
      type: direction,
      lotSize: lotSize,
      entryPrice: entryPrice,
      currentPrice: entryPrice,
      profitLoss: 0,
      openTime: Date.now(),
    };
    
    setPositions(prev => [...prev, newPosition]);
    
    if (user) {
      try {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'bot_trade',
          amount: 0,
          currency: 'USD',
          status: 'completed',
          description: `Forex EA: Opened ${direction.toUpperCase()} ${selectedPair.symbol} @ ${entryPrice.toFixed(selectedPair.decimals)}`,
          account_type: accountType,
          profit_loss: 0,
        });
      } catch (err) {
        console.error('Error logging position:', err);
      }
    }

    toast({
      title: `${direction.toUpperCase()} Order Placed`,
      description: `${selectedPair.symbol} @ ${entryPrice.toFixed(selectedPair.decimals)}`,
    });
  }, [currentBalance, user, accountType, selectedPair, buyPrice, sellPrice, lotSize]);

  const closePosition = async (positionId: string) => {
    const position = positionsRef.current.find(p => p.id === positionId);
    if (!position) return;

    if (position.profitLoss !== 0) {
      const operation = position.profitLoss > 0 ? 'add' : 'subtract';
      await updateBalance(accountType, Math.abs(position.profitLoss), operation);
    }

    if (user) {
      try {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'bot_trade',
          amount: Math.abs(position.profitLoss),
          currency: 'USD',
          status: 'completed',
          description: `Forex EA: Closed ${position.type.toUpperCase()} ${position.symbol} P/L: ${position.profitLoss >= 0 ? '+' : ''}$${position.profitLoss.toFixed(2)}`,
          account_type: accountType,
          profit_loss: position.profitLoss,
        });
      } catch (err) {
        console.error('Error logging close:', err);
      }
    }

    setPositions(prev => prev.filter(p => p.id !== positionId));
  };

  const adjustLotSize = (direction: 'up' | 'down') => {
    const step = 0.1;
    if (direction === 'up') {
      setLotSize(prev => Math.min(prev + step, 10));
    } else {
      setLotSize(prev => Math.max(prev - step, 0.1));
    }
  };

  const formatPrice = (price: number) => {
    return price.toFixed(selectedPair.decimals);
  };

  return (
    <div className="h-screen flex flex-col bg-[#1a1a2e]">
      {/* MT5 Top Toolbar */}
      <div className="bg-[#252547] flex items-center justify-between px-3 py-2 border-b border-[#3d3d6b]">
        <div className="flex items-center gap-3">
          <button className="p-1">
            <Menu className="h-5 w-5 text-gray-400" />
          </button>
          <button className="p-1">
            <Plus className="h-5 w-5 text-gray-400" />
          </button>
          <button className="p-1">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l7 7m0 0l-7 7m7-7H20"/>
            </svg>
          </button>
        </div>
        <span className="text-white font-medium">H4</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <div className="w-4 h-4 rounded-full bg-orange-500" />
        </div>
      </div>

      {/* Price Bar with SELL/BUY */}
      <div className="bg-[#1e1e3f] flex items-center justify-between px-2 py-1.5">
        {/* SELL Button */}
        <button 
          onClick={() => openPosition('sell')}
          className="flex-1 max-w-[140px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-2.5 px-3 rounded-md flex flex-col items-center"
        >
          <span className="text-[10px] opacity-80">SELL</span>
          <span className="text-lg font-bold tabular-nums">{formatPrice(sellPrice)}</span>
        </button>

        {/* Lot Size with arrows */}
        <div className="flex items-center gap-1 px-2">
          <button onClick={() => adjustLotSize('down')} className="text-gray-400 p-1">
            <ChevronDown className="h-4 w-4" />
          </button>
          <span className="text-white font-bold text-lg tabular-nums w-12 text-center">{lotSize.toFixed(1)}</span>
          <button onClick={() => adjustLotSize('up')} className="text-gray-400 p-1">
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>

        {/* BUY Button */}
        <button 
          onClick={() => openPosition('buy')}
          className="flex-1 max-w-[140px] bg-[#22c55e] hover:bg-[#16a34a] text-white py-2.5 px-3 rounded-md flex flex-col items-center"
        >
          <span className="text-[10px] opacity-80">BUY</span>
          <span className="text-lg font-bold tabular-nums">{formatPrice(buyPrice)}</span>
        </button>
      </div>

      {/* Symbol Info Bar */}
      <div className="bg-[#252547] px-3 py-1.5 flex items-center justify-between text-xs border-b border-[#3d3d6b]">
        <button 
          onClick={() => setShowPairSelector(true)}
          className="text-white font-medium flex items-center gap-1"
        >
          {selectedPair.symbol.replace('/', '')} • H4
        </button>
        <span className="text-gray-400">{selectedPair.name}</span>
      </div>

      {/* TradingView Chart - Full Screen */}
      <div className="flex-1 relative bg-[#131326]">
        <TradingViewWidget 
          symbol={selectedPair.symbol} 
          theme="dark" 
          height={window.innerHeight - 280}
        />
      </div>

      {/* Open Positions Summary */}
      {positions.length > 0 && (
        <div className="bg-[#252547] border-t border-[#3d3d6b] px-3 py-2 max-h-32 overflow-y-auto">
          {positions.map((pos) => (
            <div 
              key={pos.id}
              className="flex items-center justify-between py-1.5 border-b border-[#3d3d6b] last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">{pos.symbol}</span>
                <span className={cn(
                  "text-xs",
                  pos.type === 'buy' ? "text-green-500" : "text-blue-500"
                )}>
                  {pos.type.toUpperCase()} {pos.lotSize}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "font-bold tabular-nums",
                  pos.profitLoss >= 0 ? "text-blue-400" : "text-red-400"
                )}>
                  {pos.profitLoss >= 0 ? '+' : ''}{pos.profitLoss.toFixed(2)}
                </span>
                <button 
                  onClick={() => closePosition(pos.id)}
                  className="text-red-500 text-xs hover:underline"
                >
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MT5 Bottom Navigation */}
      <div className="bg-[#252547] border-t border-[#3d3d6b] px-2 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => navigate('/markets')}
            className="flex flex-col items-center gap-0.5"
          >
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <span className="text-[10px] text-gray-400">Quotes</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <span className="text-[10px] text-blue-500 font-bold">Charts</span>
          </button>
          <button 
            onClick={() => navigate('/positions')}
            className="flex flex-col items-center gap-0.5"
          >
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18"/>
              <path d="M7 16l4-8 4 4 4-8"/>
            </svg>
            <span className="text-[10px] text-gray-400">Trade</span>
          </button>
          <button 
            onClick={() => navigate('/history')}
            className="flex flex-col items-center gap-0.5"
          >
            <Clock className="h-5 w-5 text-gray-400" />
            <span className="text-[10px] text-gray-400">History</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 relative">
            <MessageSquare className="h-5 w-5 text-gray-400" />
            <span className="text-[10px] text-gray-400">Messages</span>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">2</span>
          </button>
        </div>
      </div>

      {/* Pair Selector Modal */}
      {showPairSelector && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-[#1e1e3f] w-full rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-bold text-lg">Select Forex Pair</span>
              <button onClick={() => setShowPairSelector(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-2">
              {FOREX_PAIRS.map(pair => (
                <button
                  key={pair.symbol}
                  onClick={() => {
                    setSelectedPair(pair);
                    setShowPairSelector(false);
                  }}
                  className={cn(
                    "w-full p-3 rounded-lg flex items-center justify-between",
                    selectedPair.symbol === pair.symbol ? "bg-blue-600/20 border border-blue-500" : "bg-[#252547]"
                  )}
                >
                  <div className="text-left">
                    <div className="text-white font-medium">{pair.symbol}</div>
                    <div className="text-gray-400 text-xs">{pair.name}</div>
                  </div>
                  <span className="text-white font-mono">{pair.basePrice.toFixed(pair.decimals)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
