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
  { symbol: 'EUR/USD', name: 'Euro vs US Dollar', code: 'EURUSD.s', basePrice: 1.13661, decimals: 5 },
  { symbol: 'GBP/USD', name: 'Pound vs US Dollar', code: 'GBPUSD.s', basePrice: 1.2645, decimals: 5 },
  { symbol: 'USD/JPY', name: 'US Dollar vs Yen', code: 'USDJPY.s', basePrice: 149.85, decimals: 3 },
  { symbol: 'XAU/USD', name: 'Gold vs US Dollar', code: 'XAUUSD.s', basePrice: 2778.50, decimals: 2 },
];

type ActiveTab = 'chart' | 'trade';

export default function ForexBot() {
  const navigate = useNavigate();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('chart');
  const [positions, setPositions] = useState<ForexPosition[]>([]);
  const [selectedPair, setSelectedPair] = useState(FOREX_PAIRS[0]);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [buyPrice, setBuyPrice] = useState(selectedPair.basePrice + 0.00006);
  const [sellPrice, setSellPrice] = useState(selectedPair.basePrice);
  const [lotSize, setLotSize] = useState(1);
  const [equity, setEquity] = useState(currentBalance);
  const [margin, setMargin] = useState(0);
  const [freeMargin, setFreeMargin] = useState(currentBalance);
  const [marginLevel, setMarginLevel] = useState(0);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');

  const positionsRef = useRef(positions);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

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

  useEffect(() => {
    const totalPL = positions.reduce((sum, pos) => sum + pos.profitLoss, 0);
    const usedMargin = positions.reduce((sum, pos) => sum + (pos.lotSize * 1000), 0);
    const eq = currentBalance + totalPL;
    setEquity(eq);
    setMargin(usedMargin);
    setFreeMargin(eq - usedMargin);
    setMarginLevel(usedMargin > 0 ? (eq / usedMargin) * 100 : 0);
  }, [positions, currentBalance]);

  useEffect(() => {
    if (positions.length === 0) return;
    const interval = setInterval(() => {
      setPositions(prev => prev.map(pos => {
        const outcome = getTradeOutcome({ accountType, userEmail });
        const bias = outcome === 'win' ? 0.55 : 0.42;
        const volatility = pos.symbol.includes('XAU') ? 0.8 : 0.0003;
        const change = (Math.random() - bias) * volatility;
        const newPrice = pos.currentPrice + change;
        const priceDiff = pos.type === 'buy' ? newPrice - pos.entryPrice : pos.entryPrice - newPrice;
        const multiplier = pos.symbol.includes('XAU') ? 100 : 100000;
        const profitLoss = priceDiff * pos.lotSize * multiplier;
        return { ...pos, currentPrice: newPrice, profitLoss: parseFloat(profitLoss.toFixed(2)) };
      }));
    }, 400);
    return () => clearInterval(interval);
  }, [positions.length, accountType, userEmail]);

  useEffect(() => {
    positions.forEach(async (pos) => {
      const targetProfit = pos.lotSize * 40;
      if (pos.profitLoss >= targetProfit) {
        await closePosition(pos.id);
        toast({ title: "Profit Taken! 💰", description: `${pos.symbol} closed at +$${pos.profitLoss.toFixed(2)}` });
      }
    });
  }, [positions]);

  const openPosition = useCallback(async (direction: 'buy' | 'sell') => {
    if (currentBalance < 1) return;
    const entryPrice = direction === 'buy' ? buyPrice : sellPrice;
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
    if (direction === 'up') setLotSize(prev => Math.min(prev + 1, 100));
    else setLotSize(prev => Math.max(prev - 1, 1));
  };

  const formatPrice = (price: number) => price.toFixed(selectedPair.decimals);

  const formatBalance = (val: number) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Toolbar - MT5 style */}
      <div className="bg-[#f0f0f0] flex items-center justify-between px-3 py-2 border-b border-gray-300">
        <span className="text-black font-bold text-sm">M30</span>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-lg">┼</span>
          <span className="text-gray-600 text-lg italic">f</span>
          <span className="text-gray-600 text-lg">⌂</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white" />
          <div className="w-5 h-5 rounded bg-red-600 border-2 border-white" />
        </div>
      </div>

      {/* Price Bar: SELL | Lot | BUY - only on Chart tab, color changes like real MT5 */}
      {activeTab === 'chart' && (
        <div className="bg-[#e8e8e8] flex items-center justify-between px-1 py-1 border-b border-gray-300">
          <button
            onClick={() => openPosition('sell')}
            className={cn(
              "flex-1 text-white py-2 px-2 rounded-sm flex flex-col items-center mx-0.5 transition-colors duration-200",
              priceDirection === 'down' ? "bg-red-600 hover:bg-red-700" : "bg-gray-500 hover:bg-gray-600"
            )}
          >
            <span className="text-[9px] font-medium tracking-wider">SELL</span>
            <span className="text-base font-bold tabular-nums tracking-tight">{formatPrice(sellPrice)}</span>
          </button>

          <div className="flex items-center gap-0 px-1">
            <button onClick={() => adjustLotSize('down')} className="text-gray-600 p-0.5">
              <ChevronDown className="h-4 w-4" />
            </button>
            <span className="text-black font-bold text-base tabular-nums w-8 text-center">{lotSize}</span>
            <button onClick={() => adjustLotSize('up')} className="text-gray-600 p-0.5">
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => openPosition('buy')}
            className={cn(
              "flex-1 text-white py-2 px-2 rounded-sm flex flex-col items-center mx-0.5 transition-colors duration-200",
              priceDirection === 'up' ? "bg-green-600 hover:bg-green-700" : "bg-gray-500 hover:bg-gray-600"
            )}
          >
            <span className="text-[9px] font-medium tracking-wider">BUY</span>
            <span className="text-base font-bold tabular-nums tracking-tight">{formatPrice(buyPrice)}</span>
          </button>
        </div>
      )}

      {/* Symbol Info */}
      <div className="bg-white px-3 py-1 border-b border-gray-200">
        <button onClick={() => setShowPairSelector(true)} className="text-left">
          <span className="text-black text-xs font-medium">{selectedPair.code} ▾ M30</span>
          <br />
          <span className="text-gray-500 text-[10px]">{selectedPair.name}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chart' ? (
          <div className="h-full bg-white">
            <TradingViewWidget symbol={selectedPair.symbol} theme="light" height={window.innerHeight - 220} />
          </div>
        ) : (
          /* Trade/Positions Tab - matches screenshot 1 */
          <div className="h-full bg-white overflow-y-auto">
            {/* Balance Header */}
            <div className="text-center py-3 border-b border-gray-200">
              <div className="flex items-center justify-center gap-2">
                <span className="text-black font-bold text-lg">{formatBalance(currentBalance)} USD</span>
                <span className="text-blue-600 text-xl cursor-pointer">+</span>
              </div>
            </div>

            {/* Account Metrics */}
            <div className="px-4 py-2 border-b border-gray-200 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Balance:</span>
                <span className="text-black text-sm font-medium">{formatBalance(currentBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Equity:</span>
                <span className="text-black text-sm font-medium">{formatBalance(equity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Margin:</span>
                <span className="text-black text-sm font-medium">{formatBalance(margin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Free Margin:</span>
                <span className="text-black text-sm font-medium">{formatBalance(freeMargin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Margin Level (%):</span>
                <span className="text-black text-sm font-medium">{marginLevel > 0 ? marginLevel.toFixed(2) : '0.00'}</span>
              </div>
            </div>

            {/* Positions Header */}
            <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-black font-bold text-sm">Positions</span>
              <span className="text-gray-400 text-lg">•••</span>
            </div>

            {/* Position List */}
            {positions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">No open positions</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {positions.map((pos) => {
                  const pair = FOREX_PAIRS.find(p => p.symbol === pos.symbol);
                  const code = pair?.code || pos.symbol.replace('/', '');
                  const decimals = pair?.decimals || 5;
                  return (
                    <div key={pos.id} className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-black text-sm font-medium">{code}</span>
                          <span className={cn("text-sm ml-1", pos.type === 'sell' ? 'text-red-600' : 'text-blue-600')}>
                            {pos.type} {pos.lotSize.toFixed(1)}
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
                        {pos.entryPrice.toFixed(decimals)} → {pos.currentPrice.toFixed(decimals)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MT5 Bottom Navigation */}
      <div className="bg-[#f5f5f5] border-t border-gray-300 px-2 py-1.5 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          <button onClick={() => navigate('/markets')} className="flex flex-col items-center gap-0.5">
            <span className="text-gray-500 text-base">↕↑</span>
            <span className="text-[10px] text-gray-500">Quotes</span>
          </button>
          <button onClick={() => setActiveTab('chart')} className="flex flex-col items-center gap-0.5">
            <span className={cn("text-base", activeTab === 'chart' ? "text-blue-600" : "text-gray-500")}>↗⇡</span>
            <span className={cn("text-[10px] font-medium", activeTab === 'chart' ? "text-blue-600" : "text-gray-500")}>Chart</span>
          </button>
          <button onClick={() => setActiveTab('trade')} className="flex flex-col items-center gap-0.5">
            <span className={cn("text-base", activeTab === 'trade' ? "text-blue-600" : "text-gray-500")}>☑</span>
            <span className={cn("text-[10px] font-medium", activeTab === 'trade' ? "text-blue-600" : "text-gray-500")}>Trade</span>
          </button>
          <button onClick={() => navigate('/history')} className="flex flex-col items-center gap-0.5">
            <span className="text-gray-500 text-base">⏱</span>
            <span className="text-[10px] text-gray-500">History</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <Settings className="h-4 w-4 text-gray-500" />
            <span className="text-[10px] text-gray-500">Settings</span>
          </button>
        </div>
      </div>

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
