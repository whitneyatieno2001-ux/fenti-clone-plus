import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Play, Square, TrendingUp, BarChart2 } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { getCoinIcon } from '@/data/coinIcons';
import { getTradeOutcome } from '@/lib/tradeOutcome';
import { supabase } from '@/integrations/supabase/client';
import { useCandlestickData, calculateMA } from '@/hooks/useCandlestickData';
import type { TimeFrame } from '@/hooks/useCandlestickData';

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

const timeframes: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

// Binance-style candlestick chart with MA lines
function BinanceChart({ symbol, basePrice }: { symbol: string; basePrice: number }) {
  const [tf, setTf] = useState<TimeFrame>('1m');
  const { candles, isLoading } = useCandlestickData(symbol, basePrice, tf);
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');

  if (isLoading || candles.length < 5) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading chart...</div>;
  }

  const ma7 = calculateMA(candles, 7);
  const ma25 = calculateMA(candles, 25);
  const ma99 = calculateMA(candles, 99);

  const visibleCandles = candles.slice(-60);
  const visibleMa7 = ma7.slice(-60);
  const visibleMa25 = ma25.slice(-60);
  const visibleMa99 = ma99.slice(-60);

  const allPrices = visibleCandles.flatMap(c => [c.high, c.low]);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;

  const w = 800, h = 300, padT = 20, padB = 30, padL = 10, padR = 60;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const toX = (i: number) => padL + (i / (visibleCandles.length - 1)) * chartW;
  const toY = (price: number) => padT + (1 - (price - min) / range) * chartH;

  const maLine = (data: number[], color: string) => {
    const pts = data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
    return <polyline key={color} points={pts} fill="none" stroke={color} strokeWidth={1.2} opacity={0.8} />;
  };

  // Price labels on right
  const priceSteps = 5;
  const priceLabels = Array.from({ length: priceSteps + 1 }, (_, i) => {
    const price = min + (range * i) / priceSteps;
    return { price, y: toY(price) };
  });

  const lastPrice = visibleCandles[visibleCandles.length - 1].close;

  return (
    <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
      {/* Timeframe bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border/30 overflow-x-auto">
        <span className="text-xs text-muted-foreground mr-1">Time</span>
        {timeframes.map(t => (
          <button key={t} onClick={() => setTf(t)}
            className={cn("px-2 py-1 text-xs rounded font-medium transition-colors",
              tf === t ? "bg-primary/20 text-primary underline underline-offset-4" : "text-muted-foreground hover:text-foreground")}>
            {t}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button onClick={() => setChartType('line')}
            className={cn("p-1 rounded", chartType === 'line' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
            <TrendingUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setChartType('candle')}
            className={cn("p-1 rounded", chartType === 'candle' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
            <BarChart2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* MA Legend */}
      <div className="flex items-center gap-3 px-3 py-1 text-xs">
        <span style={{ color: '#eab308' }}>MA(7): {visibleMa7[visibleMa7.length - 1]?.toFixed(2)}</span>
        <span style={{ color: '#ec4899' }}>MA(25): {visibleMa25[visibleMa25.length - 1]?.toFixed(2)}</span>
        <span style={{ color: '#a855f7' }}>MA(99): {visibleMa99[visibleMa99.length - 1]?.toFixed(2)}</span>
      </div>

      {/* Chart */}
      <div className="px-1">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: '260px' }}>
          {/* Grid lines */}
          {priceLabels.map((p, i) => (
            <g key={i}>
              <line x1={padL} y1={p.y} x2={w - padR} y2={p.y} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="4,4" opacity={0.5} />
              <text x={w - padR + 5} y={p.y + 4} fill="hsl(var(--muted-foreground))" fontSize={10}>{p.price.toFixed(2)}</text>
            </g>
          ))}

          {/* MA lines */}
          {maLine(visibleMa99, '#a855f7')}
          {maLine(visibleMa25, '#ec4899')}
          {maLine(visibleMa7, '#eab308')}

          {/* Candles or Line */}
          {chartType === 'candle' ? (
            visibleCandles.map((c, i) => {
              const barW = Math.max(3, chartW / visibleCandles.length * 0.6);
              const x = toX(i) - barW / 2;
              const isUp = c.close >= c.open;
              const color = isUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
              return (
                <g key={i}>
                  <line x1={toX(i)} y1={toY(c.high)} x2={toX(i)} y2={toY(c.low)} stroke={color} strokeWidth={1} />
                  <rect x={x} y={toY(Math.max(c.open, c.close))} width={barW}
                    height={Math.max(1, Math.abs(toY(c.open) - toY(c.close)))}
                    fill={isUp ? color : color} rx={1} />
                </g>
              );
            })
          ) : (
            <polyline
              points={visibleCandles.map((c, i) => `${toX(i)},${toY(c.close)}`).join(' ')}
              fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} />
          )}

          {/* Last price indicator */}
          <line x1={padL} y1={toY(lastPrice)} x2={w - padR} y2={toY(lastPrice)} stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
          <rect x={w - padR - 2} y={toY(lastPrice) - 9} width={55} height={18} rx={3} fill="hsl(var(--primary))" />
          <text x={w - padR + 3} y={toY(lastPrice) + 4} fill="white" fontSize={10} fontWeight="bold">{lastPrice.toFixed(2)}</text>
        </svg>
      </div>
    </div>
  );
}

