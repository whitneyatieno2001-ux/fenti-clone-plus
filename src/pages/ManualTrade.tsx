import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { TradingViewWidget } from '@/components/TradingViewWidget';
import { cn } from '@/lib/utils';
import { Search, X, ChevronUp, ChevronDown, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tradingPairs, getMarketCategories, getPairsByCategory, type TradingPair } from '@/data/tradingPairs';
import { supabase } from '@/integrations/supabase/client';
import { getTradeOutcome } from '@/lib/tradeOutcome';

interface ActivePosition {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  lotSize: number;
  entryPrice: number;
  currentPrice: number;
  profitLoss: number;
  investment: number;
}

type ActiveTab = 'chart' | 'trade';

export default function ManualTrade() {
  const navigate = useNavigate();
  const [selectedPair, setSelectedPair] = useState<TradingPair>(tradingPairs.find(p => p.symbol === 'EUR/USD') || tradingPairs[0]);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chart');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [pairSearch, setPairSearch] = useState('');
  const [lotSize, setLotSize] = useState(1);
  const [lotInput, setLotInput] = useState('1.00');
  const [positions, setPositions] = useState<ActivePosition[]>([]);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [equity, setEquity] = useState(0);
  const [margin, setMargin] = useState(0);
  const [freeMargin, setFreeMargin] = useState(0);
  const [marginLevel, setMarginLevel] = useState(0);
  
  const { currentBalance, accountType, updateBalance, isLoggedIn, user, userEmail } = useAccount();
  const { toast } = useToast();
  const { getCryptoWithPrice } = useCryptoPrices();
  const positionsRef = useRef(positions);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  const categories = getMarketCategories();
  
  const filteredPairs = getPairsByCategory(selectedCategory).filter(pair =>
    pair.symbol.toLowerCase().includes(pairSearch.toLowerCase()) ||
    pair.name.toLowerCase().includes(pairSearch.toLowerCase())
  );

  const getCurrentPrice = useCallback(() => {
    if (selectedPair.type === 'crypto') {
      const crypto = getCryptoWithPrice({ id: selectedPair.id, symbol: selectedPair.symbol.split('/')[0] } as any);
      return crypto.price;
    }
    const basePrice = selectedPair.basePrice || 1.0;
    const volatility = basePrice * 0.0001;
    return basePrice + (Math.random() - 0.5) * 2 * volatility;
  }, [selectedPair, getCryptoWithPrice]);

  const [sellPrice, setSellPrice] = useState(getCurrentPrice());
  const [buyPrice, setBuyPrice] = useState(getCurrentPrice() * 1.0002);

  useEffect(() => {
    const basePrice = selectedPair.basePrice || 1.0;
    const spread = selectedPair.symbol.includes('XAU') ? 0.14 : 0.00006;
    setSellPrice(basePrice);
    setBuyPrice(basePrice + spread);
  }, [selectedPair]);

  useEffect(() => {
    const interval = setInterval(() => {
      const volatility = selectedPair.symbol.includes('XAU') ? 0.3 : 0.00005;
      const change = (Math.random() - 0.5) * volatility;
      setPriceDirection(change > 0 ? 'up' : 'down');
      setSellPrice(prev => prev + change);
      setBuyPrice(prev => prev + change);
    }, 500);
    return () => clearInterval(interval);
  }, [selectedPair]);

  // Calculate account metrics
  useEffect(() => {
    const totalPL = positions.reduce((sum, pos) => sum + pos.profitLoss, 0);
    const usedMargin = positions.reduce((sum, pos) => sum + (pos.lotSize * 1000), 0);
    const eq = currentBalance + totalPL;
    setEquity(eq);
    setMargin(usedMargin);
    setFreeMargin(eq - usedMargin);
    setMarginLevel(usedMargin > 0 ? (eq / usedMargin) * 100 : 0);
  }, [positions, currentBalance]);

  // Update positions P/L
  useEffect(() => {
    if (positions.length === 0) return;

    const interval = setInterval(() => {
      setPositions(prev => prev.map(pos => {
        const pair = tradingPairs.find(p => p.symbol === pos.symbol);
        if (!pair) return pos;

        const outcome = getTradeOutcome({ accountType, userEmail });
        const bias = outcome === 'win' ? 0.55 : 0.42;
        
        const volatility = (pair.basePrice || 1) * 0.0002;
        const change = (Math.random() - bias) * volatility;
        const newPrice = pos.currentPrice + change;
        
        const priceDiff = pos.type === 'buy' 
          ? newPrice - pos.entryPrice 
          : pos.entryPrice - newPrice;
        
        // 90% payout for manual trading
        const percentChange = priceDiff / pos.entryPrice;
        const profitLoss = percentChange > 0 
          ? pos.investment * 0.90 * (percentChange * 100)
          : -pos.investment * Math.abs(percentChange * 100);

        return {
          ...pos,
          currentPrice: newPrice,
          profitLoss: parseFloat(profitLoss.toFixed(2)),
        };
      }));
    }, 400);

    return () => clearInterval(interval);
  }, [positions.length, accountType, userEmail]);

  const handleTrade = async (direction: 'buy' | 'sell') => {
    if (!isLoggedIn) {
      toast({ title: "Login Required", description: "Please login to trade", variant: "destructive" });
      return;
    }

    const investmentAmount = lotSize * 100;
    
    if (investmentAmount > currentBalance) {
      toast({ title: "Insufficient Balance", description: "Not enough funds for this trade", variant: "destructive" });
      return;
    }

    const success = await updateBalance(accountType, investmentAmount, 'subtract');
    if (!success) {
      toast({ title: "Trade Failed", description: "Could not place trade", variant: "destructive" });
      return;
    }

    const entryPrice = direction === 'buy' ? buyPrice : sellPrice;
    const newPosition: ActivePosition = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      symbol: selectedPair.symbol,
      type: direction,
      lotSize: lotSize,
      entryPrice: entryPrice,
      currentPrice: entryPrice,
      profitLoss: 0,
      investment: investmentAmount,
    };

    setPositions(prev => [...prev, newPosition]);

    if (user) {
      try {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'trade',
          amount: investmentAmount,
          currency: 'USD',
          status: 'completed',
          description: `Manual: ${direction.toUpperCase()} ${selectedPair.symbol} @ ${formatPrice(entryPrice)}`,
          account_type: accountType,
          profit_loss: 0,
        });
      } catch (err) {
        console.error('Error logging trade:', err);
      }
    }

    toast({
      title: `${direction.toUpperCase()} Order Placed!`,
      description: `${lotSize} lot on ${selectedPair.symbol}`,
    });
  };

  const closePosition = async (positionId: string) => {
    const position = positionsRef.current.find(p => p.id === positionId);
    if (!position) return;

    const totalReturn = position.investment + position.profitLoss;
    if (totalReturn > 0) {
      await updateBalance(accountType, totalReturn, 'add');
    }

    if (user) {
      try {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'trade',
          amount: Math.abs(position.profitLoss),
          currency: 'USD',
          status: 'completed',
          description: `Closed ${position.type.toUpperCase()} ${position.symbol} P/L: ${position.profitLoss >= 0 ? '+' : ''}$${position.profitLoss.toFixed(2)}`,
          account_type: accountType,
          profit_loss: position.profitLoss,
        });
      } catch (err) {
        console.error('Error logging close:', err);
      }
    }

    setPositions(prev => prev.filter(p => p.id !== positionId));
    
    toast({
      title: position.profitLoss >= 0 ? "Profit Taken! 💰" : "Position Closed",
      description: `${position.symbol} P/L: ${position.profitLoss >= 0 ? '+' : ''}$${position.profitLoss.toFixed(2)}`,
    });
  };

  const formatPrice = (price: number) => {
    if (selectedPair.symbol.includes('XAU') || selectedPair.symbol.includes('GOLD')) {
      return price.toFixed(2);
    }
    if (selectedPair.symbol.includes('JPY')) {
      return price.toFixed(3);
    }
    if (selectedPair.type === 'forex') {
      return price.toFixed(5);
    }
    return price >= 1 ? price.toFixed(2) : price.toFixed(4);
  };

  const formatBalance = (val: number) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const adjustLotSize = (direction: 'up' | 'down') => {
    if (direction === 'up') {
      setLotSize(prev => Math.min(prev + 1, 100));
    } else {
      setLotSize(prev => Math.max(prev - 1, 1));
    }
  };

  const handleLotInputChange = (val: string) => {
    setLotInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.01 && num <= 100) {
      setLotSize(num);
    }
  };

  const getSymbolCode = (symbol: string) => {
    return symbol.replace('/', '') + '.s';
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
            onClick={() => handleTrade('sell')}
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
            onClick={() => handleTrade('buy')}
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
          <span className="text-black text-xs font-medium">{getSymbolCode(selectedPair.symbol)} ▾ M30</span>
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
          /* Trade/Positions Tab */
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
                {positions.map((pos) => (
                  <div key={pos.id} className="px-4 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-black text-sm font-medium">{getSymbolCode(pos.symbol)}</span>
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
                    <div className="text-gray-500 text-xs mt-0.5 flex items-center justify-between">
                      <span>{formatPrice(pos.entryPrice)} → {formatPrice(pos.currentPrice)}</span>
                      <button 
                        onClick={() => closePosition(pos.id)}
                        className="text-red-500 text-xs font-medium"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ))}
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
              <span className="text-black font-bold text-lg">Settings</span>
              <button onClick={() => setShowSettings(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            {/* Lot Size Input */}
            <div className="mb-4">
              <label className="text-gray-600 text-sm mb-2 block">Lot Size</label>
              <input
                type="text"
                inputMode="decimal"
                value={lotInput}
                onChange={(e) => handleLotInputChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-lg border border-gray-300 bg-gray-50 text-black"
                placeholder="0.01"
              />
            </div>

            {/* Open Positions */}
            <div>
              <span className="text-black font-bold mb-2 block">Open Positions ({positions.length})</span>
              {positions.length === 0 ? (
                <p className="text-gray-500 text-sm">No open positions</p>
              ) : (
                <div className="space-y-2">
                  {positions.map(pos => (
                    <div key={pos.id} className="p-3 rounded-lg bg-gray-100 border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-black font-medium">{getSymbolCode(pos.symbol)}</span>
                          <span className={cn("ml-2 text-sm", pos.type === 'buy' ? "text-blue-600" : "text-red-600")}>
                            {pos.type.toUpperCase()} {pos.lotSize}
                          </span>
                        </div>
                        <span className={cn("font-bold", pos.profitLoss >= 0 ? "text-blue-600" : "text-red-600")}>
                          {pos.profitLoss >= 0 ? '+' : ''}{pos.profitLoss.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-gray-500 text-xs">
                          {formatPrice(pos.entryPrice)} → {formatPrice(pos.currentPrice)}
                        </span>
                        <button 
                          onClick={() => closePosition(pos.id)}
                          className="bg-red-500 text-white text-sm px-3 py-1 rounded"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pair Selector Modal */}
      {showPairSelector && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[70vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-black font-bold text-lg">Select Pair</span>
              <button onClick={() => setShowPairSelector(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={pairSearch}
                onChange={(e) => setPairSearch(e.target.value)}
                placeholder="Search pairs..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-black text-sm"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs whitespace-nowrap border",
                    selectedCategory === cat.id 
                      ? "bg-blue-600 text-white border-blue-600" 
                      : "bg-gray-100 text-gray-700 border-gray-200"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Pairs List */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredPairs.map(pair => (
                <button
                  key={pair.symbol}
                  onClick={() => { setSelectedPair(pair); setShowPairSelector(false); setPairSearch(''); }}
                  className={cn(
                    "w-full p-3 rounded-lg flex items-center justify-between border",
                    selectedPair.symbol === pair.symbol ? "bg-blue-50 border-blue-500" : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="text-left">
                    <div className="text-black font-medium text-sm">{getSymbolCode(pair.symbol)}</div>
                    <div className="text-gray-500 text-xs">{pair.name}</div>
                  </div>
                  <span className="text-black font-mono text-sm">{(pair.basePrice || 0).toFixed(pair.type === 'forex' ? 5 : 2)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
