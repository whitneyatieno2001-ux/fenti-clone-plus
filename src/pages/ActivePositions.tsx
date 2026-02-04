import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { Clock, X, Menu, ArrowUpDown, Plus } from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  lotSize: number;
  entryPrice: number;
  currentPrice: number;
  profitLoss: number;
  openTime: number;
  investment: number;
}

export default function ActivePositions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentBalance, accountType, updateBalance } = useAccount();
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [equity, setEquity] = useState(currentBalance);
  const [freeMargin, setFreeMargin] = useState(currentBalance);

  // Get initial position from navigation state
  useEffect(() => {
    const state = location.state as { 
      symbol: string; 
      direction: 'buy' | 'sell'; 
      investment: number;
      entryPrice: number;
      duration: number;
    } | null;

    if (state) {
      const newPosition: Position = {
        id: Date.now().toString(),
        symbol: state.symbol.replace('/', ''),
        type: state.direction,
        lotSize: 0.01,
        entryPrice: state.entryPrice,
        currentPrice: state.entryPrice,
        profitLoss: 0,
        openTime: Date.now(),
        investment: state.investment,
      };
      setPositions(prev => [...prev, newPosition]);
    }
  }, [location.state]);

  // Simulate real-time position updates
  useEffect(() => {
    if (positions.length === 0) return;

    const interval = setInterval(() => {
      setPositions(prev => prev.map(pos => {
        // Simulate price movement - forex style
        const volatility = 0.00005;
        const change = (Math.random() - 0.5) * volatility * pos.entryPrice;
        const newPrice = pos.currentPrice + change;
        
        // Calculate P/L based on direction (forex style)
        const priceDiff = pos.type === 'buy' 
          ? newPrice - pos.entryPrice 
          : pos.entryPrice - newPrice;
        
        // Forex lot size calculation (100,000 units per standard lot)
        const profitLoss = priceDiff * pos.lotSize * 100000;

        return {
          ...pos,
          currentPrice: newPrice,
          profitLoss: parseFloat(profitLoss.toFixed(2)),
        };
      }));
    }, 500);

    return () => clearInterval(interval);
  }, [positions.length]);

  // Update equity and margin based on positions
  useEffect(() => {
    const totalPL = positions.reduce((sum, pos) => sum + pos.profitLoss, 0);
    setEquity(currentBalance + totalPL);
    setFreeMargin(currentBalance + totalPL);
  }, [positions, currentBalance]);

  const closePosition = async (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) return;

    // Apply the profit/loss to balance
    if (position.profitLoss !== 0) {
      const operation = position.profitLoss > 0 ? 'add' : 'subtract';
      await updateBalance(accountType, Math.abs(position.profitLoss), operation);
    }

    // Return original investment
    await updateBalance(accountType, position.investment, 'add');

    setPositions(prev => prev.filter(p => p.id !== positionId));
  };

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes('JPY')) return price.toFixed(3);
    if (symbol.includes('XAU') || symbol.includes('BTC') || symbol.includes('GOLD')) return price.toFixed(2);
    return price.toFixed(5);
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0] pb-20">
      {/* Header - Light MetaTrader Style */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/trade')} className="p-1">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <span className="text-sm text-gray-500">Trade</span>
              <p className="text-green-600 font-semibold text-lg">
                {currentBalance.toFixed(2)} USD
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2">
              <svg className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                <line x1="15" y1="3" x2="15" y2="21"/>
              </svg>
            </button>
            <button className="p-2">
              <ArrowUpDown className="h-5 w-5 text-gray-600" />
            </button>
            <button 
              onClick={() => navigate('/trade')}
              className="p-2 bg-blue-600 rounded"
            >
              <Plus className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      <main className="px-4 py-3 space-y-3">
        {/* Account Summary - Exact MetaTrader Style */}
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="flex justify-between items-center py-3 px-4 border-b border-gray-100">
            <span className="text-gray-700 font-medium">Balance:</span>
            <span className="font-bold text-gray-900 text-xl">{currentBalance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-3 px-4 border-b border-gray-100">
            <span className="text-gray-700 font-medium">Equity:</span>
            <span className={cn(
              "font-bold text-xl",
              equity >= currentBalance ? "text-blue-600" : "text-red-600"
            )}>
              {equity.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 px-4">
            <span className="text-gray-700 font-medium">Free margin:</span>
            <span className="font-bold text-gray-900 text-xl">{freeMargin.toFixed(2)}</span>
          </div>
        </div>

        {/* Positions Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-900">Positions</h2>
            <button className="text-gray-400 text-lg">•••</button>
          </div>

          {positions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
              <p>No open positions</p>
              <button 
                onClick={() => navigate('/trade')}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium"
              >
                Open a Trade
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {positions.map((position) => (
                <div 
                  key={position.id}
                  className="bg-white rounded-lg px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{position.symbol},</span>
                        <span className="text-blue-600 font-medium">
                          {position.type} {position.lotSize.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5 font-mono">
                        {formatPrice(position.entryPrice, position.symbol)} → {formatPrice(position.currentPrice, position.symbol)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "font-bold text-xl",
                        position.profitLoss >= 0 ? "text-blue-600" : "text-red-600"
                      )}>
                        {position.profitLoss.toFixed(2)}
                      </span>
                      <button
                        onClick={() => closePosition(position.id)}
                        className="p-1.5 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - MetaTrader Style */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => navigate('/markets')}
            className="flex flex-col items-center gap-0.5 py-1 px-3"
          >
            <span className="text-gray-500 text-lg">↕</span>
            <span className="text-xs text-gray-500">Quotes</span>
          </button>
          <button 
            onClick={() => navigate('/trade')}
            className="flex flex-col items-center gap-0.5 py-1 px-3"
          >
            <span className="text-gray-500 text-lg">00</span>
            <span className="text-xs text-gray-500 font-medium">Charts</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 py-1 px-3">
            <span className="text-blue-600 text-lg">↗</span>
            <span className="text-xs text-blue-600 font-bold">Trade</span>
          </button>
          <button 
            onClick={() => navigate('/history')}
            className="flex flex-col items-center gap-0.5 py-1 px-3"
          >
            <Clock className="h-5 w-5 text-gray-500" />
            <span className="text-xs text-gray-500">History</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 py-1 px-3 relative">
            <div className="relative">
              <span className="text-gray-500 text-lg">💬</span>
              <div className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">3</span>
              </div>
            </div>
            <span className="text-xs text-gray-500">Messages</span>
          </button>
        </div>
      </div>
    </div>
  );
}
