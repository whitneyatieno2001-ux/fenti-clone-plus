import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getTradeOutcome } from '@/lib/tradeOutcome';
import { tradingPairs } from '@/data/tradingPairs';

interface Position {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  lotSize: number;
  entryPrice: number;
  currentPrice: number;
  profitLoss: number;
  investment: number;
}

export default function ActivePositions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();
  const { toast } = useToast();
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [balance, setBalance] = useState(currentBalance);
  const [equity, setEquity] = useState(currentBalance);
  const [margin, setMargin] = useState(0);
  const [freeMargin, setFreeMargin] = useState(currentBalance);
  const [marginLevel, setMarginLevel] = useState(0);

  // Add position from navigation state
  useEffect(() => {
    if (location.state) {
      const { symbol, direction, investment, entryPrice, lotSize = 0.1 } = location.state as any;
      if (symbol && direction && investment && entryPrice) {
        const newPosition: Position = {
          id: Date.now().toString(),
          symbol,
          type: direction,
          lotSize,
          entryPrice,
          currentPrice: entryPrice,
          profitLoss: 0,
          investment,
        };
        setPositions(prev => [...prev, newPosition]);
        // Clear the state
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state]);

  useEffect(() => {
    setBalance(currentBalance);
  }, [currentBalance]);

  // Calculate account metrics
  useEffect(() => {
    const totalPL = positions.reduce((sum, pos) => sum + pos.profitLoss, 0);
    const usedMargin = positions.reduce((sum, pos) => sum + (pos.lotSize * 1000), 0);
    
    setEquity(currentBalance + totalPL);
    setMargin(usedMargin);
    setFreeMargin(currentBalance + totalPL - usedMargin);
    setMarginLevel(usedMargin > 0 ? ((currentBalance + totalPL) / usedMargin) * 100 : 0);
  }, [positions, currentBalance]);

  // Update positions P/L with win/loss bias
  useEffect(() => {
    if (positions.length === 0) return;

    const interval = setInterval(() => {
      setPositions(prev => prev.map(pos => {
        const pair = tradingPairs.find(p => p.symbol === pos.symbol);
        const basePrice = pair?.basePrice || pos.entryPrice;

        const outcome = getTradeOutcome({ accountType, userEmail });
        const bias = outcome === 'win' ? 0.55 : 0.42;
        
        const volatility = basePrice * 0.0003;
        const change = (Math.random() - bias) * volatility;
        const newPrice = pos.currentPrice + change;
        
        const priceDiff = pos.type === 'buy' 
          ? newPrice - pos.entryPrice 
          : pos.entryPrice - newPrice;
        
        // 90% payout logic
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

  const closePosition = async (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
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

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes('XAU') || symbol.includes('GOLD')) return price.toFixed(2);
    if (symbol.includes('JPY')) return price.toFixed(3);
    return price.toFixed(5);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#1e3a5f] text-white px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-bold">{currentBalance.toFixed(2)} USD</span>
        <button 
          onClick={() => navigate('/trade')}
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
            <p className="text-sm mt-1">Go to Trade to place orders</p>
          </div>
        ) : (
          <div>
            {positions.map((position) => (
              <div 
                key={position.id}
                onClick={() => closePosition(position.id)}
                className="flex items-center justify-between py-2 px-4 border-b border-gray-100 active:bg-gray-50 cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{position.symbol.replace('/', '')}.m,</span>
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

      {/* Bottom Navigation */}
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
              <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
            </svg>
            <span className="text-xs text-gray-500">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
