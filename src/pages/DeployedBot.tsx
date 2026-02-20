import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Play, Square, ChevronRight, ChevronDown } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { getCoinIcon } from '@/data/coinIcons';
import { getTradeOutcome } from '@/lib/tradeOutcome';
import { supabase } from '@/integrations/supabase/client';
import { useCandlestickData, calculateMA, calculateEMA, calculateBollingerBands } from '@/hooks/useCandlestickData';
import type { TimeFrame } from '@/hooks/useCandlestickData';

interface TradeLog {
  id: string;
  time: Date;
  asset: string;
  direction: 'BUY' | 'SELL';
  stake: number;
  result: 'WIN' | 'LOSS';
  profit: number;
  buyPrice: number;
  sellPrice: number;
  entryPrice: number;
}

interface LocationState {
  botName: string;
  symbol: string;
  strategy: string;
  riskLevel: string;
  investmentAmount: string;
}

const timeframes: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

type IndicatorKey = 'ma7' | 'ma25' | 'ma99' | 'ema12' | 'ema26' | 'bollinger';

const availableIndicators: { key: IndicatorKey; label: string; color: string }[] = [
  { key: 'ma7', label: 'MA(7)', color: '#eab308' },
  { key: 'ma25', label: 'MA(25)', color: '#ec4899' },
  { key: 'ma99', label: 'MA(99)', color: '#a855f7' },
  { key: 'ema12', label: 'EMA(12)', color: '#06b6d4' },
  { key: 'ema26', label: 'EMA(26)', color: '#f97316' },
  { key: 'bollinger', label: 'Bollinger', color: '#6366f1' },
];

