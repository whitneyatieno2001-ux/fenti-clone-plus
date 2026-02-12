import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getTradeOutcome } from '@/lib/tradeOutcome';
import { TradingViewWidget } from '@/components/TradingViewWidget';
import {
  ChevronUp,
  ChevronDown,
  X,
  Settings,
  ArrowUpDown,
  TrendingUp,
  Clock,
  MessageSquare,
  Menu,
  Plus,
  Edit,
  ArrowUpFromLine,
  SquarePlus,
} from 'lucide-react';

interface ForexPosition {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  lotSize: number;
  entryPrice: number;
  currentPrice: number;
  profitLoss: number;
  openTime: number;
}

const FOREX_PAIRS = [
  { symbol: 'EUR/USD', name: 'Euro vs US Dollar', code: 'EURUSD.m', basePrice: 1.13661, decimals: 5, spread: 6, contractSize: 100000 },
  { symbol: 'GBP/USD', name: 'Pound vs US Dollar', code: 'GBPUSD.m', basePrice: 1.2645, decimals: 5, spread: 8, contractSize: 100000 },
  { symbol: 'USD/JPY', name: 'US Dollar vs Yen', code: 'USDJPY.m', basePrice: 149.85, decimals: 3, spread: 10, contractSize: 100000 },
  { symbol: 'GBP/JPY', name: 'Great Britain Pound vs Japanese Yen', code: 'GBPJPY.m', basePrice: 208.275, decimals: 3, spread: 30, contractSize: 100000 },
  { symbol: 'XAU/USD', name: 'Gold vs US Dollar', code: 'XAUUSD.m', basePrice: 2778.50, decimals: 2, spread: 14, contractSize: 100 },
];

const LEVERAGE = 500;

function calculateMarginForex(lotSize: number, pair: typeof FOREX_PAIRS[0], entryPrice: number): number {
  const contractValue = lotSize * pair.contractSize;
  if (pair.symbol.includes('XAU')) return (contractValue * entryPrice) / LEVERAGE;
  if (pair.symbol.startsWith('USD/')) return contractValue / LEVERAGE;
  return (contractValue * entryPrice) / LEVERAGE;
}

function calculatePLForex(pos: { type: 'buy' | 'sell'; entryPrice: number; currentPrice: number; lotSize: number }, pair: typeof FOREX_PAIRS[0]): number {
  const priceDiff = pos.type === 'buy' ? pos.currentPrice - pos.entryPrice : pos.entryPrice - pos.currentPrice;
  if (pair.symbol.includes('XAU')) return priceDiff * pos.lotSize * pair.contractSize;
  if (pair.symbol.endsWith('/JPY')) return (priceDiff * pos.lotSize * pair.contractSize) / pos.currentPrice;
  return priceDiff * pos.lotSize * pair.contractSize;
}

