import { useState, useEffect, useCallback, useRef } from 'react';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

const timeFrameToMs: Record<TimeFrame, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

// Generate realistic price movement
const generatePriceMovement = (currentPrice: number, volatility: number = 0.002): number => {
  const change = (Math.random() - 0.5) * 2 * currentPrice * volatility;
  const momentum = (Math.random() - 0.48) * currentPrice * 0.001; // Slight upward bias
  return currentPrice + change + momentum;
};

// Generate historical candles for initial chart data
const generateHistoricalCandles = (
  currentPrice: number,
  timeframe: TimeFrame,
  count: number = 100
): Candle[] => {
  const candles: Candle[] = [];
  const interval = timeFrameToMs[timeframe];
  const now = Date.now();
  
  let price = currentPrice * (1 - Math.random() * 0.1); // Start 0-10% lower
  
  for (let i = count; i >= 0; i--) {
    const time = now - i * interval;
    const volatility = 0.003 + Math.random() * 0.007; // Variable volatility
    
    const open = price;
    const movements = Array.from({ length: 4 }, () => generatePriceMovement(price, volatility));
    const close = movements[movements.length - 1];
    const high = Math.max(open, close, ...movements) * (1 + Math.random() * 0.002);
    const low = Math.min(open, close, ...movements) * (1 - Math.random() * 0.002);
    const volume = 100 + Math.random() * 900;
    
    candles.push({ time, open, high, low, close, volume });
    price = close;
  }
  
  return candles;
};

// Calculate technical indicators
export const calculateRSI = (candles: Candle[], period: number = 14): number[] => {
  const rsi: number[] = [];
  const changes = candles.map((c, i) => i === 0 ? 0 : c.close - candles[i - 1].close);
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      rsi.push(50);
      continue;
    }
    
    const recentChanges = changes.slice(i - period + 1, i + 1);
    let gains = 0, losses = 0;
    recentChanges.forEach(change => {
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    });
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
};

export const calculateMA = (candles: Candle[], period: number): number[] => {
  return candles.map((_, i) => {
    if (i < period - 1) return candles[i].close;
    const slice = candles.slice(i - period + 1, i + 1);
    return slice.reduce((sum, c) => sum + c.close, 0) / period;
  });
};

export const calculateEMA = (candles: Candle[], period: number): number[] => {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  candles.forEach((candle, i) => {
    if (i === 0) {
      ema.push(candle.close);
    } else {
      ema.push((candle.close - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  });
  
  return ema;
};

export const calculateBollingerBands = (candles: Candle[], period: number = 20, stdDev: number = 2) => {
  const ma = calculateMA(candles, period);
  
  return candles.map((_, i) => {
    if (i < period - 1) {
      return { upper: ma[i] * 1.02, middle: ma[i], lower: ma[i] * 0.98 };
    }
    
    const slice = candles.slice(i - period + 1, i + 1);
    const avg = ma[i];
    const variance = slice.reduce((sum, c) => sum + Math.pow(c.close - avg, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    return {
      upper: avg + stdDev * std,
      middle: avg,
      lower: avg - stdDev * std,
    };
  });
};

export function useCandlestickData(symbol: string, currentPrice: number, timeframe: TimeFrame = '5m') {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastPriceRef = useRef(currentPrice);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize with historical data
  useEffect(() => {
    setIsLoading(true);
    const historical = generateHistoricalCandles(currentPrice, timeframe, 100);
    setCandles(historical);
    lastPriceRef.current = historical[historical.length - 1]?.close || currentPrice;
    setIsLoading(false);
  }, [symbol, timeframe]);
  
  // Update candles in real-time
  useEffect(() => {
    const updateInterval = timeframe === '1m' ? 2000 : timeframe === '5m' ? 5000 : 10000;
    
    intervalRef.current = setInterval(() => {
      setCandles(prev => {
        if (prev.length === 0) return prev;
        
        const now = Date.now();
        const interval = timeFrameToMs[timeframe];
        const lastCandle = prev[prev.length - 1];
        
        // Check if we need a new candle
        if (now - lastCandle.time >= interval) {
          // Create new candle
          const newOpen = lastCandle.close;
          const volatility = 0.002 + Math.random() * 0.005;
          const newClose = generatePriceMovement(newOpen, volatility);
          const newHigh = Math.max(newOpen, newClose) * (1 + Math.random() * 0.001);
          const newLow = Math.min(newOpen, newClose) * (1 - Math.random() * 0.001);
          
          const newCandle: Candle = {
            time: now,
            open: newOpen,
            high: newHigh,
            low: newLow,
            close: newClose,
            volume: 100 + Math.random() * 500,
          };
          
          lastPriceRef.current = newClose;
          return [...prev.slice(-99), newCandle];
        } else {
          // Update current candle
          const updated = [...prev];
          const current = { ...updated[updated.length - 1] };
          
          const volatility = 0.001 + Math.random() * 0.002;
          current.close = generatePriceMovement(current.close, volatility);
          current.high = Math.max(current.high, current.close);
          current.low = Math.min(current.low, current.close);
          current.volume += Math.random() * 10;
          
          lastPriceRef.current = current.close;
          updated[updated.length - 1] = current;
          return updated;
        }
      });
    }, updateInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeframe]);
  
  // Calculate indicators
  const indicators = useCallback(() => {
    if (candles.length < 20) return null;
    
    return {
      rsi: calculateRSI(candles),
      ma20: calculateMA(candles, 20),
      ma50: calculateMA(candles, 50),
      ema12: calculateEMA(candles, 12),
      ema26: calculateEMA(candles, 26),
      bollingerBands: calculateBollingerBands(candles),
    };
  }, [candles]);
  
  return {
    candles,
    indicators: indicators(),
    isLoading,
    currentPrice: lastPriceRef.current,
  };
}
