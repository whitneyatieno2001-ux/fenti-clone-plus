import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { getCoinIcon } from '@/data/coinIcons';
import { executeBotTrade, type BotStrategy, type TradeResult } from '@/lib/tradingStrategies';
import { getTradeOutcome } from '@/lib/tradeOutcome';
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
  const displayPair = `${coinSymbol}/USDT`;

  const [isRunning, setIsRunning] = useState(false);
  const [totalPL, setTotalPL] = useState(0);
  const [tradesCount, setTradesCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [activeTrades, setActiveTrades] = useState(0);
  const [marginUsed, setMarginUsed] = useState(0);

  // Signal gauge values
  const [buySignal, setBuySignal] = useState(62);
  const [sellSignal, setSellSignal] = useState(38);
  const [marketPressure, setMarketPressure] = useState(68);
  const [volatility, setVolatility] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [momentum, setMomentum] = useState<'Weak' | 'Moderate' | 'Strong'>('Strong');
  const [trendDirection, setTrendDirection] = useState<'Uptrend' | 'Downtrend' | 'Sideways'>('Uptrend');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const balanceRef = useRef(currentBalance);
  const isRunningRef = useRef(false);
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
      setMarketPressure(Math.round(40 + Math.random() * 40));
      const volOptions: ('Low' | 'Medium' | 'High')[] = ['Low', 'Medium', 'High'];
      setVolatility(volOptions[Math.floor(Math.random() * 3)]);
      const momOptions: ('Weak' | 'Moderate' | 'Strong')[] = ['Weak', 'Moderate', 'Strong'];
      setMomentum(momOptions[Math.floor(Math.random() * 3)]);
      const trendOptions: ('Uptrend' | 'Downtrend' | 'Sideways')[] = ['Uptrend', 'Downtrend', 'Sideways'];
      setTrendDirection(trendOptions[Math.floor(Math.random() * 3)]);
    }, 4000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const winRate = tradesCount > 0 ? ((winsCount / tradesCount) * 100).toFixed(1) : '0.0';
  const roi = totalPL !== 0 && currentBalance > 0 ? ((totalPL / currentBalance) * 100).toFixed(2) : '0.00';

  const executeTrade = useCallback(async () => {
    const stake = parseFloat(investmentAmount) || 10;
    if (balanceRef.current < stake) {
      setIsRunning(false);
      toast({ title: 'Insufficient Balance', description: 'Bot stopped due to low balance', variant: 'destructive' });
      return;
    }

    const outcome = getTradeOutcome({ accountType, userEmail, botType: 'custom' });
    const result: TradeResult = executeBotTrade(strategy, stake, basePrice);

    if (result.netProfit === 0) return;

    // Override result based on outcome logic
    const absProfit = Math.abs(result.netProfit);
    const finalProfit = outcome === 'win' ? absProfit : -absProfit;

    if (user && accountType !== 'binance') {
      const operation = finalProfit > 0 ? 'add' : 'subtract';
      const ok = await updateBalance(accountType, Math.abs(finalProfit), operation);
      if (!ok) {
        setIsRunning(false);
        toast({ title: 'Balance update failed', variant: 'destructive' });
        return;
      }

      try {
        await supabase.from('transactions').insert({
          user_id: user.id, type: 'bot_trade', amount: Math.abs(finalProfit),
          currency: 'USD', status: 'completed',
          description: `${botName} - ${outcome === 'win' ? 'WIN' : 'LOSS'}: ${finalProfit >= 0 ? '+' : ''}$${finalProfit.toFixed(2)} on ${displayPair}`,
          account_type: accountType, profit_loss: finalProfit,
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
      profit: finalProfit,
    };

    setTradeLogs(prev => [log, ...prev].slice(0, 50));
    const newPL = totalPLRef.current + finalProfit;
    totalPLRef.current = newPL;
    setTotalPL(newPL);
    setTradesCount(prev => prev + 1);
    if (outcome === 'win') setWinsCount(prev => prev + 1);
    setActiveTrades(Math.min(2, Math.floor(Math.random() * 3)));
    setMarginUsed(Math.round(Math.random() * 30));
  }, [investmentAmount, accountType, user, updateBalance, toast, botName, displayPair, strategy, basePrice, coinSymbol, userEmail]);

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
      if (stake < 1) {
        toast({ title: 'Minimum Stake Required', description: 'Minimum stake is $1', variant: 'destructive' });
        return;
      }
      if (currentBalance < stake) {
        toast({ title: 'Insufficient Balance', variant: 'destructive' });
        return;
      }
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

  const riskLevelNum = activeTrades;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/bot')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <img src={getCoinIcon(coinSymbol)} alt="" className="w-6 h-6 rounded-full" />
                <span className="font-bold text-lg text-foreground">{displayPair}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{botName}</span>
                <span className={cn("text-[10px] flex items-center gap-1",
                  isRunning ? "text-success" : "text-muted-foreground")}>
                  ● {isRunning ? 'Running' : 'Idle'}
                </span>
              </div>
            </div>
          </div>
          <div className="border border-border/50 rounded-lg px-3 py-1.5 bg-card">
            <p className="text-[10px] text-muted-foreground">Balance:</p>
            <p className="text-base font-bold text-primary">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Signal Strength Card */}
        <div className="rounded-xl bg-card border border-border/50 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Signal Strength</h3>

          {/* BUY bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">BUY</span>
              <span className="text-sm font-bold text-success">{buySignal}%</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${buySignal}%`,
                  background: 'hsl(var(--success))'
                }}
              />
            </div>
            <div className="flex justify-end">
              <span className="text-[10px] text-muted-foreground tracking-wider">BULL</span>
            </div>
          </div>

          {/* SELL bar */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">SELL</span>
              <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${sellSignal}%`,
                    background: 'hsl(var(--destructive))'
                  }}
                />
              </div>
              <span className="text-sm font-bold text-destructive">{sellSignal}%</span>
            </div>
          </div>

          {/* Market indicators grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="text-xs text-muted-foreground">Market Pressure:</span>
              </div>
              <p className={cn("text-lg font-bold", marketPressure > 50 ? "text-success" : "text-destructive")}>
                {marketPressure}% {marketPressure > 50 ? 'Bullish' : 'Bearish'}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Volatility:</span>
              </div>
              <p className="text-lg font-bold text-foreground">{volatility}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Momentum:</span>
              </div>
              <p className={cn("text-lg font-bold", momentum === 'Strong' ? "text-success" : momentum === 'Weak' ? "text-destructive" : "text-primary")}>{momentum}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="text-xs text-muted-foreground">Trend Direction:</span>
              </div>
              <p className={cn("text-lg font-bold",
                trendDirection === 'Uptrend' ? "text-success" : trendDirection === 'Downtrend' ? "text-destructive" : "text-primary"
              )}>{trendDirection}</p>
            </div>
          </div>
        </div>

        {/* Performance + Risk & Activity Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card border border-border/50 p-4 space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Performance</p>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Profit</span>
              <span className={cn("font-bold", totalPL >= 0 ? "text-success" : "text-destructive")}>${Math.abs(totalPL).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">ROI %</span>
              <span className="font-bold text-foreground">{roi}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Win Rate</span>
              <span className="font-bold text-foreground">{winRate}%</span>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border/50 p-4 space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Risk & Activity</p>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Risk Level</span>
              <span className="font-bold text-foreground">{riskLevelNum}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Active Trades</span>
              <span className="font-bold text-foreground">{activeTrades}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Margin Used</span>
              <span className="font-bold text-foreground">{marginUsed}%</span>
            </div>
          </div>
        </div>

        {/* Bot Status Toggle */}
        <div className="rounded-xl bg-card border border-border/50 p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Bot Status:</span>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-bold", isRunning ? "text-success" : "text-muted-foreground")}>
              {isRunning ? 'ON' : 'OFF'}
            </span>
            <Switch checked={isRunning} onCheckedChange={toggleBot} />
          </div>
        </div>

        {/* Trade Log Table */}
        {tradeLogs.length > 0 && (
          <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-4 py-2 border-b border-border/30">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Trade History</span>
            </div>
            <div className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-border/30 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              <span>Order</span>
              <span>Pair</span>
              <span>Amount</span>
              <span className="text-right">Profit</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-border/20">
              {tradeLogs.map(log => (
                <div key={log.id} className={cn("grid grid-cols-4 gap-2 px-4 py-2.5 items-center text-sm", log.profit >= 0 ? "text-success" : "text-destructive")}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">
                      {log.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {log.direction === 'BUY' ? (
                      <ArrowUp className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span>
                    <span className="font-semibold">
                      {log.direction}
                    </span>
                    <span> | </span>
                    {log.pair}
                  </span>
                  <span className="text-xs">{log.amount}</span>
                  <span className="text-right font-bold">
                    {log.profit >= 0 ? '+' : '-'}${Math.abs(log.profit).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
