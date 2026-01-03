import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { 
  Bot, Play, Pause, TrendingUp, TrendingDown, 
  DollarSign, Activity, Zap, BarChart3, ArrowUpDown, Settings2,
  CheckCircle2, XCircle, ScrollText
} from 'lucide-react';
import { 
  type BotStrategy, 
  executeBotTrade, 
  getBotStrategyInfo,
  analyzeSignals,
  analyzeScalpingConditions,
  findArbitrageOpportunity
} from '@/lib/tradingStrategies';
import { supabase } from '@/integrations/supabase/client';
import { useTradingSound } from '@/hooks/useTradingSound';

interface TradeLogEntry {
  id: string;
  time: Date;
  botName: string;
  asset: string;
  direction: 'BUY' | 'SELL';
  stake: number;
  result: 'WIN' | 'LOSS';
  profit: number;
}

interface TradingBot {
  id: string;
  name: string;
  strategy: BotStrategy;
  description: string;
  profit: number;
  status: 'active' | 'paused';
  risk: 'low' | 'medium' | 'high';
  crypto: string;
  stakeAmount: number;
  tradesCount: number;
  winCount: number;
  lossCount: number;
  currentAction: 'BUY' | 'SELL' | 'HOLD' | 'SCANNING';
  lastTradeResult?: { profit: number; isWin: boolean };
  winRate: number;
  price: number;
}

const defaultBots: TradingBot[] = [
  {
    id: '1',
    name: 'Arbitrage Hunter',
    strategy: 'arbitrage',
    description: '60% win rate bot. Detects price differences across markets. Lower risk, frequent small profits.',
    profit: 0,
    status: 'paused',
    risk: 'low',
    crypto: 'BTC',
    stakeAmount: 10,
    tradesCount: 0,
    winCount: 0,
    lossCount: 0,
    currentAction: 'SCANNING',
    winRate: 60,
    price: 100,
  },
  {
    id: '2',
    name: 'Speed Scalper',
    strategy: 'scalping',
    description: '80% win rate bot. High-frequency trades on small price movements. Fast execution.',
    profit: 0,
    status: 'paused',
    risk: 'high',
    crypto: 'ETH',
    stakeAmount: 15,
    tradesCount: 0,
    winCount: 0,
    lossCount: 0,
    currentAction: 'SCANNING',
    winRate: 80,
    price: 150,
  },
  {
    id: '3',
    name: 'Signal Master',
    strategy: 'signal',
    description: '40% win rate bot. Uses RSI, MA crossovers, and pattern recognition.',
    profit: 0,
    status: 'paused',
    risk: 'medium',
    crypto: 'SOL',
    stakeAmount: 20,
    tradesCount: 0,
    winCount: 0,
    lossCount: 0,
    currentAction: 'HOLD',
    winRate: 40,
    price: 0,
  },
];

