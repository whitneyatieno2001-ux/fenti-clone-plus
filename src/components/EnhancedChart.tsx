import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useCandlestickData, type TimeFrame, type Candle } from '@/hooks/useCandlestickData';
import { cn } from '@/lib/utils';
import { Search, ZoomIn, ZoomOut, Maximize2, LineChart, BarChart3, CandlestickChart as CandlestickIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface EnhancedChartProps {
  symbol: string;
  currentPrice: number;
  className?: string;
  onFullscreen?: () => void;
}

type ChartType = 'candlestick' | 'line' | 'bar';

const timeframes: { label: string; value: TimeFrame }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

const availableIndicators = [
  { id: 'ma20', name: 'MA (20)', category: 'Moving Averages' },
  { id: 'ma50', name: 'MA (50)', category: 'Moving Averages' },
  { id: 'ema12', name: 'EMA (12)', category: 'Moving Averages' },
  { id: 'ema26', name: 'EMA (26)', category: 'Moving Averages' },
  { id: 'rsi', name: 'RSI (14)', category: 'Oscillators' },
  { id: 'volume', name: 'Volume', category: 'Volume' },
  { id: 'bollinger', name: 'Bollinger Bands', category: 'Volatility' },
  { id: 'macd', name: 'MACD', category: 'Oscillators' },
];

export function EnhancedChart({ symbol, currentPrice, className, onFullscreen }: EnhancedChartProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>('5m');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [zoom, setZoom] = useState(1);
  const [showIndicatorSearch, setShowIndicatorSearch] = useState(false);
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['ma20', 'volume', 'rsi']);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [panOffset, setPanOffset] = useState(0);
  const lastTouchRef = useRef<{ x: number; y: number; distance?: number } | null>(null);
  
  const { candles, indicators, isLoading } = useCandlestickData(symbol, currentPrice, timeframe);
  
  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
  }, []);

  // Handle touch pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      lastTouchRef.current = { 
        x: (touch1.clientX + touch2.clientX) / 2, 
        y: (touch1.clientY + touch2.clientY) / 2,
        distance 
      };
    } else if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsDragging(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchRef.current?.distance) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scale = distance / lastTouchRef.current.distance;
      setZoom(z => Math.max(0.5, Math.min(3, z * scale)));
      lastTouchRef.current.distance = distance;
    } else if (e.touches.length === 1 && isDragging && lastTouchRef.current) {
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      setPanOffset(p => p + deltaX * 0.5);
      lastTouchRef.current.x = e.touches[0].clientX;
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    lastTouchRef.current = null;
    setIsDragging(false);
  }, []);

  // Filter indicators by search
  const filteredIndicators = useMemo(() => {
    if (!indicatorSearch) return availableIndicators;
    return availableIndicators.filter(ind => 
      ind.name.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
      ind.category.toLowerCase().includes(indicatorSearch.toLowerCase())
    );
  }, [indicatorSearch]);

  const toggleIndicator = (id: string) => {
    setActiveIndicators(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  // Calculate chart dimensions and scaling
  const chartData = useMemo(() => {
    if (candles.length === 0) return null;
    
    const visibleCount = Math.floor(60 / zoom);
    const offset = Math.floor(panOffset / 10);
    const startIdx = Math.max(0, candles.length - visibleCount - offset);
    const visibleCandles = candles.slice(startIdx, startIdx + visibleCount);
    
    if (visibleCandles.length === 0) return null;
    
    const prices = visibleCandles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.1;
    
    const chartHeight = 280;
    const volumeHeight = 60;
    const chartWidth = 100;
    const candleWidth = chartWidth / visibleCandles.length;
    
    const maxVolume = Math.max(...visibleCandles.map(c => c.volume));
    
    const scalePrice = (price: number) => 
      ((maxPrice + padding - price) / (priceRange + padding * 2)) * chartHeight;
    
    const scaledCandles = visibleCandles.map((candle, i) => {
      const x = (i / visibleCandles.length) * 100;
      return {
        ...candle,
        x,
        yOpen: scalePrice(candle.open),
        yClose: scalePrice(candle.close),
        yHigh: scalePrice(candle.high),
        yLow: scalePrice(candle.low),
        width: candleWidth * 0.7,
        isGreen: candle.close >= candle.open,
        volumeBarHeight: (candle.volume / maxVolume) * volumeHeight,
      };
    });
    
    // Line chart points
    const linePoints = scaledCandles.map(c => `${c.x + c.width / 2},${c.yClose}`).join(' ');
    
    // MA lines
    const startOffset = startIdx;
    const ma20Points = indicators?.ma20.slice(startOffset, startOffset + visibleCount).map((val, i) => ({
      x: (i / visibleCount) * 100 + candleWidth / 2,
      y: scalePrice(val),
    }));
    
    const ma50Points = indicators?.ma50.slice(startOffset, startOffset + visibleCount).map((val, i) => ({
      x: (i / visibleCount) * 100 + candleWidth / 2,
      y: scalePrice(val),
    }));
    
    const ema12Points = indicators?.ema12.slice(startOffset, startOffset + visibleCount).map((val, i) => ({
      x: (i / visibleCount) * 100 + candleWidth / 2,
      y: scalePrice(val),
    }));
    
    const ema26Points = indicators?.ema26.slice(startOffset, startOffset + visibleCount).map((val, i) => ({
      x: (i / visibleCount) * 100 + candleWidth / 2,
      y: scalePrice(val),
    }));
    
    // Bollinger Bands
    const bollingerBands = indicators?.bollingerBands.slice(startOffset, startOffset + visibleCount).map((band, i) => ({
      x: (i / visibleCount) * 100 + candleWidth / 2,
      upper: scalePrice(band.upper),
      middle: scalePrice(band.middle),
      lower: scalePrice(band.lower),
    }));
    
    // Price levels for Y-axis
    const priceLevels = Array.from({ length: 5 }, (_, i) => {
      const price = minPrice - padding + ((priceRange + padding * 2) / 4) * (4 - i);
      return { price, y: (i / 4) * chartHeight };
    });
    
    return {
      candles: scaledCandles,
      linePoints,
      ma20Points,
      ma50Points,
      ema12Points,
      ema26Points,
      bollingerBands,
      priceLevels,
      chartHeight,
      volumeHeight,
      currentRSI: indicators?.rsi[indicators.rsi.length - 1] || 50,
    };
  }, [candles, indicators, zoom, panOffset]);
  
  if (isLoading || !chartData) {
    return (
      <div className={cn("bg-card rounded-xl border border-border p-4", className)}>
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }
  
  const lastCandle = chartData.candles[chartData.candles.length - 1];
  const prevCandle = chartData.candles[chartData.candles.length - 2];
  const priceChange = lastCandle && prevCandle 
    ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100 
    : 0;
  
  return (
    <div className={cn("bg-card rounded-xl border border-border overflow-hidden", className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="font-bold text-foreground">{symbol}/USDT</span>
          <span className={cn(
            "font-semibold",
            priceChange >= 0 ? "text-success" : "text-destructive"
          )}>
            ${lastCandle?.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={cn(
            "text-sm",
            priceChange >= 0 ? "text-success" : "text-destructive"
          )}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Chart type selector */}
          <div className="flex bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setChartType('candlestick')}
              className={cn(
                "p-1.5 rounded transition-colors",
                chartType === 'candlestick' ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              title="Candlestick"
            >
              <CandlestickIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={cn(
                "p-1.5 rounded transition-colors",
                chartType === 'line' ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              title="Line"
            >
              <LineChart className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={cn(
                "p-1.5 rounded transition-colors",
                chartType === 'bar' ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              title="Bar"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(3, z + 0.2))}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="p-1.5 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Timeframe selector */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30">
        <div className="flex gap-1">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded transition-colors",
                timeframe === tf.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Indicator search */}
        <div className="relative">
          <button
            onClick={() => setShowIndicatorSearch(!showIndicatorSearch)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="h-3 w-3" />
            <span>Indicators</span>
          </button>
          
          {showIndicatorSearch && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowIndicatorSearch(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 bg-card rounded-xl shadow-xl border border-border w-64 max-h-80 overflow-hidden">
                <div className="p-2 border-b border-border">
                  <Input
                    placeholder="Search indicators..."
                    value={indicatorSearch}
                    onChange={(e) => setIndicatorSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="overflow-y-auto max-h-60">
                  {filteredIndicators.map((indicator) => (
                    <button
                      key={indicator.id}
                      onClick={() => toggleIndicator(indicator.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 hover:bg-secondary transition-colors",
                        activeIndicators.includes(indicator.id) && "bg-primary/10"
                      )}
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{indicator.name}</p>
                        <p className="text-xs text-muted-foreground">{indicator.category}</p>
                      </div>
                      {activeIndicators.includes(indicator.id) && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Chart Area with touch/wheel handlers */}
      <div 
        ref={chartContainerRef}
        className="relative p-2 touch-none select-none"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Price axis */}
        <div className="absolute right-2 top-2 bottom-20 w-16 flex flex-col justify-between text-right z-10">
          {chartData.priceLevels.map((level, i) => (
            <span key={i} className="text-xs text-muted-foreground">
              ${level.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          ))}
        </div>
        
        {/* Main chart */}
        <svg 
          viewBox={`0 0 100 ${chartData.chartHeight}`} 
          className="w-full h-[280px]"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {chartData.priceLevels.map((level, i) => (
            <line
              key={i}
              x1="0"
              y1={level.y}
              x2="100"
              y2={level.y}
              stroke="hsl(var(--border))"
              strokeWidth="0.1"
              strokeDasharray="0.5"
            />
          ))}
          
          {/* Bollinger Bands */}
          {activeIndicators.includes('bollinger') && chartData.bollingerBands && (
            <>
              <polyline
                points={chartData.bollingerBands.map(b => `${b.x},${b.upper}`).join(' ')}
                fill="none"
                stroke="hsl(var(--primary) / 0.5)"
                strokeWidth="0.2"
              />
              <polyline
                points={chartData.bollingerBands.map(b => `${b.x},${b.middle}`).join(' ')}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="0.2"
                strokeDasharray="0.5"
              />
              <polyline
                points={chartData.bollingerBands.map(b => `${b.x},${b.lower}`).join(' ')}
                fill="none"
                stroke="hsl(var(--primary) / 0.5)"
                strokeWidth="0.2"
              />
            </>
          )}
          
          {/* MA Lines */}
          {activeIndicators.includes('ma20') && chartData.ma20Points && (
            <polyline
              points={chartData.ma20Points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="0.3"
              opacity="0.7"
            />
          )}
          
          {activeIndicators.includes('ma50') && chartData.ma50Points && (
            <polyline
              points={chartData.ma50Points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="hsl(var(--warning))"
              strokeWidth="0.3"
              opacity="0.7"
            />
          )}

          {activeIndicators.includes('ema12') && chartData.ema12Points && (
            <polyline
              points={chartData.ema12Points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#22c55e"
              strokeWidth="0.3"
              opacity="0.7"
            />
          )}

          {activeIndicators.includes('ema26') && chartData.ema26Points && (
            <polyline
              points={chartData.ema26Points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#f97316"
              strokeWidth="0.3"
              opacity="0.7"
            />
          )}
          
          {/* Chart rendering based on type */}
          {chartType === 'candlestick' && chartData.candles.map((candle, i) => (
            <g key={i}>
              <line
                x1={candle.x + candle.width / 2}
                y1={candle.yHigh}
                x2={candle.x + candle.width / 2}
                y2={candle.yLow}
                stroke={candle.isGreen ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                strokeWidth="0.15"
              />
              <rect
                x={candle.x}
                y={Math.min(candle.yOpen, candle.yClose)}
                width={candle.width}
                height={Math.abs(candle.yClose - candle.yOpen) || 0.5}
                fill={candle.isGreen ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                rx="0.1"
              />
            </g>
          ))}

          {chartType === 'line' && (
            <polyline
              points={chartData.linePoints}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="0.4"
            />
          )}

          {chartType === 'bar' && chartData.candles.map((candle, i) => (
            <g key={i}>
              <line
                x1={candle.x + candle.width / 2}
                y1={candle.yHigh}
                x2={candle.x + candle.width / 2}
                y2={candle.yLow}
                stroke={candle.isGreen ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                strokeWidth="0.3"
              />
              <line
                x1={candle.x}
                y1={candle.yOpen}
                x2={candle.x + candle.width / 2}
                y2={candle.yOpen}
                stroke={candle.isGreen ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                strokeWidth="0.3"
              />
              <line
                x1={candle.x + candle.width / 2}
                y1={candle.yClose}
                x2={candle.x + candle.width}
                y2={candle.yClose}
                stroke={candle.isGreen ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                strokeWidth="0.3"
              />
            </g>
          ))}
        </svg>
        
        {/* Volume bars */}
        {activeIndicators.includes('volume') && (
          <svg 
            viewBox={`0 0 100 ${chartData.volumeHeight}`} 
            className="w-full h-[60px] mt-1"
            preserveAspectRatio="none"
          >
            {chartData.candles.map((candle, i) => (
              <rect
                key={i}
                x={candle.x}
                y={chartData.volumeHeight - candle.volumeBarHeight}
                width={candle.width}
                height={candle.volumeBarHeight}
                fill={candle.isGreen ? 'hsl(var(--success) / 0.3)' : 'hsl(var(--destructive) / 0.3)'}
                rx="0.1"
              />
            ))}
          </svg>
        )}
      </div>
      
      {/* Active indicators and RSI panel */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-secondary/30">
        <div className="flex items-center gap-2 flex-wrap">
          {activeIndicators.map(id => {
            const indicator = availableIndicators.find(i => i.id === id);
            if (!indicator) return null;
            return (
              <span
                key={id}
                className="text-xs font-medium px-2 py-1 rounded bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                onClick={() => toggleIndicator(id)}
              >
                {indicator.name} ×
              </span>
            );
          })}
        </div>
        
        {activeIndicators.includes('rsi') && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">RSI(14):</span>
            <span className={cn(
              "text-xs font-semibold",
              chartData.currentRSI > 70 ? "text-destructive" :
              chartData.currentRSI < 30 ? "text-success" : "text-foreground"
            )}>
              {chartData.currentRSI.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
