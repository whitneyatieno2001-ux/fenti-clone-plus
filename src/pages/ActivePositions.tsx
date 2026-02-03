import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { BarChart3, Clock, Menu, ArrowUpDown, Plus, X } from 'lucide-react';

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
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-background pb-20">
      {/* Custom Header - MetaTrader Style */}
      <div className="bg-white dark:bg-card border-b border-gray-200 dark:border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/trade')} className="p-1">
              <Menu className="h-5 w-5 text-gray-700 dark:text-foreground" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-muted-foreground">Trade</span>
              </div>
              <span className={cn(
                "text-lg font-bold",
                accountType === 'demo' ? "text-blue-600" : "text-green-600"
              )}>
                {currentBalance.toFixed(2)} USD
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg bg-gray-100 dark:bg-secondary">
              <BarChart3 className="h-5 w-5 text-gray-700 dark:text-foreground" />
            </button>
            <button className="p-2 rounded-lg bg-gray-100 dark:bg-secondary">
              <ArrowUpDown className="h-5 w-5 text-gray-700 dark:text-foreground" />
            </button>
            <button 
              onClick={() => navigate('/trade')}
              className="p-2 rounded-lg bg-blue-600"
            >
              <Plus className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      <main className="px-4 py-4 space-y-4">
        {/* Account Summary - MetaTrader Style */}
        <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border">
          <div className="flex justify-between items-center py-3 px-4 border-b border-gray-100 dark:border-border">
            <span className="text-gray-600 dark:text-muted-foreground">Balance:</span>
            <span className="font-bold text-gray-900 dark:text-foreground text-lg">{currentBalance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-3 px-4 border-b border-gray-100 dark:border-border">
            <span className="text-gray-600 dark:text-muted-foreground">Equity:</span>
            <span className={cn(
              "font-bold text-lg",
              equity >= currentBalance ? "text-green-600" : "text-red-600"
            )}>
              {equity.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 px-4">
            <span className="text-gray-600 dark:text-muted-foreground font-semibold">Free margin:</span>
            <span className="font-bold text-gray-900 dark:text-foreground text-lg">{freeMargin.toFixed(2)}</span>
          </div>
        </div>

        {/* Positions Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 dark:text-foreground">Positions</h2>
            <button className="text-gray-400">•••</button>
          </div>

          {positions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-muted-foreground">
              <p>No open positions</p>
              <button 
                onClick={() => navigate('/trade')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
              >
                Open a Trade
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {positions.map((position) => (
                <div 
                  key={position.id}
                  className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-foreground">{position.symbol}</span>
                        <span className="text-blue-600 font-medium">
                          {position.type} {position.lotSize.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-muted-foreground mt-1 font-mono">
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
                        className="p-2 rounded-full bg-red-100 dark:bg-destructive/20 hover:bg-red-200 transition-colors"
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

      {/* Bottom Trade Navigation - MetaTrader Style */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-card border-t border-gray-200 dark:border-border px-4 py-3">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => navigate('/markets')}
            className="flex flex-col items-center gap-1 text-gray-500"
          >
            <span className="text-lg">↕</span>
            <span className="text-xs">Quotes</span>
          </button>
          <button 
            onClick={() => navigate('/trade')}
            className="flex flex-col items-center gap-1 text-gray-500"
          >
            <span className="text-lg">📊</span>
            <span className="text-xs font-medium">Charts</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-blue-600">
            <span className="text-lg">📈</span>
            <span className="text-xs font-bold">Trade</span>
          </button>
          <button 
            onClick={() => navigate('/history')}
            className="flex flex-col items-center gap-1 text-gray-500"
          >
            <Clock className="h-5 w-5" />
            <span className="text-xs">History</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-500 relative">
            <div className="relative">
              <span className="text-lg">💬</span>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">3</span>
              </div>
            </div>
            <span className="text-xs">Messages</span>
          </button>
        </div>
      </div>
    </div>
  );
}
