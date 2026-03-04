import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TradingViewWidget } from '@/components/TradingViewWidget';
import { PageLoader } from '@/components/PageLoader';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { cryptoAssets, formatPrice as formatCryptoPrice } from '@/data/cryptoData';
import { getCoinIcon } from '@/data/coinIcons';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/BottomNav';
import { ChevronLeft, Search, Star, MoreHorizontal, Zap, AlertTriangle } from 'lucide-react';
import { useTheme } from 'next-themes';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  depth: number;
}

interface FuturesPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  leverage: number;
  entryPrice: number;
  margin: number;
  size: number;
  liquidationPrice: number;
  pnl: number;
  pnlPercent: number;
}

const WATCHLIST_PAIRS = [
  { symbol: 'BTC/USDT', id: 'bitcoin' },
  { symbol: 'ETH/USDT', id: 'ethereum' },
  { symbol: 'BNB/USDT', id: 'binancecoin' },
  { symbol: 'SOL/USDT', id: 'solana' },
  { symbol: 'XRP/USDT', id: 'ripple' },
  { symbol: 'ADA/USDT', id: 'cardano' },
  { symbol: 'DOGE/USDT', id: 'dogecoin' },
  { symbol: 'DOT/USDT', id: 'polkadot' },
  { symbol: 'AVAX/USDT', id: 'avalanche-2' },
  { symbol: 'LINK/USDT', id: 'chainlink' },
];

const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20, 25, 50, 75, 100, 125];

type MobileTab = 'chart' | 'orderbook' | 'trades' | 'info';
type OrderType = 'limit' | 'market';
type BottomPanelTab = 'positions' | 'open' | 'history';

