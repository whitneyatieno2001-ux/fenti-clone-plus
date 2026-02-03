import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { BarChart3, Clock, Menu, ArrowUpDown, Plus, Play, Pause, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  { symbol: 'XAUUSDm', name: 'Gold', basePrice: 2780 },
  { symbol: 'EURUSDm', name: 'Euro/USD', basePrice: 1.0862 },
  { symbol: 'GBPUSDm', name: 'GBP/USD', basePrice: 1.2645 },
  { symbol: 'USDJPYm', name: 'USD/JPY', basePrice: 149.85 },
];

export default function ForexBot() {
  const navigate = useNavigate();
  const { currentBalance, accountType, updateBalance, user } = useAccount();
  const { toast } = useToast();
  
  const [isRunning, setIsRunning] = useState(false);
  const [positions, setPositions] = useState<ForexPosition[]>([]);
  const [equity, setEquity] = useState(currentBalance);
  const [freeMargin, setFreeMargin] = useState(currentBalance);
  const [lotSize, setLotSize] = useState('0.01');
  const [targetProfit, setTargetProfit] = useState('0.50');
  
  const tradingInterval = useRef<NodeJS.Timeout | null>(null);
  const positionsRef = useRef(positions);
  
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  // Update equity based on positions
  useEffect(() => {
    const totalPL = positions.reduce((sum, pos) => sum + pos.profitLoss, 0);
    setEquity(currentBalance + totalPL);
    setFreeMargin(currentBalance + totalPL);
  }, [positions, currentBalance]);

  // Real-time position updates
  useEffect(() => {
    if (positions.length === 0) return;

    const interval = setInterval(() => {
      setPositions(prev => prev.map(pos => {
        const pair = FOREX_PAIRS.find(p => p.symbol === pos.symbol);
        if (!pair) return pos;

        // Simulate price movement
        const volatility = pos.symbol.includes('XAU') ? 0.5 : 0.0002;
        const change = (Math.random() - 0.48) * volatility; // Slight bullish bias
        const newPrice = pos.currentPrice + change;
        
        // Calculate P/L
        const priceDiff = pos.type === 'buy' 
          ? newPrice - pos.entryPrice 
          : pos.entryPrice - newPrice;
        
        // Forex lot calculation
        const multiplier = pos.symbol.includes('XAU') ? 100 : 100000;
        const profitLoss = priceDiff * pos.lotSize * multiplier;

        return {
          ...pos,
          currentPrice: newPrice,
          profitLoss: parseFloat(profitLoss.toFixed(2)),
        };
      }));
    }, 300);

    return () => clearInterval(interval);
  }, [positions.length]);

  // Auto-close profitable positions
  useEffect(() => {
    const target = parseFloat(targetProfit) || 0.50;
    
    positions.forEach(async (pos) => {
      if (pos.profitLoss >= target) {
        // Close this position with profit
        await closePosition(pos.id);
        
        toast({
          title: "Profit Taken! 💰",
          description: `${pos.symbol} closed at +$${pos.profitLoss.toFixed(2)}`,
        });
      }
    });
  }, [positions, targetProfit]);

  const openPosition = useCallback(async () => {
    if (currentBalance < 1) return;
    
    const pair = FOREX_PAIRS[Math.floor(Math.random() * FOREX_PAIRS.length)];
    const direction = Math.random() > 0.5 ? 'buy' : 'sell';
    const lot = parseFloat(lotSize) || 0.01;
    
    const basePrice = pair.basePrice + (Math.random() - 0.5) * (pair.symbol.includes('XAU') ? 20 : 0.01);
    
    const newPosition: ForexPosition = {
      id: Date.now().toString(),
      symbol: pair.symbol,
      type: direction,
      lotSize: lot,
      entryPrice: basePrice,
      currentPrice: basePrice,
      profitLoss: 0,
      openTime: Date.now(),
    };
    
    setPositions(prev => [...prev, newPosition]);
    
    // Log to database
    if (user) {
      try {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'bot_trade',
          amount: 0,
          currency: 'USD',
          status: 'completed',
          description: `Forex EA: Opened ${direction.toUpperCase()} ${pair.symbol} @ ${basePrice.toFixed(pair.symbol.includes('XAU') ? 3 : 5)}`,
          account_type: accountType,
          profit_loss: 0,
        });
      } catch (err) {
        console.error('Error logging position:', err);
      }
    }
  }, [currentBalance, lotSize, user, accountType]);

  const closePosition = async (positionId: string) => {
    const position = positionsRef.current.find(p => p.id === positionId);
    if (!position) return;

    // Apply profit/loss to balance
    if (position.profitLoss !== 0) {
      const operation = position.profitLoss > 0 ? 'add' : 'subtract';
      await updateBalance(accountType, Math.abs(position.profitLoss), operation);
    }

    // Log closed trade
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
    
    // Open initial positions
    openPosition();
    
    // Open new positions periodically
    tradingInterval.current = setInterval(() => {
      if (positionsRef.current.length < 10) {
        openPosition();
      }
    }, 3000 + Math.random() * 2000);
    
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
    if (symbol.includes('XAU')) return price.toFixed(3);
    if (symbol.includes('JPY')) return price.toFixed(3);
    return price.toFixed(5);
  };

  const totalProfit = positions.reduce((sum, pos) => sum + pos.profitLoss, 0);

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-background pb-20">
      {/* Header - MetaTrader Style */}
      <div className="bg-white dark:bg-card border-b border-gray-200 dark:border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/bot-select')} className="p-1">
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
        {/* Account Summary */}
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

        {/* Bot Controls */}
        <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-foreground">Forex EA Settings</h3>
            <Settings className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-muted-foreground">Lot Size</label>
              <Input
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                className="mt-1"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-muted-foreground">Target Profit ($)</label>
              <Input
                value={targetProfit}
                onChange={(e) => setTargetProfit(e.target.value)}
                className="mt-1"
                disabled={isRunning}
              />
            </div>
          </div>

          <Button
            onClick={isRunning ? stopBot : startBot}
            className={cn(
              "w-full",
              isRunning 
                ? "bg-red-500 hover:bg-red-600" 
                : "bg-green-500 hover:bg-green-600"
            )}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop EA
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start EA
              </>
            )}
          </Button>

          {isRunning && (
            <div className="text-center">
              <span className={cn(
                "text-lg font-bold",
                totalProfit >= 0 ? "text-blue-600" : "text-red-600"
              )}>
                Session P/L: {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} USD
              </span>
            </div>
          )}
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
              <p className="text-sm mt-1">Start the EA to begin trading</p>
            </div>
          ) : (
            <div className="space-y-2">
              {positions.map((position) => (
                <div 
                  key={position.id}
                  className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-foreground">{position.symbol}</span>
                        <span className="text-blue-600 text-sm">
                          {position.type} {position.lotSize.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-muted-foreground font-mono">
                        {formatPrice(position.entryPrice, position.symbol)} → {formatPrice(position.currentPrice, position.symbol)}
                      </div>
                    </div>
                    <span className={cn(
                      "font-bold text-lg",
                      position.profitLoss >= 0 ? "text-blue-600" : "text-red-600"
                    )}>
                      {position.profitLoss.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
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
            <span className="text-xs">Charts</span>
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