// Extended quotes list matching MT5 screenshot
const QUOTES_LIST = [
  { code: 'AUDCAD.m', name: 'AUD/CAD', basePrice: 0.96549, decimals: 5, spread: 24 },
  { code: 'AUDCHF.m', name: 'AUD/CHF', basePrice: 0.54603, decimals: 5, spread: 9 },
  { code: 'AUDJPY.m', name: 'AUD/JPY', basePrice: 108.498, decimals: 3, spread: 20 },
  { code: 'AUDNZD.m', name: 'AUD/NZD', basePrice: 1.17521, decimals: 5, spread: 21 },
  { code: 'AUDUSD.m', name: 'AUD/USD', basePrice: 0.70956, decimals: 5, spread: 10 },
  { code: 'CADCHF.m', name: 'CAD/CHF', basePrice: 0.56548, decimals: 5, spread: 8 },
  { code: 'CADJPY.m', name: 'CAD/JPY', basePrice: 112.353, decimals: 3, spread: 38 },
  { code: 'CHFJPY.m', name: 'CHF/JPY', basePrice: 198.691, decimals: 3, spread: 25 },
  { code: 'EURAUD.m', name: 'EUR/AUD', basePrice: 1.60234, decimals: 5, spread: 15 },
  { code: 'EURCAD.m', name: 'EUR/CAD', basePrice: 1.54321, decimals: 5, spread: 12 },
  { code: 'EURCHF.m', name: 'EUR/CHF', basePrice: 0.93456, decimals: 5, spread: 9 },
  { code: 'EURGBP.m', name: 'EUR/GBP', basePrice: 0.85923, decimals: 5, spread: 8 },
  { code: 'EURJPY.m', name: 'EUR/JPY', basePrice: 162.780, decimals: 3, spread: 15 },
  { code: 'EURUSD.m', name: 'EUR/USD', basePrice: 1.13661, decimals: 5, spread: 6 },
  { code: 'GBPAUD.m', name: 'GBP/AUD', basePrice: 1.86543, decimals: 5, spread: 20 },
  { code: 'GBPCAD.m', name: 'GBP/CAD', basePrice: 1.79876, decimals: 5, spread: 18 },
  { code: 'GBPCHF.m', name: 'GBP/CHF', basePrice: 1.08765, decimals: 5, spread: 12 },
  { code: 'GBPJPY.m', name: 'GBP/JPY', basePrice: 208.275, decimals: 3, spread: 30 },
  { code: 'GBPUSD.m', name: 'GBP/USD', basePrice: 1.26450, decimals: 5, spread: 8 },
  { code: 'USDJPY.m', name: 'USD/JPY', basePrice: 149.850, decimals: 3, spread: 10 },
  { code: 'XAUUSD.m', name: 'XAU/USD', basePrice: 2778.50, decimals: 2, spread: 14 },
];

type ActiveTab = 'quotes' | 'charts' | 'trade' | 'history' | 'messages';

interface QuoteData {
  code: string;
  bid: number;
  ask: number;
  low: number;
  high: number;
  change: number;
  changePct: number;
  spread: number;
  decimals: number;
  timestamp: string;
}

