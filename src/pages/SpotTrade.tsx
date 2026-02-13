import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TradingViewWidget } from '@/components/TradingViewWidget';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { cryptoAssets, formatPrice as formatCryptoPrice } from '@/data/cryptoData';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/BottomNav';
import { ChevronLeft, Search, Star, MoreHorizontal } from 'lucide-react';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  depth: number;
}

interface MarketTrade {
  price: number;
  amount: number;
  time: string;
  isBuy: boolean;
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
  { symbol: 'MATIC/USDT', id: 'matic-network' },
  { symbol: 'UNI/USDT', id: 'uniswap' },
  { symbol: 'LTC/USDT', id: 'litecoin' },
  { symbol: 'NEAR/USDT', id: 'near' },
  { symbol: 'APT/USDT', id: 'aptos' },
];

type MobileTab = 'chart' | 'orderbook' | 'trades' | 'info';
type OrderType = 'limit' | 'market';
type BottomPanelTab = 'open' | 'history' | 'funds';

export default function SpotTrade() {
  const navigate = useNavigate();
  const { currentBalance, deposit, withdraw, accountType } = useAccount();
  const { toast } = useToast();
  const { getCryptoWithPrice, getAllCryptosWithPrices } = useCryptoPrices();

  const [selectedPairId, setSelectedPairId] = useState('bitcoin');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [sliderBuy, setSliderBuy] = useState(0);
  const [sliderSell, setSliderSell] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chart');
  const [bottomTab, setBottomTab] = useState<BottomPanelTab>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [wlTab, setWlTab] = useState('USDT');
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [marketTrades, setMarketTrades] = useState<MarketTrade[]>([]);
  const [chartInterval, setChartInterval] = useState('15');

  const selectedCrypto = getCryptoWithPrice(cryptoAssets.find(c => c.id === selectedPairId) || cryptoAssets[0]);
  const pairSymbol = `${selectedCrypto.symbol}/USDT`;
  const currentPrice = selectedCrypto.price;
  const change24h = selectedCrypto.change24h;

  // Generate order book
  useEffect(() => {
    if (!currentPrice || currentPrice === 0) return;
    const generateBook = () => {
      const newAsks: OrderBookEntry[] = [];
      const newBids: OrderBookEntry[] = [];
      let askTotal = 0;
      let bidTotal = 0;

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

  // Generate market trades
  useEffect(() => {
    if (!currentPrice || currentPrice === 0) return;
    const generateTrades = () => {
      const trades: MarketTrade[] = [];
      const now = new Date();
      for (let i = 0; i < 20; i++) {
        const t = new Date(now.getTime() - i * 3000);
        trades.push({
          price: currentPrice + (Math.random() - 0.5) * currentPrice * 0.001,
          amount: parseFloat((Math.random() * 0.3 + 0.001).toFixed(5)),
          time: `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}`,
          isBuy: Math.random() > 0.5,
        });
      }
      setMarketTrades(trades);
    };
    generateTrades();
    const interval = setInterval(generateTrades, 3000);
    return () => clearInterval(interval);
  }, [currentPrice, selectedPairId]);

  // Auto-fill price on pair change
  useEffect(() => {
    if (currentPrice > 0) {
      setBuyPrice(currentPrice.toFixed(2));
      setSellPrice(currentPrice.toFixed(2));
    }
  }, [selectedPairId, currentPrice]);

  const formatOBPrice = (price: number) => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const handleBuy = () => {
    const price = orderType === 'market' ? currentPrice : parseFloat(buyPrice);
    const amount = parseFloat(buyAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    const total = price * amount;
    if (total > currentBalance) {
      toast({ title: "Insufficient balance", description: `Need $${total.toFixed(2)}`, variant: "destructive" });
      return;
    }
    withdraw(total);
    toast({ title: "Buy Order Executed", description: `Bought ${amount} ${selectedCrypto.symbol} at ${formatOBPrice(price)}` });
    setBuyAmount('');
  };

  const handleSell = () => {
    const price = orderType === 'market' ? currentPrice : parseFloat(sellPrice);
    const amount = parseFloat(sellAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    const total = price * amount;
    deposit(total);
    toast({ title: "Sell Order Executed", description: `Sold ${amount} ${selectedCrypto.symbol} at ${formatOBPrice(price)}` });
    setSellAmount('');
  };

  const buyTotal = (parseFloat(buyPrice || '0') * parseFloat(buyAmount || '0')).toFixed(2);
  const sellTotal = (parseFloat(sellPrice || '0') * parseFloat(sellAmount || '0')).toFixed(2);

  const allCryptos = getAllCryptosWithPrices();
  const filteredWatchlist = WATCHLIST_PAIRS.filter(p =>
    p.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ticker stats
  const high24h = currentPrice * 1.02;
  const low24h = currentPrice * 0.98;
  const vol24h = parseFloat(selectedCrypto.volume24h?.replace(/[^0-9.]/g, '') || '0');

  return (
    <div className="h-screen flex flex-col" style={{ fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: '12px', background: '#fafafa', color: '#1e2329' }}>

      {/* === HEADER === */}
      <div className="bg-white border-b flex items-center justify-between px-4 sticky top-0 z-50" style={{ borderColor: '#eaecef', height: 56 }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="font-semibold text-sm" style={{ color: '#1e2329' }}>{pairSymbol}</div>
            <div className="text-xs" style={{ color: '#707a8a' }}>{selectedCrypto.name} Price</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <div>
            <div className={cn("text-xl font-semibold", change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
              {formatOBPrice(currentPrice)}
            </div>
            <div className="text-xs" style={{ color: '#707a8a' }}>= ${currentPrice.toFixed(2)}</div>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div>
              <div style={{ color: '#707a8a' }}>24h Change</div>
              <div className={change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]"}>
                {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ color: '#707a8a' }}>24h High</div>
              <div style={{ color: '#1e2329', fontWeight: 500 }}>{formatOBPrice(high24h)}</div>
            </div>
            <div>
              <div style={{ color: '#707a8a' }}>24h Low</div>
              <div style={{ color: '#1e2329', fontWeight: 500 }}>{formatOBPrice(low24h)}</div>
            </div>
            <div>
              <div style={{ color: '#707a8a' }}>24h Vol({selectedCrypto.symbol})</div>
              <div style={{ color: '#1e2329', fontWeight: 500 }}>{vol24h.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: '#707a8a' }}>Wallet</span>
          <span className="text-xs" style={{ color: '#707a8a' }}>Orders</span>
          <MoreHorizontal className="h-4 w-4" style={{ color: '#707a8a' }} />
        </div>
      </div>

      {/* === MOBILE TABS === */}
      <div className="md:hidden flex border-b bg-white sticky top-[56px] z-40" style={{ borderColor: '#eaecef' }}>
        {(['chart', 'orderbook', 'trades', 'info'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={cn(
              "flex-1 text-center py-3 text-sm capitalize border-b-2 font-medium",
              mobileTab === tab
                ? "text-[#1e2329] font-semibold border-[#fcd535]"
                : "text-[#707a8a] border-transparent"
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
          <div className="bg-white border" style={{ borderColor: '#eaecef' }}>
            <div className="flex justify-between items-center px-3 py-2 border-b text-xs font-semibold" style={{ borderColor: '#eaecef', color: '#1e2329' }}>
              <span>Order Book</span>
              <div className="flex gap-1">
                <span className="w-4 h-4 bg-gray-200 rounded-sm" />
                <span className="w-4 h-4 bg-gray-200 rounded-sm" />
                <span className="w-4 h-4 bg-gray-200 rounded-sm" />
              </div>
            </div>
            <div className="flex px-3 py-1 text-[11px]" style={{ color: '#707a8a' }}>
              <span className="flex-1">Price(USDT)</span>
              <span className="flex-1 text-right">Amount({selectedCrypto.symbol})</span>
              <span className="flex-1 text-right">Total</span>
            </div>

            {/* Asks */}
            <div className="flex flex-col-reverse">
              {asks.map((a, i) => (
                <div key={`ask-${i}`} className="flex px-3 relative cursor-pointer hover:bg-gray-50" style={{ height: 18, alignItems: 'center', fontSize: 12 }}>
                  <div className="absolute top-0 bottom-0 right-0 opacity-10 bg-[#f6465d]" style={{ width: `${a.depth}%` }} />
                  <span className="flex-1 relative z-10 font-medium text-[#f6465d]">{formatOBPrice(a.price)}</span>
                  <span className="flex-1 text-right relative z-10" style={{ color: '#1e2329' }}>{a.amount.toFixed(5)}</span>
                  <span className="flex-1 text-right relative z-10" style={{ color: '#1e2329' }}>{a.total}K</span>
                </div>
              ))}
            </div>

            {/* Mid Price */}
            <div className="flex items-center justify-between px-3 py-2 border-y" style={{ borderColor: '#f0f0f0', background: '#fafafa' }}>
              <span className={cn("text-lg font-semibold", change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                {formatOBPrice(currentPrice)}
              </span>
              <span className="text-[11px] cursor-pointer" style={{ color: '#707a8a' }}>More</span>
            </div>

            {/* Bids */}
            <div>
              {bids.map((b, i) => (
                <div key={`bid-${i}`} className="flex px-3 relative cursor-pointer hover:bg-gray-50" style={{ height: 18, alignItems: 'center', fontSize: 12 }}>
                  <div className="absolute top-0 bottom-0 right-0 opacity-10 bg-[#0ecb81]" style={{ width: `${b.depth}%` }} />
                  <span className="flex-1 relative z-10 font-medium text-[#0ecb81]">{formatOBPrice(b.price)}</span>
                  <span className="flex-1 text-right relative z-10" style={{ color: '#1e2329' }}>{b.amount.toFixed(5)}</span>
                  <span className="flex-1 text-right relative z-10" style={{ color: '#1e2329' }}>{b.total}K</span>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER: Chart + Trading Form */}
          <div className="flex flex-col">
            {/* Chart Toolbar */}
            <div className="bg-white border border-t-0 flex items-center gap-1 px-3 py-2 text-xs" style={{ borderColor: '#eaecef', color: '#707a8a' }}>
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
                  className={cn("cursor-pointer px-2 py-1 rounded transition-colors", chartInterval === tf.value ? "font-semibold" : "hover:text-[#1e2329]")}
                  style={chartInterval === tf.value ? { color: '#f0b90b' } : {}}
                >
                  {tf.label}
                </span>
              ))}
              <div className="w-px h-3.5 bg-gray-200 mx-1" />
              <span className="font-semibold" style={{ color: '#f0b90b' }}>TradingView</span>
            </div>

            {/* Chart Area */}
            <div className="bg-white border border-t-0" style={{ borderColor: '#eaecef', height: 400 }}>
              <TradingViewWidget 
                symbol={`${selectedCrypto.symbol}/USD`} 
                theme="light" 
                height={400} 
                interval={chartInterval}
              />
            </div>

            {/* Trading Form */}
            <div className="bg-white border border-t-0" style={{ borderColor: '#eaecef' }}>
              {/* Trade Tabs */}
              <div className="flex gap-6 px-4 pt-3 border-b text-sm font-semibold" style={{ borderColor: '#eaecef' }}>
                {['Spot', 'Cross 3x', 'Isolated 10x', 'Grid'].map((t, i) => (
                  <span
                    key={t}
                    className={cn("pb-3 cursor-pointer relative", i === 0 ? "text-[#f0b90b]" : "text-[#707a8a]")}
                  >
                    {t}
                    {i === 0 && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#f0b90b]" />}
                  </span>
                ))}
              </div>

              <div className="flex gap-4 p-4">
                {/* Buy Form */}
                <div className="flex-1">
                  <div className="flex gap-4 text-xs font-semibold mb-3">
                    <span className={cn("cursor-pointer", orderType === 'limit' ? "text-[#1e2329]" : "text-[#707a8a]")} onClick={() => setOrderType('limit')}>Limit</span>
                    <span className={cn("cursor-pointer", orderType === 'market' ? "text-[#1e2329]" : "text-[#707a8a]")} onClick={() => setOrderType('market')}>Market</span>
                  </div>

                  {orderType === 'limit' && (
                    <div className="mb-2 flex items-center border rounded h-10 bg-white hover:border-[#fcd535] transition-colors" style={{ borderColor: '#eaecef' }}>
                      <span className="px-3 text-sm" style={{ color: '#707a8a' }}>Price</span>
                      <input
                        type="number"
                        value={buyPrice}
                        onChange={e => setBuyPrice(e.target.value)}
                        className="flex-1 border-none outline-none bg-transparent text-right text-sm font-medium px-2"
                        style={{ color: '#1e2329' }}
                      />
                      <span className="px-3 text-xs" style={{ color: '#1e2329' }}>USDT</span>
                    </div>
                  )}

                  <div className="mb-2 flex items-center border rounded h-10 bg-white hover:border-[#fcd535] transition-colors" style={{ borderColor: '#eaecef' }}>
                    <span className="px-3 text-sm" style={{ color: '#707a8a' }}>Amount</span>
                    <input
                      type="number"
                      value={buyAmount}
                      onChange={e => setBuyAmount(e.target.value)}
                      className="flex-1 border-none outline-none bg-transparent text-right text-sm font-medium px-2"
                      style={{ color: '#1e2329' }}
                    />
                    <span className="px-3 text-xs" style={{ color: '#1e2329' }}>{selectedCrypto.symbol}</span>
                  </div>

                  {/* Slider */}
                  <div className="my-3 relative h-0.5" style={{ background: '#eaecef' }}>
                    {[0, 25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        onClick={() => {
                          setSliderBuy(pct);
                          const price = orderType === 'market' ? currentPrice : parseFloat(buyPrice || '0');
                          if (price > 0) {
                            const maxAmt = (currentBalance * pct / 100) / price;
                            setBuyAmount(maxAmt.toFixed(6));
                          }
                        }}
                        className="absolute w-2 h-2 border-2 rounded-sm transition-all"
                        style={{
                          left: `${pct}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%) rotate(45deg)',
                          background: sliderBuy >= pct ? '#fcd535' : '#fff',
                          borderColor: sliderBuy >= pct ? '#fcd535' : '#b7bdc6',
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex justify-between text-xs my-3">
                    <span style={{ color: '#707a8a' }}>Avbl</span>
                    <span className="font-medium" style={{ color: '#1e2329' }}>{currentBalance.toFixed(2)} USDT</span>
                  </div>

                  <div className="mb-2 flex items-center border rounded h-10 bg-white" style={{ borderColor: '#eaecef' }}>
                    <span className="px-3 text-sm" style={{ color: '#707a8a' }}>Total</span>
                    <input
                      type="text"
                      value={buyTotal !== '0.00' && buyTotal !== 'NaN' ? buyTotal : ''}
                      readOnly
                      className="flex-1 border-none outline-none bg-transparent text-right text-sm font-medium px-2"
                      style={{ color: '#1e2329' }}
                    />
                    <span className="px-3 text-xs" style={{ color: '#1e2329' }}>USDT</span>
                  </div>

                  <button
                    onClick={handleBuy}
                    className="w-full h-10 rounded text-sm font-semibold text-white cursor-pointer transition-colors"
                    style={{ background: '#0ecb81' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#0bb974')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#0ecb81')}
                  >
                    Buy {selectedCrypto.symbol}
                  </button>
                </div>

                {/* Sell Form */}
                <div className="flex-1">
                  <div className="flex gap-4 text-xs font-semibold mb-3">
                    <span className={cn("cursor-pointer", orderType === 'limit' ? "text-[#1e2329]" : "text-[#707a8a]")} onClick={() => setOrderType('limit')}>Limit</span>
                    <span className={cn("cursor-pointer", orderType === 'market' ? "text-[#1e2329]" : "text-[#707a8a]")} onClick={() => setOrderType('market')}>Market</span>
                  </div>

                  {orderType === 'limit' && (
                    <div className="mb-2 flex items-center border rounded h-10 bg-white hover:border-[#fcd535] transition-colors" style={{ borderColor: '#eaecef' }}>
                      <span className="px-3 text-sm" style={{ color: '#707a8a' }}>Price</span>
                      <input
                        type="number"
                        value={sellPrice}
                        onChange={e => setSellPrice(e.target.value)}
                        className="flex-1 border-none outline-none bg-transparent text-right text-sm font-medium px-2"
                        style={{ color: '#1e2329' }}
                      />
                      <span className="px-3 text-xs" style={{ color: '#1e2329' }}>USDT</span>
                    </div>
                  )}

                  <div className="mb-2 flex items-center border rounded h-10 bg-white hover:border-[#fcd535] transition-colors" style={{ borderColor: '#eaecef' }}>
                    <span className="px-3 text-sm" style={{ color: '#707a8a' }}>Amount</span>
                    <input
                      type="number"
                      value={sellAmount}
                      onChange={e => setSellAmount(e.target.value)}
                      className="flex-1 border-none outline-none bg-transparent text-right text-sm font-medium px-2"
                      style={{ color: '#1e2329' }}
                    />
                    <span className="px-3 text-xs" style={{ color: '#1e2329' }}>{selectedCrypto.symbol}</span>
                  </div>

                  {/* Slider */}
                  <div className="my-3 relative h-0.5" style={{ background: '#eaecef' }}>
                    {[0, 25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        onClick={() => setSliderSell(pct)}
                        className="absolute w-2 h-2 border-2 rounded-sm transition-all"
                        style={{
                          left: `${pct}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%) rotate(45deg)',
                          background: sliderSell >= pct ? '#fcd535' : '#fff',
                          borderColor: sliderSell >= pct ? '#fcd535' : '#b7bdc6',
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex justify-between text-xs my-3">
                    <span style={{ color: '#707a8a' }}>Avbl</span>
                    <span className="font-medium" style={{ color: '#1e2329' }}>0.00000 {selectedCrypto.symbol}</span>
                  </div>

                  <div className="mb-2 flex items-center border rounded h-10 bg-white" style={{ borderColor: '#eaecef' }}>
                    <span className="px-3 text-sm" style={{ color: '#707a8a' }}>Total</span>
                    <input
                      type="text"
                      value={sellTotal !== '0.00' && sellTotal !== 'NaN' ? sellTotal : ''}
                      readOnly
                      className="flex-1 border-none outline-none bg-transparent text-right text-sm font-medium px-2"
                      style={{ color: '#1e2329' }}
                    />
                    <span className="px-3 text-xs" style={{ color: '#1e2329' }}>USDT</span>
                  </div>

                  <button
                    onClick={handleSell}
                    className="w-full h-10 rounded text-sm font-semibold text-white cursor-pointer transition-colors"
                    style={{ background: '#f6465d' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e8364e')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#f6465d')}
                  >
                    Sell {selectedCrypto.symbol}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Panel */}
            <div className="bg-white border border-t-0" style={{ borderColor: '#eaecef' }}>
              <div className="flex gap-6 px-4 pt-3 border-b text-sm font-semibold" style={{ borderColor: '#eaecef' }}>
                {([['open', 'Open Orders(0)'], ['history', 'Order History'], ['funds', 'Funds']] as const).map(([key, label]) => (
                  <span
                    key={key}
                    onClick={() => setBottomTab(key)}
                    className={cn("pb-3 cursor-pointer relative", bottomTab === key ? "text-[#f0b90b]" : "text-[#707a8a]")}
                  >
                    {label}
                    {bottomTab === key && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#f0b90b]" />}
                  </span>
                ))}
              </div>
              <div className="flex flex-col items-center justify-center py-12" style={{ color: '#b7bdc6' }}>
                <div className="text-3xl opacity-30 mb-3">📋</div>
                <div className="text-sm">No open orders</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Watchlist + Market Trades */}
          <div className="bg-white border" style={{ borderColor: '#eaecef' }}>
            {/* Search */}
            <div className="p-2 border-b" style={{ borderColor: '#eaecef' }}>
              <div className="flex items-center gap-2 rounded px-3 py-1.5" style={{ background: '#f5f5f5' }}>
                <Search className="h-3.5 w-3.5" style={{ color: '#707a8a' }} />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 border-none outline-none bg-transparent text-xs"
                  style={{ color: '#1e2329' }}
                />
              </div>
            </div>

            {/* WL Tabs */}
            <div className="flex gap-5 px-3 py-2 border-b text-xs font-semibold" style={{ borderColor: '#eaecef' }}>
              {['USDT', 'BTC', 'FDUSD'].map(t => (
                <span
                  key={t}
                  onClick={() => setWlTab(t)}
                  className={cn("cursor-pointer pb-2 relative", wlTab === t ? "text-[#f0b90b]" : "text-[#707a8a]")}
                >
                  {t}
                  {wlTab === t && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#f0b90b]" />}
                </span>
              ))}
            </div>

            {/* WL Header */}
            <div className="grid px-3 py-1 text-[11px]" style={{ gridTemplateColumns: '1.5fr 1fr 1fr', color: '#707a8a' }}>
              <span>Pair</span>
              <span className="text-right">Price</span>
              <span className="text-right">Change</span>
            </div>

            {/* WL Rows */}
            <div className="max-h-[280px] overflow-auto">
              {filteredWatchlist.map(wp => {
                const crypto = allCryptos.find(c => c.id === wp.id);
                if (!crypto) return null;
                return (
                  <div
                    key={wp.id}
                    onClick={() => setSelectedPairId(wp.id)}
                    className={cn(
                      "grid px-3 py-1.5 text-xs items-center cursor-pointer border-b hover:bg-gray-50",
                      selectedPairId === wp.id && "bg-gray-50"
                    )}
                    style={{ gridTemplateColumns: '1.5fr 1fr 1fr', borderColor: '#fafafa' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Star className="h-2.5 w-2.5" style={{ color: '#d0d0d0' }} />
                      <span className="font-semibold">{crypto.symbol}</span>
                      <span className="text-[10px]" style={{ color: '#b7bdc6' }}>/USDT</span>
                    </div>
                    <span className="text-right font-medium">{formatOBPrice(crypto.price)}</span>
                    <span className={cn("text-right font-medium", crypto.change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                      {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Market Trades */}
            <div className="border-t pt-3 px-3" style={{ borderColor: '#eaecef' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: '#1e2329' }}>Market Trades</div>
              <div className="grid text-[11px] mb-1" style={{ gridTemplateColumns: '1fr 1fr 1fr', color: '#707a8a' }}>
                <span>Price(USDT)</span>
                <span className="text-right">Amount({selectedCrypto.symbol})</span>
                <span className="text-right">Time</span>
              </div>
              <div className="max-h-[200px] overflow-auto">
                {marketTrades.map((trade, i) => (
                  <div key={i} className="grid text-xs py-px" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <span className={trade.isBuy ? "text-[#0ecb81]" : "text-[#f6465d]"}>{formatOBPrice(trade.price)}</span>
                    <span className="text-right" style={{ color: '#707a8a' }}>{trade.amount.toFixed(5)}</span>
                    <span className="text-right" style={{ color: '#b7bdc6' }}>{trade.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* === MOBILE VIEW === */}
        <div className="md:hidden">
          {/* Mobile Price Bar */}
          <div className="bg-white px-4 py-3 border-b" style={{ borderColor: '#eaecef' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className={cn("text-xl font-semibold", change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                  {formatOBPrice(currentPrice)}
                </div>
                <div className="text-xs" style={{ color: '#707a8a' }}>= ${currentPrice.toFixed(2)}</div>
              </div>
              <div className="text-right text-xs">
                <div className={change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]"}>
                  {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                </div>
                <div style={{ color: '#707a8a' }}>Vol {vol24h.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Mobile Content */}
          {mobileTab === 'chart' && (
            <div className="bg-white mx-2 mt-2 rounded border overflow-hidden" style={{ borderColor: '#eaecef' }}>
              {/* Mobile timeframe selector */}
              <div className="flex items-center gap-1 px-3 py-2 text-xs border-b" style={{ borderColor: '#eaecef', color: '#707a8a' }}>
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
                    className={cn("cursor-pointer px-2 py-1 rounded", chartInterval === tf.value ? "font-semibold" : "")}
                    style={chartInterval === tf.value ? { color: '#f0b90b' } : {}}
                  >
                    {tf.label}
                  </span>
                ))}
              </div>
              <div style={{ height: 280 }}>
                <TradingViewWidget 
                  symbol={`${selectedCrypto.symbol}/USD`} 
                  theme="light" 
                  height={280} 
                  interval={chartInterval}
                />
              </div>
            </div>
          )}

          {mobileTab === 'orderbook' && (
            <div className="bg-white mx-2 mt-2 rounded border p-3" style={{ borderColor: '#eaecef' }}>
              <div className="flex text-[11px] mb-2" style={{ color: '#707a8a' }}>
                <span className="flex-1">Price(USDT)</span>
                <span className="flex-1 text-right">Amount</span>
                <span className="flex-1 text-right">Total</span>
              </div>
              {asks.slice(-10).map((a, i) => (
                <div key={`ma-${i}`} className="flex text-xs py-px">
                  <span className="flex-1 text-[#f6465d] font-medium">{formatOBPrice(a.price)}</span>
                  <span className="flex-1 text-right">{a.amount.toFixed(5)}</span>
                  <span className="flex-1 text-right">{a.total}K</span>
                </div>
              ))}
              <div className="py-2 text-center">
                <span className={cn("text-lg font-semibold", change24h >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                  {formatOBPrice(currentPrice)}
                </span>
              </div>
              {bids.slice(0, 10).map((b, i) => (
                <div key={`mb-${i}`} className="flex text-xs py-px">
                  <span className="flex-1 text-[#0ecb81] font-medium">{formatOBPrice(b.price)}</span>
                  <span className="flex-1 text-right">{b.amount.toFixed(5)}</span>
                  <span className="flex-1 text-right">{b.total}K</span>
                </div>
              ))}
            </div>
          )}

          {mobileTab === 'trades' && (
            <div className="bg-white mx-2 mt-2 rounded border p-3" style={{ borderColor: '#eaecef' }}>
              <div className="grid text-[11px] mb-2" style={{ gridTemplateColumns: '1fr 1fr 1fr', color: '#707a8a' }}>
                <span>Price</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Time</span>
              </div>
              {marketTrades.map((trade, i) => (
                <div key={i} className="grid text-xs py-0.5" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  <span className={trade.isBuy ? "text-[#0ecb81]" : "text-[#f6465d]"}>{formatOBPrice(trade.price)}</span>
                  <span className="text-right" style={{ color: '#707a8a' }}>{trade.amount.toFixed(5)}</span>
                  <span className="text-right" style={{ color: '#b7bdc6' }}>{trade.time}</span>
                </div>
              ))}
            </div>
          )}

          {mobileTab === 'info' && (
            <div className="bg-white mx-2 mt-2 rounded border p-4" style={{ borderColor: '#eaecef' }}>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: '#707a8a' }}>24h High</span>
                  <span className="font-medium">{formatOBPrice(high24h)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#707a8a' }}>24h Low</span>
                  <span className="font-medium">{formatOBPrice(low24h)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#707a8a' }}>24h Volume</span>
                  <span className="font-medium">{vol24h.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#707a8a' }}>Market Cap</span>
                  <span className="font-medium">{selectedCrypto.marketCap}</span>
                </div>
              </div>
            </div>
          )}

          {/* Watchlist on mobile */}
          <div className="bg-white mx-2 mt-2 rounded border p-3" style={{ borderColor: '#eaecef' }}>
            <div className="text-sm font-semibold mb-2" style={{ color: '#1e2329' }}>Pairs</div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {WATCHLIST_PAIRS.slice(0, 8).map(wp => {
                const crypto = allCryptos.find(c => c.id === wp.id);
                if (!crypto) return null;
                return (
                  <button
                    key={wp.id}
                    onClick={() => setSelectedPairId(wp.id)}
                    className={cn(
                      "flex-shrink-0 px-3 py-1.5 rounded text-xs font-medium border",
                      selectedPairId === wp.id
                        ? "border-[#fcd535] bg-[#fcd535]/10 text-[#1e2329]"
                        : "border-[#eaecef] text-[#707a8a]"
                    )}
                  >
                    {crypto.symbol}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Buy/Sell Footer */}
          <div className="fixed bottom-16 left-0 right-0 h-14 bg-white border-t flex gap-3 px-4 py-2 z-50" style={{ borderColor: '#eaecef' }}>
            <button
              onClick={() => {
                const amt = parseFloat(buyAmount || '0.001');
                setBuyAmount(amt.toString());
                handleBuy();
              }}
              className="flex-1 rounded font-semibold text-base text-white"
              style={{ background: '#0ecb81' }}
            >
              Buy
            </button>
            <button
              onClick={() => {
                const amt = parseFloat(sellAmount || '0.001');
                setSellAmount(amt.toString());
                handleSell();
              }}
              className="flex-1 rounded font-semibold text-base text-white"
              style={{ background: '#f6465d' }}
            >
              Sell
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