export default function Futures() {
  const navigate = useNavigate();
  const { currentBalance, deposit, withdraw, accountType } = useAccount();
  const { toast } = useToast();
  const { getCryptoWithPrice, getAllCryptosWithPrices } = useCryptoPrices();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [selectedPairId, setSelectedPairId] = useState('bitcoin');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [leverage, setLeverage] = useState(20);
  const [showLeverageModal, setShowLeverageModal] = useState(false);
  const [longPrice, setLongPrice] = useState('');
  const [longAmount, setLongAmount] = useState('');
  const [shortPrice, setShortPrice] = useState('');
  const [shortAmount, setShortAmount] = useState('');
  const [sliderLong, setSliderLong] = useState(0);
  const [sliderShort, setSliderShort] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chart');
  const [bottomTab, setBottomTab] = useState<BottomPanelTab>('positions');
  const [searchQuery, setSearchQuery] = useState('');
  const [wlTab, setWlTab] = useState('USDT');
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [chartInterval, setChartInterval] = useState('15');
  const [positions, setPositions] = useState<FuturesPosition[]>([]);

  const selectedCrypto = getCryptoWithPrice(cryptoAssets.find(c => c.id === selectedPairId) || cryptoAssets[0]);
  const pairSymbol = `${selectedCrypto.symbol}USDT Perp`;
  const currentPrice = selectedCrypto.price;
  const change24h = selectedCrypto.change24h;

  // Generate order book
  useEffect(() => {
    if (!currentPrice || currentPrice === 0) return;
    const generateBook = () => {
      const newAsks: OrderBookEntry[] = [];
      const newBids: OrderBookEntry[] = [];
      let askTotal = 0, bidTotal = 0;
      for (let i = 0; i < 20; i++) {
        const askPrice = currentPrice + (i + 1) * currentPrice * 0.00005;
        const askAmt = parseFloat((Math.random() * 0.5 + 0.01).toFixed(5));
        askTotal += askAmt * askPrice;
        newAsks.push({ price: askPrice, amount: askAmt, total: parseFloat((askTotal / 1000).toFixed(1)), depth: Math.random() * 100 });
      }
      for (let i = 0; i < 20; i++) {
        const bidPrice = currentPrice - (i + 1) * currentPrice * 0.00005;
        const bidAmt = parseFloat((Math.random() * 0.5 + 0.01).toFixed(5));
        bidTotal += bidAmt * bidPrice;
        newBids.push({ price: bidPrice, amount: bidAmt, total: parseFloat((bidTotal / 1000).toFixed(1)), depth: Math.random() * 100 });
      }
      setAsks(newAsks.reverse());
      setBids(newBids);
    };
    generateBook();
    const interval = setInterval(generateBook, 2000);
    return () => clearInterval(interval);
  }, [currentPrice, selectedPairId]);

  // Update P/L on positions
  useEffect(() => {
    if (positions.length === 0 || !currentPrice) return;
    const interval = setInterval(() => {
      setPositions(prev => prev.map(pos => {
        const priceDiff = currentPrice - pos.entryPrice;
        const pnl = pos.side === 'long' 
          ? (priceDiff / pos.entryPrice) * pos.size
          : (-priceDiff / pos.entryPrice) * pos.size;
        const pnlPercent = (pnl / pos.margin) * 100;
        return { ...pos, pnl, pnlPercent };
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [positions.length, currentPrice]);

  useEffect(() => {
    if (currentPrice > 0) {
      setLongPrice(currentPrice.toFixed(2));
      setShortPrice(currentPrice.toFixed(2));
    }
  }, [selectedPairId, currentPrice]);

  const formatOBPrice = (price: number) => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const handleOpenPosition = (side: 'long' | 'short') => {
    const price = orderType === 'market' ? currentPrice : parseFloat(side === 'long' ? longPrice : shortPrice);
    const amount = parseFloat(side === 'long' ? longAmount : shortAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    const margin = (price * amount) / leverage;
    if (margin > currentBalance) {
      toast({ title: "Insufficient margin", description: `Need $${margin.toFixed(2)} margin`, variant: "destructive" });
      return;
    }

    withdraw(margin);
    const liquidationPrice = side === 'long'
      ? price * (1 - 1 / leverage * 0.9)
      : price * (1 + 1 / leverage * 0.9);

    const newPosition: FuturesPosition = {
      id: Date.now().toString(),
      symbol: selectedCrypto.symbol,
      side,
      leverage,
      entryPrice: price,
      margin,
      size: price * amount,
      liquidationPrice,
      pnl: 0,
      pnlPercent: 0,
    };

    setPositions(prev => [...prev, newPosition]);
    toast({ 
      title: `${side.toUpperCase()} Position Opened`,
      description: `${selectedCrypto.symbol} ${leverage}x | Size: $${(price * amount).toFixed(2)} | Margin: $${margin.toFixed(2)}`
    });
    if (side === 'long') setLongAmount('');
    else setShortAmount('');
  };

  const handleClosePosition = (posId: string) => {
    const pos = positions.find(p => p.id === posId);
    if (!pos) return;
    const returnAmount = pos.margin + pos.pnl;
    if (returnAmount > 0) deposit(returnAmount);
    setPositions(prev => prev.filter(p => p.id !== posId));
    toast({
      title: "Position Closed",
      description: `${pos.side.toUpperCase()} ${pos.symbol} | P/L: ${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)}`,
    });
  };

  const longTotal = (parseFloat(longPrice || '0') * parseFloat(longAmount || '0')).toFixed(2);
  const shortTotal = (parseFloat(shortPrice || '0') * parseFloat(shortAmount || '0')).toFixed(2);
  const longMargin = ((parseFloat(longPrice || '0') * parseFloat(longAmount || '0')) / leverage).toFixed(2);
  const shortMargin = ((parseFloat(shortPrice || '0') * parseFloat(shortAmount || '0')) / leverage).toFixed(2);

  const allCryptos = getAllCryptosWithPrices();
  const filteredWatchlist = WATCHLIST_PAIRS.filter(p =>
    p.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const high24h = currentPrice * 1.02;
  const low24h = currentPrice * 0.98;
  const vol24h = parseFloat(selectedCrypto.volume24h?.replace(/[^0-9.]/g, '') || '0');
  const tvTheme = isDark ? 'dark' : 'light';

  // Funding rate mock
  const fundingRate = (Math.random() * 0.02 - 0.005).toFixed(4);

  return (
    <PageLoader>
    <div className="h-screen flex flex-col bg-background text-foreground" style={{ fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: '12px' }}>

      {/* === HEADER === */}
      <div className="bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-50" style={{ height: 56 }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={getCoinIcon(selectedCrypto.symbol)} alt={selectedCrypto.symbol} className="w-6 h-6 rounded-full" />
            <div>
              <div className="font-semibold text-sm text-foreground flex items-center gap-1">
                {pairSymbol}
                <span className="text-[10px] px-1 py-0.5 rounded bg-primary/20 text-primary font-bold">{leverage}x</span>
              </div>
              <div className="text-xs text-muted-foreground">Perpetual</div>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <div>
            <div className={cn("text-xl font-semibold", change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
              {formatOBPrice(currentPrice)}
            </div>
            <div className="text-xs text-muted-foreground">= ${currentPrice.toFixed(2)}</div>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div>
              <div className="text-muted-foreground">24h Change</div>
              <div className={change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]"}>
                {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Mark Price</div>
              <div className="text-foreground font-medium">{formatOBPrice(currentPrice * 1.0001)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Funding / Countdown</div>
              <div className={cn("font-medium", parseFloat(fundingRate) >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                {fundingRate}% / 07:23:15
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">24h Vol(USDT)</div>
              <div className="text-foreground font-medium">{(vol24h * currentPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="text-xs">Wallet</span>
          <MoreHorizontal className="h-4 w-4" />
        </div>
      </div>

      {/* === MOBILE TABS === */}
      <div className="md:hidden flex border-b border-border bg-card sticky top-[56px] z-40">
        {(['chart', 'orderbook', 'trades', 'info'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={cn(
              "flex-1 text-center py-3 text-sm capitalize border-b-2 font-medium",
              mobileTab === tab
                ? "text-foreground font-semibold border-primary"
                : "text-muted-foreground border-transparent"
            )}
          >
            {tab === 'orderbook' ? 'Order Book' : tab}
          </button>
        ))}
      </div>

      {/* === MAIN CONTENT === */}
      <div className="flex-1 overflow-auto pb-40 md:pb-4">
        {/* Desktop Grid */}
        <div className="hidden md:grid gap-px p-px" style={{ gridTemplateColumns: '288px 1fr 318px', maxWidth: 1920, margin: '0 auto' }}>

          {/* LEFT: Order Book */}
          <div className="bg-card border border-border">
            <div className="flex justify-between items-center px-3 py-2 border-b border-border text-xs font-semibold text-foreground">
              <span>Order Book</span>
            </div>
            <div className="flex px-3 py-1 text-[11px] text-muted-foreground">
              <span className="flex-1">Price(USDT)</span>
              <span className="flex-1 text-right">Amount({selectedCrypto.symbol})</span>
              <span className="flex-1 text-right">Total</span>
            </div>
            <div className="flex flex-col-reverse">
              {asks.map((a, i) => (
                <div key={`ask-${i}`} className="flex px-3 relative cursor-pointer hover:bg-muted/50" style={{ height: 18, alignItems: 'center', fontSize: 12 }}>
                  <div className="absolute top-0 bottom-0 right-0 bg-[#f6465d]/10" style={{ width: `${a.depth}%` }} />
                  <span className="flex-1 relative z-10 font-medium text-[#f6465d]">{formatOBPrice(a.price)}</span>
                  <span className="flex-1 text-right relative z-10 text-foreground">{a.amount.toFixed(5)}</span>
                  <span className="flex-1 text-right relative z-10 text-foreground">{a.total}K</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-3 py-2 border-y border-border bg-muted/30">
              <span className={cn("text-lg font-semibold", change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                {formatOBPrice(currentPrice)}
              </span>
              <span className="text-[11px] text-muted-foreground">Mark: {formatOBPrice(currentPrice * 1.0001)}</span>
            </div>
            <div>
              {bids.map((b, i) => (
                <div key={`bid-${i}`} className="flex px-3 relative cursor-pointer hover:bg-muted/50" style={{ height: 18, alignItems: 'center', fontSize: 12 }}>
                  <div className="absolute top-0 bottom-0 right-0 bg-[#0ecb81]/10" style={{ width: `${b.depth}%` }} />
                  <span className="flex-1 relative z-10 font-medium text-[#0ecb81]">{formatOBPrice(b.price)}</span>
                  <span className="flex-1 text-right relative z-10 text-foreground">{b.amount.toFixed(5)}</span>
                  <span className="flex-1 text-right relative z-10 text-foreground">{b.total}K</span>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER: Chart + Trading Form */}
          <div className="flex flex-col">
            {/* Chart Toolbar */}
            <div className="bg-card border border-border border-t-0 flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground">
              <span className="mr-1">Time</span>
              {[
                { label: '1m', value: '1' },
                { label: '5m', value: '5' },
                { label: '15m', value: '15' },
                { label: '1H', value: '60' },
                { label: '4H', value: '240' },
                { label: '1D', value: 'D' },
                { label: '1W', value: 'W' },
              ].map(tf => (
                <span
                  key={tf.value}
                  onClick={() => setChartInterval(tf.value)}
                  className={cn("cursor-pointer px-2 py-1 rounded transition-colors", chartInterval === tf.value ? "font-semibold text-primary" : "hover:text-foreground")}
                >
                  {tf.label}
                </span>
              ))}
              <div className="w-px h-3.5 bg-border mx-1" />
              <span className="font-semibold text-primary">TradingView</span>
            </div>

            <div className="bg-card border border-border border-t-0" style={{ height: 400 }}>
              <TradingViewWidget 
                symbol={`${selectedCrypto.symbol}/USD`} 
                theme={tvTheme} 
                height={400} 
                interval={chartInterval}
              />
            </div>

            {/* Trading Form - Futures Style */}
            <div className="bg-card border border-border border-t-0">
              <div className="flex gap-6 px-4 pt-3 border-b border-border text-sm font-semibold">
                {['USDT-M Futures', 'COIN-M Futures'].map((t, i) => (
                  <span
                    key={t}
                    className={cn("pb-3 cursor-pointer relative", i === 0 ? "text-primary" : "text-muted-foreground")}
                  >
                    {t}
                    {i === 0 && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary" />}
                  </span>
                ))}
              </div>

              {/* Leverage selector */}
              <div className="px-4 py-2 border-b border-border flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Cross</span>
                <button
                  onClick={() => setShowLeverageModal(!showLeverageModal)}
                  className="text-xs font-semibold text-primary px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 flex items-center gap-1"
                >
                  <Zap className="h-3 w-3" />
                  {leverage}x
                </button>
                {showLeverageModal && (
                  <div className="flex gap-1 flex-wrap">
                    {LEVERAGE_OPTIONS.map(lev => (
                      <button
                        key={lev}
                        onClick={() => { setLeverage(lev); setShowLeverageModal(false); }}
                        className={cn(
                          "px-2 py-1 text-[11px] rounded font-medium",
                          leverage === lev ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {lev}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4 p-4">
                {/* Long Form */}
                <div className="flex-1">
                  <div className="flex gap-4 text-xs font-semibold mb-3">
                    <span className={cn("cursor-pointer", orderType === 'limit' ? "text-foreground" : "text-muted-foreground")} onClick={() => setOrderType('limit')}>Limit</span>
                    <span className={cn("cursor-pointer", orderType === 'market' ? "text-foreground" : "text-muted-foreground")} onClick={() => setOrderType('market')}>Market</span>
                  </div>

                  {orderType === 'limit' && (
                    <div className="mb-2 flex items-center border border-border rounded h-10 bg-card hover:border-primary transition-colors">
                      <span className="px-3 text-sm text-muted-foreground">Price</span>
                      <input type="number" value={longPrice} onChange={e => setLongPrice(e.target.value)}
                        className="flex-1 border-none outline-none bg-transparent text-right text-sm font-medium px-2 text-foreground" />
                      <span className="px-3 text-xs text-foreground">USDT</span>
                    </div>
                  )}

                  <div className="mb-2 flex items-center border border-border rounded h-10 bg-card hover:border-primary transition-colors">
                    <span className="px-3 text-sm text-muted-foreground">Size</span>
                    <input type="number" value={longAmount} onChange={e => setLongAmount(e.target.value)}
                      className="flex-1 border-none outline-none bg-transparent text-right text-sm font-medium px-2 text-foreground" />
                    <span className="px-3 text-xs text-foreground">{selectedCrypto.symbol}</span>
                  </div>

                  <div className="my-3 relative h-0.5 bg-border">
                    {[0, 25, 50, 75, 100].map(pct => (
                      <button key={pct} onClick={() => {
                        setSliderLong(pct);
                        const price = orderType === 'market' ? currentPrice : parseFloat(longPrice || '0');
                        if (price > 0) {
                          const maxSize = (currentBalance * leverage * pct / 100) / price;
                          setLongAmount(maxSize.toFixed(6));
                        }
                      }}
                        className="absolute w-2 h-2 border-2 rounded-sm transition-all"
                        style={{
                          left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%) rotate(45deg)',
                          background: sliderLong >= pct ? '#0ecb81' : isDark ? '#181a20' : '#fff',
                          borderColor: sliderLong >= pct ? '#0ecb81' : isDark ? '#474d57' : '#b7bdc6',
                        }}
                      />
                    ))}
                  </div>

                  <div className="space-y-1 text-xs my-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margin</span>
                      <span className="font-medium text-foreground">{longMargin} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avbl</span>
                      <span className="font-medium text-foreground">{currentBalance.toFixed(2)} USDT</span>
                    </div>
                  </div>

                  <button onClick={() => handleOpenPosition('long')}
                    className="w-full h-10 rounded text-sm font-semibold text-white cursor-pointer transition-colors bg-[#0ecb81] hover:bg-[#0bb974]">
                    Open Long
                  </button>
                </div>

                {/* Short Form */}
                <div className="flex-1">
                  <div className="flex gap-4 text-xs font-semibold mb-3">
                    <span className={cn("cursor-pointer", orderType === 'limit' ? "text-foreground" : "text-muted-foreground")} onClick={() => setOrderType('limit')}>Limit</span>
                    <span className={cn("cursor-pointer", orderType === 'market' ? "text-foreground" : "text-muted-foreground")} onClick={() => setOrderType('market')}>Market</span>
                  </div>

                  {orderType === 'limit' && (
                    <div className="mb-2 flex items-center border border-border rounded h-10 bg-card hover:border-primary transition-colors">
                      <span className="px-3 text-sm text-muted-foreground">Price</span>
                      <input type="number" value={shortPrice} onChange={e => setShortPrice(e.target.value)}
                        className="flex-1 border-none outline-none bg-transparent text-right text-sm font-medium px-2 text-foreground" />
                      <span className="px-3 text-xs text-foreground">USDT</span>
                    </div>
                  )}

                  <div className="mb-2 flex items-center border border-border rounded h-10 bg-card hover:border-primary transition-colors">
                    <span className="px-3 text-sm text-muted-foreground">Size</span>
                    <input type="number" value={shortAmount} onChange={e => setShortAmount(e.target.value)}
                      className="flex-1 border-none outline-none bg-transparent text-right text-sm font-medium px-2 text-foreground" />
                    <span className="px-3 text-xs text-foreground">{selectedCrypto.symbol}</span>
                  </div>

                  <div className="my-3 relative h-0.5 bg-border">
                    {[0, 25, 50, 75, 100].map(pct => (
                      <button key={pct} onClick={() => {
                        setSliderShort(pct);
                        const price = orderType === 'market' ? currentPrice : parseFloat(shortPrice || '0');
                        if (price > 0) {
                          const maxSize = (currentBalance * leverage * pct / 100) / price;
                          setShortAmount(maxSize.toFixed(6));
                        }
                      }}
                        className="absolute w-2 h-2 border-2 rounded-sm transition-all"
                        style={{
                          left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%) rotate(45deg)',
                          background: sliderShort >= pct ? '#f6465d' : isDark ? '#181a20' : '#fff',
                          borderColor: sliderShort >= pct ? '#f6465d' : isDark ? '#474d57' : '#b7bdc6',
                        }}
                      />
                    ))}
                  </div>

                  <div className="space-y-1 text-xs my-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margin</span>
                      <span className="font-medium text-foreground">{shortMargin} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avbl</span>
                      <span className="font-medium text-foreground">{currentBalance.toFixed(2)} USDT</span>
                    </div>
                  </div>

                  <button onClick={() => handleOpenPosition('short')}
                    className="w-full h-10 rounded text-sm font-semibold text-white cursor-pointer transition-colors bg-[#f6465d] hover:bg-[#e8364e]">
                    Open Short
                  </button>
                </div>
              </div>
            </div>

            {/* Positions Panel */}
            <div className="bg-card border border-border border-t-0">
              <div className="flex gap-6 px-4 pt-3 border-b border-border text-sm font-semibold">
                {([['positions', `Positions(${positions.length})`], ['open', `Open Orders(${positions.length})`], ['history', 'Trade History']] as const).map(([key, label]) => (
                  <span key={key} onClick={() => setBottomTab(key)}
                    className={cn("pb-3 cursor-pointer relative", bottomTab === key ? "text-primary" : "text-muted-foreground")}>
                    {label}
                    {bottomTab === key && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary" />}
                  </span>
                ))}
              </div>
              {bottomTab === 'positions' && positions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left px-3 py-2 font-normal">Symbol</th>
                        <th className="text-right px-3 py-2 font-normal">Size</th>
                        <th className="text-right px-3 py-2 font-normal">Entry Price</th>
                        <th className="text-right px-3 py-2 font-normal">Mark Price</th>
                        <th className="text-right px-3 py-2 font-normal">Liq. Price</th>
                        <th className="text-right px-3 py-2 font-normal">Margin</th>
                        <th className="text-right px-3 py-2 font-normal">PNL(ROE%)</th>
                        <th className="text-right px-3 py-2 font-normal">Close</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map(pos => (
                        <tr key={pos.id} className="border-b border-border/30 hover:bg-muted/30">
                          <td className="px-3 py-2 text-left">
                            <div className="font-semibold text-foreground">{pos.symbol}USDT</div>
                            <div className={cn("text-[10px] font-medium", pos.side === 'long' ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                              {pos.side.toUpperCase()} {pos.leverage}x
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-foreground">${pos.size.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-foreground">{formatOBPrice(pos.entryPrice)}</td>
                          <td className="px-3 py-2 text-right text-foreground">{formatOBPrice(currentPrice)}</td>
                          <td className="px-3 py-2 text-right text-[#f6465d]">{formatOBPrice(pos.liquidationPrice)}</td>
                          <td className="px-3 py-2 text-right text-foreground">${pos.margin.toFixed(2)}</td>
                          <td className={cn("px-3 py-2 text-right font-medium", pos.pnl >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                            {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                            <div className="text-[10px]">({pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%)</div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => handleClosePosition(pos.id)}
                              className="text-primary hover:underline text-xs font-semibold">Close</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : bottomTab === 'open' && positions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left px-3 py-2 font-normal">Symbol</th>
                        <th className="text-left px-3 py-2 font-normal">Side</th>
                        <th className="text-right px-3 py-2 font-normal">Size</th>
                        <th className="text-right px-3 py-2 font-normal">Entry Price</th>
                        <th className="text-right px-3 py-2 font-normal">Leverage</th>
                        <th className="text-right px-3 py-2 font-normal">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map(pos => (
                        <tr key={pos.id} className="border-b border-border/30 hover:bg-muted/30">
                          <td className="px-3 py-2 text-left font-semibold text-foreground">{pos.symbol}USDT</td>
                          <td className={cn("px-3 py-2 text-left font-medium", pos.side === 'long' ? "text-[#0ecb81]" : "text-[#f6465d]")}>{pos.side.toUpperCase()}</td>
                          <td className="px-3 py-2 text-right text-foreground">${pos.size.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-foreground">{formatOBPrice(pos.entryPrice)}</td>
                          <td className="px-3 py-2 text-right text-foreground">{pos.leverage}x</td>
                          <td className="px-3 py-2 text-right text-foreground">${pos.margin.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <div className="text-sm">{bottomTab === 'positions' ? 'No open positions' : bottomTab === 'open' ? 'No open orders' : 'No data'}</div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Watchlist */}
          <div className="bg-card border border-border">
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-2 rounded px-3 py-1.5 bg-muted">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input type="text" placeholder="Search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 border-none outline-none bg-transparent text-xs text-foreground" />
              </div>
            </div>
            <div className="flex gap-5 px-3 py-2 border-b border-border text-xs font-semibold">
              {['USDT', 'COIN-M'].map(t => (
                <span key={t} onClick={() => setWlTab(t)}
                  className={cn("cursor-pointer pb-2 relative", wlTab === t ? "text-primary" : "text-muted-foreground")}>
                  {t}
                  {wlTab === t && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary" />}
                </span>
              ))}
            </div>
            <div className="grid px-3 py-1 text-[11px] text-muted-foreground" style={{ gridTemplateColumns: '1.5fr 1fr 1fr' }}>
              <span>Pair</span>
              <span className="text-right">Price</span>
              <span className="text-right">Change</span>
            </div>
            <div className="max-h-[500px] overflow-auto">
              {filteredWatchlist.map(wp => {
                const crypto = allCryptos.find(c => c.id === wp.id);
                if (!crypto) return null;
                return (
                  <div key={wp.id} onClick={() => setSelectedPairId(wp.id)}
                    className={cn("grid px-3 py-1.5 text-xs items-center cursor-pointer border-b border-border/30 hover:bg-muted/50",
                      selectedPairId === wp.id && "bg-muted/50"
                    )} style={{ gridTemplateColumns: '1.5fr 1fr 1fr' }}>
                    <div className="flex items-center gap-1.5">
                      <img src={getCoinIcon(crypto.symbol)} alt={crypto.symbol} className="w-4 h-4 rounded-full" />
                      <span className="font-semibold text-foreground">{crypto.symbol}</span>
                      <span className="text-[10px] text-muted-foreground">/USDT</span>
                    </div>
                    <span className="text-right font-medium text-foreground">{formatOBPrice(crypto.price)}</span>
                    <span className={cn("text-right font-medium", crypto.change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                      {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* === MOBILE VIEW === */}
        <div className="md:hidden">
          {/* Mobile Price Bar */}
          <div className="bg-card px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={getCoinIcon(selectedCrypto.symbol)} alt="" className="w-6 h-6 rounded-full" />
                <div>
                  <div className={cn("text-xl font-semibold", change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                    {formatOBPrice(currentPrice)}
                  </div>
                  <div className="text-xs text-muted-foreground">= ${currentPrice.toFixed(2)}</div>
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="flex items-center gap-1 justify-end">
                  <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold">{leverage}x</span>
                  <span className={change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]"}>
                    {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                  </span>
                </div>
                <div className="text-muted-foreground mt-1">Funding: {fundingRate}%</div>
              </div>
            </div>
          </div>

          {/* Leverage quick select mobile */}
          <div className="bg-card px-4 py-2 border-b border-border flex items-center gap-2 overflow-x-auto">
            <span className="text-xs text-muted-foreground flex-shrink-0">Leverage:</span>
            {[5, 10, 20, 50, 100, 125].map(lev => (
              <button key={lev} onClick={() => setLeverage(lev)}
                className={cn("px-2 py-1 text-[11px] rounded font-medium flex-shrink-0",
                  leverage === lev ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                {lev}x
              </button>
            ))}
          </div>

          {mobileTab === 'chart' && (
            <div className="bg-card mx-2 mt-2 rounded border border-border overflow-hidden">
              <div className="flex items-center gap-1 px-3 py-2 text-xs border-b border-border text-muted-foreground">
                {[
                  { label: '1m', value: '1' },
                  { label: '5m', value: '5' },
                  { label: '15m', value: '15' },
                  { label: '1H', value: '60' },
                  { label: '4H', value: '240' },
                  { label: '1D', value: 'D' },
                  { label: '1W', value: 'W' },
                ].map(tf => (
                  <span key={tf.value} onClick={() => setChartInterval(tf.value)}
                    className={cn("cursor-pointer px-2 py-1 rounded", chartInterval === tf.value ? "font-semibold text-primary" : "")}>
                    {tf.label}
                  </span>
                ))}
              </div>
              <div style={{ height: 280 }}>
                <TradingViewWidget symbol={`${selectedCrypto.symbol}/USD`} theme={tvTheme} height={280} interval={chartInterval} />
              </div>
            </div>
          )}

          {mobileTab === 'orderbook' && (
            <div className="bg-card mx-2 mt-2 rounded border border-border p-3">
              <div className="flex text-[11px] mb-2 text-muted-foreground">
                <span className="flex-1">Price(USDT)</span>
                <span className="flex-1 text-right">Amount</span>
                <span className="flex-1 text-right">Total</span>
              </div>
              {asks.slice(-10).map((a, i) => (
                <div key={`ma-${i}`} className="flex text-xs py-px relative">
                  <div className="absolute top-0 bottom-0 right-0 bg-[#f6465d]/10" style={{ width: `${a.depth}%` }} />
                  <span className="flex-1 text-[#f6465d] font-medium relative z-10">{formatOBPrice(a.price)}</span>
                  <span className="flex-1 text-right text-foreground relative z-10">{a.amount.toFixed(5)}</span>
                  <span className="flex-1 text-right text-foreground relative z-10">{a.total}K</span>
                </div>
              ))}
              <div className="py-2 text-center">
                <span className={cn("text-lg font-semibold", change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                  {formatOBPrice(currentPrice)}
                </span>
              </div>
              {bids.slice(0, 10).map((b, i) => (
                <div key={`mb-${i}`} className="flex text-xs py-px relative">
                  <div className="absolute top-0 bottom-0 right-0 bg-[#0ecb81]/10" style={{ width: `${b.depth}%` }} />
                  <span className="flex-1 text-[#0ecb81] font-medium relative z-10">{formatOBPrice(b.price)}</span>
                  <span className="flex-1 text-right text-foreground relative z-10">{b.amount.toFixed(5)}</span>
                  <span className="flex-1 text-right text-foreground relative z-10">{b.total}K</span>
                </div>
              ))}
            </div>
          )}

          {mobileTab === 'info' && (
            <div className="bg-card mx-2 mt-2 rounded border border-border p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mark Price</span>
                <span className="font-medium text-foreground">{formatOBPrice(currentPrice * 1.0001)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Index Price</span>
                <span className="font-medium text-foreground">{formatOBPrice(currentPrice * 0.9999)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Funding Rate</span>
                <span className={cn("font-medium", parseFloat(fundingRate) >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>{fundingRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open Interest</span>
                <span className="font-medium text-foreground">{(vol24h * 0.3).toLocaleString()} {selectedCrypto.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Volume</span>
                <span className="font-medium text-foreground">${(vol24h * currentPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          )}

          {/* Mobile Positions */}
          {positions.length > 0 && (
            <div className="bg-card mx-2 mt-2 rounded border border-border p-3">
              <div className="text-sm font-semibold mb-2 text-foreground">Positions ({positions.length})</div>
              {positions.map(pos => (
                <div key={pos.id} className="py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-xs">{pos.symbol}USDT</span>
                      <span className={cn("text-[10px] font-bold px-1 rounded", pos.side === 'long' ? "text-[#0ecb81] bg-[#0ecb81]/10" : "text-[#f6465d] bg-[#f6465d]/10")}>
                        {pos.side.toUpperCase()} {pos.leverage}x
                      </span>
                    </div>
                    <button onClick={() => handleClosePosition(pos.id)} className="text-primary text-xs font-semibold">Close</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className="text-muted-foreground">Size: ${pos.size.toFixed(2)}</span>
                    <span className="text-right text-muted-foreground">Margin: ${pos.margin.toFixed(2)}</span>
                    <span className="text-muted-foreground">Entry: {formatOBPrice(pos.entryPrice)}</span>
                    <span className={cn("text-right font-medium", pos.pnl >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                      PNL: {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)} ({pos.pnlPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mobile Pairs */}
          <div className="bg-card mx-2 mt-2 rounded border border-border p-3">
            <div className="text-sm font-semibold mb-2 text-foreground">Pairs</div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {WATCHLIST_PAIRS.slice(0, 8).map(wp => {
                const crypto = allCryptos.find(c => c.id === wp.id);
                if (!crypto) return null;
                return (
                  <button key={wp.id} onClick={() => setSelectedPairId(wp.id)}
                    className={cn("flex-shrink-0 px-3 py-1.5 rounded text-xs font-medium border flex items-center gap-1",
                      selectedPairId === wp.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
                    )}>
                    <img src={getCoinIcon(crypto.symbol)} alt="" className="w-4 h-4 rounded-full" />
                    {crypto.symbol}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Long/Short Footer with Stake Input */}
          <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border px-3 py-2 z-50">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 flex items-center border border-border rounded h-9 bg-muted/50">
                <span className="px-2 text-[11px] text-muted-foreground">USDT</span>
                <input
                  type="number"
                  placeholder="Stake amount"
                  value={longAmount ? (parseFloat(longAmount) * currentPrice).toFixed(2) : ''}
                  onChange={e => {
                    const usdtVal = parseFloat(e.target.value || '0');
                    if (currentPrice > 0) {
                      const amt = (usdtVal / currentPrice).toFixed(6);
                      setLongAmount(amt);
                      setShortAmount(amt);
                    }
                  }}
                  className="flex-1 border-none outline-none bg-transparent text-right text-xs font-medium px-1 text-foreground"
                />
              </div>
              <div className="flex gap-1">
                {['25%', '50%', '100%'].map(pct => (
                  <button key={pct} onClick={() => {
                    const percent = parseInt(pct) / 100;
                    const maxUsd = currentBalance * percent * leverage;
                    if (currentPrice > 0) {
                      const amt = (maxUsd / currentPrice).toFixed(6);
                      setLongAmount(amt);
                      setShortAmount(amt);
                    }
                  }}
                    className="px-1.5 py-1 text-[10px] font-medium rounded bg-muted text-muted-foreground hover:text-foreground">
                    {pct}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 mb-2 text-[10px] text-muted-foreground">
              <span>Margin: ${longAmount ? ((parseFloat(longAmount) * currentPrice) / leverage).toFixed(2) : '0.00'}</span>
              <span className="mx-1">•</span>
              <span>Avbl: ${currentBalance.toFixed(2)}</span>
              <span className="mx-1">•</span>
              <span className="text-primary font-medium">{leverage}x</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!longAmount || parseFloat(longAmount) <= 0) {
                    toast({ title: "Enter stake amount", variant: "destructive" });
                    return;
                  }
                  handleOpenPosition('long');
                }}
                className="flex-1 rounded-lg font-semibold text-sm text-white bg-[#0ecb81] h-10"
              >
                Long {selectedCrypto.symbol}
              </button>
              <button
                onClick={() => {
                  if (!shortAmount || parseFloat(shortAmount) <= 0) {
                    toast({ title: "Enter stake amount", variant: "destructive" });
                    return;
                  }
                  handleOpenPosition('short');
                }}
                className="flex-1 rounded-lg font-semibold text-sm text-white bg-[#f6465d] h-10"
              >
                Short {selectedCrypto.symbol}
              </button>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
    </PageLoader>
  );
}
