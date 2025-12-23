// Trading strategy implementations with realistic behavior

export interface TradeSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  reason: string;
}

export interface TradeResult {
  isWin: boolean;
  profitPercent: number;
  slippage: number;
  spread: number;
  netProfit: number;
}

// Market noise simulation
const getMarketNoise = (): number => {
  return (Math.random() - 0.5) * 0.02; // ±1% noise
};

// Slippage calculation based on market conditions
const calculateSlippage = (volatility: number): number => {
  const baseSlippage = 0.001; // 0.1% base
  return baseSlippage + (Math.random() * volatility * 0.005);
};

// Spread calculation
const calculateSpread = (): number => {
  return 0.0005 + Math.random() * 0.001; // 0.05% to 0.15%
};

// RSI indicator simulation
const calculateRSI = (recentChanges: number[]): number => {
  if (recentChanges.length < 14) return 50;
  
  let gains = 0, losses = 0;
  recentChanges.slice(-14).forEach(change => {
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  });
  
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

// Moving average crossover detection
const detectMACrossover = (shortMA: number, longMA: number, prevShortMA: number, prevLongMA: number): 'bullish' | 'bearish' | 'none' => {
  if (prevShortMA <= prevLongMA && shortMA > longMA) return 'bullish';
  if (prevShortMA >= prevLongMA && shortMA < longMA) return 'bearish';
  return 'none';
};

// ============ ARBITRAGE BOT STRATEGY ============
// Detects price differences between simulated markets
// Lower risk, smaller but frequent profits
// Can incur losses if spread closes late

export interface ArbitrageOpportunity {
  market1Price: number;
  market2Price: number;
  spreadPercent: number;
  profitable: boolean;
}

export const findArbitrageOpportunity = (basePrice: number): ArbitrageOpportunity => {
  // Simulate two different market prices with slight variations
  const priceVariance1 = 1 + (Math.random() - 0.5) * 0.006; // ±0.3%
  const priceVariance2 = 1 + (Math.random() - 0.5) * 0.006;
  
  const market1Price = basePrice * priceVariance1;
  const market2Price = basePrice * priceVariance2;
  
  const spreadPercent = Math.abs((market1Price - market2Price) / basePrice) * 100;
  const profitable = spreadPercent > 0.1; // Need at least 0.1% spread to profit
  
  return { market1Price, market2Price, spreadPercent, profitable };
};

export const executeArbitrageTrade = (stakeAmount: number, basePrice: number): TradeResult => {
  const opportunity = findArbitrageOpportunity(basePrice);
  const slippage = calculateSlippage(0.3);
  const spread = calculateSpread();
  
  // Arbitrage success depends on timing and spread
  // 65% base win rate, adjusted by opportunity quality
  const adjustedWinRate = opportunity.profitable ? 0.70 : 0.45;
  const isWin = Math.random() < adjustedWinRate;
  
  let profitPercent: number;
  if (isWin) {
    // Arbitrage profits are small but consistent (0.5% to 2%)
    profitPercent = 0.005 + Math.random() * 0.015;
  } else {
    // Losses occur when spread closes before execution (-0.8% to -2.5%)
    profitPercent = -(0.008 + Math.random() * 0.017);
  }
  
  // Apply market friction
  const frictionCost = slippage + spread;
  const netProfitPercent = profitPercent - frictionCost + getMarketNoise();
  let netProfit = stakeAmount * netProfitPercent;
  
  // Ensure minimum profit/loss of $0.15 to avoid $0.00 trades
  if (Math.abs(netProfit) < 0.15) {
    netProfit = isWin ? (0.15 + Math.random() * 0.35) : -(0.15 + Math.random() * 0.35);
  }
  
  return {
    isWin: netProfit > 0,
    profitPercent: netProfitPercent * 100,
    slippage,
    spread,
    netProfit
  };
};

// ============ SCALPING BOT STRATEGY ============
// High frequency, many fast trades
// Uses small price movements
// Can lose during volatile or sideways markets

export interface ScalpingConditions {
  volatility: number;
  momentum: number;
  isSideways: boolean;
}

export const analyzeScalpingConditions = (): ScalpingConditions => {
  const volatility = Math.random(); // 0-1 scale
  const momentum = (Math.random() - 0.5) * 2; // -1 to 1
  const isSideways = Math.abs(momentum) < 0.2;
  
  return { volatility, momentum, isSideways };
};

export const executeScalpingTrade = (stakeAmount: number): TradeResult => {
  const conditions = analyzeScalpingConditions();
  const slippage = calculateSlippage(conditions.volatility);
  const spread = calculateSpread();
  
  // Scalping struggles in sideways and high volatility markets
  let baseWinRate = 0.58;
  if (conditions.isSideways) baseWinRate -= 0.15;
  if (conditions.volatility > 0.7) baseWinRate -= 0.10;
  if (Math.abs(conditions.momentum) > 0.5) baseWinRate += 0.08;
  
  const isWin = Math.random() < Math.max(0.35, Math.min(0.72, baseWinRate));
  
  let profitPercent: number;
  if (isWin) {
    // Quick small profits (0.8% to 3%)
    profitPercent = 0.008 + Math.random() * 0.022;
  } else {
    // Losses can be larger due to tight stop-loss triggers (-1% to -4%)
    profitPercent = -(0.01 + Math.random() * 0.03);
  }
  
  const frictionCost = slippage + spread;
  const netProfitPercent = profitPercent - frictionCost + getMarketNoise();
  let netProfit = stakeAmount * netProfitPercent;
  
  // Ensure minimum profit/loss of $0.20 to avoid $0.00 trades
  if (Math.abs(netProfit) < 0.20) {
    netProfit = isWin ? (0.20 + Math.random() * 0.40) : -(0.20 + Math.random() * 0.40);
  }
  
  return {
    isWin: netProfit > 0,
    profitPercent: netProfitPercent * 100,
    slippage,
    spread,
    netProfit
  };
};

// ============ SIGNAL-BASED BOT STRATEGY ============
// Uses RSI, Moving Averages, Pattern Recognition
// Trades only when signals align
// Slower but more strategic

export interface SignalAnalysis {
  rsi: number;
  rsiSignal: 'oversold' | 'overbought' | 'neutral';
  maCrossover: 'bullish' | 'bearish' | 'none';
  pattern: string | null;
  overallSignal: TradeSignal;
}

const patterns = [
  { name: 'Double Bottom', bullish: true },
  { name: 'Double Top', bullish: false },
  { name: 'Bull Flag', bullish: true },
  { name: 'Bear Flag', bullish: false },
  { name: 'Triangle Breakout', bullish: true },
  { name: 'Head & Shoulders', bullish: false },
];

export const analyzeSignals = (): SignalAnalysis => {
  // Simulate recent price changes
  const recentChanges = Array.from({ length: 20 }, () => (Math.random() - 0.5) * 4);
  
  // Calculate RSI
  const rsi = calculateRSI(recentChanges);
  let rsiSignal: 'oversold' | 'overbought' | 'neutral' = 'neutral';
  if (rsi < 30) rsiSignal = 'oversold';
  if (rsi > 70) rsiSignal = 'overbought';
  
  // Simulate MA crossover
  const shortMA = 100 + (Math.random() - 0.5) * 10;
  const longMA = 100 + (Math.random() - 0.5) * 8;
  const prevShortMA = shortMA + (Math.random() - 0.5) * 3;
  const prevLongMA = longMA + (Math.random() - 0.5) * 2;
  const maCrossover = detectMACrossover(shortMA, longMA, prevShortMA, prevLongMA);
  
  // Pattern detection (random but weighted)
  const patternDetected = Math.random() < 0.3; // 30% chance to detect pattern
  const pattern = patternDetected ? patterns[Math.floor(Math.random() * patterns.length)] : null;
  
  // Calculate overall signal
  let buyPoints = 0, sellPoints = 0;
  
  if (rsiSignal === 'oversold') buyPoints += 2;
  if (rsiSignal === 'overbought') sellPoints += 2;
  if (maCrossover === 'bullish') buyPoints += 3;
  if (maCrossover === 'bearish') sellPoints += 3;
  if (pattern?.bullish) buyPoints += 2;
  if (pattern && !pattern.bullish) sellPoints += 2;
  
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let confidence = 50;
  let reason = 'No clear signals';
  
  if (buyPoints >= 4 && buyPoints > sellPoints) {
    action = 'BUY';
    confidence = Math.min(90, 50 + buyPoints * 8);
    reason = `Bullish: RSI ${rsi.toFixed(0)}, ${maCrossover === 'bullish' ? 'MA crossover' : ''}${pattern?.bullish ? `, ${pattern.name}` : ''}`;
  } else if (sellPoints >= 4 && sellPoints > buyPoints) {
    action = 'SELL';
    confidence = Math.min(90, 50 + sellPoints * 8);
    reason = `Bearish: RSI ${rsi.toFixed(0)}, ${maCrossover === 'bearish' ? 'MA crossover' : ''}${pattern && !pattern.bullish ? `, ${pattern.name}` : ''}`;
  }
  
  return {
    rsi,
    rsiSignal,
    maCrossover,
    pattern: pattern?.name || null,
    overallSignal: { action, confidence, reason }
  };
};

export const executeSignalTrade = (stakeAmount: number): TradeResult => {
  const analysis = analyzeSignals();
  const slippage = calculateSlippage(0.4);
  const spread = calculateSpread();
  
  // Signal-based trades only execute when there's a clear signal
  if (analysis.overallSignal.action === 'HOLD') {
    return {
      isWin: false,
      profitPercent: 0,
      slippage: 0,
      spread: 0,
      netProfit: 0
    };
  }
  
  // Win rate based on confidence
  const baseWinRate = 0.55 + (analysis.overallSignal.confidence / 100) * 0.25;
  const isWin = Math.random() < baseWinRate;
  
  let profitPercent: number;
  if (isWin) {
    // Signal trades aim for bigger profits (1.5% to 6%)
    profitPercent = 0.015 + Math.random() * 0.045;
  } else {
    // But losses can also be bigger (-1.5% to -5%)
    profitPercent = -(0.015 + Math.random() * 0.035);
  }
  
  const frictionCost = slippage + spread;
  const netProfitPercent = profitPercent - frictionCost + getMarketNoise();
  let netProfit = stakeAmount * netProfitPercent;
  
  // Ensure minimum profit/loss of $0.25 to avoid $0.00 trades
  if (Math.abs(netProfit) < 0.25) {
    netProfit = isWin ? (0.25 + Math.random() * 0.50) : -(0.25 + Math.random() * 0.50);
  }
  
  return {
    isWin: netProfit > 0,
    profitPercent: netProfitPercent * 100,
    slippage,
    spread,
    netProfit
  };
};

// Get bot strategy info
export type BotStrategy = 'arbitrage' | 'scalping' | 'signal';

export const getBotStrategyInfo = (strategy: BotStrategy) => {
  switch (strategy) {
    case 'arbitrage':
      return {
        name: 'Arbitrage Bot',
        description: 'Detects price differences across markets. Lower risk, smaller frequent profits.',
        risk: 'low' as const,
        tradeFrequency: 'high',
        expectedWinRate: 65,
        icon: '⚖️'
      };
    case 'scalping':
      return {
        name: 'Scalping Bot',
        description: 'Fast trades on small price movements. High frequency, tight stop-loss.',
        risk: 'high' as const,
        tradeFrequency: 'very high',
        expectedWinRate: 58,
        icon: '⚡'
      };
    case 'signal':
      return {
        name: 'Signal Bot',
        description: 'Uses RSI, MA crossovers, and patterns. Trades only when signals align.',
        risk: 'medium' as const,
        tradeFrequency: 'low',
        expectedWinRate: 68,
        icon: '📊'
      };
  }
};

export const executeBotTrade = (strategy: BotStrategy, stakeAmount: number, basePrice: number = 50000): TradeResult => {
  switch (strategy) {
    case 'arbitrage':
      return executeArbitrageTrade(stakeAmount, basePrice);
    case 'scalping':
      return executeScalpingTrade(stakeAmount);
    case 'signal':
      return executeSignalTrade(stakeAmount);
  }
};
