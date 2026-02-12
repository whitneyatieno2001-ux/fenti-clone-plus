import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getTradeOutcome } from '@/lib/tradeOutcome';
import { TradingViewWidget } from '@/components/TradingViewWidget';
import {
  FOREX_PAIRS,
  analyzePair,
  calculateLotSize,
  calculatePayout,
  createAccountProtection,
  checkProtection,
  calculateAnalytics,
  initializePriceHistory,
  updatePriceHistory,
  type ForexPairConfig,
  type MarketSignal,
  type TradeLog,
  type AccountProtection,
} from '@/lib/forexEngine';
import {
  ChevronUp, ChevronDown, X, Settings, Play, Pause,
  TrendingUp, TrendingDown, Shield, Activity, BarChart3,
  AlertTriangle, CheckCircle, Zap, Target,
} from 'lucide-react';

type ActiveTab = 'chart' | 'trade' | 'signals' | 'logs';

export default function ForexBot() {
  const navigate = useNavigate();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();
  const { toast } = useToast();

  // Core state
  const [activeTab, setActiveTab] = useState<ActiveTab>('chart');
  const [selectedPair, setSelectedPair] = useState(FOREX_PAIRS[0]);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Bot state
  const [isRunning, setIsRunning] = useState(false);
  const [signals, setSignals] = useState<Map<string, MarketSignal>>(new Map());
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [protection, setProtection] = useState<AccountProtection>(createAccountProtection(currentBalance));

  // Price state
  const [livePrices, setLivePrices] = useState<Map<string, number>>(new Map());
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');

  // Settings
  const [takeProfitTarget, setTakeProfitTarget] = useState('40');
  const [positionsToOpen, setPositionsToOpen] = useState('1');
  const [lotSize, setLotSize] = useState(1);

  // Refs
  const tradeLogsRef = useRef(tradeLogs);
  const protectionRef = useRef(protection);
  const isRunningRef = useRef(isRunning);

  useEffect(() => { tradeLogsRef.current = tradeLogs; }, [tradeLogs]);
  useEffect(() => { protectionRef.current = protection; }, [protection]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  // Initialize price history
  useEffect(() => {
    FOREX_PAIRS.forEach(pair => {
      initializePriceHistory(pair);
      setLivePrices(prev => new Map(prev).set(pair.symbol, pair.basePrice));
    });
  }, []);

  // Live price simulation
  useEffect(() => {
    const interval = setInterval(() => {
      FOREX_PAIRS.forEach(pair => {
        const volatility = pair.symbol.includes('XAU') ? 0.5 : pair.symbol.includes('JPY') ? 0.05 : 0.00005;
        const change = (Math.random() - 0.5) * volatility;
        setLivePrices(prev => {
          const current = prev.get(pair.symbol) || pair.basePrice;
          const newPrice = current + change;
          updatePriceHistory(pair.symbol, newPrice);
          return new Map(prev).set(pair.symbol, newPrice);
        });
        if (pair.symbol === selectedPair.symbol) {
          setPriceDirection(change > 0 ? 'up' : 'down');
        }
      });
    }, 500);
    return () => clearInterval(interval);
  }, [selectedPair]);

  // Signal analysis loop (runs every 3 seconds when bot is on)
  useEffect(() => {
    if (!isRunning) return;
    const analyze = () => {
      const newSignals = new Map<string, MarketSignal>();
      FOREX_PAIRS.forEach(pair => {
        const signal = analyzePair(pair);
        newSignals.set(pair.symbol, signal);
      });
      setSignals(newSignals);
    };
    analyze();
    const interval = setInterval(analyze, 3000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Auto-execution loop
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      if (!isRunningRef.current) return;
      const openTrades = tradeLogsRef.current.filter(l => l.status === 'open');
      
      signals.forEach((signal, symbol) => {
        if (signal.direction === 'WAIT' || signal.confidence < 70) return;
        
        const pair = FOREX_PAIRS.find(p => p.symbol === symbol);
        if (!pair) return;

        // Check if pair already has open trade
        if (openTrades.some(t => t.pair === symbol)) return;

        // Check protection
        const { canTrade, reason } = checkProtection(protectionRef.current, currentBalance, openTrades.length);
        if (!canTrade) return;

        // Calculate lot size
        const { lotSize: calcLot } = calculateLotSize(currentBalance, pair.risk, signal.stopLossPips, pair.pipValue);
        const currentPrice = livePrices.get(symbol) || pair.basePrice;

        // Execute trade
        const trade: TradeLog = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
          pair: symbol,
          direction: signal.direction,
          lotSize: calcLot,
          entry: currentPrice,
          exit: null,
          profitLoss: 0,
          timestamp: Date.now(),
          status: 'open',
          stopLoss: signal.direction === 'BUY' 
            ? currentPrice - (signal.stopLossPips / (pair.symbol.includes('JPY') ? 100 : 10000))
            : currentPrice + (signal.stopLossPips / (pair.symbol.includes('JPY') ? 100 : 10000)),
          takeProfit: signal.direction === 'BUY'
            ? currentPrice + (signal.takeProfitPips / (pair.symbol.includes('JPY') ? 100 : 10000))
            : currentPrice - (signal.takeProfitPips / (pair.symbol.includes('JPY') ? 100 : 10000)),
          signal,
        };

        setTradeLogs(prev => [...prev, trade]);
        toast({ title: `🤖 ${signal.direction} ${symbol}`, description: `Confidence: ${signal.confidence}% | Lot: ${calcLot}` });

        // Log to DB
        if (user) {
          supabase.from('transactions').insert({
            user_id: user.id, type: 'bot_trade', amount: 0, currency: 'USD', status: 'completed',
            description: `Forex Bot: ${signal.direction} ${symbol} @ ${currentPrice.toFixed(pair.decimals)} | Conf: ${signal.confidence}%`,
            account_type: accountType, profit_loss: 0,
          }).then(() => {});
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isRunning, signals, currentBalance, livePrices, user, accountType]);

  // P/L update loop for open trades
  useEffect(() => {
    const openTrades = tradeLogs.filter(l => l.status === 'open');
    if (openTrades.length === 0) return;

    const interval = setInterval(() => {
      setTradeLogs(prev => prev.map(trade => {
        if (trade.status !== 'open') return trade;
        const pair = FOREX_PAIRS.find(p => p.symbol === trade.pair);
        if (!pair) return trade;

        const currentPrice = livePrices.get(trade.pair) || trade.entry;
        const outcome = getTradeOutcome({ accountType, userEmail });
        const bias = outcome === 'win' ? 0.55 : 0.42;
        const vol = pair.symbol.includes('XAU') ? 0.8 : 0.0003;
        const change = (Math.random() - bias) * vol;
        const newPrice = currentPrice + change;
        
        const priceDiff = trade.direction === 'BUY' ? newPrice - trade.entry : trade.entry - newPrice;
        const multiplier = pair.symbol.includes('XAU') ? 100 : pair.symbol.includes('JPY') ? 1000 : 100000;
        const profitLoss = parseFloat((priceDiff * trade.lotSize * multiplier).toFixed(2));

        // Auto-close on TP/SL
        if (trade.direction === 'BUY') {
          if (newPrice >= trade.takeProfit || newPrice <= trade.stopLoss) {
            closeTrade(trade.id, profitLoss);
            return trade;
          }
        } else {
          if (newPrice <= trade.takeProfit || newPrice >= trade.stopLoss) {
            closeTrade(trade.id, profitLoss);
            return trade;
          }
        }

        return { ...trade, profitLoss };
      }));
    }, 400);
    return () => clearInterval(interval);
  }, [tradeLogs.filter(l => l.status === 'open').length, accountType, userEmail, livePrices]);

  const closeTrade = async (tradeId: string, finalPL?: number) => {
    const trade = tradeLogsRef.current.find(t => t.id === tradeId);
    if (!trade || trade.status !== 'open') return;

    const pl = finalPL ?? trade.profitLoss;
    const minPL = pl === 0 ? (Math.random() > 0.5 ? 0.15 + Math.random() * 0.1 : -(0.15 + Math.random() * 0.1)) : pl;

    if (minPL !== 0) {
      const op = minPL > 0 ? 'add' : 'subtract';
      await updateBalance(accountType, Math.abs(minPL), op);
    }

    // Update protection
    setProtection(prev => ({
      ...prev,
      consecutiveLosses: minPL < 0 ? prev.consecutiveLosses + 1 : 0,
    }));

    setTradeLogs(prev => prev.map(t => 
      t.id === tradeId ? { ...t, status: 'closed' as const, profitLoss: minPL, exit: livePrices.get(t.pair) || t.entry } : t
    ));

    if (user) {
      await supabase.from('transactions').insert({
        user_id: user.id, type: 'bot_trade', amount: Math.abs(minPL), currency: 'USD', status: 'completed',
        description: `Forex Bot: Closed ${trade.direction} ${trade.pair} P/L: ${minPL >= 0 ? '+' : ''}$${minPL.toFixed(2)}`,
        account_type: accountType, profit_loss: minPL,
      });
    }

    toast({
      title: minPL >= 0 ? '💰 Trade Closed - Profit' : '📉 Trade Closed - Loss',
      description: `${trade.pair}: ${minPL >= 0 ? '+' : ''}$${minPL.toFixed(2)}`,
    });
  };

  const manualOpen = async (direction: 'buy' | 'sell') => {
    if (currentBalance < 1) return;
    const count = Math.max(1, parseInt(positionsToOpen) || 1);
    const currentPrice = livePrices.get(selectedPair.symbol) || selectedPair.basePrice;
    const spread = selectedPair.symbol.includes('XAU') ? 0.14 : 0.00006;

    for (let i = 0; i < count; i++) {
      const entry = direction === 'buy' ? currentPrice + spread : currentPrice;
      const trade: TradeLog = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6) + i,
        pair: selectedPair.symbol,
        direction: direction === 'buy' ? 'BUY' : 'SELL',
        lotSize,
        entry,
        exit: null,
        profitLoss: 0,
        timestamp: Date.now(),
        status: 'open',
        stopLoss: direction === 'buy' ? entry - 0.005 : entry + 0.005,
        takeProfit: direction === 'buy' ? entry + 0.01 : entry - 0.01,
        signal: { direction: direction === 'buy' ? 'BUY' : 'SELL', confidence: 0, stopLossPips: 50, takeProfitPips: 100, ema50: 0, ema200: 0, rsi: 50, macdLine: 0, macdSignal: 0, macdHistogram: 0, trend: 'NEUTRAL', momentum: 'MODERATE', volatility: 'MEDIUM', spread: 0 },
      };
      setTradeLogs(prev => [...prev, trade]);
    }
    toast({ title: `${direction.toUpperCase()} Order Placed`, description: `${selectedPair.symbol} × ${count}` });
  };

  const adjustLotSize = (dir: 'up' | 'down') => {
    if (dir === 'up') setLotSize(prev => Math.min(prev + 1, 100));
    else setLotSize(prev => Math.max(prev - 1, 1));
  };

  const formatPrice = (price: number) => price.toFixed(selectedPair.decimals);
  const formatBalance = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const openTrades = tradeLogs.filter(l => l.status === 'open');
  const totalPL = openTrades.reduce((sum, t) => sum + t.profitLoss, 0);
  const equity = currentBalance + totalPL;
  const usedMargin = openTrades.reduce((sum, t) => sum + t.lotSize * 1000, 0);
  const freeMargin = equity - usedMargin;
  const analytics = calculateAnalytics(tradeLogs);

  const currentSignal = signals.get(selectedPair.symbol);
  const buyPrice = (livePrices.get(selectedPair.symbol) || selectedPair.basePrice) + (selectedPair.symbol.includes('XAU') ? 0.14 : 0.00006);
  const sellPrice = livePrices.get(selectedPair.symbol) || selectedPair.basePrice;

  // Payout preview
  const { lotSize: autoLot, riskAmount } = calculateLotSize(currentBalance, selectedPair.risk, currentSignal?.stopLossPips || 30, selectedPair.pipValue);
  const payout = calculatePayout(autoLot, currentSignal?.takeProfitPips || 60, currentSignal?.stopLossPips || 30, selectedPair.pipValue);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Price Bar - only on Chart tab */}
      {activeTab === 'chart' && (
        <>
          <div className="bg-white px-3 py-1 border-b border-gray-200 flex items-center justify-between">
            <button onClick={() => setShowPairSelector(true)} className="text-left">
              <span className="text-black text-xs font-medium">{selectedPair.code} ▾ M30</span>
              <br />
              <span className="text-gray-500 text-[10px]">{selectedPair.name}</span>
            </button>
            <button
              onClick={() => { setIsRunning(!isRunning); if (!isRunning) setProtection(createAccountProtection(currentBalance)); }}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-colors",
                isRunning ? "bg-red-500 text-white" : "bg-green-500 text-white"
              )}
            >
              {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {isRunning ? 'STOP BOT' : 'START BOT'}
            </button>
          </div>
          <div className="bg-[#e8e8e8] flex items-center justify-between px-1 py-1 border-b border-gray-300">
            <button
              onClick={() => manualOpen('sell')}
              className={cn(
                "flex-1 text-white py-2 px-2 rounded-sm flex flex-col items-center mx-0.5 transition-colors duration-200",
                priceDirection === 'down' ? "bg-red-600 hover:bg-red-700" : "bg-gray-500 hover:bg-gray-600"
              )}
            >
              <span className="text-[9px] font-medium tracking-wider">SELL</span>
              <span className="text-base font-bold tabular-nums tracking-tight">{formatPrice(sellPrice)}</span>
            </button>
            <div className="flex items-center gap-0 px-1">
              <button onClick={() => adjustLotSize('down')} className="text-gray-600 p-0.5"><ChevronDown className="h-4 w-4" /></button>
              <span className="text-black font-bold text-base tabular-nums w-8 text-center">{lotSize}</span>
              <button onClick={() => adjustLotSize('up')} className="text-gray-600 p-0.5"><ChevronUp className="h-4 w-4" /></button>
            </div>
            <button
              onClick={() => manualOpen('buy')}
              className={cn(
                "flex-1 text-white py-2 px-2 rounded-sm flex flex-col items-center mx-0.5 transition-colors duration-200",
                priceDirection === 'up' ? "bg-green-600 hover:bg-green-700" : "bg-gray-500 hover:bg-gray-600"
              )}
            >
              <span className="text-[9px] font-medium tracking-wider">BUY</span>
              <span className="text-base font-bold tabular-nums tracking-tight">{formatPrice(buyPrice)}</span>
            </button>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chart' ? (
          <div className="h-full bg-white">
            <TradingViewWidget symbol={selectedPair.symbol} theme="light" height={window.innerHeight - 130} />
          </div>
        ) : activeTab === 'trade' ? (
          <div className="h-full bg-white overflow-y-auto">
            {/* Balance Header */}
            <div className="text-center py-3 border-b border-gray-200">
              <div className="flex items-center justify-center gap-2">
                <span className="text-blue-600 font-bold text-lg">{formatBalance(currentBalance)} USD</span>
                {isRunning && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold"><Zap className="h-3 w-3" />BOT ACTIVE</span>}
              </div>
            </div>

            {/* Account Metrics */}
            <div className="px-4 py-2 border-b border-gray-200 space-y-0.5">
              {[
                ['Balance', formatBalance(currentBalance)],
                ['Equity', formatBalance(equity)],
                ['Margin', formatBalance(usedMargin)],
                ['Free Margin', formatBalance(freeMargin)],
                ['Open P/L', `${totalPL >= 0 ? '+' : ''}${formatBalance(totalPL)}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-600 text-sm">{label}:</span>
                  <span className={cn("text-sm font-medium", label === 'Open P/L' ? (totalPL >= 0 ? 'text-green-600' : 'text-red-600') : 'text-black')}>{value}</span>
                </div>
              ))}
            </div>

            {/* Payout Preview */}
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-1 mb-1">
                <Target className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-bold text-gray-700">Payout Preview (Auto Lot: {autoLot})</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-gray-500">Potential Profit</div>
                  <div className="text-xs font-bold text-green-600">+${payout.potentialProfit.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Potential Loss</div>
                  <div className="text-xs font-bold text-red-600">-${payout.potentialLoss.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Risk:Reward</div>
                  <div className="text-xs font-bold text-blue-600">1:{payout.riskReward}</div>
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">Risk: ${riskAmount} ({selectedPair.risk}% of balance)</div>
            </div>

            {/* Protection Status */}
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="flex items-center gap-1 mb-1">
                <Shield className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-bold text-gray-700">Account Protection</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Daily Loss:</span>
                  <span className={cn("font-medium", ((protection.dailyStartBalance - currentBalance) / protection.dailyStartBalance * 100) > 3 ? 'text-red-600' : 'text-green-600')}>
                    {((protection.dailyStartBalance - currentBalance) / protection.dailyStartBalance * 100).toFixed(1)}% / 5%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Open Trades:</span>
                  <span className="font-medium text-black">{openTrades.length} / {protection.maxOpenTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Consec. Losses:</span>
                  <span className={cn("font-medium", protection.consecutiveLosses >= 2 ? 'text-red-600' : 'text-black')}>
                    {protection.consecutiveLosses} / {protection.maxConsecutiveLosses}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={cn("font-medium", isRunning ? 'text-green-600' : 'text-gray-500')}>{isRunning ? 'Active' : 'Stopped'}</span>
                </div>
              </div>
            </div>

            {/* Positions */}
            <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-black font-bold text-sm">Open Positions ({openTrades.length})</span>
            </div>
            {openTrades.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                {isRunning ? 'Scanning for signals...' : 'No open positions'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {openTrades.map(trade => {
                  const pair = FOREX_PAIRS.find(p => p.symbol === trade.pair);
                  return (
                    <div key={trade.id} className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-black text-sm font-medium">{pair?.code || trade.pair}</span>
                          <span className={cn("text-sm ml-1", trade.direction === 'SELL' ? 'text-red-600' : 'text-blue-600')}>
                            {trade.direction.toLowerCase()} {trade.lotSize.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("font-bold text-sm tabular-nums", trade.profitLoss >= 0 ? "text-blue-700" : "text-red-600")}>
                            {trade.profitLoss >= 0 ? '+' : ''}{trade.profitLoss.toFixed(2)}
                          </span>
                          <button onClick={() => closeTrade(trade.id)} className="text-gray-400 hover:text-red-500">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5 flex justify-between">
                        <span>{trade.entry.toFixed(pair?.decimals || 5)} → SL: {trade.stopLoss.toFixed(pair?.decimals || 5)}</span>
                        <span>TP: {trade.takeProfit.toFixed(pair?.decimals || 5)}</span>
                      </div>
                      {trade.signal.confidence > 0 && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Signal: {trade.signal.confidence}% | {trade.signal.trend} | RSI: {trade.signal.rsi}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'signals' ? (
          /* Signals Dashboard */
          <div className="h-full bg-white overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <span className="text-black font-bold text-sm">Market Signals</span>
              {!isRunning && <span className="text-[10px] text-gray-400">Start bot to enable scanning</span>}
            </div>
            {FOREX_PAIRS.map(pair => {
              const signal = signals.get(pair.symbol);
              const price = livePrices.get(pair.symbol) || pair.basePrice;
              return (
                <div key={pair.symbol} className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-black font-medium text-sm">{pair.code}</span>
                      <span className="text-gray-400 text-xs ml-2">{price.toFixed(pair.decimals)}</span>
                    </div>
                    {signal ? (
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        signal.direction === 'BUY' ? 'bg-green-100 text-green-700' :
                        signal.direction === 'SELL' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-500'
                      )}>
                        {signal.direction}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </div>
                  {signal && (
                    <div className="grid grid-cols-4 gap-1 text-[10px]">
                      <div>
                        <span className="text-gray-400">Conf</span>
                        <div className={cn("font-bold", signal.confidence >= 70 ? 'text-green-600' : 'text-gray-500')}>{signal.confidence}%</div>
                      </div>
                      <div>
                        <span className="text-gray-400">RSI</span>
                        <div className={cn("font-bold", signal.rsi > 70 ? 'text-red-500' : signal.rsi < 30 ? 'text-green-500' : 'text-black')}>{signal.rsi}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Trend</span>
                        <div className={cn("font-bold", signal.trend === 'BULLISH' ? 'text-green-600' : signal.trend === 'BEARISH' ? 'text-red-600' : 'text-gray-500')}>{signal.trend}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Spread</span>
                        <div className={cn("font-bold", signal.spread > pair.maxSpread ? 'text-red-500' : 'text-black')}>{signal.spread}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Analytics Summary */}
            <div className="px-4 py-3 border-t border-gray-300 bg-gray-50">
              <div className="flex items-center gap-1 mb-2">
                <BarChart3 className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-bold text-gray-700">Session Analytics</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Win Rate:</span>
                  <span className={cn("font-bold", analytics.winRate >= 50 ? 'text-green-600' : 'text-red-600')}>{analytics.winRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Net P/L:</span>
                  <span className={cn("font-bold", analytics.netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {analytics.netProfit >= 0 ? '+' : ''}${analytics.netProfit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Trades:</span>
                  <span className="font-bold text-black">{analytics.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Drawdown:</span>
                  <span className="font-bold text-red-600">-${analytics.maxDrawdown.toFixed(2)}</span>
                </div>
              </div>
              {Object.keys(analytics.profitByPair).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-[10px] text-gray-500 font-bold">Profit by Pair:</span>
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(analytics.profitByPair).map(([pair, pl]) => (
                      <div key={pair} className="flex justify-between text-[10px]">
                        <span className="text-gray-500">{pair}</span>
                        <span className={cn("font-bold", pl >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {pl >= 0 ? '+' : ''}${pl.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Trade Logs */
          <div className="h-full bg-white overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-200">
              <span className="text-black font-bold text-sm">Trade Log ({tradeLogs.length})</span>
            </div>
            {tradeLogs.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">No trades executed yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {[...tradeLogs].reverse().map(trade => {
                  const pair = FOREX_PAIRS.find(p => p.symbol === trade.pair);
                  return (
                    <div key={trade.id} className="px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {trade.direction === 'BUY' 
                            ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                            : <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                          }
                          <span className="text-black text-sm font-medium">{pair?.code || trade.pair}</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold",
                            trade.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                          )}>
                            {trade.status.toUpperCase()}
                          </span>
                        </div>
                        <span className={cn("font-bold text-sm tabular-nums", trade.profitLoss >= 0 ? "text-green-600" : "text-red-600")}>
                          {trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-gray-400 text-[10px] mt-0.5">
                        {trade.direction} {trade.lotSize.toFixed(2)} lot @ {trade.entry.toFixed(pair?.decimals || 5)}
                        {trade.exit ? ` → ${trade.exit.toFixed(pair?.decimals || 5)}` : ''}
                        {' · '}{new Date(trade.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-[#f5f5f5] border-t border-gray-300 px-2 py-1.5 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          {([
            { tab: 'chart' as ActiveTab, icon: '↗⇡', label: 'Chart' },
            { tab: 'trade' as ActiveTab, icon: '☑', label: 'Trade' },
            { tab: 'signals' as ActiveTab, icon: '📡', label: 'Signals' },
            { tab: 'logs' as ActiveTab, icon: '📋', label: 'Logs' },
          ]).map(item => (
            <button key={item.tab} onClick={() => setActiveTab(item.tab)} className="flex flex-col items-center gap-0.5">
              <span className={cn("text-base", activeTab === item.tab ? "text-blue-600" : "text-gray-500")}>{item.icon}</span>
              <span className={cn("text-[10px] font-medium", activeTab === item.tab ? "text-blue-600" : "text-gray-500")}>{item.label}</span>
            </button>
          ))}
          <button onClick={() => setShowSettings(true)} className="flex flex-col items-center gap-0.5">
            <Settings className="h-4 w-4 text-gray-500" />
            <span className="text-[10px] text-gray-500">Settings</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-black font-bold text-lg">Bot Settings</span>
              <button onClick={() => setShowSettings(false)}><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-600 text-sm mb-2 block">Take Profit Target ($ per lot)</label>
                <input type="text" inputMode="decimal" value={takeProfitTarget} onChange={e => setTakeProfitTarget(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-lg border border-gray-300 bg-gray-50 text-black" placeholder="40" />
              </div>
              <div>
                <label className="text-gray-600 text-sm mb-2 block">Positions to Open per Click</label>
                <input type="text" inputMode="numeric" value={positionsToOpen} onChange={e => setPositionsToOpen(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-lg border border-gray-300 bg-gray-50 text-black" placeholder="1" />
              </div>
              <div>
                <label className="text-gray-600 text-sm mb-2 block">Manual Lot Size</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => adjustLotSize('down')} className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                    <ChevronDown className="h-5 w-5 text-black" />
                  </button>
                  <span className="text-black font-bold text-xl flex-1 text-center">{lotSize}</span>
                  <button onClick={() => adjustLotSize('up')} className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                    <ChevronUp className="h-5 w-5 text-black" />
                  </button>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <button
                  onClick={() => { setProtection(createAccountProtection(currentBalance)); toast({ title: 'Protection Reset', description: 'Daily limits have been reset' }); }}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg font-bold text-sm"
                >
                  Reset Protection Limits
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pair Selector Modal */}
      {showPairSelector && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-black font-bold text-lg">Select Pair</span>
              <button onClick={() => setShowPairSelector(false)}><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-2">
              {FOREX_PAIRS.map(pair => (
                <button key={pair.symbol} onClick={() => { setSelectedPair(pair); setShowPairSelector(false); }}
                  className={cn("w-full p-3 rounded-lg flex items-center justify-between border",
                    selectedPair.symbol === pair.symbol ? "bg-blue-50 border-blue-500" : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="text-left">
                    <div className="text-black font-medium">{pair.code}</div>
                    <div className="text-gray-500 text-xs">{pair.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-black font-mono text-sm">{(livePrices.get(pair.symbol) || pair.basePrice).toFixed(pair.decimals)}</div>
                    <div className="text-gray-400 text-[10px]">Risk: {pair.risk}% | Max Spread: {pair.maxSpread}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
