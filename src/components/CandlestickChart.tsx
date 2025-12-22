import { useMemo, useState } from 'react';
import { useCandlestickData, type TimeFrame, type Candle } from '@/hooks/useCandlestickData';
import { cn } from '@/lib/utils';

interface CandlestickChartProps {
  symbol: string;
  currentPrice: number;
  className?: string;
}

const timeframes: { label: string; value: TimeFrame }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

export function CandlestickChart({ symbol, currentPrice, className }: CandlestickChartProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>('5m');
  const [showIndicators, setShowIndicators] = useState({ ma20: true, ma50: false, volume: true });
  
  const { candles, indicators, isLoading } = useCandlestickData(symbol, currentPrice, timeframe);
  
  // Calculate chart dimensions and scaling
  const chartData = useMemo(() => {
    if (candles.length === 0) return null;
    
    const visibleCandles = candles.slice(-60); // Show last 60 candles
    const prices = visibleCandles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.1;
    
    const chartHeight = 280;
    const volumeHeight = 60;
    const chartWidth = 100; // percentage
    const candleWidth = chartWidth / visibleCandles.length;
    
    const maxVolume = Math.max(...visibleCandles.map(c => c.volume));
    
    const scaledCandles = visibleCandles.map((candle, i) => {
      const x = (i / visibleCandles.length) * 100;
      const yOpen = ((maxPrice + padding - candle.open) / (priceRange + padding * 2)) * chartHeight;
      const yClose = ((maxPrice + padding - candle.close) / (priceRange + padding * 2)) * chartHeight;
      const yHigh = ((maxPrice + padding - candle.high) / (priceRange + padding * 2)) * chartHeight;
      const yLow = ((maxPrice + padding - candle.low) / (priceRange + padding * 2)) * chartHeight;
      const volumeBarHeight = (candle.volume / maxVolume) * volumeHeight;
      
      return {
        ...candle,
        x,
        yOpen,
        yClose,
        yHigh,
        yLow,
        width: candleWidth * 0.7,
        isGreen: candle.close >= candle.open,
        volumeBarHeight,
      };
    });
    
    // Scale indicators
    const scalePrice = (price: number) => 
      ((maxPrice + padding - price) / (priceRange + padding * 2)) * chartHeight;
    
    const ma20Points = indicators?.ma20.slice(-60).map((val, i) => ({
      x: (i / 60) * 100,
      y: scalePrice(val),
    }));
    
    const ma50Points = indicators?.ma50.slice(-60).map((val, i) => ({
      x: (i / 60) * 100,
      y: scalePrice(val),
    }));
    
    // Price levels for Y-axis
    const priceLevels = Array.from({ length: 5 }, (_, i) => {
      const price = minPrice - padding + ((priceRange + padding * 2) / 4) * (4 - i);
      return { price, y: (i / 4) * chartHeight };
    });
    
    return {
      candles: scaledCandles,
      ma20Points,
      ma50Points,
      priceLevels,
      chartHeight,
      volumeHeight,
      currentRSI: indicators?.rsi[indicators.rsi.length - 1] || 50,
    };
  }, [candles, indicators]);
  
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
      {/* Header */}
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
        
        {/* Timeframe selector */}
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
      </div>
      
      {/* Chart Area */}
      <div className="relative p-2">
        {/* Price axis */}
        <div className="absolute right-2 top-2 bottom-20 w-16 flex flex-col justify-between text-right">
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
          
          {/* MA Lines */}
          {showIndicators.ma20 && chartData.ma20Points && (
            <polyline
              points={chartData.ma20Points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="0.3"
              opacity="0.7"
            />
          )}
          
          {showIndicators.ma50 && chartData.ma50Points && (
            <polyline
              points={chartData.ma50Points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="hsl(var(--warning))"
              strokeWidth="0.3"
              opacity="0.7"
            />
          )}
          
          {/* Candlesticks */}
          {chartData.candles.map((candle, i) => (
            <g key={i}>
              {/* Wick */}
              <line
                x1={candle.x + candle.width / 2}
                y1={candle.yHigh}
                x2={candle.x + candle.width / 2}
                y2={candle.yLow}
                stroke={candle.isGreen ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                strokeWidth="0.15"
              />
              {/* Body */}
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
        </svg>
        
        {/* Volume bars */}
        {showIndicators.volume && (
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
      
      {/* Indicators panel */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-secondary/30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowIndicators(s => ({ ...s, ma20: !s.ma20 }))}
            className={cn(
              "text-xs font-medium px-2 py-1 rounded",
              showIndicators.ma20 ? "bg-primary/20 text-primary" : "text-muted-foreground"
            )}
          >
            MA(20)
          </button>
          <button
            onClick={() => setShowIndicators(s => ({ ...s, ma50: !s.ma50 }))}
            className={cn(
              "text-xs font-medium px-2 py-1 rounded",
              showIndicators.ma50 ? "bg-warning/20 text-warning" : "text-muted-foreground"
            )}
          >
            MA(50)
          </button>
          <button
            onClick={() => setShowIndicators(s => ({ ...s, volume: !s.volume }))}
            className={cn(
              "text-xs font-medium px-2 py-1 rounded",
              showIndicators.volume ? "bg-secondary text-foreground" : "text-muted-foreground"
            )}
          >
            VOL
          </button>
        </div>
        
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
      </div>
    </div>
  );
}
