import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, Play, Pause, TrendingUp, TrendingDown, 
  DollarSign, Settings2, ScrollText
} from 'lucide-react';
import { 
  type BotStrategy, 
  executeBotTrade, 
  getBotStrategyInfo
} from '@/lib/tradingStrategies';
import { CandlestickChart } from '@/components/CandlestickChart';
import { supabase } from '@/integrations/supabase/client';
import { useTradingSound } from '@/hooks/useTradingSound';

interface TradeLog {
  id: string;
  time: Date;
  asset: string;
  direction: 'BUY' | 'SELL';
  stake: number;
  result: 'WIN' | 'LOSS';
  profit: number;
}

interface BotConfig {
  id: string;
  name: string;
  strategy: BotStrategy;
  winRate: number;
  price: number;
  crypto: string;
}

const botConfigs: Record<string, BotConfig> = {
  '1': { id: '1', name: 'Arbitrage Hunter', strategy: 'arbitrage', winRate: 60, price: 100, crypto: 'BTC' },
  '2': { id: '2', name: 'Speed Scalper', strategy: 'scalping', winRate: 80, price: 150, crypto: 'ETH' },
  '3': { id: '3', name: 'Signal Master', strategy: 'signal', winRate: 40, price: 0, crypto: 'SOL' }, // FREE bot
};