export default function DeployedBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { toast } = useToast();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();

  const botName = state?.botName || 'Custom Bot';
  const symbol = state?.symbol || 'BTCUSDT';
  const investmentAmount = state?.investmentAmount || '10';

  const [isRunning, setIsRunning] = useState(false);
  const [totalPL, setTotalPL] = useState(0);
  const [tradesCount, setTradesCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [activeDuration, setActiveDuration] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);
  const balanceRef = useRef(currentBalance);

  useEffect(() => { balanceRef.current = currentBalance; }, [currentBalance]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, []);

  const basePrice = symbol === 'BTCUSDT' ? 98000 : symbol === 'ETHUSDT' ? 3400 : symbol === 'SOLUSDT' ? 180 : symbol === 'BNBUSDT' ? 580 : 100;

  const executeTrade = useCallback(async () => {
    const stake = parseFloat(investmentAmount) || 10;
    if (balanceRef.current < stake) {
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

    const log: TradeLog = {
      id: Date.now().toString(), time: new Date(), asset: symbol,
      direction: Math.random() > 0.5 ? 'BUY' : 'SELL', stake,
      result: isWin ? 'WIN' : 'LOSS', profit: actualProfit,
    };
    setTradeLogs(prev => [log, ...prev].slice(0, 100));
    setTotalPL(prev => prev + actualProfit);
    setTradesCount(prev => prev + 1);
    if (isWin) setWinsCount(prev => prev + 1);
  }, [investmentAmount, accountType, userEmail, user, updateBalance, toast, botName, symbol]);

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
    const hrs = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${hrs}h ${m}m ${sec}s`;
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
        {/* Status */}
        <div className="flex items-center gap-2 text-sm">
          <span className={cn("w-2 h-2 rounded-full", isRunning ? "bg-success animate-pulse" : "bg-muted-foreground")} />
          <span className="text-muted-foreground">{isRunning ? 'Active' : 'Idle'}</span>
          {activeDuration > 0 && <span className="text-muted-foreground">• {formatDuration(activeDuration)}</span>}
        </div>

        {/* Bot Summary */}
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

        {/* Binance-Style Chart */}
        <BinanceChart symbol={symbol} basePrice={basePrice} />

        {/* Trading History */}
        {tradeLogs.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Trading History</span>
            <div className="rounded-xl bg-card border border-border/50 overflow-hidden max-h-60 overflow-y-auto">
              {tradeLogs.map((log) => (
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
      </main>
      <BottomNav />
    </div>
  );
}
