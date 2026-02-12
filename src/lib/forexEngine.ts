// =====================================================
// PROFESSIONAL FOREX TRADING ENGINE
// Modular market analysis, risk management, and execution
// =====================================================

import { getTradeOutcome } from './tradeOutcome';

// ===================== TYPES =====================

export interface ForexPairConfig {
  symbol: string;
  name: string;
  code: string;
  basePrice: number;
  decimals: number;
  risk: number;         // % risk per trade
  maxSpread: number;    // max allowed spread in pips
  pipValue: number;     // value per pip per standard lot
}

export interface MarketSignal {
  direction: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;   // 0–100
  stopLossPips: number;
  takeProfitPips: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  momentum: 'STRONG' | 'MODERATE' | 'WEAK';
  volatility: 'HIGH' | 'MEDIUM' | 'LOW';
  spread: number;
}

export interface LotSizeResult {
  lotSize: number;
  riskAmount: number;
}

export interface PayoutResult {
  potentialProfit: number;
  potentialLoss: number;
  riskReward: number;
}

export interface TradeLog {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  lotSize: number;
  entry: number;
  exit: number | null;
  profitLoss: number;
  timestamp: number;
  status: 'open' | 'closed';
  stopLoss: number;
  takeProfit: number;
  signal: MarketSignal;
}

export interface AccountProtection {
  dailyLossPercent: number;
  maxOpenTrades: number;
  consecutiveLosses: number;
  maxConsecutiveLosses: number;
  dailyStartBalance: number;
  isPaused: boolean;
  pauseReason: string | null;
}

// ===================== PAIR CONFIGS =====================

export const FOREX_PAIRS: ForexPairConfig[] = [
  { symbol: 'EUR/USD', name: 'Euro vs US Dollar', code: 'EURUSD.s', basePrice: 1.13661, decimals: 5, risk: 1, maxSpread: 20, pipValue: 10 },
  { symbol: 'GBP/USD', name: 'Pound vs US Dollar', code: 'GBPUSD.s', basePrice: 1.2645, decimals: 5, risk: 1.5, maxSpread: 25, pipValue: 10 },
  { symbol: 'USD/JPY', name: 'US Dollar vs Yen', code: 'USDJPY.s', basePrice: 149.85, decimals: 3, risk: 1, maxSpread: 20, pipValue: 6.67 },
  { symbol: 'XAU/USD', name: 'Gold vs US Dollar', code: 'XAUUSD.s', basePrice: 2778.50, decimals: 2, risk: 2, maxSpread: 50, pipValue: 10 },
  { symbol: 'AUD/USD', name: 'Australian Dollar vs US Dollar', code: 'AUDUSD.s', basePrice: 0.6542, decimals: 5, risk: 1, maxSpread: 20, pipValue: 10 },
];

// ===================== PRICE HISTORY =====================

const priceHistory: Map<string, number[]> = new Map();

export function updatePriceHistory(symbol: string, price: number): void {
  const history = priceHistory.get(symbol) || [];
  history.push(price);
  // Keep last 250 candles for indicator calculations
  if (history.length > 250) history.shift();
  priceHistory.set(symbol, history);
}

export function getPriceHistory(symbol: string): number[] {
  return priceHistory.get(symbol) || [];
}

// Initialize price history with simulated data
export function initializePriceHistory(pair: ForexPairConfig): void {
  const prices: number[] = [];
  let price = pair.basePrice;
  const volatility = pair.symbol.includes('XAU') ? 2.0 : pair.symbol.includes('JPY') ? 0.3 : 0.001;
  
  for (let i = 0; i < 220; i++) {
    price += (Math.random() - 0.5) * volatility;
    prices.push(price);
  }
  priceHistory.set(pair.symbol, prices);
}

// ===================== INDICATORS =====================

