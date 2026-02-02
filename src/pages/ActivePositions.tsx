import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, BarChart3, Clock, Menu, ArrowUpDown, Plus } from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  lotSize: number;
  entryPrice: number;
  currentPrice: number;
  profitLoss: number;
  openTime: number;
}

export default function ActivePositions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentBalance, accountType } = useAccount();
  
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
        symbol: state.symbol,
        type: state.direction,
        lotSize: 0.01,
        entryPrice: state.entryPrice,
        currentPrice: state.entryPrice,
        profitLoss: 0,
        openTime: Date.now(),
      };
      setPositions([newPosition]);
    }
  }, [location.state]);

  // Simulate real-time position updates
  useEffect(() => {
    if (positions.length === 0) return;

    const interval = setInterval(() => {
      setPositions(prev => prev.map(pos => {
        // Simulate price movement
        const volatility = 0.0001;
        const change = (Math.random() - 0.5) * volatility * pos.entryPrice;
        const newPrice = pos.currentPrice + change;
        
        // Calculate P/L based on direction
        const priceDiff = pos.type === 'buy' 
          ? newPrice - pos.entryPrice 
          : pos.entryPrice - newPrice;
        const profitLoss = priceDiff * pos.lotSize * 100000;

        return {
          ...pos,
          currentPrice: newPrice,
          profitLoss,
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

  const closePosition = (positionId: string) => {
    setPositions(prev => prev.filter(p => p.id !== positionId));
  };

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes('JPY')) return price.toFixed(3);
    if (symbol.includes('XAU') || symbol.includes('BTC')) return price.toFixed(2);
    return price.toFixed(5);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Custom Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/trade')} className="p-1">
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Trade</span>
              </div>
              <span className={cn(
                "text-lg font-bold",
                accountType === 'demo' ? "text-primary" : "text-success"
              )}>
                {currentBalance.toFixed(2)} USD
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg bg-secondary">
              <BarChart3 className="h-5 w-5 text-foreground" />
            </button>
            <button className="p-2 rounded-lg bg-secondary">
              <ArrowUpDown className="h-5 w-5 text-foreground" />
            </button>
            <button 
              onClick={() => navigate('/trade')}
              className="p-2 rounded-lg bg-primary"
            >
              <Plus className="h-5 w-5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      <main className="px-4 py-4 space-y-4">
        {/* Account Summary */}
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">Balance:</span>
            <span className="font-semibold text-foreground">{currentBalance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">Equity:</span>
            <span className={cn(
              "font-semibold",
              equity >= currentBalance ? "text-success" : "text-destructive"
            )}>
              {equity.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground font-semibold">Free margin:</span>
            <span className="font-semibold text-foreground">{freeMargin.toFixed(2)}</span>
          </div>
        </div>

        {/* Positions Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Positions</h2>
            <button className="text-muted-foreground">...</button>
          </div>

          {positions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No open positions</p>
              <button 
                onClick={() => navigate('/trade')}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
              >
                Open a Trade
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => (
                <div 
                  key={position.id}
                  className="bg-card rounded-xl border border-border p-4"
                  onClick={() => closePosition(position.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{position.symbol}</span>
                        <span className={cn(
                          "text-sm font-medium",
                          position.type === 'buy' ? "text-primary" : "text-destructive"
                        )}>
                          {position.type} {position.lotSize.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatPrice(position.entryPrice, position.symbol)} → {formatPrice(position.currentPrice, position.symbol)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "font-bold text-lg",
                        position.profitLoss >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {position.profitLoss >= 0 ? '+' : ''}{position.profitLoss.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Trade Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => navigate('/markets')}
            className="flex flex-col items-center gap-1 text-muted-foreground"
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Quotes</span>
          </button>
          <button 
            onClick={() => navigate('/trade')}
            className="flex flex-col items-center gap-1 text-muted-foreground"
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Charts</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-primary">
            <ArrowUpDown className="h-5 w-5" />
            <span className="text-xs">Trade</span>
          </button>
          <button 
            onClick={() => navigate('/history')}
            className="flex flex-col items-center gap-1 text-muted-foreground"
          >
            <Clock className="h-5 w-5" />
            <span className="text-xs">History</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground relative">
            <div className="relative">
              <Menu className="h-5 w-5" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white">2</span>
              </div>
            </div>
            <span className="text-xs">Messages</span>
          </button>
        </div>
      </div>
    </div>
  );
}