// Full-width chart that blends with theme
function DeployedChart({ symbol, basePrice }: { symbol: string; basePrice: number }) {
  const [tf, setTf] = useState<TimeFrame>('1m');
  const { candles, isLoading } = useCandlestickData(symbol, basePrice, tf);
  const [zoom, setZoom] = useState(1);
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorKey>>(new Set());
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [candles, zoom]);

  const toggleIndicator = (key: IndicatorKey) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (isLoading || candles.length < 5) {
    return <div className="h-[500px] flex items-center justify-center text-muted-foreground text-sm bg-card">Loading chart...</div>;
  }

  const ma7 = activeIndicators.has('ma7') ? calculateMA(candles, 7) : null;
  const ma25 = activeIndicators.has('ma25') ? calculateMA(candles, 25) : null;
  const ma99 = activeIndicators.has('ma99') ? calculateMA(candles, 99) : null;
  const ema12 = activeIndicators.has('ema12') ? calculateEMA(candles, 12) : null;
  const ema26 = activeIndicators.has('ema26') ? calculateEMA(candles, 26) : null;
  const bb = activeIndicators.has('bollinger') ? calculateBollingerBands(candles) : null;

  const allPrices = candles.flatMap(c => [c.high, c.low]);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;

  const candleWidth = Math.max(6, 12 * zoom);
  const chartWidth = Math.max(800, candles.length * candleWidth);
  const h = 500, padT = 10, padB = 30, padR = 70;

  const toX = (i: number) => i * candleWidth + candleWidth / 2;
  const toY = (price: number) => padT + (1 - (price - min) / range) * (h - padT - padB);

  const maLine = (data: number[], color: string) => {
    const pts = data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
    return <polyline key={color} points={pts} fill="none" stroke={color} strokeWidth={1.2} opacity={0.8} />;
  };

  const priceSteps = 12;
  const priceLabels = Array.from({ length: priceSteps + 1 }, (_, i) => {
    const price = min + (range * i) / priceSteps;
    return { price, y: toY(price) };
  });

  const lastPrice = candles[candles.length - 1].close;
  const slPrice = lastPrice * 1.003;
  const tpPrice = lastPrice * 0.993;

  const timeLabels: { x: number; label: string }[] = [];
  const step = Math.max(1, Math.floor(candles.length / 6));
  for (let i = 0; i < candles.length; i += step) {
    const d = new Date(candles[i].time);
    timeLabels.push({ x: toX(i), label: `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` });
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.3, Math.min(4, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  };

  return (
    <div className="bg-card border-y border-border/50 overflow-hidden">
      {/* Timeframe bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/30 overflow-x-auto">
        {timeframes.map(t => (
          <button key={t} onClick={() => setTf(t)}
            className={cn("px-2.5 py-1 text-xs rounded font-medium transition-colors",
              tf === t ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}>
            {t}
          </button>
        ))}
        <div className="ml-auto flex gap-1 items-center">
          <div className="relative">
            <button onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
              className="px-2 py-1 text-xs rounded font-medium text-muted-foreground hover:text-foreground border border-border">
              Indicators
            </button>
            {showIndicatorMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowIndicatorMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 w-48 py-1">
                  {availableIndicators.map(ind => (
                    <button key={ind.key} onClick={() => toggleIndicator(ind.key)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                      <div className={cn("w-3 h-3 rounded-sm border", activeIndicators.has(ind.key) ? "border-primary bg-primary" : "border-muted-foreground")} />
                      <span className="flex-1 text-left text-foreground">{ind.label}</span>
                      <div className="w-3 h-1 rounded" style={{ backgroundColor: ind.color }} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {activeIndicators.size > 0 && (
        <div className="flex items-center gap-3 px-2 py-1 text-[10px]">
          {availableIndicators.filter(i => activeIndicators.has(i.key)).map(ind => {
            let val = '';
            if (ind.key === 'ma7' && ma7) val = ma7[ma7.length - 1]?.toFixed(2);
            if (ind.key === 'ma25' && ma25) val = ma25[ma25.length - 1]?.toFixed(2);
            if (ind.key === 'ma99' && ma99) val = ma99[ma99.length - 1]?.toFixed(2);
            if (ind.key === 'ema12' && ema12) val = ema12[ema12.length - 1]?.toFixed(2);
            if (ind.key === 'ema26' && ema26) val = ema26[ema26.length - 1]?.toFixed(2);
            if (ind.key === 'bollinger' && bb) val = `U:${bb[bb.length - 1]?.upper.toFixed(2)}`;
            return <span key={ind.key} style={{ color: ind.color }}>{ind.label}: {val}</span>;
          })}
        </div>
      )}

      <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden" onWheel={handleWheel} style={{ cursor: 'grab' }}>
        <svg viewBox={`0 0 ${chartWidth + padR} ${h}`} width={chartWidth + padR} style={{ height: '500px', minWidth: chartWidth + padR, display: 'block' }}>
          <rect width={chartWidth + padR} height={h} className="fill-card" />

          {priceLabels.map((p, i) => (
            <g key={i}>
              <line x1={0} y1={p.y} x2={chartWidth} y2={p.y} className="stroke-border" strokeWidth={0.5} />
              <text x={chartWidth + 5} y={p.y + 4} className="fill-muted-foreground" fontSize={9}>{p.price.toFixed(3)}</text>
            </g>
          ))}

          {timeLabels.map((t, i) => (
            <text key={i} x={t.x} y={h - 5} className="fill-muted-foreground" fontSize={8} textAnchor="middle">{t.label}</text>
          ))}

          {bb && (
            <>
              <polyline points={bb.map((b, i) => `${toX(i)},${toY(b.upper)}`).join(' ')} fill="none" stroke="#6366f1" strokeWidth={1} opacity={0.5} />
              <polyline points={bb.map((b, i) => `${toX(i)},${toY(b.middle)}`).join(' ')} fill="none" stroke="#6366f1" strokeWidth={0.8} opacity={0.3} strokeDasharray="3,3" />
              <polyline points={bb.map((b, i) => `${toX(i)},${toY(b.lower)}`).join(' ')} fill="none" stroke="#6366f1" strokeWidth={1} opacity={0.5} />
            </>
          )}

          {ma99 && maLine(ma99, '#a855f7')}
          {ma25 && maLine(ma25, '#ec4899')}
          {ma7 && maLine(ma7, '#eab308')}
          {ema12 && maLine(ema12, '#06b6d4')}
          {ema26 && maLine(ema26, '#f97316')}

          {candles.map((c, i) => {
            const barW = Math.max(2, candleWidth * 0.65);
            const x = toX(i) - barW / 2;
            const isUp = c.close >= c.open;
            const color = isUp ? '#0ecb81' : '#f6465d';
            return (
              <g key={i}>
                <line x1={toX(i)} y1={toY(c.high)} x2={toX(i)} y2={toY(c.low)} stroke={color} strokeWidth={1} />
                <rect x={x} y={toY(Math.max(c.open, c.close))} width={barW}
                  height={Math.max(1, Math.abs(toY(c.open) - toY(c.close)))} fill={color} />
              </g>
            );
          })}

          <line x1={0} y1={toY(slPrice)} x2={chartWidth} y2={toY(slPrice)} stroke="#f6465d" strokeWidth={1} strokeDasharray="6,4" opacity={0.7} />
          <text x={4} y={toY(slPrice) - 4} fill="#f6465d" fontSize={9} fontWeight="bold">SL</text>
          <rect x={chartWidth + 2} y={toY(slPrice) - 8} width={66} height={16} rx={2} fill="#f6465d" />
          <text x={chartWidth + 5} y={toY(slPrice) + 4} fill="white" fontSize={9} fontWeight="bold">{slPrice.toFixed(3)}</text>

          <line x1={0} y1={toY(lastPrice)} x2={chartWidth} y2={toY(lastPrice)} stroke="#3b82f6" strokeWidth={1} strokeDasharray="2,2" opacity={0.8} />
          <rect x={chartWidth + 2} y={toY(lastPrice) - 8} width={66} height={16} rx={2} fill="#3b82f6" />
          <text x={chartWidth + 5} y={toY(lastPrice) + 4} fill="white" fontSize={9} fontWeight="bold">{lastPrice.toFixed(3)}</text>

          <line x1={0} y1={toY(tpPrice)} x2={chartWidth} y2={toY(tpPrice)} stroke="#0ecb81" strokeWidth={1} strokeDasharray="6,4" opacity={0.7} />
          <text x={4} y={toY(tpPrice) - 4} fill="#0ecb81" fontSize={9} fontWeight="bold">TP</text>
          <rect x={chartWidth + 2} y={toY(tpPrice) - 8} width={66} height={16} rx={2} fill="#0ecb81" />
          <text x={chartWidth + 5} y={toY(tpPrice) + 4} fill="white" fontSize={9} fontWeight="bold">{tpPrice.toFixed(3)}</text>
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
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);
  const balanceRef = useRef(currentBalance);
  const isRunningRef = useRef(false);

  useEffect(() => { balanceRef.current = currentBalance; }, [currentBalance]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, []);

  const basePrice = symbol === 'BTCUSDT' ? 98000 : symbol === 'ETHUSDT' ? 3400 : symbol === 'SOLUSDT' ? 180 : symbol === 'BNBUSDT' ? 580 : 100;

  const executeTrade = useCallback(async () => {
    const stake = parseFloat(investmentAmount) || 10;
    if (balanceRef.current < stake) {
      setIsRunning(false);
      if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
      toast({ title: 'Insufficient Balance', description: 'Bot stopped due to low balance', variant: 'destructive' });
      return;
    }

    const outcome = getTradeOutcome({ accountType, userEmail });
    const isWin = outcome === 'win';

    const buyPrice = basePrice * (1 + (Math.random() - 0.5) * 0.01);
    const priceMove = buyPrice * (0.001 + Math.random() * 0.005);
    const sellPrice = isWin ? buyPrice + priceMove : buyPrice - priceMove;

    // Over 0 payout (Deriv style) - ~10.5% payout like over 0 digit
    const payoutPercent = 9.5 + Math.random() * 2; // 9.5-11.5%
    const actualProfit = isWin ? stake * (payoutPercent / 100) : -stake;

    if (user && accountType !== 'binance') {
      const operation = actualProfit > 0 ? 'add' : 'subtract';
      const ok = await updateBalance(accountType, Math.abs(actualProfit), operation);
      if (!ok) {
        setIsRunning(false);
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
      direction: isWin ? 'BUY' : 'SELL', stake,
      result: isWin ? 'WIN' : 'LOSS', profit: actualProfit,
      buyPrice, sellPrice, entryPrice: buyPrice,
    };
    setTradeLogs(prev => [log, ...prev].slice(0, 100));
    setTotalPL(prev => prev + actualProfit);
    setTradesCount(prev => prev + 1);
    if (isWin) setWinsCount(prev => prev + 1);
  }, [investmentAmount, accountType, userEmail, user, updateBalance, toast, botName, symbol, basePrice]);

  const scheduleNextTrade = useCallback(() => {
    intervalRef.current = setTimeout(async () => {
      if (!isRunningRef.current) return;
      await executeTrade();
      if (isRunningRef.current) {
        scheduleNextTrade();
      }
    }, 3000 + Math.random() * 2000);
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
      durationRef.current = setInterval(() => setActiveDuration(prev => prev + 1), 1000);
      toast({ title: 'Bot Started', description: `${botName} is now trading` });
    } else {
      if (intervalRef.current) { clearTimeout(intervalRef.current); intervalRef.current = null; }
      if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
      setIsRunning(false);
      toast({ title: 'Bot Stopped' });
    }
  };

  const formatDuration = (s: number) => {
    const d = Math.floor(s / 86400);
    const hrs = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}D ${hrs}h ${m}m`;
  };

  const winRate = tradesCount > 0 ? ((winsCount / tradesCount) * 100).toFixed(1) : '0.0';
  const profitPercent = parseFloat(investmentAmount) > 0 ? ((totalPL / parseFloat(investmentAmount)) * 100).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/bot')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg text-foreground">My Grid Bots</h1>
          </div>
        </div>
      </header>

      <main className="space-y-0">
        {/* Active / Completed tabs */}
        <div className="flex border-b border-border/30 px-4">
          <button onClick={() => setActiveTab('active')}
            className={cn("px-4 py-3 text-sm font-semibold border-b-2 transition-colors",
              activeTab === 'active' ? "text-foreground border-foreground" : "text-muted-foreground border-transparent")}>
            Active
          </button>
          <button onClick={() => setActiveTab('completed')}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'completed' ? "text-foreground border-foreground" : "text-muted-foreground border-transparent")}>
            Completed
          </button>
        </div>

        {/* Bot card - like screenshot 2 (My Grid Bots) */}
        <div className="px-4 py-4">
          <div className="rounded-xl bg-card border border-border/50 p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={getCoinIcon(symbol.replace('USDT', ''))} alt="" className="w-8 h-8 rounded-full" />
                <span className="font-semibold text-foreground">{symbol.replace('USDT', '/USDT')}</span>
              </div>
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                View More <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Active duration */}
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("w-2 h-2 rounded-full", isRunning ? "bg-success animate-pulse" : "bg-muted-foreground")} />
              <span className="text-muted-foreground">
                {isRunning ? `Active Duration: ${formatDuration(activeDuration)}` : 'Idle'}
              </span>
            </div>

            {/* Investment / Profit boxes */}
            <div className="grid grid-cols-2 gap-0 border border-border rounded-lg overflow-hidden">
              <div className="p-3 border-r border-border">
                <p className="text-xs text-muted-foreground">Investment (USDT)</p>
                <p className="text-xl font-bold text-foreground">{investmentAmount}</p>
              </div>
              <div className="p-3">
                <p className="text-xs text-muted-foreground">Profit (USDT) ⓘ</p>
                <p className={cn("text-xl font-bold", totalPL >= 0 ? "text-success" : "text-destructive")}>
                  {totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)}
                  <span className="text-sm ml-1">{profitPercent}%</span>
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="text-foreground font-medium">{winRate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">No. of Trades</span>
                <span className="text-foreground font-medium">{tradesCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Grid Profit (USDT) ⓘ</span>
                <span className={cn("font-medium", totalPL >= 0 ? "text-success" : "text-destructive")}>
                  {totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Start/Stop button */}
            <Button onClick={toggleBot} className={cn("w-full h-11 font-semibold",
              isRunning ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "bg-success hover:bg-success/90 text-success-foreground")}>
              {isRunning ? <><Square className="h-4 w-4 mr-2" />Stop Bot</> : <><Play className="h-4 w-4 mr-2" />Start Bot</>}
            </Button>
          </div>
        </div>

        {/* No chart for custom bots */}

        {/* Positions Panel */}
        {tradeLogs.length > 0 && (
          <div className="px-4 py-4">
            <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
              <div className="flex border-b border-border/30">
                <button className="flex-1 py-3 text-sm font-medium text-foreground bg-muted/30">All ({tradeLogs.length})</button>
                <button className="flex-1 py-3 text-sm font-medium text-muted-foreground">Positions ({tradeLogs.length})</button>
                <button className="flex-1 py-3 text-sm font-medium text-muted-foreground">Orders (0)</button>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <span className="text-sm font-medium text-foreground">Total P&L</span>
                <span className={cn("text-lg font-bold", totalPL >= 0 ? "text-success" : "text-destructive")}>
                  {totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)}
                </span>
              </div>
              <div className="px-4 pb-2">
                <span className="text-xs text-muted-foreground">{winsCount} winning / {tradesCount - winsCount} losing trades</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {tradeLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between px-4 py-3 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                        log.direction === 'BUY' ? "bg-success/10" : "bg-destructive/10")}>
                        <span className={cn("text-sm font-bold", log.direction === 'BUY' ? "text-success" : "text-destructive")}>
                          {log.direction === 'BUY' ? '↗' : '↘'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{log.asset.replace('USDT', '/USD')}</p>
                        <p className="text-xs text-muted-foreground">0.01 • {log.direction}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-semibold", log.profit >= 0 ? "text-success" : "text-destructive")}>
                        {log.profit >= 0 ? '+' : '-'}${Math.abs(log.profit).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">@ {log.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
