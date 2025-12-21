import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CryptoCard } from '@/components/CryptoCard';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'gainers' | 'losers';

export default function Markets() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const { getAllCryptosWithPrices, isLoading, refetch } = useCryptoPrices();

  const cryptoAssets = getAllCryptosWithPrices();

  const filteredCryptos = cryptoAssets
    .filter(crypto => 
      crypto.name.toLowerCase().includes(search.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(search.toLowerCase())
    )
    .filter(crypto => {
      if (filter === 'gainers') return crypto.change24h > 0;
      if (filter === 'losers') return crypto.change24h < 0;
      return true;
    })
    .sort((a, b) => {
      if (filter === 'gainers') return b.change24h - a.change24h;
      if (filter === 'losers') return a.change24h - b.change24h;
      return b.price - a.price;
    });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search cryptocurrencies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border h-12"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 items-center">
          {[
            { id: 'all' as FilterType, label: 'All', icon: null },
            { id: 'gainers' as FilterType, label: 'Gainers', icon: TrendingUp },
            { id: 'losers' as FilterType, label: 'Losers', icon: TrendingDown },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {f.icon && <f.icon className="h-4 w-4" />}
              {f.label}
            </button>
          ))}
          <button
            onClick={refetch}
            className={cn(
              "ml-auto p-2 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-all",
              isLoading && "animate-spin"
            )}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <p className="text-xs text-muted-foreground">Total Coins</p>
            <p className="text-lg font-bold text-foreground">{cryptoAssets.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <p className="text-xs text-muted-foreground">Gainers</p>
            <p className="text-lg font-bold text-success">
              {cryptoAssets.filter(c => c.change24h > 0).length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <p className="text-xs text-muted-foreground">Losers</p>
            <p className="text-lg font-bold text-destructive">
              {cryptoAssets.filter(c => c.change24h < 0).length}
            </p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Live prices from CoinGecko
        </div>

        {/* Crypto List */}
        <div className="space-y-3">
          {isLoading && filteredCryptos.every(c => c.price === 0) ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading prices...</p>
            </div>
          ) : (
            filteredCryptos.map((crypto, index) => (
              <div
                key={crypto.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <CryptoCard crypto={crypto} variant="compact" />
              </div>
            ))
          )}
        </div>

        {filteredCryptos.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No cryptocurrencies found</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
