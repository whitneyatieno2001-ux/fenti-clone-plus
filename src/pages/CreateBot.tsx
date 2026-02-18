import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Rocket, ChevronDown, TrendingUp,
  Grid3X3, ArrowUpDown, Settings2, Eye
} from 'lucide-react';
import { type BotStrategy } from '@/lib/tradingStrategies';
import { BottomNav } from '@/components/BottomNav';
import { getCoinIcon } from '@/data/coinIcons';
import { useCandlestickData, calculateMA, calculateRSI, calculateEMA, calculateBollingerBands } from '@/hooks/useCandlestickData';
import type { TimeFrame } from '@/hooks/useCandlestickData';

const tradingPairs = [
  { symbol: 'BTCUSDT', name: 'BTC/USD', basePrice: 98000 },
  { symbol: 'ETHUSDT', name: 'ETH/USD', basePrice: 3400 },
  { symbol: 'XRPUSDT', name: 'XRP/USD', basePrice: 0.52 },
  { symbol: 'BNBUSDT', name: 'BNB/USD', basePrice: 580 },
  { symbol: 'SOLUSDT', name: 'SOL/USD', basePrice: 180 },
  { symbol: 'ADAUSDT', name: 'ADA/USD', basePrice: 0.45 },
  { symbol: 'DOGEUSDT', name: 'DOGE/USD', basePrice: 0.08 },
  { symbol: 'DOTUSDT', name: 'DOT/USD', basePrice: 7.2 },
];

const strategies: { id: BotStrategy; name: string; tag: string; description: string; icon: React.ReactNode }[] = [
  { id: 'trend', name: 'Trend Following', tag: 'AI-Powered', description: 'Identifies and follows market trends using advanced technical indicators', icon: <TrendingUp className="h-5 w-5 text-primary" /> },
  { id: 'grid', name: 'Grid Trading', tag: 'Automated', description: 'Places buy and sell orders at predetermined price intervals', icon: <Grid3X3 className="h-5 w-5 text-primary" /> },
  { id: 'arbitrage', name: 'Arbitrage', tag: 'Multi-Exchange', description: 'Exploits price differences across multiple exchanges', icon: <ArrowUpDown className="h-5 w-5 text-primary" /> },
];

type RiskLevel = 'low' | 'medium' | 'high';

const riskConfig: Record<RiskLevel, { label: string; range: string; maxPos: string; stopLoss: string; takeProfit: string }> = {
  low:    { label: 'Low',    range: '1-2%', maxPos: '2% per trade', stopLoss: '1.5%', takeProfit: '3.0%' },
  medium: { label: 'Medium', range: '3-5%', maxPos: '5% per trade', stopLoss: '3%',   takeProfit: '6%' },
  high:   { label: 'High',   range: '6-10%', maxPos: '10% per trade', stopLoss: '5%',  takeProfit: '10%' },
};

const USD_FLAG = 'https://flagcdn.com/w40/us.png';

const timeframes: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

type IndicatorKey = 'ma7' | 'ma25' | 'ma99' | 'ema12' | 'ema26' | 'rsi' | 'bollinger';

const availableIndicators: { key: IndicatorKey; label: string; color: string }[] = [
  { key: 'ma7', label: 'MA(7)', color: '#eab308' },
  { key: 'ma25', label: 'MA(25)', color: '#ec4899' },
  { key: 'ma99', label: 'MA(99)', color: '#a855f7' },
  { key: 'ema12', label: 'EMA(12)', color: '#06b6d4' },
  { key: 'ema26', label: 'EMA(26)', color: '#f97316' },
  { key: 'bollinger', label: 'Bollinger', color: '#6366f1' },
];

