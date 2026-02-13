import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { useNavigate } from 'react-router-dom';

const COIN_ICONS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  DOT: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
};

export default function Markets() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDot, setActiveDot] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { getAllCryptosWithPrices } = useCryptoPrices();

  const cryptoAssets = getAllCryptosWithPrices();
  const itemsPerPage = 10;

  const filteredCryptos = cryptoAssets.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredCryptos.length / itemsPerPage);
  const paginated = filteredCryptos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const gainers = [...cryptoAssets].sort((a, b) => b.change24h - a.change24h).slice(0, 3);
  const losers = [...cryptoAssets].sort((a, b) => a.change24h - b.change24h).slice(0, 3);
  const hot = [...cryptoAssets].sort((a, b) => b.price - a.price).slice(0, 3);
  const newest = cryptoAssets.slice(0, 3);

  const categories = ['All', 'Solana', 'Meme', 'AI', 'Layer 1', 'DeFi', 'Gaming', 'Metaverse', 'Storage'];

  const formatPrice = (p: number) => p >= 1 ? p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : p.toFixed(6);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    const onScroll = () => {
      const idx = Math.round(slider.scrollLeft / slider.clientWidth);
      setActiveDot(idx);
    };
    slider.addEventListener('scroll', onScroll, { passive: true });
    return () => slider.removeEventListener('scroll', onScroll);
  }, []);

  const renderCardRows = (items: typeof cryptoAssets) =>
    items.map((c) => (
      <div key={c.id} className="eczex-top-card-row">
        <span className="eczex-tc-name">{c.symbol}/USDT</span>
        <span className="eczex-tc-price">${formatPrice(c.price)}</span>
        <span className={`eczex-tc-change ${c.change24h >= 0 ? 'eczex-text-green' : 'eczex-text-red'}`}>
          {c.change24h >= 0 ? '+' : ''}{c.change24h.toFixed(2)}%
        </span>
      </div>
    ));

  return (
    <div className="eczex-markets-page">
      <style>{marketsCSS}</style>
      <Header />

      <div className="eczex-app-container">
        {/* Overview Header */}
        <div className="eczex-section-pad" style={{ paddingTop: 24 }}>
          <div className="eczex-header-tabs">
            <div className="eczex-header-tab active">Overview</div>
          </div>

          {/* Market Summary Cards */}
          <div className="eczex-market-cards" ref={sliderRef}>
            <div className="eczex-market-card">
              <div className="eczex-card-header">
                <span>🔥 Hot</span>
                <span className="eczex-more-link">More →</span>
              </div>
              {renderCardRows(hot)}
            </div>
            <div className="eczex-market-card">
              <div className="eczex-card-header">
                <span>🆕 New Listing</span>
                <span className="eczex-more-link">More →</span>
              </div>
              {renderCardRows(newest)}
            </div>
            <div className="eczex-market-card">
              <div className="eczex-card-header">
                <span>📈 Top Gainer</span>
                <span className="eczex-more-link">More →</span>
              </div>
              {renderCardRows(gainers)}
            </div>
            <div className="eczex-market-card">
              <div className="eczex-card-header">
                <span>📊 Top Volume</span>
                <span className="eczex-more-link">More →</span>
              </div>
              {renderCardRows(losers)}
            </div>
          </div>

          {/* Mobile dots */}
          <div className="eczex-dots-indicator">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`eczex-dot ${activeDot === i ? 'active' : ''}`} />
            ))}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="eczex-section-pad" style={{ paddingTop: 0 }}>
          <div className="eczex-filter-toolbar">
            <div className="eczex-sub-filters-container">
              <div className="eczex-sub-filters">
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`eczex-filter-chip ${activeFilter === cat ? 'active' : ''}`}
                    onClick={() => { setActiveFilter(cat); setCurrentPage(1); }}
                  >
                    {cat}
                    {cat === 'Solana' && <span className="eczex-badge-new">New</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="eczex-search-container">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                className="eczex-search-input"
                placeholder="Search"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          {/* Market Table */}
          <table className="eczex-market-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Name</th>
                <th>Price</th>
                <th>24h Change</th>
                <th className="eczex-col-vol">24h Volume</th>
                <th className="eczex-col-mcap">Market Cap</th>
                <th className="eczex-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(crypto => (
                <tr key={crypto.id}>
                  <td style={{ textAlign: 'left' }}>
                    <div className="eczex-coin-cell">
                      <div className="eczex-coin-icon-img">
                        <img
                          src={COIN_ICONS[crypto.symbol] || `https://ui-avatars.com/api/?name=${crypto.symbol}&background=333&color=fff&size=28`}
                          alt={crypto.symbol}
                        />
                      </div>
                      <span className="eczex-coin-symbol">{crypto.symbol}</span>
                      <span className="eczex-coin-name">/ USDT</span>
                    </div>
                  </td>
                  <td>${formatPrice(crypto.price)}</td>
                  <td className={crypto.change24h >= 0 ? 'eczex-text-green' : 'eczex-text-red'}>
                    {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                  </td>
                  <td className="eczex-col-vol">{crypto.volume24h}</td>
                  <td className="eczex-col-mcap">{crypto.marketCap}</td>
                  <td className="eczex-col-actions">
                    <div className="eczex-action-cell">
                      <span className="eczex-trade-btn" onClick={() => navigate(`/trade/${crypto.id}`)}>Trade</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="eczex-pagination">
            <div
              className={`eczex-page-item ${currentPage === 1 ? 'disabled' : ''}`}
              onClick={() => currentPage > 1 && setCurrentPage(p => p - 1)}
            >‹</div>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
              <div
                key={i + 1}
                className={`eczex-page-item ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(i + 1)}
              >{i + 1}</div>
            ))}
            {totalPages > 5 && <div className="eczex-page-item">...</div>}
            <div
              className={`eczex-page-item ${currentPage === totalPages ? 'disabled' : ''}`}
              onClick={() => currentPage < totalPages && setCurrentPage(p => p + 1)}
            >›</div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

const marketsCSS = `
.eczex-markets-page {
  min-height: 100vh;
  background: var(--bg-body, hsl(var(--background)));
  padding-bottom: 80px;
}
.eczex-app-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}
.eczex-section-pad {
  padding: 40px 24px;
}
.eczex-section-pad:first-of-type { padding-top: 24px; }

/* Header Tabs */
.eczex-header-tabs {
  display: flex; gap: 24px; margin-bottom: 24px;
  border-bottom: 1px solid hsl(var(--border));
}
.eczex-header-tab {
  padding-bottom: 12px; font-size: 16px; font-weight: 500;
  color: hsl(var(--muted-foreground)); cursor: pointer; position: relative;
}
.eczex-header-tab.active {
  color: hsl(var(--foreground));
}
.eczex-header-tab.active::after {
  content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px;
  background: hsl(var(--primary));
}

/* Market Cards */
.eczex-market-cards {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px;
}
.eczex-market-card {
  background: hsl(var(--card)); border-radius: 4px; padding: 20px;
  border: 1px solid hsl(var(--border)); transition: border-color 0.2s;
  min-height: 180px;
}
.eczex-market-card:hover { border-color: hsl(var(--primary)); }

.eczex-card-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  font-size: 13px; font-weight: 600; color: hsl(var(--foreground));
}
.eczex-more-link {
  font-size: 12px; color: hsl(var(--muted-foreground)); cursor: pointer;
}
.eczex-more-link:hover { color: hsl(var(--primary)); }

.eczex-top-card-row {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
  font-size: 14px; font-weight: 500; cursor: pointer;
}
.eczex-top-card-row:last-child { margin-bottom: 0; }
.eczex-top-card-row:hover .eczex-tc-name { color: hsl(var(--primary)); }
.eczex-tc-name { font-weight: 600; color: hsl(var(--foreground)); transition: color 0.2s; }
.eczex-tc-price { font-weight: 500; color: hsl(var(--foreground)); }
.eczex-tc-change { font-weight: 500; text-align: right; min-width: 60px; }

.eczex-text-green { color: hsl(var(--success)) !important; }
.eczex-text-red { color: hsl(var(--destructive)) !important; }

/* Dots */
.eczex-dots-indicator { display: none; justify-content: center; gap: 6px; padding-top: 16px; margin-bottom: 32px; }
.eczex-dot { width: 6px; height: 6px; background: hsl(var(--muted-foreground)); border-radius: 1px; opacity: 0.3; transition: all 0.3s; }
.eczex-dot.active { background: hsl(var(--primary)); width: 24px; opacity: 1; }

/* Filter Toolbar */
.eczex-filter-toolbar {
  display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 24px;
}
.eczex-sub-filters-container {
  flex-grow: 1; overflow-x: auto; scrollbar-width: none;
}
.eczex-sub-filters-container::-webkit-scrollbar { display: none; }
.eczex-sub-filters { display: inline-flex; gap: 10px; padding-bottom: 4px; }

.eczex-filter-chip {
  padding: 6px 16px; background: hsl(var(--secondary)); color: hsl(var(--muted-foreground));
  border: 1px solid hsl(var(--border)); border-radius: 4px; font-size: 12px; font-weight: 500;
  cursor: pointer; white-space: nowrap; transition: all 0.2s; flex-shrink: 0;
}
.eczex-filter-chip:hover { border-color: hsl(var(--foreground)); }
.eczex-filter-chip.active {
  background: hsl(var(--muted)); color: hsl(var(--foreground));
  border-color: hsl(var(--primary));
}
.eczex-badge-new {
  background: rgba(252, 213, 53, 0.15); color: hsl(var(--primary));
  font-size: 10px; padding: 1px 4px; border-radius: 2px; margin-left: 4px;
}

/* Search */
.eczex-search-container {
  display: flex; align-items: center; background: hsl(var(--secondary));
  border: 1px solid hsl(var(--border)); border-radius: 4px; padding: 8px 12px;
  width: 240px; transition: border-color 0.2s; flex-shrink: 0;
  color: hsl(var(--muted-foreground));
}
.eczex-search-container:focus-within { border-color: hsl(var(--primary)); }
.eczex-search-input {
  background: transparent; border: none; outline: none; color: hsl(var(--foreground));
  font-size: 13px; margin-left: 8px; width: 100%; font-family: inherit;
}
.eczex-search-input::placeholder { color: hsl(var(--muted-foreground)); }

/* Table */
.eczex-market-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.eczex-market-table th {
  text-align: right; color: hsl(var(--muted-foreground)); font-weight: 400; font-size: 12px;
  padding: 12px 8px; border-bottom: 1px solid hsl(var(--border)); cursor: pointer;
}
.eczex-market-table th:first-child { text-align: left; }
.eczex-market-table td {
  padding: 16px 8px; text-align: right; border-bottom: 1px solid hsl(var(--border));
  font-size: 14px; color: hsl(var(--foreground)); vertical-align: middle;
}
.eczex-market-table td:first-child { text-align: left; }
.eczex-market-table tr:hover td { background: hsl(var(--muted)); }

.eczex-coin-cell { display: flex; align-items: center; gap: 12px; }
.eczex-coin-icon-img {
  width: 28px; height: 28px; border-radius: 50%; overflow: hidden; background: #333;
  flex-shrink: 0;
}
.eczex-coin-icon-img img { width: 100%; height: 100%; object-fit: cover; }
.eczex-coin-symbol { font-weight: 600; color: hsl(var(--foreground)); }
.eczex-coin-name { font-size: 12px; color: hsl(var(--muted-foreground)); margin-left: 4px; }

.eczex-action-cell { white-space: nowrap; text-align: right; }
.eczex-trade-btn {
  color: hsl(var(--primary)); font-weight: 600; font-size: 13px; cursor: pointer;
}
.eczex-trade-btn:hover { text-decoration: underline; }

/* Pagination */
.eczex-pagination {
  display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 24px;
}
.eczex-page-item {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border-radius: 4px; cursor: pointer; color: hsl(var(--muted-foreground)); font-size: 13px;
  transition: all 0.2s;
}
.eczex-page-item.active {
  background: hsl(var(--muted)); color: hsl(var(--foreground)); font-weight: 600;
}
.eczex-page-item:hover:not(.active):not(.disabled) { background: hsl(var(--card)); }
.eczex-page-item.disabled { opacity: 0.3; cursor: not-allowed; }

/* Responsive */
@media (max-width: 767px) {
  .eczex-section-pad { padding: 20px 16px; }
  .eczex-col-vol, .eczex-col-mcap, .eczex-col-actions, .eczex-coin-name { display: none !important; }

  .eczex-market-cards {
    display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
    gap: 16px; padding-bottom: 20px; scrollbar-width: none; margin-bottom: 0;
  }
  .eczex-market-cards::-webkit-scrollbar { display: none; }
  .eczex-market-card { min-width: 100%; scroll-snap-align: center; flex-shrink: 0; }
  .eczex-dots-indicator { display: flex; }

  .eczex-filter-toolbar { flex-direction: column-reverse; align-items: stretch; gap: 16px; }
  .eczex-search-container { width: 100%; max-width: none; margin-bottom: 12px; }
  .eczex-sub-filters-container { width: 100%; }
}

@media (min-width: 768px) {
  .eczex-filter-toolbar { margin-top: 32px; margin-bottom: 32px; }
}
`;
