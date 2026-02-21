import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Play, Square, Settings2, BarChart3, TrendingUp, Clock } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { getCoinIcon } from '@/data/coinIcons';
import { getTradeOutcome } from '@/lib/tradeOutcome';
import { supabase } from '@/integrations/supabase/client';

interface TradeLog {
  id: string;
  time: Date;
  asset: string;
  direction: 'BUY' | 'SELL';
  stake: number;
  result: 'WIN' | 'LOSS';
  profit: number;
}

interface LocationState {
  botName: string;
  symbol: string;
  strategy: string;
  riskLevel: string;
  investmentAmount: string;
}

export default function DeployedBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { toast } = useToast();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();

  const botName = state?.botName || 'Advanced Auto Trader';
  const symbol = state?.symbol || 'BTCUSDT';
  const investmentAmount = state?.investmentAmount || '10';
  const displayPair = symbol.replace('USDT', '') + ' / USD (OTC)';

  const [isRunning, setIsRunning] = useState(false);
  const [totalPL, setTotalPL] = useState(0);
  const [tradesCount, setTradesCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [activeTab, setActiveTab] = useState<'strategies' | 'settings' | 'analysis'>('strategies');
  const [lastWonAmount, setLastWonAmount] = useState(0);

  // Simulated signals
  const [buySignal, setBuySignal] = useState(50);
  const [sellSignal, setSellSignal] = useState(42);
  const [volatility, setVolatility] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [trend, setTrend] = useState<'Bullish' | 'Bearish' | 'Neutral'>('Neutral');
  const [recommendation, setRecommendation] = useState<'Buy' | 'Sell' | 'Hold'>('Hold');
  const [nextTradeProgress, setNextTradeProgress] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const balanceRef = useRef(currentBalance);
  const isRunningRef = useRef(false);

  useEffect(() => { balanceRef.current = currentBalance; }, [currentBalance]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  // Update signals periodically
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setBuySignal(Math.floor(40 + Math.random() * 25));
      setSellSignal(Math.floor(30 + Math.random() * 25));
      const vols: ('Low' | 'Medium' | 'High')[] = ['Low', 'Medium', 'High'];
      setVolatility(vols[Math.floor(Math.random() * 3)]);
      const trends: ('Bullish' | 'Bearish' | 'Neutral')[] = ['Bullish', 'Bearish', 'Neutral'];
      setTrend(trends[Math.floor(Math.random() * 3)]);
      const recs: ('Buy' | 'Sell' | 'Hold')[] = ['Buy', 'Sell', 'Hold'];
      setRecommendation(recs[Math.floor(Math.random() * 3)]);
    }, 5000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const basePrice = symbol === 'BTCUSDT' ? 98000 : symbol === 'ETHUSDT' ? 3400 : symbol === 'SOLUSDT' ? 180 : symbol === 'BNBUSDT' ? 580 : 100;

  const executeTrade = useCallback(async () => {
    const stake = parseFloat(investmentAmount) || 10;
    if (balanceRef.current < stake) {
      setIsRunning(false);
      toast({ title: 'Insufficient Balance', description: 'Bot stopped due to low balance', variant: 'destructive' });
      return;
    }

    const outcome = getTradeOutcome({ accountType, userEmail });
    const isWin = outcome === 'win';

    // Over 0 payout (Deriv style) - ~10.5% payout
    const payoutPercent = 9.5 + Math.random() * 2;
    const actualProfit = isWin ? stake * (payoutPercent / 100) : -stake;

    if (user && accountType !== 'binance') {
      const operation = actualProfit > 0 ? 'add' : 'subtract';
      const ok = await updateBalance(accountType, Math.abs(actualProfit), operation);
      if (!ok) {
        setIsRunning(false);
        toast({ title: 'Balance update failed', variant: 'destructive' });
        return;
      }

      try {
        await supabase.from('transactions').insert({
          user_id: user.id, type: 'bot_trade', amount: Math.abs(actualProfit),
          currency: 'USD', status: 'completed',
          description: `${botName} - ${isWin ? 'WIN' : 'LOSS'}: ${actualProfit >= 0 ? '+' : ''}$${actualProfit.toFixed(2)} on ${symbol}`,
          account_type: accountType, profit_loss: actualProfit,
        });
      } catch (err) { console.error(err); }
    }

    const log: TradeLog = {
      id: Date.now().toString(), time: new Date(), asset: symbol,
      direction: isWin ? 'BUY' : 'SELL', stake,
      result: isWin ? 'WIN' : 'LOSS', profit: actualProfit,
    };
    setTradeLogs(prev => [log, ...prev].slice(0, 100));
    setTotalPL(prev => prev + actualProfit);
    setTradesCount(prev => prev + 1);
    if (isWin) {
      setWinsCount(prev => prev + 1);
      setLastWonAmount(actualProfit);
    }
  }, [investmentAmount, accountType, userEmail, user, updateBalance, toast, botName, symbol]);

  const scheduleNextTrade = useCallback(() => {
    // Progress bar animation
    setNextTradeProgress(0);
    const duration = 3000 + Math.random() * 2000;
    const step = 50;
    let elapsed = 0;
    progressRef.current = setInterval(() => {
      elapsed += step;
      setNextTradeProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed >= duration) {
        if (progressRef.current) clearInterval(progressRef.current);
      }
    }, step);

    intervalRef.current = setTimeout(async () => {
      if (!isRunningRef.current) return;
      await executeTrade();
      if (isRunningRef.current) {
        scheduleNextTrade();
      }
    }, duration);
  }, [executeTrade]);

  const toggleBot = () => {
    if (!isRunning) {
      const stake = parseFloat(investmentAmount) || 10;
      if (currentBalance < stake) {
        toast({ title: 'Insufficient Balance', variant: 'destructive' });
        return;
      }
      setIsRunning(true);
      executeTrade();
      scheduleNextTrade();
      toast({ title: 'Bot Started', description: `${botName} is now trading` });
    } else {
      if (intervalRef.current) { clearTimeout(intervalRef.current); intervalRef.current = null; }
      if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
      setIsRunning(false);
      setNextTradeProgress(0);
      toast({ title: 'Bot Stopped' });
    }
  };

  const winRate = tradesCount > 0 ? ((winsCount / tradesCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with pair selector */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/bot')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5">
              <img src={getCoinIcon(symbol.replace('USDT', ''))} alt="" className="w-5 h-5 rounded-full" />
              <span className="text-sm font-semibold text-foreground">{displayPair}</span>
            </div>
          </div>
          <button className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" /> Reset P/L
          </button>
        </div>
      </header>

      <main className="space-y-0">
        {/* Bot info bar */}
        <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground text-sm">{botName}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full", isRunning ? "bg-success/20 text-success" : "bg-muted text-muted-foreground")}>
              {isRunning ? 'Active' : 'Idle'}
            </span>
            <span className="text-xs text-muted-foreground">• Bot ID: 1•••</span>
          </div>
          <div className="flex gap-1">
            <button className="w-7 h-7 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
            <button className="w-7 h-7 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tabs: Strategies, Settings, Analysis */}
        <div className="flex border-b border-border/30 px-4">
          {(['strategies', 'settings', 'analysis'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn("px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors",
                activeTab === tab ? "text-foreground border-foreground" : "text-muted-foreground border-transparent")}>
              {tab}
            </button>
          ))}
        </div>

        {/* Signals section */}
        <div className="px-4 py-4 space-y-4">
          {/* Buy/Sell signals */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Buy Signal</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${buySignal}%` }} />
                </div>
                <span className="text-sm font-bold text-foreground">{buySignal}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sell Signal</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-destructive rounded-full transition-all duration-500" style={{ width: `${sellSignal}%` }} />
                </div>
                <span className="text-sm font-bold text-foreground">{sellSignal}%</span>
              </div>
            </div>
          </div>

          {/* Volatility / Trend / Recommendation */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Volatility</p>
              <p className="font-semibold text-foreground">{volatility}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Trend</p>
              <p className="font-semibold text-foreground">{trend}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recommendation</p>
              <p className={cn("font-semibold", recommendation === 'Buy' ? "text-success" : recommendation === 'Sell' ? "text-destructive" : "text-foreground")}>{recommendation}</p>
            </div>
          </div>

          {/* Next Trade progress bar */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Next Trade</p>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-100" 
                style={{ 
                  width: `${nextTradeProgress}%`,
                  background: 'linear-gradient(90deg, hsl(var(--success)), hsl(var(--primary)), hsl(var(--destructive)))'
                }} />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-lg font-bold text-foreground">{winRate}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total P/L</p>
              <p className={cn("text-lg font-bold", totalPL >= 0 ? "text-success" : "text-destructive")}>
                ${totalPL.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Trades</p>
              <p className="text-lg font-bold text-foreground">{tradesCount}</p>
            </div>
          </div>

          {/* Recent Transactions */}
          {tradeLogs.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Recent Transactions</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">↘</span>
                <span className="text-foreground">{displayPair.split(' ')[0]}/USD</span>
                <span className="text-foreground font-medium">${parseFloat(investmentAmount).toFixed(2)}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  ⏱ {tradeLogs[0]?.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          )}

          {/* Start/Stop button */}
          <Button onClick={toggleBot} className={cn("w-full h-12 font-semibold text-base",
            isRunning ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "bg-success hover:bg-success/90 text-success-foreground")}>
            {isRunning ? <><Square className="h-4 w-4 mr-2" />Stop Bot</> : <><Play className="h-4 w-4 mr-2" />Start Bot</>}
          </Button>
        </div>

        {/* Trading History */}
        {tradeLogs.length > 0 && (
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Trading History</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tradeLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", log.result === 'WIN' ? "bg-success" : "bg-destructive")} />
                    <span className="text-sm text-foreground">{displayPair.split(' ')[0]}/USD</span>
                  </div>
                  <span className={cn("text-sm font-semibold", log.profit >= 0 ? "text-success" : "text-destructive")}>
                    {log.profit >= 0 ? '+' : ''}${Math.abs(log.profit).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom win notification */}
        {lastWonAmount > 0 && tradesCount > 0 && (
          <div className="px-4 pb-4">
            <div className="rounded-xl bg-success/10 border border-success/30 p-3 flex items-center gap-2">
              <span className="text-success">✓</span>
              <span className="text-sm font-medium text-foreground">You won ${lastWonAmount.toFixed(2)}!</span>
            </div>
          </div>
        )}

        {/* Bottom tabs: Total P/L, Win Rate, Active Bots */}
        <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/30 flex justify-around py-2 px-4 z-30">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Total P/L</p>
            <p className={cn("text-xs font-bold", totalPL >= 0 ? "text-success" : "text-destructive")}>${totalPL.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Win Rate</p>
            <p className="text-xs font-bold text-foreground">{winRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Active Bots</p>
            <p className="text-xs font-bold text-foreground">{isRunning ? 1 : 0}</p>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}