export default function ForexBot() {
  const navigate = useNavigate();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('charts');
  const [positions, setPositions] = useState<ForexPosition[]>([]);
  const [selectedPair, setSelectedPair] = useState(FOREX_PAIRS[0]);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [buyPrice, setBuyPrice] = useState(selectedPair.basePrice + 0.00006);
  const [sellPrice, setSellPrice] = useState(selectedPair.basePrice);
  const [lotSize, setLotSize] = useState(0.01);
  const [equity, setEquity] = useState(currentBalance);
  const [margin, setMargin] = useState(0);
  const [freeMargin, setFreeMargin] = useState(currentBalance);
  const [marginLevel, setMarginLevel] = useState(0);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [showSettings, setShowSettings] = useState(false);
  const [takeProfitTarget, setTakeProfitTarget] = useState('40');
  const [positionsToOpen, setPositionsToOpen] = useState('1');
  const [quotes, setQuotes] = useState<QuoteData[]>([]);

  const positionsRef = useRef(positions);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  // Initialize quotes
  useEffect(() => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const initialQuotes: QuoteData[] = QUOTES_LIST.map(q => {
      const spreadVal = q.spread / Math.pow(10, q.decimals);
      const bid = q.basePrice;
      const ask = bid + spreadVal;
      const changePips = Math.floor(Math.random() * 800) - 400;
      const changePct = -((Math.random() * 1.2).toFixed(2) as any) + Math.random() * 0.3;
      return {
        code: q.code,
        bid,
        ask,
        low: bid - Math.random() * spreadVal * 50,
        high: ask + Math.random() * spreadVal * 50,
        change: changePips,
        changePct: parseFloat(changePct.toFixed(2)),
        spread: q.spread,
        decimals: q.decimals,
        timestamp: timeStr,
      };
    });
    setQuotes(initialQuotes);
  }, []);

  // Update quotes periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      setQuotes(prev => prev.map(q => {
        const volatility = q.decimals <= 3 ? 0.03 : 0.00008;
        const change = (Math.random() - 0.5) * volatility;
        const newBid = q.bid + change;
        const spreadVal = q.spread / Math.pow(10, q.decimals);
        const newAsk = newBid + spreadVal;
        return {
          ...q,
          bid: newBid,
          ask: newAsk,
          low: Math.min(q.low, newBid),
          high: Math.max(q.high, newAsk),
          timestamp: timeStr,
        };
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const spread = selectedPair.symbol.includes('XAU') ? 0.14 : 0.00006;
    setBuyPrice(selectedPair.basePrice + spread);
    setSellPrice(selectedPair.basePrice);
  }, [selectedPair]);

  useEffect(() => {
    const interval = setInterval(() => {
      const volatility = selectedPair.symbol.includes('XAU') ? 0.5 : 0.00005;
      const change = (Math.random() - 0.5) * volatility;
      setPriceDirection(change > 0 ? 'up' : 'down');
      setBuyPrice(prev => prev + change);
      setSellPrice(prev => prev + change);
    }, 500);
    return () => clearInterval(interval);
  }, [selectedPair]);

  // Real MT5 margin calculations (derived, not state)
  const totalPL = positions.reduce((sum, pos) => sum + pos.profitLoss, 0);
  const totalMarginCalc = positions.reduce((sum, pos) => {
    const pair = FOREX_PAIRS.find(p => p.symbol === pos.symbol);
    if (!pair) return sum;
    return sum + calculateMarginForex(pos.lotSize, pair, pos.entryPrice);
  }, 0);
  const equityCalc = currentBalance + totalPL;
  const freeMarginCalc = equityCalc - totalMarginCalc;
  const marginLevelCalc = totalMarginCalc > 0 ? (equityCalc / totalMarginCalc) * 100 : 0;

  // Sync derived values to state for UI
  useEffect(() => {
    setEquity(equityCalc);
    setMargin(totalMarginCalc);
    setFreeMargin(freeMarginCalc);
    setMarginLevel(marginLevelCalc);
  }, [equityCalc, totalMarginCalc, freeMarginCalc, marginLevelCalc]);

  // Update positions P/L with real forex pip calculations
  useEffect(() => {
    if (positions.length === 0) return;
    const interval = setInterval(() => {
      setPositions(prev => prev.map(pos => {
        const pair = FOREX_PAIRS.find(p => p.symbol === pos.symbol);
        if (!pair) return pos;
        const outcome = getTradeOutcome({ accountType, userEmail });
        const bias = outcome === 'win' ? 0.55 : 0.42;
        const volatility = pair.symbol.includes('XAU') ? 0.8 
          : pair.symbol.includes('JPY') ? 0.03 
          : 0.0003;
        const change = (Math.random() - bias) * volatility;
        const newPrice = pos.currentPrice + change;
        const profitLoss = calculatePLForex({ ...pos, currentPrice: newPrice }, pair);
        
        // Ensure minimum P/L of $0.15 after initial movement
        const timeSinceOpen = Date.now() - pos.openTime;
        let finalPL = parseFloat(profitLoss.toFixed(2));
        if (timeSinceOpen > 3000 && Math.abs(finalPL) < 0.15 && finalPL !== 0) {
          finalPL = finalPL > 0 ? 0.15 : -0.15;
        }
        
        return { ...pos, currentPrice: newPrice, profitLoss: finalPL };
      }));
    }, 400);
    return () => clearInterval(interval);
  }, [positions.length, accountType, userEmail]);

  useEffect(() => {
    positions.forEach(async (pos) => {
      const tp = parseFloat(takeProfitTarget) || 40;
      const targetProfit = pos.lotSize * tp;
      if (pos.profitLoss >= targetProfit) {
        await closePosition(pos.id);
        toast({ title: "Profit Taken! 💰", description: `${pos.symbol} closed at +$${pos.profitLoss.toFixed(2)}` });
      }
    });
  }, [positions]);

  const openMultiplePositions = useCallback(async (direction: 'buy' | 'sell') => {
    const count = Math.max(1, parseInt(positionsToOpen) || 1);
    for (let i = 0; i < count; i++) {
      await openPosition(direction);
    }
  }, [positionsToOpen]);

  const openPosition = useCallback(async (direction: 'buy' | 'sell') => {
    const entryPrice = direction === 'buy' ? buyPrice : sellPrice;
    const requiredMargin = calculateMarginForex(lotSize, selectedPair, entryPrice);
    if (requiredMargin > freeMarginCalc) {
      toast({ title: "Insufficient Margin", description: `Required: $${requiredMargin.toFixed(2)}`, variant: "destructive" });
      return;
    }
    // entryPrice already defined above
    const newPosition: ForexPosition = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      symbol: selectedPair.symbol,
      type: direction,
      lotSize,
      entryPrice,
      currentPrice: entryPrice,
      profitLoss: 0,
      openTime: Date.now(),
    };
    setPositions(prev => [...prev, newPosition]);
    if (user) {
      try {
        await supabase.from('transactions').insert({
          user_id: user.id, type: 'bot_trade', amount: 0, currency: 'USD', status: 'completed',
          description: `Forex EA: Opened ${direction.toUpperCase()} ${selectedPair.symbol} @ ${entryPrice.toFixed(selectedPair.decimals)}`,
          account_type: accountType, profit_loss: 0,
        });
      } catch (err) { console.error('Error logging position:', err); }
    }
    toast({ title: `${direction.toUpperCase()} Order Placed`, description: `${selectedPair.symbol} @ ${entryPrice.toFixed(selectedPair.decimals)}` });
  }, [currentBalance, user, accountType, selectedPair, buyPrice, sellPrice, lotSize]);

  const closePosition = async (positionId: string) => {
    const position = positionsRef.current.find(p => p.id === positionId);
    if (!position) return;
    if (position.profitLoss !== 0) {
      const operation = position.profitLoss > 0 ? 'add' : 'subtract';
      await updateBalance(accountType, Math.abs(position.profitLoss), operation);
    }
    if (user) {
      try {
        await supabase.from('transactions').insert({
          user_id: user.id, type: 'bot_trade', amount: Math.abs(position.profitLoss), currency: 'USD', status: 'completed',
          description: `Forex EA: Closed ${position.type.toUpperCase()} ${position.symbol} P/L: ${position.profitLoss >= 0 ? '+' : ''}$${position.profitLoss.toFixed(2)}`,
          account_type: accountType, profit_loss: position.profitLoss,
        });
      } catch (err) { console.error('Error logging close:', err); }
    }
    setPositions(prev => prev.filter(p => p.id !== positionId));
  };

  const adjustLotSize = (direction: 'up' | 'down') => {
    if (direction === 'up') setLotSize(prev => parseFloat(Math.min(prev + 0.01, 100).toFixed(2)));
    else setLotSize(prev => parseFloat(Math.max(prev - 0.01, 0.01).toFixed(2)));
  };

  const formatPrice = (price: number) => price.toFixed(selectedPair.decimals);

  const formatBalance = (val: number) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // totalPL already declared above as derived value

  // Format price with last digit superscript style for quotes
  const formatQuotePrice = (price: number, decimals: number) => {
    const str = price.toFixed(decimals);
    const parts = str.split('.');
    if (!parts[1]) return { main: str, sup: '' };
    const intPart = parts[0];
    const decPart = parts[1];
    // Show main digits bold, last digit superscript
    const mainDec = decPart.slice(0, -1);
    const lastDigit = decPart.slice(-1);
    return { main: `${intPart}.${mainDec}`, sup: lastDigit };
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Charts Tab Header & Price Bar */}
      {activeTab === 'charts' && (
        <>
          {/* Top toolbar */}
          <div className="bg-white flex items-center justify-between px-4 py-2 border-b border-gray-200">
            <Menu className="h-5 w-5 text-gray-700" />
            <div className="flex items-center gap-6">
              <span className="text-gray-600 text-lg">⊞</span>
              <span className="text-gray-600 text-lg">📈</span>
              <span className="text-black font-medium text-sm">M1</span>
              <span className="text-gray-600 text-lg">⏱</span>
              <span className="text-gray-600 text-lg">📋</span>
            </div>
          </div>

          {/* SELL / lot / BUY bar */}
          <div className="flex items-stretch">
            <button
              onClick={() => openMultiplePositions('sell')}
              className={cn(
                "flex-1 text-white py-2 flex flex-col items-center transition-colors duration-200",
                priceDirection === 'down' ? "bg-red-500" : "bg-red-400"
              )}
            >
              <span className="text-[10px] font-medium tracking-wider">SELL</span>
              <span className="text-xl font-bold tabular-nums">{formatPrice(sellPrice)}</span>
            </button>

            <div className="flex items-center gap-0 bg-white px-3 border-y border-gray-200">
              <button onClick={() => adjustLotSize('down')} className="text-gray-600 p-1">
                <ChevronDown className="h-5 w-5" />
              </button>
              <span className="text-black font-bold text-sm tabular-nums w-10 text-center">{lotSize.toFixed(2)}</span>
              <button onClick={() => adjustLotSize('up')} className="text-gray-600 p-1">
                <ChevronUp className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={() => openMultiplePositions('buy')}
              className={cn(
                "flex-1 text-white py-2 flex flex-col items-center transition-colors duration-200",
                priceDirection === 'up' ? "bg-blue-500" : "bg-blue-400"
              )}
            >
              <span className="text-[10px] font-medium tracking-wider">BUY</span>
              <span className="text-xl font-bold tabular-nums">{formatPrice(buyPrice)}</span>
            </button>
          </div>

          {/* Symbol info overlay */}
          <div className="bg-white px-3 py-1 border-b border-gray-200">
            <button onClick={() => setShowPairSelector(true)} className="text-left">
              <span className="text-blue-600 text-xs font-medium">{selectedPair.code} ▾ M1</span>
              <br />
              <span className="text-gray-500 text-[10px]">{selectedPair.name}</span>
            </button>
          </div>
        </>
      )}

      {/* Quotes Tab Header */}
      {activeTab === 'quotes' && (
        <div className="bg-white flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 text-gray-700" />
            <span className="text-black font-medium text-lg">Quotes</span>
          </div>
          <div className="flex items-center gap-4">
            <Plus className="h-5 w-5 text-gray-700" />
            <Edit className="h-5 w-5 text-gray-700" />
          </div>
        </div>
      )}

      {/* Trade Tab Header */}
      {activeTab === 'trade' && (
        <div className="bg-white flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 text-gray-700" />
            <div>
              <span className="text-black font-medium text-lg">Trade</span>
              {positions.length > 0 && (
                <div className={cn("text-sm", totalPL >= 0 ? "text-blue-600" : "text-red-500")}>
                  {totalPL >= 0 ? '' : ''}{totalPL.toFixed(2)} USD
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ArrowUpFromLine className="h-5 w-5 text-gray-700" />
            <SquarePlus className="h-5 w-5 text-gray-700" />
          </div>
        </div>
      )}

      {/* History Tab Header */}
      {activeTab === 'history' && (
        <div className="bg-white flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 text-gray-700" />
            <span className="text-black font-medium text-lg">History</span>
          </div>
        </div>
      )}

      {/* Messages Tab Header */}
      {activeTab === 'messages' && (
        <div className="bg-white flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 text-gray-700" />
            <span className="text-black font-medium text-lg">Messages</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* CHARTS */}
        {activeTab === 'charts' && (
          <div className="h-full bg-white">
            <TradingViewWidget symbol={selectedPair.symbol} theme="light" height={window.innerHeight - 180} />
          </div>
        )}

        {/* QUOTES */}
        {activeTab === 'quotes' && (
          <div className="h-full bg-white overflow-y-auto">
            {quotes.map((q) => {
              const bidFormatted = formatQuotePrice(q.bid, q.decimals);
              const askFormatted = formatQuotePrice(q.ask, q.decimals);
              const isNegative = q.changePct <= 0;
              return (
                <div key={q.code} className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs", isNegative ? "text-red-500" : "text-blue-600")}>
                          {q.change > 0 ? '+' : ''}{q.change}
                        </span>
                        <span className={cn("text-xs", isNegative ? "text-red-500" : "text-blue-600")}>
                          {q.changePct > 0 ? '+' : ''}{q.changePct.toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-black font-bold text-base mt-0.5">{q.code}</div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        {q.timestamp} ⊞ {q.spread}
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="text-right">
                        <span className={cn("text-lg font-bold tabular-nums", isNegative ? "text-red-500" : "text-blue-600")}>
                          {bidFormatted.main}
                        </span>
                        <sup className={cn("text-sm font-bold", isNegative ? "text-red-500" : "text-blue-600")}>
                          {bidFormatted.sup}
                        </sup>
                        <div className="text-gray-400 text-xs">L: {q.low.toFixed(q.decimals)}</div>
                      </div>
                      <div className="text-right">
                        <span className={cn("text-lg font-bold tabular-nums", isNegative ? "text-red-500" : "text-blue-600")}>
                          {askFormatted.main}
                        </span>
                        <sup className={cn("text-sm font-bold", isNegative ? "text-red-500" : "text-blue-600")}>
                          {askFormatted.sup}
                        </sup>
                        <div className="text-gray-400 text-xs">H: {q.high.toFixed(q.decimals)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TRADE */}
        {activeTab === 'trade' && (
          <div className="h-full bg-white overflow-y-auto">
            {/* Account Metrics with dotted lines like MT5 */}
            <div className="px-4 py-3 border-b border-gray-200">
              {/* Always show Balance, Equity, Free margin */}
              <div className="flex justify-between items-baseline py-1">
                <span className="text-black font-medium text-sm">Balance:</span>
                <span className="flex-1 mx-2 border-b border-dotted border-gray-300"></span>
                <span className="text-black font-medium text-sm tabular-nums">{formatBalance(currentBalance)}</span>
              </div>
              <div className="flex justify-between items-baseline py-1">
                <span className="text-black font-medium text-sm">Equity:</span>
                <span className="flex-1 mx-2 border-b border-dotted border-gray-300"></span>
                <span className="text-black font-medium text-sm tabular-nums">{formatBalance(equity)}</span>
              </div>
              {/* Only show Margin & Margin Level when positions are open */}
              {positions.length > 0 && (
                <div className="flex justify-between items-baseline py-1">
                  <span className="text-black font-medium text-sm">Margin:</span>
                  <span className="flex-1 mx-2 border-b border-dotted border-gray-300"></span>
                  <span className="text-black font-medium text-sm tabular-nums">{formatBalance(margin)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline py-1">
                <span className="text-black font-medium text-sm">Free margin:</span>
                <span className="flex-1 mx-2 border-b border-dotted border-gray-300"></span>
                <span className="text-black font-medium text-sm tabular-nums">{formatBalance(freeMargin)}</span>
              </div>
              {positions.length > 0 && (
                <div className="flex justify-between items-baseline py-1">
                  <span className="text-black font-medium text-sm">Margin Level (%):</span>
                  <span className="flex-1 mx-2 border-b border-dotted border-gray-300"></span>
                  <span className="text-black font-medium text-sm tabular-nums">{marginLevel > 0 ? formatBalance(marginLevel) : '0.00'}</span>
                </div>
              )}
            </div>

            {/* Positions Header - only show when positions exist */}
            {positions.length > 0 && (
              <>
                <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                  <span className="text-gray-500 font-medium text-sm">Positions</span>
                  <span className="text-gray-400 text-lg">•••</span>
                </div>

                {/* Position List */}
                <div className="divide-y divide-gray-100">
                  {positions.map((pos) => {
                    const pair = FOREX_PAIRS.find(p => p.symbol === pos.symbol);
                    const code = pair?.code || pos.symbol.replace('/', '');
                    const decimals = pair?.decimals || 5;
                    return (
                      <div key={pos.id} className="px-4 py-2.5 border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-black text-sm font-medium">{code}, </span>
                            <span className={cn("text-sm", pos.type === 'sell' ? 'text-red-600' : 'text-blue-600')}>
                              {pos.type} {pos.lotSize.toFixed(2)}
                            </span>
                          </div>
                          <span className={cn(
                            "font-bold text-sm tabular-nums",
                            pos.profitLoss >= 0 ? "text-blue-700" : "text-red-600"
                          )}>
                            {pos.profitLoss.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {pos.entryPrice.toFixed(decimals)} 'n  {pos.currentPrice.toFixed(decimals)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div className="h-full bg-white flex items-center justify-center">
            <span className="text-gray-400 text-sm">No history yet</span>
          </div>
        )}

        {/* MESSAGES */}
        {activeTab === 'messages' && (
          <div className="h-full bg-white flex items-center justify-center">
            <span className="text-gray-400 text-sm">No messages</span>
          </div>
        )}
      </div>

      {/* MT5 Bottom Navigation - exactly 5 tabs */}
      <div className="bg-[#f8f8f8] border-t border-gray-200 px-2 py-1.5 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          <button onClick={() => setActiveTab('quotes')} className="flex flex-col items-center gap-0.5 py-1">
            <ArrowUpDown className={cn("h-5 w-5", activeTab === 'quotes' ? "text-blue-600" : "text-gray-400")} />
            <span className={cn("text-[10px]", activeTab === 'quotes' ? "text-blue-600 font-medium" : "text-gray-400")}>Quotes</span>
          </button>
          <button onClick={() => setActiveTab('charts')} className={cn("flex flex-col items-center gap-0.5 py-1", activeTab === 'charts' && "bg-blue-50 px-4 rounded-full")}>
            <svg className={cn("h-5 w-5", activeTab === 'charts' ? "text-blue-600" : "text-gray-400")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className={cn("text-[10px]", activeTab === 'charts' ? "text-blue-600 font-medium" : "text-gray-400")}>Charts</span>
          </button>
          <button onClick={() => setActiveTab('trade')} className={cn("flex flex-col items-center gap-0.5 py-1", activeTab === 'trade' && "bg-blue-50 px-4 rounded-full")}>
            <TrendingUp className={cn("h-5 w-5", activeTab === 'trade' ? "text-blue-600" : "text-gray-400")} />
            <span className={cn("text-[10px]", activeTab === 'trade' ? "text-blue-600 font-medium" : "text-gray-400")}>Trade</span>
          </button>
          <button onClick={() => setActiveTab('history')} className="flex flex-col items-center gap-0.5 py-1">
            <Clock className={cn("h-5 w-5", activeTab === 'history' ? "text-blue-600" : "text-gray-400")} />
            <span className={cn("text-[10px]", activeTab === 'history' ? "text-blue-600 font-medium" : "text-gray-400")}>History</span>
          </button>
          <button onClick={() => setActiveTab('messages')} className="flex flex-col items-center gap-0.5 py-1">
            <MessageSquare className={cn("h-5 w-5", activeTab === 'messages' ? "text-blue-600" : "text-gray-400")} />
            <span className={cn("text-[10px]", activeTab === 'messages' ? "text-blue-600 font-medium" : "text-gray-400")}>Messages</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-black font-bold text-lg">EA Settings</span>
              <button onClick={() => setShowSettings(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-600 text-sm mb-2 block">Take Profit Target ($ per lot)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={takeProfitTarget}
                  onChange={(e) => setTakeProfitTarget(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-lg border border-gray-300 bg-gray-50 text-black"
                  placeholder="40"
                />
              </div>
              <div>
                <label className="text-gray-600 text-sm mb-2 block">Positions to Open per Click</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={positionsToOpen}
                  onChange={(e) => setPositionsToOpen(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-lg border border-gray-300 bg-gray-50 text-black"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="text-gray-600 text-sm mb-2 block">Lot Size</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => adjustLotSize('down')} className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                    <ChevronDown className="h-5 w-5 text-black" />
                  </button>
                  <span className="text-black font-bold text-xl flex-1 text-center">{lotSize.toFixed(2)}</span>
                  <button onClick={() => adjustLotSize('up')} className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                    <ChevronUp className="h-5 w-5 text-black" />
                  </button>
                </div>
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
              <button onClick={() => setShowPairSelector(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-2">
              {FOREX_PAIRS.map(pair => (
                <button
                  key={pair.symbol}
                  onClick={() => { setSelectedPair(pair); setShowPairSelector(false); }}
                  className={cn(
                    "w-full p-3 rounded-lg flex items-center justify-between border",
                    selectedPair.symbol === pair.symbol ? "bg-blue-50 border-blue-500" : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="text-left">
                    <div className="text-black font-medium">{pair.code}</div>
                    <div className="text-gray-500 text-xs">{pair.name}</div>
                  </div>
                  <span className="text-black font-mono text-sm">{pair.basePrice.toFixed(pair.decimals)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