export default function BotTrade() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentBalance, accountType, updateBalance, user } = useAccount();
  
  const [isRunning, setIsRunning] = useState(false);
  const [stakeAmount, setStakeAmount] = useState(10);
  const [martingaleEnabled, setMartingaleEnabled] = useState(false);
  const [martingaleMultiplier, setMartingaleMultiplier] = useState(2);
  const [currentStake, setCurrentStake] = useState(10);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [tradesCount, setTradesCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);
  
  // Cumulative P/L for the session (sum of individual trade profits)
  const [totalProfit, setTotalProfit] = useState(0);
  
  const { playTradeSound } = useTradingSound();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const balanceRef = useRef(currentBalance);
  const currentStakeRef = useRef(currentStake);

  const botConfig = botId ? botConfigs[botId] : null;
  
  useEffect(() => {
    balanceRef.current = currentBalance;
  }, [currentBalance]);
  
  useEffect(() => {
    currentStakeRef.current = currentStake;
  }, [currentStake]);
  
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const logTradeToDb = async (log: TradeLog) => {
    if (!user) return;
    
    try {
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'bot_trade',
        amount: Math.abs(log.profit),
        currency: 'USD',
        status: 'completed',
        description: `${botConfig?.name} - ${log.result}: ${log.profit >= 0 ? '+' : ''}$${log.profit.toFixed(2)} on ${log.asset}/USDT`,
        account_type: accountType,
        profit_loss: log.profit, // Store signed P/L value
      });
    } catch (err) {
      console.error('Error logging trade:', err);
    }
  };

  const executeTrade = useCallback(async () => {
    if (!botConfig) return;
    
    const bal = balanceRef.current;
    const stake = currentStakeRef.current;
    
    if (bal < stake) {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      toast({
        title: "Insufficient Balance",
        description: "Bot stopped due to low balance",
        variant: "destructive",
      });
      return;
    }
    
    // Execute trade with target win rate
    const basePrice = botConfig.crypto === 'BTC' ? 98000 : botConfig.crypto === 'ETH' ? 3400 : 180;
    
    // Adjust win probability based on bot's target win rate
    const randomValue = Math.random() * 100;
    const isWin = randomValue < botConfig.winRate;
    
    const result = executeBotTrade(botConfig.strategy, stake, basePrice);
    
    // Ensure minimum profit/loss of $0.10 to avoid $0.00 trades
    const minProfit = 0.10 + Math.random() * 0.50; // $0.10 to $0.60 minimum
    const baseProfit = Math.abs(result.netProfit) < minProfit ? minProfit : Math.abs(result.netProfit);
    
    // Override result based on target win rate
    const actualProfit = isWin 
      ? baseProfit 
      : -baseProfit;
    
    // Update balance (must succeed for P/L to be considered applied)
    if (user) {
      const operation = actualProfit > 0 ? 'add' : 'subtract';
      const ok = await updateBalance(accountType, Math.abs(actualProfit), operation);
      if (!ok) {
        // Stop if balance update failed so UI P/L never diverges from balance
        setIsRunning(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        toast({
          title: "Balance update failed",
          description: "Trade was not applied to your balance. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Update cumulative P/L
    setTotalProfit(prev => prev + actualProfit);

    // Create log entry
    const log: TradeLog = {
      id: Date.now().toString(),
      time: new Date(),
      asset: `${botConfig.crypto}/USDT`,
      direction: Math.random() > 0.5 ? 'BUY' : 'SELL',
      stake: stake,
      result: isWin ? 'WIN' : 'LOSS',
      profit: actualProfit,
    };
    
    setTradeLogs(prev => [log, ...prev].slice(0, 100));
    setTradesCount(prev => prev + 1);
    if (isWin) setWinsCount(prev => prev + 1);

    // Play trade sound
    playTradeSound(isWin);

    await logTradeToDb(log);
    
    // Handle Martingale
    if (martingaleEnabled) {
      if (isWin) {
        // Reset to base stake after win
        setCurrentStake(stakeAmount);
      } else {
        // Multiply stake after loss
        const newStake = stake * martingaleMultiplier;
        if (newStake <= balanceRef.current) {
          setCurrentStake(newStake);
        } else {
          setCurrentStake(stakeAmount); // Reset if can't afford
        }
      }
    }
  }, [botConfig, martingaleEnabled, martingaleMultiplier, stakeAmount, user, accountType, updateBalance, toast]);

  const toggleBot = () => {
    if (!isRunning) {
      if (currentBalance < stakeAmount) {
        toast({
          title: "Insufficient Balance",
          description: `You need at least $${stakeAmount} to start`,
          variant: "destructive",
        });
        return;
      }

      // Reset session stats (P/L keeps accumulating across start/stop)
      setTradeLogs([]);
      setTradesCount(0);
      setWinsCount(0);

      setCurrentStake(stakeAmount);

      // Start trading
      executeTrade();
      intervalRef.current = setInterval(() => {
        executeTrade();
      }, 3000 + Math.random() * 2000);

      setIsRunning(true);
      toast({
        title: "Bot Started",
        description: `${botConfig?.name} is now trading`,
      });
    } else {
      // Stop trading
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRunning(false);
      toast({
        title: "Bot Stopped",
        description: `${botConfig?.name} has been stopped`,
      });
    }
  };

  if (!botConfig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Bot not found</p>
      </div>
    );
  }

  const strategyInfo = getBotStrategyInfo(botConfig.strategy);

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/bot')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{strategyInfo.icon}</span>
            <div>
              <h1 className="font-bold text-foreground">{botConfig.name}</h1>
              <p className="text-sm text-muted-foreground">{botConfig.crypto}/USDT • {botConfig.winRate}% target</p>
            </div>
          </div>
          <div className="ml-auto px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
            {botConfig.price > 0 ? `$${botConfig.price}` : 'FREE'}
          </div>
        </div>
      </header>
      
      <main className="px-4 py-4 space-y-4">
        {/* P/L Display */}
        <div className={cn(
          "p-4 rounded-xl border-2",
          totalProfit >= 0 
            ? "bg-success/10 border-success/30" 
            : "bg-destructive/10 border-destructive/30"
        )}>
          <p className="text-sm text-muted-foreground">Total P/L</p>
          <p className={cn(
            "text-3xl font-bold",
            totalProfit >= 0 ? "text-success" : "text-destructive"
          )}>
            {totalProfit >= 0 && <span className="text-lg font-normal opacity-70">+</span>}
            {totalProfit < 0 && <span className="text-lg font-normal opacity-70">-</span>}
            {Math.abs(totalProfit).toFixed(2)} USD
          </p>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-muted-foreground">{tradesCount} trades</span>
            <span className="text-success">{winsCount} wins</span>
            <span className="text-destructive">{tradesCount - winsCount} losses</span>
            {tradesCount > 0 && (
              <span className="text-foreground font-medium">
                {((winsCount / tradesCount) * 100).toFixed(0)}% rate
              </span>
            )}
          </div>
        </div>

        {/* Live Chart */}
        <CandlestickChart 
          symbol={botConfig.crypto} 
          currentPrice={botConfig.crypto === 'BTC' ? 98000 : botConfig.crypto === 'ETH' ? 3400 : 180} 
        />

        {/* Bot Configuration */}
        <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">Configuration</span>
          </div>
          
          {/* Stake Amount */}
          <div className="flex items-center gap-3">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Base Stake:</span>
            <Input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(Number(e.target.value) || 1)}
              className="w-24 h-8 text-sm bg-input"
              disabled={isRunning}
              min={1}
            />
            <span className="text-sm text-muted-foreground">USD</span>
          </div>
          
          {/* Current Stake (if Martingale active) */}
          {martingaleEnabled && (
            <div className="flex items-center gap-3 p-2 rounded bg-secondary/50">
              <span className="text-sm text-muted-foreground">Current Stake:</span>
              <span className="font-bold text-foreground">${currentStake.toFixed(2)}</span>
            </div>
          )}
          
          {/* Martingale Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Martingale</p>
              <p className="text-xs text-muted-foreground">Multiply stake after loss, reset after win</p>
            </div>
            <Switch
              checked={martingaleEnabled}
              onCheckedChange={setMartingaleEnabled}
              disabled={isRunning}
            />
          </div>
          
          {/* Martingale Multiplier */}
          {martingaleEnabled && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Multiplier:</span>
              <Input
                type="number"
                value={martingaleMultiplier}
                onChange={(e) => setMartingaleMultiplier(Number(e.target.value) || 1.5)}
                className="w-20 h-8 text-sm bg-input"
                disabled={isRunning}
                min={1.1}
                step={0.1}
              />
              <span className="text-sm text-muted-foreground">x</span>
            </div>
          )}
        </div>

        {/* Start/Stop Button */}
        <Button
          onClick={toggleBot}
          className={cn(
            "w-full h-14 font-bold text-lg",
            isRunning 
              ? "bg-destructive hover:bg-destructive/90" 
              : "bg-success hover:bg-success/90"
          )}
        >
          {isRunning ? (
            <>
              <Pause className="h-5 w-5 mr-2" />
              Stop Trading
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Start Trading
            </>
          )}
        </Button>

        {/* Bot Logs Section */}
        <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-secondary/30">
            <ScrollText className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">Bot Logs</span>
            <span className="ml-auto text-xs text-muted-foreground">{tradeLogs.length} entries</span>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {tradeLogs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No trades yet. Start the bot to see logs.
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {tradeLogs.map((log) => (
                  <div key={log.id} className="p-3 flex items-center gap-3 text-sm">
                    <span className="text-xs text-muted-foreground w-16">
                      {log.time.toLocaleTimeString()}
                    </span>
                    <span className="text-foreground font-medium w-20">{log.asset}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-bold w-12 text-center",
                      log.direction === 'BUY' ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                    )}>
                      {log.direction}
                    </span>
                    <span className="text-muted-foreground w-16">${log.stake.toFixed(2)}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-bold w-12 text-center",
                      log.result === 'WIN' ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                    )}>
                      {log.result}
                    </span>
                    <span className={cn(
                      "ml-auto font-semibold",
                      log.profit >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {log.profit >= 0 && <span className="text-xs font-normal opacity-60">+</span>}
                      {log.profit < 0 && <span className="text-xs font-normal opacity-60">-</span>}
                      {Math.abs(log.profit).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
