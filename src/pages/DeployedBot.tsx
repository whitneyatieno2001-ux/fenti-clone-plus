import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Play, Square, TrendingUp, BarChart2, CandlestickChart as CandleIcon } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { getCoinIcon } from '@/data/coinIcons';
import { getTradeOutcome } from '@/lib/tradeOutcome';
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

interface LocationState {
  botName: string;
  symbol: string;
  strategy: string;
  riskLevel: string;
  investmentAmount: string;
}

// Simple mini-chart component
function MiniChart({ data, type }: { data: number[]; type: 'line' | 'candle' }) {
  const w = 320, h = 140;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  if (type === 'candle') {
    const barW = Math.max(4, (w - 20) / data.length - 2);
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36">
        {data.map((val, i) => {
          const open = i > 0 ? data[i - 1] : val * 0.999;
          const close = val;
          const high = Math.max(open, close) + Math.abs(close - open) * 0.3;
          const low = Math.min(open, close) - Math.abs(close - open) * 0.3;
          const isUp = close >= open;
          const x = 10 + i * ((w - 20) / data.length);
          const yOpen = h - 10 - ((open - min) / range) * (h - 20);
          const yClose = h - 10 - ((close - min) / range) * (h - 20);
          const yHigh = h - 10 - ((high - min) / range) * (h - 20);
          const yLow = h - 10 - ((low - min) / range) * (h - 20);
          return (
            <g key={i}>
              <line x1={x + barW / 2} y1={yHigh} x2={x + barW / 2} y2={yLow} stroke={isUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} strokeWidth={1} />
              <rect x={x} y={Math.min(yOpen, yClose)} width={barW} height={Math.max(2, Math.abs(yClose - yOpen))} fill={isUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} rx={1} />
            </g>
          );
        })}
      </svg>
    );
  }

  // Line chart
  const points = data.map((val, i) => {
    const x = 10 + (i / (data.length - 1)) * (w - 20);
    const y = h - 10 - ((val - min) / range) * (h - 20);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `10,${h - 10} ${points} ${w - 10},${h - 10}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#lineGrad)" />
      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
    </svg>
  );
}

export default function DeployedBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { toast } = useToast();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();
  const { playTradeSound } = useTradingSound();

  const botName = state?.botName || 'Custom Bot';
  const symbol = state?.symbol || 'BTCUSDT';
  const investmentAmount = state?.investmentAmount || '10';

  const [isRunning, setIsRunning] = useState(false);
  const [totalPL, setTotalPL] = useState(0);
  const [tradesCount, setTradesCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [chartType, setChartType] = useState<'line' | 'candle'>('candle');
  const [priceData, setPriceData] = useState<number[]>(() => {
    const base = 100;
    return Array.from({ length: 30 }, (_, i) => base + Math.sin(i * 0.3) * 5 + Math.random() * 3);
  });
  const [activeDuration, setActiveDuration] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, []);

  // Update chart with random data periodically
  useEffect(() => {
    if (!isRunning) return;
    const chartInterval = setInterval(() => {
      setPriceData(prev => {
        const last = prev[prev.length - 1];
        const next = last + (Math.random() - 0.48) * 2;
        return [...prev.slice(-49), next];
      });
    }, 2000);
    return () => clearInterval(chartInterval);
  }, [isRunning]);

  const executeTrade = useCallback(async () => {
    const stake = parseFloat(investmentAmount) || 10;
    if (currentBalance < stake) {
      setIsRunning(false);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
      toast({ title: 'Insufficient Balance', description: 'Bot stopped due to low balance', variant: 'destructive' });
      return;
    }

    const outcome = getTradeOutcome({ accountType, userEmail });
    const isWin = outcome === 'win';
    const payoutAmount = stake * 0.05;
    const actualProfit = isWin ? payoutAmount : -payoutAmount;

    if (user) {
      const operation = actualProfit > 0 ? 'add' : 'subtract';
      const ok = await updateBalance(accountType, Math.abs(actualProfit), operation);
      if (!ok) {
        setIsRunning(false);
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
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

    playTradeSound(isWin);

    const log: TradeLog = {
      id: Date.now().toString(), time: new Date(), asset: symbol,
      direction: Math.random() > 0.5 ? 'BUY' : 'SELL', stake,
      result: isWin ? 'WIN' : 'LOSS', profit: actualProfit,
    };
    setTradeLogs(prev => [log, ...prev].slice(0, 100));
    setTotalPL(prev => prev + actualProfit);
    setTradesCount(prev => prev + 1);
    if (isWin) setWinsCount(prev => prev + 1);
  }, [investmentAmount, currentBalance, accountType, userEmail, user, updateBalance, toast, playTradeSound, botName, symbol]);

  const toggleBot = () => {
    if (!isRunning) {
      const stake = parseFloat(investmentAmount) || 10;
      if (currentBalance < stake) {
        toast({ title: 'Insufficient Balance', variant: 'destructive' });
        return;
      }
      setIsRunning(true);
      executeTrade();
      intervalRef.current = setInterval(executeTrade, 3000 + Math.random() * 2000);
      durationRef.current = setInterval(() => setActiveDuration(prev => prev + 1), 1000);
      toast({ title: 'Bot Started', description: `${botName} is now trading` });
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
      setIsRunning(false);
      toast({ title: 'Bot Stopped' });
    }
  };

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  };

  const winRate = tradesCount > 0 ? ((winsCount / tradesCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/bot')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-base text-foreground">{botName}</h1>
              <p className="text-xs text-muted-foreground">{symbol} • 5% payout</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-sm font-bold text-primary">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Active Duration & Status */}
        <div className="flex items-center gap-2 text-sm">
          <span className={cn("w-2 h-2 rounded-full", isRunning ? "bg-success animate-pulse" : "bg-muted-foreground")} />
          <span className="text-muted-foreground">{isRunning ? 'Active' : 'Idle'}</span>
          {activeDuration > 0 && <span className="text-muted-foreground">• {formatDuration(activeDuration)}</span>}
        </div>

        {/* Bot Summary Card (like screenshot 3) */}
        <div className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={getCoinIcon(symbol.replace('USDT', ''))} alt="" className="w-8 h-8 rounded-full" />
              <span className="font-semibold text-foreground">{symbol.replace('USDT', '/USDT')}</span>
            </div>
            <Button onClick={toggleBot} size="sm" className={isRunning ? "bg-destructive hover:bg-destructive/90" : "bg-success hover:bg-success/90"}>
              {isRunning ? <><Square className="h-4 w-4 mr-1" />Stop</> : <><Play className="h-4 w-4 mr-1" />Start</>}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-border/50 bg-background">
              <p className="text-xs text-muted-foreground">Investment (USDT)</p>
              <p className="text-lg font-bold text-foreground">{investmentAmount}</p>
            </div>
            <div className="p-3 rounded-lg border border-border/50 bg-background">
              <p className="text-xs text-muted-foreground">Profit (USDT)</p>
              <p className={cn("text-lg font-bold", totalPL >= 0 ? "text-success" : "text-destructive")}>
                {totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)}
                {tradesCount > 0 && (
                  <span className="text-xs ml-1 opacity-80">
                    {((totalPL / (parseFloat(investmentAmount) || 1)) * 100).toFixed(1)}%
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="font-semibold text-foreground">{winRate}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total P/L</p>
              <p className={cn("font-semibold", totalPL >= 0 ? "text-success" : "text-destructive")}>
                ${Math.abs(totalPL).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Trades</p>
              <p className="font-semibold text-foreground">{tradesCount}</p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-sm font-semibold text-foreground">Price Chart</span>
            <div className="flex gap-1">
              <button onClick={() => setChartType('line')}
                className={cn("p-1.5 rounded text-xs", chartType === 'line' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <TrendingUp className="h-4 w-4" />
              </button>
              <button onClick={() => setChartType('candle')}
                className={cn("p-1.5 rounded text-xs", chartType === 'candle' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <BarChart2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="px-2 pb-2">
            <MiniChart data={priceData} type={chartType} />
          </div>
        </div>

        {/* Recent Transactions */}
        {tradeLogs.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Recent Transactions</span>
            <div className="rounded-xl bg-card border border-border/50 overflow-hidden max-h-40 overflow-y-auto">
              {tradeLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 last:border-0 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs", log.direction === 'BUY' ? "text-success" : "text-destructive")}>
                      {log.direction === 'BUY' ? '↗' : '↘'}
                    </span>
                    <span className="text-foreground">{log.asset.replace('USDT', '/USD')}</span>
                    <span className="text-muted-foreground">${log.stake.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium", log.result === 'WIN' ? "text-success" : "text-destructive")}>
                      {log.profit >= 0 ? '+' : ''}${log.profit.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">{log.time.toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trading History */}
        {tradeLogs.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Trading History</span>
            <div className="rounded-xl bg-card border border-border/50 overflow-hidden max-h-60 overflow-y-auto">
              {tradeLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 last:border-0 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-foreground">{log.asset.replace('USDT', '/USD')}</span>
                  </div>
                  <span className={cn("font-medium", log.result === 'WIN' ? "text-success" : "text-destructive")}>
                    {log.profit >= 0 ? '+' : ''}${log.profit.toFixed(2)}
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
