import { useEffect, useState } from 'react';

interface Candle {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  isGreen: boolean;
}

export function CandlestickVisual() {
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => {
    // Generate initial candles
    const generateCandles = () => {
      const newCandles: Candle[] = [];
      let lastClose = 50;
      
      for (let i = 0; i < 12; i++) {
        const open = lastClose;
        const change = (Math.random() - 0.45) * 15;
        const close = Math.max(10, Math.min(90, open + change));
        const high = Math.max(open, close) + Math.random() * 8;
        const low = Math.min(open, close) - Math.random() * 8;
        
        newCandles.push({
          x: i * 28 + 15,
          open,
          close,
          high: Math.min(95, high),
          low: Math.max(5, low),
          isGreen: close > open
        });
        
        lastClose = close;
      }
      
      return newCandles;
    };

    setCandles(generateCandles());

    // Animate candles periodically
    const interval = setInterval(() => {
      setCandles(prev => {
        const updated = [...prev];
        // Shift candles left and add new one
        updated.shift();
        
        const lastCandle = updated[updated.length - 1];
        const open = lastCandle.close;
        const change = (Math.random() - 0.45) * 15;
        const close = Math.max(10, Math.min(90, open + change));
        const high = Math.max(open, close) + Math.random() * 8;
        const low = Math.min(open, close) - Math.random() * 8;
        
        updated.push({
          x: 11 * 28 + 15,
          open,
          close,
          high: Math.min(95, high),
          low: Math.max(5, low),
          isGreen: close > open
        });

        // Recalculate x positions
        return updated.map((c, i) => ({ ...c, x: i * 28 + 15 }));
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-sm">
      <svg 
        viewBox="0 0 350 200" 
        className="w-full h-auto"
        style={{ filter: 'drop-shadow(0 0 20px hsl(45 93% 47% / 0.3))' }}
      >
        {/* Background grid */}
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(240 10% 12%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(240 10% 6%)" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(142 71% 55%)" />
            <stop offset="100%" stopColor="hsl(142 71% 40%)" />
          </linearGradient>
          <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(0 72% 55%)" />
            <stop offset="100%" stopColor="hsl(0 72% 45%)" />
          </linearGradient>
        </defs>

        {/* Chart background */}
        <rect 
          x="0" y="0" 
          width="350" height="200" 
          rx="12" 
          fill="url(#bgGradient)"
          stroke="hsl(240 10% 25%)"
          strokeWidth="1"
        />

        {/* Grid lines */}
        {[40, 80, 120, 160].map((y) => (
          <line 
            key={y}
            x1="10" y1={y} 
            x2="340" y2={y} 
            stroke="hsl(240 10% 20%)" 
            strokeWidth="0.5"
            strokeDasharray="4,4"
          />
        ))}

        {/* Candlesticks */}
        {candles.map((candle, i) => {
          const candleHeight = Math.abs(candle.close - candle.open) * 1.5;
          const candleY = Math.min(candle.open, candle.close) * 1.5 + 20;
          const wickTop = candle.high * 1.5 + 20;
          const wickBottom = candle.low * 1.5 + 20;
          
          return (
            <g 
              key={i} 
              className="transition-all duration-500"
              style={{ 
                opacity: i === candles.length - 1 ? 1 : 0.7 + (i * 0.025),
                animation: i === candles.length - 1 ? 'fadeIn 0.5s ease-out' : undefined
              }}
            >
              {/* Wick */}
              <line
                x1={candle.x + 8}
                y1={wickTop}
                x2={candle.x + 8}
                y2={wickBottom}
                stroke={candle.isGreen ? 'hsl(142 71% 45%)' : 'hsl(0 72% 51%)'}
                strokeWidth="2"
              />
              {/* Body */}
              <rect
                x={candle.x}
                y={candleY}
                width="16"
                height={Math.max(candleHeight, 3)}
                rx="2"
                fill={candle.isGreen ? 'url(#greenGradient)' : 'url(#redGradient)'}
                className="transition-all duration-300"
              />
            </g>
          );
        })}

        {/* Moving average line */}
        <path
          d={candles.length > 0 ? 
            `M ${candles.map((c, i) => `${c.x + 8},${((c.open + c.close) / 2) * 1.5 + 20}`).join(' L ')}` 
            : ''
          }
          fill="none"
          stroke="hsl(45 93% 47%)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500"
          style={{ filter: 'drop-shadow(0 0 6px hsl(45 93% 47% / 0.6))' }}
        />

        {/* Price indicator */}
        {candles.length > 0 && (
          <g>
            <rect
              x="300"
              y={candles[candles.length - 1].close * 1.5 + 12}
              width="45"
              height="18"
              rx="4"
              fill="hsl(45 93% 47%)"
            />
            <text
              x="322"
              y={candles[candles.length - 1].close * 1.5 + 25}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="hsl(240 10% 6%)"
            >
              LIVE
            </text>
          </g>
        )}
      </svg>

      {/* Glow effect */}
      <div className="absolute inset-0 bg-primary/5 rounded-xl blur-2xl -z-10" />
    </div>
  );
}