export default function BotPage() {
  const navigate = useNavigate();
  const [bots, setBots] = useState<TradingBot[]>(defaultBots);
  const [tradeLogs, setTradeLogs] = useState<TradeLogEntry[]>([]);
  const { toast } = useToast();
  const { currentBalance, accountType, updateBalance, user } = useAccount();
  const tradingIntervals = useRef<Record<string, NodeJS.Timeout>>({});
  const scanningIntervals = useRef<Record<string, NodeJS.Timeout>>({});
  const { playTradeSound } = useTradingSound();
  
  // Track starting balance for accurate P/L calculation
  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  
  // Keep refs for latest state to avoid stale closures
  const botsRef = useRef(bots);
  const balanceRef = useRef(currentBalance);
  
  // Set starting balance when page loads
  useEffect(() => {
    if (startingBalance === null && currentBalance > 0) {
      setStartingBalance(currentBalance);
    }
  }, [currentBalance, startingBalance]);
  
  useEffect(() => {
    botsRef.current = bots;
  }, [bots]);
  
  useEffect(() => {
    balanceRef.current = currentBalance;
  }, [currentBalance]);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(tradingIntervals.current).forEach(interval => clearInterval(interval));
      Object.values(scanningIntervals.current).forEach(interval => clearInterval(interval));
    };
  }, []);

  // Log trade to database
  const logTrade = useCallback(async (bot: TradingBot, result: { profit: number; isWin: boolean }) => {
    if (!user) return;
    
    try {
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'bot_trade',
        amount: Math.abs(result.profit),
        currency: 'USD',
        status: 'completed',
        description: `${bot.name} (${bot.strategy}) - ${result.isWin ? 'WIN' : 'LOSS'}: ${result.profit >= 0 ? '+' : ''}$${result.profit.toFixed(2)} on ${bot.crypto}/USDT`,
        account_type: accountType,
        profit_loss: result.profit, // Store signed P/L value
      });
    } catch (err) {
      console.error('Error logging trade:', err);
    }
  }, [user, accountType]);

  const executeTrade = useCallback(async (botId: string) => {
    const bot = botsRef.current.find(b => b.id === botId);
    if (!bot || bot.status !== 'active') return;

    const currentBal = balanceRef.current;
    
    // Check balance
    if (currentBal < bot.stakeAmount) {
      setBots(prev => prev.map(b => 
        b.id === botId ? { ...b, status: 'paused', currentAction: 'HOLD' } : b
      ));
      if (tradingIntervals.current[botId]) {
        clearInterval(tradingIntervals.current[botId]);
        delete tradingIntervals.current[botId];
      }
      if (scanningIntervals.current[botId]) {
        clearInterval(scanningIntervals.current[botId]);
        delete scanningIntervals.current[botId];
      }
      toast({
        title: "Insufficient Balance",
        description: `${bot.name} has been paused due to insufficient funds`,
        variant: "destructive",
      });
      return;
    }

    // Execute trade based on strategy
    const basePrice = bot.crypto === 'BTC' ? 98000 : bot.crypto === 'ETH' ? 3400 : 180;
    const result = executeBotTrade(bot.strategy, bot.stakeAmount, basePrice);

    // Skip if signal bot decided to hold
    if (bot.strategy === 'signal' && result.netProfit === 0) {
      return;
    }

    // Update balance
    if (user && result.netProfit !== 0) {
      const operation = result.netProfit > 0 ? 'add' : 'subtract';
      await updateBalance(accountType, Math.abs(result.netProfit), operation);
      await logTrade(bot, { profit: result.netProfit, isWin: result.isWin });

      // Play trade sound
      playTradeSound(result.isWin);

      // Add to trade logs
      const logEntry: TradeLogEntry = {
        id: Date.now().toString(),
        time: new Date(),
        botName: bot.name,
        asset: `${bot.crypto}/USDT`,
        direction: result.isWin ? 'BUY' : 'SELL',
        stake: bot.stakeAmount,
        result: result.isWin ? 'WIN' : 'LOSS',
        profit: result.netProfit,
      };
      setTradeLogs(prev => [logEntry, ...prev].slice(0, 50));
    }

    // Update bot stats
    setBots(prev => prev.map(b => {
      if (b.id === botId) {
        return {
          ...b,
          profit: b.profit + result.netProfit,
          tradesCount: b.tradesCount + 1,
          winCount: result.isWin ? b.winCount + 1 : b.winCount,
          lossCount: !result.isWin ? b.lossCount + 1 : b.lossCount,
          currentAction: result.isWin ? 'BUY' : 'SELL',
          lastTradeResult: { profit: result.netProfit, isWin: result.isWin },
        };
      }
      return b;
    }));

    // Show trade notification (less frequent to avoid spam)
    if (Math.random() < 0.3) {
      const notifTitle = result.isWin ? "Trade Won! 🎉" : "Trade Lost 📉";
      const notifDesc = `${bot.name}: ${result.netProfit >= 0 ? '+' : ''}$${result.netProfit.toFixed(2)}`;
      
      toast({
        title: notifTitle,
        description: notifDesc,
        variant: result.isWin ? "default" : "destructive",
      });
    }
  }, [user, accountType, updateBalance, logTrade, toast]);

  const updateBotAction = useCallback((botId: string) => {
    const bot = botsRef.current.find(b => b.id === botId);
    if (!bot || bot.status !== 'active') return;

    let newAction: 'BUY' | 'SELL' | 'HOLD' | 'SCANNING' = 'SCANNING';

    switch (bot.strategy) {
      case 'arbitrage':
        const arb = findArbitrageOpportunity(98000);
        newAction = arb.profitable ? 'BUY' : 'SCANNING';
        break;
      case 'scalping':
        const scalp = analyzeScalpingConditions();
        newAction = Math.abs(scalp.momentum) > 0.3 ? (scalp.momentum > 0 ? 'BUY' : 'SELL') : 'SCANNING';
        break;
      case 'signal':
        const signals = analyzeSignals();
        newAction = signals.overallSignal.action;
        break;
    }

    setBots(prev => prev.map(b => 
      b.id === botId ? { ...b, currentAction: newAction } : b
    ));
  }, []);

  const toggleBot = useCallback((id: string) => {
    const bot = botsRef.current.find(b => b.id === id);
    if (!bot) return;

    if (bot.status === 'paused') {
      // Starting the bot
      if (balanceRef.current < bot.stakeAmount) {
        toast({
          title: "Insufficient Balance",
          description: `You need at least $${bot.stakeAmount} to start this bot`,
          variant: "destructive",
        });
        return;
      }

      if (balanceRef.current === 0) {
        toast({
          title: "Zero Balance",
          description: "Please deposit funds before starting a bot",
          variant: "destructive",
        });
        return;
      }

      // Trade frequency based on strategy
      const tradeIntervals = {
        arbitrage: { min: 3000, max: 6000 },   // Fast: 3-6 seconds
        scalping: { min: 2000, max: 4000 },    // Very fast: 2-4 seconds
        signal: { min: 5000, max: 10000 },     // Slower: 5-10 seconds
      };

      const { min, max } = tradeIntervals[bot.strategy];
      
      // Execute first trade immediately
      executeTrade(id);
      
      // Start continuous trading interval
      const tradeInterval = setInterval(() => {
        executeTrade(id);
      }, min + Math.random() * (max - min));

      tradingIntervals.current[id] = tradeInterval;

      // Start scanning interval (updates action display)
      const scanInterval = setInterval(() => {
        updateBotAction(id);
      }, 1000);

      scanningIntervals.current[id] = scanInterval;

      toast({
        title: "Bot Activated 🤖",
        description: `${bot.name} is now trading with $${bot.stakeAmount} stake`,
      });
    } else {
      // Stopping the bot
      if (tradingIntervals.current[id]) {
        clearInterval(tradingIntervals.current[id]);
        delete tradingIntervals.current[id];
      }
      if (scanningIntervals.current[id]) {
        clearInterval(scanningIntervals.current[id]);
        delete scanningIntervals.current[id];
      }
      toast({
        title: "Bot Paused",
        description: `${bot.name} has been stopped`,
      });
    }

    setBots(prev => prev.map(b => {
      if (b.id === id) {
        return { 
          ...b, 
          status: b.status === 'active' ? 'paused' : 'active',
          currentAction: b.status === 'active' ? 'HOLD' : 'SCANNING'
        };
      }
      return b;
    }));
  }, [executeTrade, updateBotAction, toast]);

  const updateStakeAmount = (id: string, amount: string) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) return;

    setBots(prev => prev.map(b => {
      if (b.id === id) {
        return { ...b, stakeAmount: numAmount };
      }
      return b;
    }));
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-success bg-success/20';
      case 'medium': return 'text-warning bg-warning/20';
      case 'high': return 'text-destructive bg-destructive/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'text-success bg-success/20';
      case 'SELL': return 'text-destructive bg-destructive/20';
      case 'HOLD': return 'text-warning bg-warning/20';
      default: return 'text-primary bg-primary/20';
    }
  };

  const getStrategyIcon = (strategy: BotStrategy) => {
    switch (strategy) {
      case 'arbitrage': return <ArrowUpDown className="h-4 w-4" />;
      case 'scalping': return <Zap className="h-4 w-4" />;
      case 'signal': return <BarChart3 className="h-4 w-4" />;
    }
  };

  // Calculate P/L from actual balance change for accuracy
  const sessionProfit = bots.reduce((sum, bot) => sum + bot.profit, 0);
  const actualProfit = startingBalance !== null ? currentBalance - startingBalance : sessionProfit;
  const totalProfit = actualProfit;
  const activeBots = bots.filter(bot => bot.status === 'active').length;
  const totalTrades = bots.reduce((sum, bot) => sum + bot.tradesCount, 0);
  const totalWins = bots.reduce((sum, bot) => sum + bot.winCount, 0);
  const totalLosses = bots.reduce((sum, bot) => sum + bot.lossCount, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-5">
        {/* PROMINENT TOTAL P/L BANNER */}
        <div className={cn(
          "p-5 rounded-2xl border-2 transition-all",
          totalProfit >= 0 
            ? "bg-gradient-to-br from-success/20 via-success/10 to-transparent border-success/50" 
            : "bg-gradient-to-br from-destructive/20 via-destructive/10 to-transparent border-destructive/50"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Profit/Loss</p>
              <p className={cn(
                "text-4xl font-bold tracking-tight",
                totalProfit >= 0 ? "text-success" : "text-destructive"
              )}>
                {totalProfit >= 0 && <span className="text-xl font-normal opacity-60">+</span>}
                {totalProfit < 0 && <span className="text-xl font-normal opacity-60">-</span>}
                {Math.abs(totalProfit).toFixed(2)}
                <span className="text-lg ml-1">USD</span>
              </p>
            </div>
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              totalProfit >= 0 ? "bg-success/20" : "bg-destructive/20"
            )}>
              {totalProfit >= 0 ? (
                <TrendingUp className="h-8 w-8 text-success" />
              ) : (
                <TrendingDown className="h-8 w-8 text-destructive" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-muted-foreground">
              {totalTrades} trades
            </span>
            <span className="text-success">
              {totalWins} wins
            </span>
            <span className="text-destructive">
              {totalLosses} losses
            </span>
            {totalTrades > 0 && (
              <span className="text-foreground font-medium">
                {((totalWins / totalTrades) * 100).toFixed(0)}% win rate
              </span>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="p-4 rounded-xl bg-card border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Balance ({accountType})</p>
              <p className="text-2xl font-bold text-foreground">
                ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-primary">{activeBots} Active</span>
            </div>
          </div>
        </div>

        {/* Bot List */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground">Trading Bots</h3>
          
          {bots.map((bot, index) => (
            <div 
              key={bot.id}
              className={cn(
                "p-4 rounded-xl bg-card border transition-all duration-300",
                bot.status === 'active' 
                  ? "border-primary/50 shadow-lg shadow-primary/10" 
                  : "border-border/50"
              )}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    bot.status === 'active' ? "bg-primary/20" : "bg-muted"
                  )}>
                    <span className="text-2xl">{getBotStrategyInfo(bot.strategy).icon}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{bot.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStrategyIcon(bot.strategy)}
                      <span className="text-xs text-muted-foreground capitalize">{bot.strategy}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{bot.crypto}/USDT</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    bot.status === 'active' 
                      ? "bg-success/20 text-success" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {bot.status === 'active' ? 'Running' : 'Stopped'}
                  </div>
                  {bot.status === 'active' && (
                    <div className={cn(
                      "px-2 py-0.5 rounded text-xs font-bold animate-pulse",
                      getActionColor(bot.currentAction)
                    )}>
                      {bot.currentAction}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{bot.description}</p>

              {/* Last Trade Result */}
              {bot.lastTradeResult && (
                <div className={cn(
                  "mb-3 p-2 rounded-lg text-sm font-medium flex items-center gap-2",
                  bot.lastTradeResult.isWin ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                )}>
                  {bot.lastTradeResult.isWin ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  Last: {bot.lastTradeResult.profit >= 0 && <span className="text-xs font-normal opacity-60">+</span>}
                  {bot.lastTradeResult.profit < 0 && <span className="text-xs font-normal opacity-60">-</span>}
                  ${Math.abs(bot.lastTradeResult.profit).toFixed(2)}
                </div>
              )}

              {/* Stake Amount Control */}
              <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-secondary/50">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Stake:</span>
                <Input
                  type="number"
                  value={bot.stakeAmount}
                  onChange={(e) => updateStakeAmount(bot.id, e.target.value)}
                  className="w-20 h-8 text-sm bg-input border-border"
                  disabled={bot.status === 'active'}
                  min="1"
                />
                <span className="text-sm text-muted-foreground">USD</span>
              </div>

              {/* Stats Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    getRiskColor(bot.risk)
                  )}>
                    {bot.risk} risk
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {bot.tradesCount} trades
                  </span>
                  <span className="text-xs text-success">
                    {bot.winCount}W
                  </span>
                  <span className="text-xs text-destructive">
                    {bot.lossCount}L
                  </span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 font-semibold",
                  bot.profit >= 0 ? "text-success" : "text-destructive"
                )}>
                  {bot.profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {bot.profit >= 0 && <span className="text-xs font-normal opacity-60">+</span>}
                  {bot.profit < 0 && <span className="text-xs font-normal opacity-60">-</span>}
                  ${Math.abs(bot.profit).toFixed(2)}
                </div>
              </div>

              <Button
                onClick={() => toggleBot(bot.id)}
                disabled={bot.status === 'paused' && currentBalance < bot.stakeAmount}
                className={cn(
                  "w-full",
                  bot.status === 'active'
                    ? "bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/30"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
                variant={bot.status === 'active' ? "outline" : "default"}
              >
                {bot.status === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Trading
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Trading
                  </>
                )}
              </Button>
              
              {/* Configure Button */}
              <Button
                onClick={() => navigate(`/bot/${bot.id}`)}
                variant="outline"
                className="w-full mt-2"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Configure Bot
              </Button>
              
              {bot.status === 'paused' && currentBalance < bot.stakeAmount && (
                <p className="text-xs text-destructive text-center mt-2">
                  Insufficient balance (need ${bot.stakeAmount})
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Professional Trade Logs Section */}
        <div className="mt-6 rounded-2xl bg-card border border-border/50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-secondary/50 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <ScrollText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Trade History</h3>
                <p className="text-xs text-muted-foreground">{tradeLogs.length} recent trades</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="font-semibold text-success">{totalWins}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="font-semibold text-destructive">{totalLosses}</span>
              </div>
            </div>
          </div>
          
          <div className="max-h-[320px] overflow-y-auto">
            {tradeLogs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium">No trades yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Start a bot to see live trades</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {tradeLogs.map((log, index) => (
                  <div 
                    key={log.id} 
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
                      index === 0 && "animate-fade-in bg-muted/20"
                    )}
                  >
                    {/* Result Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      log.result === 'WIN' ? "bg-success/20" : "bg-destructive/20"
                    )}>
                      {log.result === 'WIN' ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    
                    {/* Trade Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm truncate">{log.botName}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                          log.direction === 'BUY' ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                        )}>
                          {log.direction}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{log.asset}</span>
                        <span className="text-xs text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground">${log.stake.toFixed(2)} stake</span>
                        <span className="text-xs text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground">
                          {log.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Result & Profit */}
                    <div className="text-right shrink-0">
                      <div className={cn(
                        "text-sm font-bold",
                        log.profit >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {log.profit >= 0 ? '+' : ''}{log.profit.toFixed(2)}
                        <span className="text-xs font-normal ml-1">USD</span>
                      </div>
                      <div className={cn(
                        "text-[10px] font-bold uppercase tracking-wide mt-0.5",
                        log.result === 'WIN' ? "text-success" : "text-destructive"
                      )}>
                        {log.result}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
