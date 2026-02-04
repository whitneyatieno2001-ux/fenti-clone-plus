import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getTradeOutcome } from '@/lib/tradeOutcome';

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
  { symbol: 'EURUSDm', name: 'Euro/USD', basePrice: 1.0862, decimals: 5 },
  { symbol: 'GBPUSDm', name: 'GBP/USD', basePrice: 1.2645, decimals: 5 },
  { symbol: 'USDJPYm', name: 'USD/JPY', basePrice: 149.85, decimals: 3 },
  { symbol: 'XAUUSDm', name: 'Gold', basePrice: 2780, decimals: 2 },
];

export default function ForexBot() {
  const navigate = useNavigate();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();
  const { toast } = useToast();
  
  const [isRunning, setIsRunning] = useState(false);
  const [positions, setPositions] = useState<ForexPosition[]>([]);
  const [balance, setBalance] = useState(currentBalance);
  const [equity, setEquity] = useState(currentBalance);
  const [margin, setMargin] = useState(0);
  const [freeMargin, setFreeMargin] = useState(currentBalance);
  const [marginLevel, setMarginLevel] = useState(0);
  
  const tradingInterval = useRef<NodeJS.Timeout | null>(null);
  const positionsRef = useRef(positions);
  
  useEffect(() => {
    positionsRef.current = positions;
    setBalance(currentBalance);
  }, [positions, currentBalance]);

  // Calculate account metrics
  useEffect(() => {
    const totalPL = positions.reduce((sum, pos) => sum + pos.profitLoss, 0);
    const usedMargin = positions.reduce((sum, pos) => sum + (pos.lotSize * 1000), 0);
    
    setEquity(currentBalance + totalPL);
    setMargin(usedMargin);
    setFreeMargin(currentBalance + totalPL - usedMargin);
    setMarginLevel(usedMargin > 0 ? ((currentBalance + totalPL) / usedMargin) * 100 : 0);
  }, [positions, currentBalance]);

  // Real-time position updates with win/loss bias
  useEffect(() => {
    if (positions.length === 0) return;

    const interval = setInterval(() => {
      setPositions(prev => prev.map(pos => {
        const pair = FOREX_PAIRS.find(p => p.symbol === pos.symbol);
        if (!pair) return pos;

        // Determine if this position should trend towards profit based on outcome logic
        const outcome = getTradeOutcome({ accountType, userEmail });
        const bias = outcome === 'win' ? 0.55 : 0.42; // Slight bias based on expected outcome
        
        const volatility = pos.symbol.includes('XAU') ? 0.8 : 0.0003;
        const change = (Math.random() - bias) * volatility;
        const newPrice = pos.currentPrice + change;
        
        // Calculate P/L
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
      // Close at profit thresholds based on lot size
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

  const openPosition = useCallback(async () => {
    if (currentBalance < 1) return;
    
    const pair = FOREX_PAIRS[Math.floor(Math.random() * FOREX_PAIRS.length)];
    const direction = Math.random() > 0.5 ? 'buy' : 'sell';
    const lotSizes = [0.05, 0.10];
    const lot = lotSizes[Math.floor(Math.random() * lotSizes.length)];
    
    const priceVariation = pair.symbol.includes('XAU') ? 20 : 0.01;
    const basePrice = pair.basePrice + (Math.random() - 0.5) * priceVariation;
    
    const newPosition: ForexPosition = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      symbol: pair.symbol,
      type: direction,
      lotSize: lot,
      entryPrice: basePrice,
      currentPrice: basePrice,
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
          description: `Forex EA: Opened ${direction.toUpperCase()} ${pair.symbol} @ ${basePrice.toFixed(pair.decimals)}`,
          account_type: accountType,
          profit_loss: 0,
        });
      } catch (err) {
        console.error('Error logging position:', err);
      }
    }
  }, [currentBalance, user, accountType]);

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

  const startBot = () => {
    if (currentBalance < 1) {
      toast({
        title: "Insufficient Balance",
        description: "You need at least $1 to start the bot",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    openPosition();
    
    tradingInterval.current = setInterval(() => {
      if (positionsRef.current.length < 15) {
        openPosition();
      }
    }, 2000 + Math.random() * 1500);
    
    toast({
      title: "Forex EA Started 🤖",
      description: "Bot is now trading automatically",
    });
  };

  const stopBot = () => {
    setIsRunning(false);
    if (tradingInterval.current) {
      clearInterval(tradingInterval.current);
      tradingInterval.current = null;
    }
    toast({
      title: "Forex EA Stopped",
      description: "Bot has been paused",
    });
  };

  const formatPrice = (price: number, symbol: string) => {
    const pair = FOREX_PAIRS.find(p => p.symbol === symbol);
    return price.toFixed(pair?.decimals || 5);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header - MT Style */}
      <div className="bg-[#1e3a5f] text-white px-4 py-3 flex items-center justify-between">
        <button 
          onClick={isRunning ? stopBot : startBot}
          className={cn(
            "px-4 py-2 rounded text-sm font-bold",
            isRunning ? "bg-red-500" : "bg-green-500"
          )}
        >
          {isRunning ? 'Stop EA' : 'Start EA'}
        </button>
        <span className="text-xl font-bold">{currentBalance.toFixed(2)} USD</span>
        <button 
          onClick={() => navigate('/bot-select')}
          className="text-2xl"
        >
          +
        </button>
      </div>

      {/* Account Summary */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex justify-between py-2 px-4 border-b border-gray-100">
          <span className="text-gray-600">Balance:</span>
          <span className="font-medium text-gray-900">{balance.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-2 px-4 border-b border-gray-100">
          <span className="text-gray-600">Equity:</span>
          <span className={cn("font-medium", equity >= balance ? "text-blue-600" : "text-red-600")}>
            {equity.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between py-2 px-4 border-b border-gray-100">
          <span className="text-gray-600">Margin:</span>
          <span className="font-medium text-gray-900">{margin.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-2 px-4 border-b border-gray-100">
          <span className="text-gray-600">Free margin:</span>
          <span className="font-medium text-gray-900">{freeMargin.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-2 px-4 border-b border-gray-100">
          <span className="text-gray-600">Margin level (%):</span>
          <span className="font-medium text-gray-900">{marginLevel.toFixed(2)}</span>
        </div>
      </div>

      {/* Positions Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-2 px-4 border-b border-gray-200 bg-gray-50">
          <span className="font-bold text-gray-800">Positions</span>
        </div>

        {positions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No open positions</p>
            <p className="text-sm mt-1">Start the EA to begin trading</p>
          </div>
        ) : (
          <div>
            {positions.map((position) => (
              <div 
                key={position.id}
                className="flex items-center justify-between py-2 px-4 border-b border-gray-100"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{position.symbol},</span>
                    <span className="text-blue-600 text-sm">
                      {position.type} {position.lotSize.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 font-mono">
                    {formatPrice(position.entryPrice, position.symbol)} → {formatPrice(position.currentPrice, position.symbol)}
                  </div>
                </div>
                <span className={cn(
                  "font-bold text-lg tabular-nums",
                  position.profitLoss >= 0 ? "text-blue-600" : "text-red-600"
                )}>
                  {position.profitLoss.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
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
          <button 
            onClick={() => navigate('/trade')}
            className="flex flex-col items-center gap-0.5"
          >
            <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
            <span className="text-xs text-gray-500">Chart</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18"/>
              <path d="M7 16l4-8 4 4 4-8"/>
            </svg>
            <span className="text-xs text-blue-600 font-bold">Trade</span>
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
            onClick={() => navigate('/settings')}
            className="flex flex-col items-center gap-0.5"
          >
            <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.42 3.42 2 2 0 0 1-1.42-.59l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span className="text-xs text-gray-500">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
