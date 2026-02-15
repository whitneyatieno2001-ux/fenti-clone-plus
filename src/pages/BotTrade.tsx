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
  DollarSign, Settings2, ScrollText, Lock, Unlock
} from 'lucide-react';
import { 
  type BotStrategy, 
  executeBotTrade, 
  getBotStrategyInfo
} from '@/lib/tradingStrategies';
import { CandlestickChart } from '@/components/CandlestickChart';
import { supabase } from '@/integrations/supabase/client';
import { BotPurchaseModal } from '@/components/BotPurchaseModal';

// TradeLog, BotConfig interfaces and botConfigs
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
  '3': { id: '3', name: 'Signal Master', strategy: 'signal', winRate: 40, price: 0, crypto: 'SOL' },
  '4': { id: '4', name: 'Trend Follower', strategy: 'trend', winRate: 45, price: 0, crypto: 'BNB' },
  '5': { id: '5', name: 'Grid Trader', strategy: 'grid', winRate: 50, price: 0, crypto: 'XRP' },
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
  const [totalProfit, setTotalProfit] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const balanceRef = useRef(currentBalance);
  const currentStakeRef = useRef(currentStake);

  const botConfig = botId ? botConfigs[botId] : null;
  
  useEffect(() => {
    const checkPurchase = async () => {
      if (!user || !botConfig) return;
      if (botConfig.price === 0) { setIsUnlocked(true); return; }
      try {
        const { data, error } = await supabase
          .from('bot_purchases').select('id').eq('user_id', user.id).eq('bot_id', botConfig.id).maybeSingle();
        if (error) throw error;
        setIsUnlocked(!!data);
      } catch (err) {
        console.error('Error checking bot purchase:', err);
        setIsUnlocked(false);
      }
    };
    checkPurchase();
  }, [user, botConfig]);
  
  useEffect(() => { balanceRef.current = currentBalance; }, [currentBalance]);
  useEffect(() => { currentStakeRef.current = currentStake; }, [currentStake]);
  
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const logTradeToDb = async (log: TradeLog) => {
    if (!user) return;
    try {
      await supabase.from('transactions').insert({
        user_id: user.id, type: 'bot_trade', amount: Math.abs(log.profit),
        currency: 'USD', status: 'completed',
        description: `${botConfig?.name} - ${log.result}: ${log.profit >= 0 ? '+' : ''}$${log.profit.toFixed(2)} on ${log.asset}/USDT`,
        account_type: accountType, profit_loss: log.profit,
      });
    } catch (err) { console.error('Error logging trade:', err); }
  };

  const executeTrade = useCallback(async () => {
    if (!botConfig) return;
    const bal = balanceRef.current;
    const stake = currentStakeRef.current;
    
    if (bal < stake) {
      setIsRunning(false);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      toast({ title: "Insufficient Balance", description: "Bot stopped due to low balance", variant: "destructive" });
      return;
    }
    
    const basePrice = botConfig.crypto === 'BTC' ? 98000 : botConfig.crypto === 'ETH' ? 3400 : 180;
    const randomValue = Math.random() * 100;
    const isWin = randomValue < botConfig.winRate;
    const result = executeBotTrade(botConfig.strategy, stake, basePrice);
    const minProfit = 0.10 + Math.random() * 0.50;
    const baseProfit = Math.abs(result.netProfit) < minProfit ? minProfit : Math.abs(result.netProfit);
    const actualProfit = isWin ? baseProfit : -baseProfit;
    
    if (user) {
      const operation = actualProfit > 0 ? 'add' : 'subtract';
      const ok = await updateBalance(accountType, Math.abs(actualProfit), operation);
      if (!ok) {
        setIsRunning(false);
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        toast({ title: "Balance update failed", variant: "destructive" });
        return;
      }
    }
    
    setTotalProfit(prev => prev + actualProfit);

    const log: TradeLog = {
      id: Date.now().toString(), time: new Date(), asset: `${botConfig.crypto}/USDT`,
      direction: Math.random() > 0.5 ? 'BUY' : 'SELL', stake,
      result: isWin ? 'WIN' : 'LOSS', profit: actualProfit,
    };
    
    setTradeLogs(prev => [log, ...prev].slice(0, 100));
    setTradesCount(prev => prev + 1);
    if (isWin) setWinsCount(prev => prev + 1);

    await logTradeToDb(log);
    
    if (martingaleEnabled) {
      if (isWin) { setCurrentStake(stakeAmount); }
      else {
        const newStake = stake * martingaleMultiplier;
        setCurrentStake(newStake <= balanceRef.current ? newStake : stakeAmount);
      }
    }
  }, [botConfig, martingaleEnabled, martingaleMultiplier, stakeAmount, user, accountType, updateBalance, toast]);

  const toggleBot = () => {
    if (!isRunning) {
      if (currentBalance < stakeAmount) {
        toast({ title: "Insufficient Balance", description: `You need at least $${stakeAmount}`, variant: "destructive" });
        return;
      }
      setTradeLogs([]); setTradesCount(0); setWinsCount(0);
      setCurrentStake(stakeAmount);
      executeTrade();
      intervalRef.current = setInterval(executeTrade, 3000 + Math.random() * 2000);
      setIsRunning(true);
      toast({ title: "Bot Started", description: `${botConfig?.name} is now trading` });
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      setIsRunning(false);
      toast({ title: "Bot Stopped" });
    }
  };
  
  if (!botConfig) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-foreground">Bot not found</p></div>;
  }
  
  if (isUnlocked === null) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  const strategyInfo = getBotStrategyInfo(botConfig.strategy);

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/bot')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{strategyInfo.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-foreground">{botConfig.name}</h1>
                {botConfig.price > 0 && (
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold",
                    isUnlocked ? "bg-success/20 text-success" : "bg-warning/20 text-warning")}>
                    {isUnlocked ? "Owned" : "Locked"}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{botConfig.crypto}/USDT • {botConfig.winRate}% target</p>
            </div>
          </div>
          <div className="ml-auto px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
            {botConfig.price > 0 ? `$${botConfig.price}` : 'FREE'}
          </div>
        </div>
      </header>
      
      <main className="px-4 py-4 space-y-4">
        {!isUnlocked && (
          <div className="p-6 rounded-2xl bg-card border-2 border-warning/50 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-warning/20 flex items-center justify-center">
              <Lock className="h-10 w-10 text-warning" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Bot Locked</h2>
            <p className="text-muted-foreground mb-4">Pay ${botConfig.price} to unlock.</p>
            <Button onClick={() => setPurchaseDialogOpen(true)} disabled={currentBalance < botConfig.price}
              className="w-full bg-warning hover:bg-warning/90 text-warning-foreground" size="lg">
              <Unlock className="h-5 w-5 mr-2" />Unlock for ${botConfig.price}
            </Button>
          </div>
        )}
        
        {isUnlocked && (
          <>
            <div className={cn("p-4 rounded-xl border-2", totalProfit >= 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30")}>
              <p className="text-sm text-muted-foreground">Total P/L</p>
              <p className={cn("text-3xl font-bold", totalProfit >= 0 ? "text-success" : "text-destructive")}>
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} USD
              </p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-muted-foreground">{tradesCount} trades</span>
                <span className="text-success">{winsCount} wins</span>
                <span className="text-destructive">{tradesCount - winsCount} losses</span>
              </div>
            </div>

            <CandlestickChart symbol={botConfig.crypto} currentPrice={botConfig.crypto === 'BTC' ? 98000 : botConfig.crypto === 'ETH' ? 3400 : 180} />

            <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-foreground">Configuration</span>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Base Stake:</span>
                <Input type="text" inputMode="decimal" value={stakeAmount === 0 ? '' : stakeAmount}
                  onChange={(e) => { const val = e.target.value; if (val === '') setStakeAmount(0); else if (/^\d*\.?\d*$/.test(val)) setStakeAmount(Number(val)); }}
                  className="w-24 h-8 text-sm bg-input" disabled={isRunning} />
                <span className="text-sm text-muted-foreground">USD</span>
              </div>
              
              {martingaleEnabled && (
                <div className="flex items-center gap-3 p-2 rounded bg-secondary/50">
                  <span className="text-sm text-muted-foreground">Current Stake:</span>
                  <span className="font-bold text-foreground">${currentStake.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Martingale</p>
                  <p className="text-xs text-muted-foreground">Multiply stake after loss</p>
                </div>
                <Switch checked={martingaleEnabled} onCheckedChange={setMartingaleEnabled} disabled={isRunning} />
              </div>
              
              {martingaleEnabled && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Multiplier:</span>
                  <Input type="text" inputMode="decimal" value={martingaleMultiplier === 0 ? '' : martingaleMultiplier}
                    onChange={(e) => { const val = e.target.value; if (val === '') setMartingaleMultiplier(0); else if (/^\d*\.?\d*$/.test(val)) setMartingaleMultiplier(Number(val)); }}
                    className="w-20 h-8 text-sm bg-input" disabled={isRunning} />
                  <span className="text-sm text-muted-foreground">x</span>
                </div>
              )}
            </div>

            <Button onClick={toggleBot} className={cn("w-full h-12 font-semibold text-base", isRunning ? "bg-destructive hover:bg-destructive/90" : "bg-success hover:bg-success/90")} size="lg">
              {isRunning ? <><Pause className="h-5 w-5 mr-2" />Stop Trading</> : <><Play className="h-5 w-5 mr-2" />Start Trading</>}
            </Button>

            {tradeLogs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Trade Logs</span>
                </div>
                <div className="rounded-xl bg-card border border-border/50 overflow-hidden max-h-60 overflow-y-auto">
                  {tradeLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 last:border-0 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-bold", log.direction === 'BUY' ? "text-success" : "text-destructive")}>{log.direction}</span>
                        <span className="text-foreground">{log.asset}</span>
                        <span className="text-xs text-muted-foreground">${log.stake}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-semibold", log.result === 'WIN' ? "text-success" : "text-destructive")}>
                          {log.profit >= 0 ? '+' : ''}${log.profit.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">{log.time.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <BotPurchaseModal
        isOpen={purchaseDialogOpen}
        onClose={() => setPurchaseDialogOpen(false)}
        bot={botConfig}
        onPurchaseSuccess={() => setIsUnlocked(true)}
      />
    </div>
  );
}
