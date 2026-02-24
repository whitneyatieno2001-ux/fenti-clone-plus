import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowUp, ArrowDown, Shield, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { getCoinIcon } from '@/data/coinIcons';
import { executeBotTrade, type BotStrategy, type TradeResult } from '@/lib/tradingStrategies';
import { supabase } from '@/integrations/supabase/client';

interface TradeLog {
  id: string;
  time: Date;
  direction: 'BUY' | 'SELL';
  pair: string;
  amount: string;
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

  const botName = state?.botName || 'BTC Master Bot';
  const symbol = state?.symbol || 'BTCUSDT';
  const strategy = (state?.strategy || 'trend') as BotStrategy;
  const investmentAmount = state?.investmentAmount || '10';
  const coinSymbol = symbol.replace('USDT', '');
  const displayPair = `${coinSymbol}/USD`;

  const [isRunning, setIsRunning] = useState(false);
  const [totalPL, setTotalPL] = useState(0);
  const [tradesCount, setTradesCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [drawdownPercent, setDrawdownPercent] = useState(0);
  const [activeTrades, setActiveTrades] = useState(0);
  const [lastEntryPrice, setLastEntryPrice] = useState(0);
  const [lastExitPrice, setLastExitPrice] = useState(0);

  // Signal gauge values
  const [buySignal, setBuySignal] = useState(62);
  const [sellSignal, setSellSignal] = useState(38);
  const [aiConfidence, setAiConfidence] = useState(78);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const balanceRef = useRef(currentBalance);
  const isRunningRef = useRef(false);
  const initialBalanceRef = useRef(currentBalance);
  const totalPLRef = useRef(0);

  const basePrice = symbol === 'BTCUSDT' ? 65872 : symbol === 'ETHUSDT' ? 3400 : symbol === 'SOLUSDT' ? 180 : symbol === 'BNBUSDT' ? 580 : 100;

  useEffect(() => { balanceRef.current = currentBalance; }, [currentBalance]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => {
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, []);

  // Update signals periodically
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const buy = 45 + Math.random() * 30;
      setBuySignal(Math.round(buy));
      setSellSignal(Math.round(100 - buy));
      setAiConfidence(Math.round(55 + Math.random() * 35));
    }, 4000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const winRate = tradesCount > 0 ? ((winsCount / tradesCount) * 100).toFixed(1) : '0.0';
  const capitalAllocation = Math.round((parseFloat(investmentAmount) / Math.max(currentBalance, 1)) * 100);

  const executeTrade = useCallback(async () => {
    const stake = parseFloat(investmentAmount) || 10;
    if (balanceRef.current < stake) {
      setIsRunning(false);
      toast({ title: 'Insufficient Balance', description: 'Bot stopped due to low balance', variant: 'destructive' });
      return;
    }

    // Auto pause if drawdown > 25%
    if (drawdownPercent > 25) {
      setIsRunning(false);
      toast({ title: 'Drawdown Limit', description: 'Bot paused: drawdown exceeds 25%', variant: 'destructive' });
      return;
    }

    const result: TradeResult = executeBotTrade(strategy, stake, basePrice);
    
    if (result.netProfit === 0) {
      // No trade executed (e.g., grid breakout or no arb opportunity)
      return;
    }

    if (user && accountType !== 'binance') {
      const operation = result.netProfit > 0 ? 'add' : 'subtract';
      const ok = await updateBalance(accountType, Math.abs(result.netProfit), operation);
      if (!ok) {
        setIsRunning(false);
        toast({ title: 'Balance update failed', variant: 'destructive' });
        return;
      }

      try {
        await supabase.from('transactions').insert({
          user_id: user.id, type: 'bot_trade', amount: Math.abs(result.netProfit),
          currency: 'USD', status: 'completed',
          description: `${botName} - ${result.isWin ? 'WIN' : 'LOSS'}: ${result.netProfit >= 0 ? '+' : ''}$${result.netProfit.toFixed(2)} on ${displayPair}`,
          account_type: accountType, profit_loss: result.netProfit,
        });
      } catch (err) { console.error(err); }
    }

    const btcAmount = (stake / basePrice).toFixed(4);
    const log: TradeLog = {
      id: Date.now().toString(),
      time: new Date(),
      direction: result.direction,
      pair: displayPair,
      amount: `${btcAmount} ${coinSymbol}`,
      profit: result.netProfit,
    };

    setTradeLogs(prev => [log, ...prev].slice(0, 50));
    const newPL = totalPLRef.current + result.netProfit;
    totalPLRef.current = newPL;
    setTotalPL(newPL);
    setTradesCount(prev => prev + 1);
    if (result.isWin) setWinsCount(prev => prev + 1);
    setLastEntryPrice(result.entryPrice);
    setLastExitPrice(result.exitPrice);
    setActiveTrades(Math.min(2, Math.floor(Math.random() * 3)));

    // Calculate drawdown
    if (newPL < 0) {
      setDrawdownPercent(Math.abs(newPL / initialBalanceRef.current) * 100);
    } else {
      setDrawdownPercent(0);
    }
  }, [investmentAmount, accountType, user, updateBalance, toast, botName, displayPair, strategy, basePrice, coinSymbol, drawdownPercent]);

  const scheduleNextTrade = useCallback(() => {
    const delay = 2500 + Math.random() * 3000;
    intervalRef.current = setTimeout(async () => {
      if (!isRunningRef.current) return;
      await executeTrade();
      if (isRunningRef.current) scheduleNextTrade();
    }, delay);
  }, [executeTrade]);

  const toggleBot = () => {
    if (!isRunning) {
      const stake = parseFloat(investmentAmount) || 10;
      if (currentBalance < stake) {
        toast({ title: 'Insufficient Balance', variant: 'destructive' });
        return;
      }
      initialBalanceRef.current = currentBalance;
      setIsRunning(true);
      executeTrade();
      scheduleNextTrade();
      toast({ title: 'Bot Activated', description: `${botName} is now trading ${displayPair}` });
    } else {
      if (intervalRef.current) { clearTimeout(intervalRef.current); intervalRef.current = null; }
      setIsRunning(false);
      toast({ title: 'Bot Stopped' });
    }
  };

  const riskLevel = drawdownPercent > 15 ? 'HIGH' : drawdownPercent > 8 ? 'MEDIUM' : 'LOW';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/bot')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img src={getCoinIcon(coinSymbol)} alt="" className="w-7 h-7 rounded-full" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{botName}</span>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded font-semibold",
                    isRunning ? "bg-success/20 text-success" : "bg-muted text-muted-foreground")}>
                    {isRunning ? '● ACTIVE' : 'IDLE'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{displayPair}</span>
              </div>
            </div>
          </div>
          <div className="text-right border border-primary/30 rounded-lg px-3 py-1.5 bg-primary/5">
            <p className="text-[10px] text-muted-foreground">Balance:</p>
            <p className="text-base font-bold text-primary">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Signal Strength + Mini Chart */}
        <div className="grid grid-cols-2 gap-3">
          {/* Signal Gauge */}
          <div className="rounded-xl bg-card border border-border/50 p-4">
            <div className="relative w-full aspect-square max-w-[160px] mx-auto">
              <svg viewBox="0 0 120 80" className="w-full">
                {/* Gauge arc background */}
                <path d="M 10 70 A 50 50 0 0 1 110 70" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" strokeLinecap="round" />
                {/* Gauge arc colored segments */}
                <path d="M 10 70 A 50 50 0 0 1 40 25" fill="none" stroke="hsl(var(--destructive))" strokeWidth="8" strokeLinecap="round" />
                <path d="M 40 25 A 50 50 0 0 1 60 20" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" />
                <path d="M 60 20 A 50 50 0 0 1 80 25" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" />
                <path d="M 80 25 A 50 50 0 0 1 110 70" fill="none" stroke="hsl(var(--success))" strokeWidth="8" strokeLinecap="round" />
                {/* Needle */}
                <line 
                  x1="60" y1="70" 
                  x2={60 + 40 * Math.cos(Math.PI - (buySignal / 100) * Math.PI)} 
                  y2={70 - 40 * Math.sin(Math.PI - (buySignal / 100) * Math.PI)} 
                  stroke="hsl(var(--success))" strokeWidth="2" strokeLinecap="round" 
                  className="transition-all duration-500"
                />
                <circle cx="60" cy="70" r="4" fill="hsl(var(--foreground))" />
              </svg>
              <div className="absolute bottom-0 left-0 right-0 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Signal Strength</p>
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <div className="text-center">
                <p className="text-lg font-bold text-success">{buySignal}%</p>
                <p className="text-[10px] text-success">BUY</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-destructive">{sellSignal}%</p>
                <p className="text-[10px] text-destructive">SELL</p>
              </div>
            </div>
          </div>

          {/* AI Confidence + Price */}
          <div className="space-y-3">
            {/* Mini candlestick visual */}
            <div className="rounded-xl bg-card border border-border/50 p-3 h-[120px] flex items-end gap-[3px]">
              {Array.from({ length: 20 }).map((_, i) => {
                const h = 20 + Math.random() * 60;
                const isGreen = Math.random() > 0.4;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end">
                    <div className={cn("w-[2px]", isGreen ? "bg-success/60" : "bg-destructive/60")} style={{ height: `${h * 0.3}px` }} />
                    <div className={cn("w-full rounded-[1px]", isGreen ? "bg-success" : "bg-destructive")} style={{ height: `${h * 0.5}px` }} />
                    <div className={cn("w-[2px]", isGreen ? "bg-success/60" : "bg-destructive/60")} style={{ height: `${h * 0.2}px` }} />
                  </div>
                );
              })}
            </div>

            {/* AI Confidence Score */}
            <div className="rounded-xl bg-card border border-border/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-success text-xs">✓</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">AI Confidence Score</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full transition-all duration-700" style={{ width: `${aiConfidence}%` }} />
                </div>
                <span className="text-xl font-bold text-foreground">{aiConfidence}<span className="text-sm text-muted-foreground">/100</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance / Risk / Trade Activity Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Performance */}
          <div className="rounded-xl bg-card border border-border/50 p-3">
            <div className="flex items-center gap-1 mb-2">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-foreground uppercase">Performance</span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Total Profit</p>
              <p className={cn("text-base font-bold", totalPL >= 0 ? "text-success" : "text-destructive")}>
                ${Math.abs(totalPL).toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground">Win Rate</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-foreground">{winRate}%</span>
                {totalPL < 0 && <span className="text-[10px] text-destructive">-{drawdownPercent.toFixed(1)}%</span>}
              </div>
            </div>
          </div>

          {/* Risk */}
          <div className="rounded-xl bg-card border border-border/50 p-3">
            <div className="flex items-center gap-1 mb-2">
              <Shield className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-foreground uppercase">Risk</span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Risk Level</p>
              <p className={cn("text-sm font-bold", riskLevel === 'LOW' ? "text-success" : riskLevel === 'MEDIUM' ? "text-primary" : "text-destructive")}>{riskLevel}</p>
              <div className="h-1 bg-secondary rounded-full overflow-hidden my-1">
                <div className={cn("h-full rounded-full", riskLevel === 'LOW' ? "bg-success" : riskLevel === 'MEDIUM' ? "bg-primary" : "bg-destructive")}
                  style={{ width: `${Math.min(capitalAllocation * 2, 100)}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">{capitalAllocation}% Capital</p>
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>${parseFloat(investmentAmount).toFixed(2)}</span>
                <span>${currentBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Trade Activity */}
          <div className="rounded-xl bg-card border border-border/50 p-3">
            <div className="flex items-center gap-1 mb-2">
              <Activity className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-foreground uppercase">Activity</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Active Trades</span>
                <span className="font-bold text-foreground">{activeTrades}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Entry Price</span>
                <span className="font-bold text-foreground">${lastEntryPrice > 0 ? lastEntryPrice.toLocaleString() : '—'}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Exit Price</span>
                <span className="font-bold text-foreground">${lastExitPrice > 0 ? lastExitPrice.toLocaleString() : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activate / Emergency Stop Buttons */}
        <div className="flex gap-3">
          <Button onClick={toggleBot}
            className={cn("flex-1 h-12 font-bold text-base tracking-wide border-2",
              isRunning
                ? "bg-card hover:bg-card border-primary text-primary"
                : "bg-primary hover:bg-primary/90 border-primary text-primary-foreground")}>
            {isRunning ? '[ TRADING... ]' : '[ ACTIVATE BOT ]'}
          </Button>
          {isRunning && (
            <Button onClick={toggleBot} variant="outline"
              className="h-12 px-4 border-destructive/50 text-destructive hover:bg-destructive/10 font-semibold">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Emergency Stop
            </Button>
          )}
        </div>

        {/* Trade Log Table */}
        {tradeLogs.length > 0 && (
          <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-border/30 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              <span>Order</span>
              <span>Pair</span>
              <span>Amount</span>
              <span className="text-right">Profit</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-border/20">
              {tradeLogs.map(log => (
                <div key={log.id} className="grid grid-cols-4 gap-2 px-4 py-2.5 items-center text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {log.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {log.direction === 'BUY' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </div>
                  <span className="text-foreground">
                    <span className={cn("font-semibold", log.direction === 'BUY' ? "text-success" : "text-destructive")}>
                      {log.direction}
                    </span>
                    <span className="text-muted-foreground"> | </span>
                    {log.pair}
                  </span>
                  <span className="text-foreground text-xs">{log.amount}</span>
                  <span className={cn("text-right font-bold", log.profit >= 0 ? "text-success" : "text-destructive")}>
                    {log.profit >= 0 ? '+' : '-'}${Math.abs(log.profit).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer bar */}
        <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} PM</span>
          {isRunning && (
            <Button size="sm" variant="outline" onClick={toggleBot}
              className="text-xs border-destructive/40 text-destructive hover:bg-destructive/10">
              Emergency <span className="text-destructive font-bold ml-1">Stop</span>
            </Button>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