// Full-screen candlestick chart matching screenshot 1 exactly
function CreateBotChart({ symbol, basePrice }: { symbol: string; basePrice: number }) {
  const [tf, setTf] = useState<TimeFrame>('5m');
  const { candles, isLoading } = useCandlestickData(symbol, basePrice, tf);
  const [zoom, setZoom] = useState(1);
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorKey>>(new Set());
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDist, setTouchDist] = useState<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [candles, zoom]);

  const toggleIndicator = (key: IndicatorKey) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isLoading || candles.length < 5) {
    return <div className="h-[500px] flex items-center justify-center text-muted-foreground text-sm bg-[#0b0e11]">Loading chart...</div>;
  }

  // Calculate indicators
  const ma7 = activeIndicators.has('ma7') ? calculateMA(candles, 7) : null;
  const ma25 = activeIndicators.has('ma25') ? calculateMA(candles, 25) : null;
  const ma99 = activeIndicators.has('ma99') ? calculateMA(candles, 99) : null;
  const ema12 = activeIndicators.has('ema12') ? calculateEMA(candles, 12) : null;
  const ema26 = activeIndicators.has('ema26') ? calculateEMA(candles, 26) : null;
  const bb = activeIndicators.has('bollinger') ? calculateBollingerBands(candles) : null;

  const visibleCandles = candles;
  const allPrices = visibleCandles.flatMap(c => [c.high, c.low]);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;

  const candleWidth = Math.max(6, 12 * zoom);
  const chartWidth = Math.max(800, visibleCandles.length * candleWidth);
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

  const lastPrice = visibleCandles[visibleCandles.length - 1].close;

  // SL and TP levels
  const slPrice = lastPrice * 1.003;
  const tpPrice = lastPrice * 0.993;
  const entryPrice = lastPrice;

  // Time labels at bottom
  const timeLabels: { x: number; label: string }[] = [];
  const step = Math.max(1, Math.floor(visibleCandles.length / 6));
  for (let i = 0; i < visibleCandles.length; i += step) {
    const d = new Date(visibleCandles[i].time);
    const label = `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    timeLabels.push({ x: toX(i), label });
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.3, Math.min(4, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setTouchStart(zoom);
      setTouchDist(dist);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStart !== null && touchDist !== null) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setZoom(Math.max(0.3, Math.min(4, touchStart * (dist / touchDist))));
    }
  };

  return (
    <div className="bg-[#0b0e11] rounded-none overflow-hidden">
      {/* Timeframe bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#1e2329] overflow-x-auto">
        {timeframes.map(t => (
          <button key={t} onClick={() => setTf(t)}
            className={cn("px-2.5 py-1 text-xs rounded font-medium transition-colors",
              tf === t ? "bg-[#fcd535]/20 text-[#fcd535]" : "text-[#848e9c] hover:text-[#eaecef]")}>
            {t}
          </button>
        ))}
        <div className="ml-auto flex gap-1 items-center">
          <div className="relative">
            <button onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
              className="px-2 py-1 text-xs rounded font-medium text-[#848e9c] hover:text-[#eaecef] border border-[#2b3139]">
              Indicators
            </button>
            {showIndicatorMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowIndicatorMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-[#1e2329] border border-[#2b3139] rounded-lg shadow-xl z-50 w-48 py-1">
                  {availableIndicators.map(ind => (
                    <button key={ind.key} onClick={() => toggleIndicator(ind.key)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#2b3139] transition-colors">
                      <div className={cn("w-3 h-3 rounded-sm border", activeIndicators.has(ind.key) ? "border-[#fcd535] bg-[#fcd535]" : "border-[#474d57]")} />
                      <span className="flex-1 text-left text-[#eaecef]">{ind.label}</span>
                      <div className="w-3 h-1 rounded" style={{ backgroundColor: ind.color }} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Active indicator labels */}
      {activeIndicators.size > 0 && (
        <div className="flex items-center gap-3 px-2 py-1 text-[10px]">
          {availableIndicators.filter(i => activeIndicators.has(i.key)).map(ind => {
            let val = '';
            if (ind.key === 'ma7' && ma7) val = ma7[ma7.length - 1]?.toFixed(2);
            if (ind.key === 'ma25' && ma25) val = ma25[ma25.length - 1]?.toFixed(2);
            if (ind.key === 'ma99' && ma99) val = ma99[ma99.length - 1]?.toFixed(2);
            if (ind.key === 'ema12' && ema12) val = ema12[ema12.length - 1]?.toFixed(2);
            if (ind.key === 'ema26' && ema26) val = ema26[ema26.length - 1]?.toFixed(2);
            if (ind.key === 'bollinger' && bb) val = `U:${bb[bb.length - 1]?.upper.toFixed(2)} M:${bb[bb.length - 1]?.middle.toFixed(2)}`;
            return <span key={ind.key} style={{ color: ind.color }}>{ind.label}: {val}</span>;
          })}
        </div>
      )}

      {/* Chart - touches edges, tall */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{ cursor: 'grab' }}
      >
        <svg viewBox={`0 0 ${chartWidth + padR} ${h}`} width={chartWidth + padR} style={{ height: '500px', minWidth: chartWidth + padR, display: 'block' }}>
          <rect width={chartWidth + padR} height={h} fill="#0b0e11" />

          {/* Grid lines */}
          {priceLabels.map((p, i) => (
            <g key={i}>
              <line x1={0} y1={p.y} x2={chartWidth} y2={p.y} stroke="#1e2329" strokeWidth={0.5} />
              <text x={chartWidth + 5} y={p.y + 4} fill="#848e9c" fontSize={9}>{p.price.toFixed(3)}</text>
            </g>
          ))}

          {/* Time labels */}
          {timeLabels.map((t, i) => (
            <text key={i} x={t.x} y={h - 5} fill="#848e9c" fontSize={8} textAnchor="middle">{t.label}</text>
          ))}

          {/* Bollinger Bands */}
          {bb && (
            <>
              <polyline points={bb.map((b, i) => `${toX(i)},${toY(b.upper)}`).join(' ')} fill="none" stroke="#6366f1" strokeWidth={1} opacity={0.5} />
              <polyline points={bb.map((b, i) => `${toX(i)},${toY(b.middle)}`).join(' ')} fill="none" stroke="#6366f1" strokeWidth={0.8} opacity={0.3} strokeDasharray="3,3" />
              <polyline points={bb.map((b, i) => `${toX(i)},${toY(b.lower)}`).join(' ')} fill="none" stroke="#6366f1" strokeWidth={1} opacity={0.5} />
            </>
          )}

          {/* MA/EMA lines */}
          {ma99 && maLine(ma99, '#a855f7')}
          {ma25 && maLine(ma25, '#ec4899')}
          {ma7 && maLine(ma7, '#eab308')}
          {ema12 && maLine(ema12, '#06b6d4')}
          {ema26 && maLine(ema26, '#f97316')}

          {/* Candlesticks */}
          {visibleCandles.map((c, i) => {
            const barW = Math.max(2, candleWidth * 0.65);
            const x = toX(i) - barW / 2;
            const isUp = c.close >= c.open;
            const color = isUp ? '#0ecb81' : '#f6465d';
            return (
              <g key={i}>
                <line x1={toX(i)} y1={toY(c.high)} x2={toX(i)} y2={toY(c.low)} stroke={color} strokeWidth={1} />
                <rect x={x} y={toY(Math.max(c.open, c.close))} width={barW}
                  height={Math.max(1, Math.abs(toY(c.open) - toY(c.close)))}
                  fill={color} />
              </g>
            );
          })}

          {/* SL line */}
          <line x1={0} y1={toY(slPrice)} x2={chartWidth} y2={toY(slPrice)} stroke="#f6465d" strokeWidth={1} strokeDasharray="6,4" opacity={0.7} />
          <text x={4} y={toY(slPrice) - 4} fill="#f6465d" fontSize={9} fontWeight="bold">SL</text>
          <rect x={chartWidth + 2} y={toY(slPrice) - 8} width={66} height={16} rx={2} fill="#f6465d" />
          <text x={chartWidth + 5} y={toY(slPrice) + 4} fill="white" fontSize={9} fontWeight="bold">{slPrice.toFixed(3)}</text>

          {/* Entry / SELL line */}
          <line x1={0} y1={toY(entryPrice)} x2={chartWidth} y2={toY(entryPrice)} stroke="#3b82f6" strokeWidth={1} strokeDasharray="2,2" opacity={0.8} />
          <rect x={chartWidth + 2} y={toY(entryPrice) - 8} width={66} height={16} rx={2} fill="#3b82f6" />
          <text x={chartWidth + 5} y={toY(entryPrice) + 4} fill="white" fontSize={9} fontWeight="bold">{entryPrice.toFixed(3)}</text>
          <text x={4} y={toY(entryPrice) - 4} fill="#3b82f6" fontSize={8}>SELL 0.01</text>
          {/* Current price label on right edge */}
          <rect x={chartWidth + 2} y={toY(entryPrice) + 10} width={66} height={14} rx={2} fill="#0ecb81" />
          <text x={chartWidth + 5} y={toY(entryPrice) + 21} fill="white" fontSize={8}>{entryPrice.toFixed(3)}</text>

          {/* TP line */}
          <line x1={0} y1={toY(tpPrice)} x2={chartWidth} y2={toY(tpPrice)} stroke="#0ecb81" strokeWidth={1} strokeDasharray="6,4" opacity={0.7} />
          <text x={4} y={toY(tpPrice) - 4} fill="#0ecb81" fontSize={9} fontWeight="bold">TP</text>
          <rect x={chartWidth + 2} y={toY(tpPrice) - 8} width={66} height={16} rx={2} fill="#0ecb81" />
          <text x={chartWidth + 5} y={toY(tpPrice) + 4} fill="white" fontSize={9} fontWeight="bold">{tpPrice.toFixed(3)}</text>
        </svg>
      </div>
    </div>
  );
}

export default function CreateBot() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentBalance } = useAccount();

  const [botName, setBotName] = useState('BTC Master Bot');
  const [selectedPair, setSelectedPair] = useState(tradingPairs[0]);
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<BotStrategy>('trend');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('low');
  const [investmentAmount, setInvestmentAmount] = useState('10');
  const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setPairDropdownOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const risk = riskConfig[riskLevel];

  const handleDeploy = () => {
    const amount = parseFloat(investmentAmount);
    if (!amount || amount < 1) {
      toast({ title: 'Invalid Amount', description: 'Minimum investment is $1', variant: 'destructive' });
      return;
    }
    navigate('/deployed-bot', {
      state: {
        botName,
        symbol: selectedPair.symbol,
        strategy: selectedStrategy,
        riskLevel,
        investmentAmount,
      }
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/bot')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg text-foreground">AI Trading Bot Creator</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-sm font-bold text-primary">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </header>

      <main className="space-y-0">
        {/* Chart - full width, no padding, touches edges exactly like screenshot */}
        <CreateBotChart symbol={selectedPair.symbol} basePrice={selectedPair.basePrice} />

        <div className="px-4 py-4 space-y-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4">
              {/* LEFT PANEL */}
              <div className="space-y-4 md:border-r md:border-border/50 md:pr-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Bot Name</label>
                  <Input value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="My Trading Bot" className="bg-card border-border" />
                </div>

                {/* Trading Pair with flags */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Trading Pair</label>
                  <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setPairDropdownOpen(!pairDropdownOpen)}
                      className="w-full flex items-center justify-between p-3 bg-card border border-border rounded-md text-sm text-foreground hover:border-primary transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center -space-x-1">
                          <img src={getCoinIcon(selectedPair.symbol.replace('USDT', ''))} alt="" className="w-6 h-6 rounded-full border-2 border-card z-10" />
                          <img src={USD_FLAG} alt="USD" className="w-6 h-6 rounded-full border-2 border-card" />
                        </div>
                        <span className="font-medium ml-1">{selectedPair.name}</span>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", pairDropdownOpen && "rotate-180 text-primary")} />
                    </button>
                    {pairDropdownOpen && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto z-20">
                        {tradingPairs.map((pair) => (
                          <button key={pair.symbol} onClick={() => { setSelectedPair(pair); setPairDropdownOpen(false); }}
                            className={cn("w-full flex items-center gap-3 p-3 text-sm text-foreground hover:bg-muted/50 transition-colors", selectedPair.symbol === pair.symbol && "bg-muted/50")}>
                            <div className="flex items-center -space-x-1">
                              <img src={getCoinIcon(pair.symbol.replace('USDT', ''))} alt="" className="w-6 h-6 rounded-full border-2 border-card z-10" />
                              <img src={USD_FLAG} alt="USD" className="w-6 h-6 rounded-full border-2 border-card" />
                            </div>
                            <span className="font-medium">{pair.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-foreground mb-3">Strategy Type</h3>
                  <div className="space-y-2">
                    {strategies.map((s) => (
                      <button key={s.id} onClick={() => setSelectedStrategy(s.id)}
                        className={cn("w-full text-left p-3 bg-card border rounded-md transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary relative overflow-hidden",
                          selectedStrategy === s.id ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]" : "border-border")}>
                        <div className="flex items-center gap-2 mb-1">
                          {s.icon}
                          <div><p className="font-semibold text-sm text-foreground">{s.name}</p><span className="text-[11px] text-muted-foreground">{s.tag}</span></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                        <span className={cn("absolute top-0 right-0 px-2 py-0.5 text-[11px] font-medium bg-primary text-primary-foreground transition-opacity",
                          selectedStrategy === s.id ? "opacity-100" : "opacity-0")}>Selected</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div className="space-y-4 md:pl-4">
                <div className="flex border-b border-border">
                  <button onClick={() => setActiveTab('config')}
                    className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                      activeTab === 'config' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-primary")}>
                    <Settings2 className="h-4 w-4 inline mr-1" />Configuration
                  </button>
                  <button onClick={() => setActiveTab('preview')}
                    className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                      activeTab === 'preview' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-primary")}>
                    <Eye className="h-4 w-4 inline mr-1" />Preview
                  </button>
                </div>

                {activeTab === 'config' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                    <h4 className="text-sm font-semibold text-foreground">Risk Management</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as RiskLevel[]).map((level) => (
                        <button key={level} onClick={() => setRiskLevel(level)}
                          className={cn("flex flex-col items-center justify-center p-3 border text-sm font-medium rounded-md transition-all",
                            riskLevel === level
                              ? level === 'low' ? "bg-success text-success-foreground border-success"
                                : level === 'medium' ? "bg-primary text-primary-foreground border-primary"
                                : "bg-destructive text-destructive-foreground border-destructive"
                              : "border-border text-muted-foreground hover:border-primary")}>
                          <span className="font-semibold capitalize">{level}</span>
                          <span className="text-[11px] opacity-80">{riskConfig[level].range}</span>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {[{ label: 'Max Position Size', value: risk.maxPos }, { label: 'Stop Loss', value: risk.stopLoss }, { label: 'Take Profit', value: risk.takeProfit }].map((item) => (
                        <div key={item.label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">Stake Amount (Over/Under payout)</label>
                      <div className="relative">
                        <Input type="text" inputMode="decimal" value={investmentAmount}
                          onChange={(e) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setInvestmentAmount(e.target.value); }}
                          className="bg-card border-border pr-16" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">USDT</span>
                      </div>
                    </div>

                    <Button onClick={handleDeploy} disabled={!botName.trim()}
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                      <Rocket className="h-4 w-4 mr-2" />Deploy Bot
                    </Button>
                  </div>
                )}

                {activeTab === 'preview' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                    <div className="p-4 rounded-md bg-card border border-border space-y-3">
                      <h4 className="font-semibold text-foreground">Bot Configuration Summary</h4>
                      <div className="space-y-2">
                        {[
                          { label: 'Bot Name', value: botName || 'My Trading Bot' },
                          { label: 'Trading Pair', value: selectedPair.name },
                          { label: 'Strategy', value: strategies.find(s => s.id === selectedStrategy)?.name || '' },
                          { label: 'Risk Level', value: `${risk.label} (${risk.range})` },
                          { label: 'Stake', value: `${investmentAmount || '0'} USDT` },
                          { label: 'Payout', value: 'Over/Under style' },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-medium text-foreground">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button onClick={handleDeploy} disabled={!botName.trim()}
                      className="w-full h-11 bg-success hover:bg-success/90 text-success-foreground font-semibold">
                      <Rocket className="h-4 w-4 mr-2" />Deploy Bot Now
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
