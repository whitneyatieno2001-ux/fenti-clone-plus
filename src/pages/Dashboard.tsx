import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PortfolioCard } from '@/components/PortfolioCard';
import { CryptoCard } from '@/components/CryptoCard';
import { TransactionModal } from '@/components/TransactionModal';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { featuredCryptos } from '@/data/cryptoData';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | null>(null);
  const { getAllCryptosWithPrices } = useCryptoPrices();

  const cryptoAssets = getAllCryptosWithPrices();
  const watchlistCryptos = cryptoAssets.filter(c => featuredCryptos.includes(c.id));
  const topMovers = [...cryptoAssets]
    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-6">
        {/* Portfolio Card */}
        <div className="animate-fade-in">
          <PortfolioCard 
            onDeposit={() => setModalType('deposit')}
            onWithdraw={() => setModalType('withdraw')}
          />
        </div>

        {/* Watchlist Section */}
        <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-display text-foreground">Watchlist</h2>
            <Link 
              to="/markets"
              className="flex items-center text-sm text-primary font-medium hover:underline"
            >
              See All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {watchlistCryptos.map((crypto, index) => (
              <div
                key={crypto.id}
                className="animate-slide-up"
                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
              >
                <CryptoCard crypto={crypto} />
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-lg font-bold font-display text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: '💰', label: 'Deposit', action: () => setModalType('deposit') },
              { icon: '💸', label: 'Withdraw', action: () => setModalType('withdraw') },
              { icon: '📊', label: 'Trade', path: '/trade' },
              { icon: '🤖', label: 'Bot', path: '/bot' },
            ].map((item) => (
              item.path ? (
                <Link
                  key={item.label}
                  to={item.path}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card hover:bg-secondary border border-border/50 transition-all"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                </Link>
              ) : (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card hover:bg-secondary border border-border/50 transition-all"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                </button>
              )
            ))}
          </div>
        </section>

        {/* Market Overview */}
        <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-display text-foreground">Top Movers</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Live
            </div>
          </div>
          <div className="space-y-3">
            {topMovers.map((crypto) => (
              <CryptoCard key={crypto.id} crypto={crypto} variant="compact" />
            ))}
          </div>
        </section>
      </main>

      <BottomNav />

      <TransactionModal 
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        type={modalType || 'deposit'}
      />
    </div>
  );
}
