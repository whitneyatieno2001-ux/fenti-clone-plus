import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { Search, ChevronLeft, ChevronRight, Star, Share2, Bell } from 'lucide-react';

export default function Markets() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { getAllCryptosWithPrices } = useCryptoPrices();

  const cryptoAssets = getAllCryptosWithPrices();
  const itemsPerPage = 10;
  const filteredCryptos = cryptoAssets.filter(crypto =>
    crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCryptos.length / itemsPerPage);
  const paginatedCryptos = filteredCryptos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const categories = ['All', 'Solana New', 'Meme', 'AI', 'Layer 1', 'DeFi', 'Gaming', 'Metaverse', 'Storage'];
  
  const topCards = [
    { title: 'Hot', count: 6 },
    { title: 'New Listing', count: 3 },
    { title: 'Top Gainer', count: 4 },
    { title: 'Top Volume', count: 5 }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-16 pb-24 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Overview Section */}
          <section>
            <h1 className="text-3xl font-semibold mb-6 text-foreground">Overview</h1>
            
            {/* Market Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {topCards.map((card) => (
                <div 
                  key={card.title}
                  className="bg-card rounded border border-border p-5 hover:border-primary transition-colors"
                >
                  <div className="flex justify-between items-center mb-4 text-sm font-semibold text-foreground">
                    <span>{card.title}</span>
                    <span className="text-muted-foreground text-xs cursor-pointer hover:text-foreground">More →</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    {Array.from({ length: card.count }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center py-2 hover:text-primary cursor-pointer">
                        <span className="font-medium text-foreground">BTC</span>
                        <span className="text-foreground">$86,370</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Filters */}
          <section>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === cat
                        ? 'bg-muted text-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="flex items-center bg-secondary border border-border rounded px-3 py-2 flex-1 md:flex-none md:w-64 transition-colors focus-within:border-primary">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search crypto..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="ml-2 bg-transparent outline-none w-full text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Market Table */}
            <div className="bg-card rounded border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Price</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">24h Change</th>
                    <th className="hidden md:table-cell px-4 py-3 text-right font-semibold text-muted-foreground">24h Volume</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-right font-semibold text-muted-foreground">Market Cap</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCryptos.map((crypto) => (
                    <tr key={crypto.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-foreground">{crypto.symbol}</div>
                          <div className="text-xs text-muted-foreground">{crypto.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">${crypto.price.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${crypto.change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-right text-muted-foreground text-xs">--</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-right text-muted-foreground text-xs">--</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Star className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                          <span className="text-primary font-semibold text-xs cursor-pointer hover:underline">Trade</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-end items-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded border border-border hover:border-primary disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded text-sm font-medium transition-all ${
                    currentPage === i + 1
                      ? 'bg-secondary text-foreground font-semibold'
                      : 'border border-border hover:border-primary text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded border border-border hover:border-primary disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