function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calculateRSI(data: number[], period: number = 14): number {
  if (data.length < period + 1) return 50;
  const changes = [];
  for (let i = data.length - period - 1; i < data.length - 1; i++) {
    changes.push(data[i + 1] - data[i]);
  }
  const gains = changes.filter(c => c > 0);
  const losses = changes.filter(c => c < 0).map(c => Math.abs(c));
  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(data: number[]): { line: number; signal: number; histogram: number } {
  if (data.length < 26) return { line: 0, signal: 0, histogram: 0 };
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine = ema12 - ema26;
  
  // Signal line (9-period EMA of MACD values) - simplified
  const macdValues: number[] = [];
  for (let i = Math.max(0, data.length - 9); i < data.length; i++) {
    const e12 = calculateEMA(data.slice(0, i + 1), 12);
    const e26 = calculateEMA(data.slice(0, i + 1), 26);
    macdValues.push(e12 - e26);
  }
  const signalLine = macdValues.length > 0 
    ? macdValues.reduce((a, b) => a + b, 0) / macdValues.length 
    : 0;
  
  return { line: macdLine, signal: signalLine, histogram: macdLine - signalLine };
}

// ===================== MARKET ANALYSIS =====================

export function analyzePair(pair: ForexPairConfig): MarketSignal {
  const prices = getPriceHistory(pair.symbol);
  const currentPrice = prices[prices.length - 1] || pair.basePrice;
  
  const ema50 = calculateEMA(prices, 50);
  const ema200 = calculateEMA(prices, 200);
  const rsi = calculateRSI(prices);
  const macd = calculateMACD(prices);
  
  // Spread simulation
  const spreadMultiplier = pair.symbol.includes('XAU') ? 3 : 1;
  const spread = Math.random() * pair.maxSpread * 0.8 * spreadMultiplier;
  
  // Trend detection
  const trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 
    ema50 > ema200 * 1.0001 ? 'BULLISH' : 
    ema50 < ema200 * 0.9999 ? 'BEARISH' : 'NEUTRAL';
  
  // Momentum
  const momentum: 'STRONG' | 'MODERATE' | 'WEAK' =
    Math.abs(macd.histogram) > 0.0005 ? 'STRONG' :
    Math.abs(macd.histogram) > 0.0002 ? 'MODERATE' : 'WEAK';
  
  // Volatility
  const recentPrices = prices.slice(-20);
  const priceRange = recentPrices.length > 1 
    ? (Math.max(...recentPrices) - Math.min(...recentPrices)) / currentPrice * 100 
    : 0;
  const volatility: 'HIGH' | 'MEDIUM' | 'LOW' = 
    priceRange > 1.5 ? 'HIGH' : priceRange > 0.5 ? 'MEDIUM' : 'LOW';
  
  // Signal generation
  let confidence = 0;
  let direction: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  
  // BUY conditions
  if (ema50 > ema200 && rsi > 50 && macd.histogram > 0) {
    direction = 'BUY';
    confidence += 25; // EMA alignment
    confidence += rsi > 55 ? 20 : 10; // RSI strength
    confidence += macd.histogram > 0 ? 20 : 0; // MACD confirmation
    confidence += momentum === 'STRONG' ? 15 : momentum === 'MODERATE' ? 10 : 5;
    confidence += spread < pair.maxSpread ? 10 : -20;
  }
  // SELL conditions
  else if (ema50 < ema200 && rsi < 50 && macd.histogram < 0) {
    direction = 'SELL';
    confidence += 25;
    confidence += rsi < 45 ? 20 : 10;
    confidence += macd.histogram < 0 ? 20 : 0;
    confidence += momentum === 'STRONG' ? 15 : momentum === 'MODERATE' ? 10 : 5;
    confidence += spread < pair.maxSpread ? 10 : -20;
  }
  
  confidence = Math.min(100, Math.max(0, confidence));
  
  // SL/TP based on volatility
  const atr = priceRange * currentPrice / 100;
  const pipMultiplier = pair.symbol.includes('JPY') ? 100 : pair.symbol.includes('XAU') ? 1 : 10000;
  const stopLossPips = Math.max(15, Math.round(atr * pipMultiplier * 1.5));
  const takeProfitPips = Math.round(stopLossPips * 2); // 1:2 risk-reward
  
  return {
    direction: confidence >= 70 && spread < pair.maxSpread ? direction : 'WAIT',
    confidence,
    stopLossPips,
    takeProfitPips,
    ema50,
    ema200,
    rsi: parseFloat(rsi.toFixed(2)),
    macdLine: macd.line,
    macdSignal: macd.signal,
    macdHistogram: macd.histogram,
    trend,
    momentum,
    volatility,
    spread: parseFloat(spread.toFixed(1)),
  };
}

// ===================== LOT SIZE =====================

export function calculateLotSize(
  balance: number,
  riskPercent: number,
  stopLossPips: number,
  pipValue: number
): LotSizeResult {
  const riskAmount = balance * (riskPercent / 100);
  const rawLotSize = riskAmount / (stopLossPips * pipValue);
  const lotSize = Math.max(0.01, parseFloat(rawLotSize.toFixed(2)));
  return { lotSize, riskAmount: parseFloat(riskAmount.toFixed(2)) };
}

// ===================== PAYOUT =====================

export function calculatePayout(
  lotSize: number,
  takeProfitPips: number,
  stopLossPips: number,
  pipValue: number
): PayoutResult {
  const potentialProfit = parseFloat((lotSize * takeProfitPips * pipValue).toFixed(2));
  const potentialLoss = parseFloat((lotSize * stopLossPips * pipValue).toFixed(2));
  const riskReward = parseFloat((takeProfitPips / stopLossPips).toFixed(2));
  return { potentialProfit, potentialLoss, riskReward };
}

// ===================== ACCOUNT PROTECTION =====================

export function createAccountProtection(balance: number): AccountProtection {
  return {
    dailyLossPercent: 0,
    maxOpenTrades: 3,
    consecutiveLosses: 0,
    maxConsecutiveLosses: 3,
    dailyStartBalance: balance,
    isPaused: false,
    pauseReason: null,
  };
}

export function checkProtection(
  protection: AccountProtection,
  currentBalance: number,
  openTradeCount: number
): { canTrade: boolean; reason: string | null } {
  const dailyLoss = ((protection.dailyStartBalance - currentBalance) / protection.dailyStartBalance) * 100;
  
  if (dailyLoss >= 5) {
    return { canTrade: false, reason: 'Daily loss limit (5%) reached' };
  }
  if (openTradeCount >= protection.maxOpenTrades) {
    return { canTrade: false, reason: `Max open trades (${protection.maxOpenTrades}) reached` };
  }
  if (protection.consecutiveLosses >= protection.maxConsecutiveLosses) {
    return { canTrade: false, reason: `${protection.maxConsecutiveLosses} consecutive losses - auto paused` };
  }
  if (protection.isPaused) {
    return { canTrade: false, reason: protection.pauseReason || 'Bot is paused' };
  }
  return { canTrade: true, reason: null };
}

// ===================== ANALYTICS =====================

export function calculateAnalytics(logs: TradeLog[]): {
  winRate: number;
  netProfit: number;
  totalTrades: number;
  maxDrawdown: number;
  profitByPair: Record<string, number>;
} {
  const closed = logs.filter(l => l.status === 'closed');
  const wins = closed.filter(l => l.profitLoss > 0);
  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
  const netProfit = closed.reduce((sum, l) => sum + l.profitLoss, 0);
  
  // Max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let running = 0;
  for (const log of closed) {
    running += log.profitLoss;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }
  
  // Profit by pair
  const profitByPair: Record<string, number> = {};
  for (const log of closed) {
    profitByPair[log.pair] = (profitByPair[log.pair] || 0) + log.profitLoss;
  }
  
  return {
    winRate: parseFloat(winRate.toFixed(1)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    totalTrades: closed.length,
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    profitByPair,
  };
}
