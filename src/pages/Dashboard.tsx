import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { TransactionModal } from '@/components/TransactionModal';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { useAccount } from '@/contexts/AccountContext';
import { formatPrice, formatChange } from '@/data/cryptoData';
import { getCoinIcon } from '@/data/coinIcons';
import { cn } from '@/lib/utils';
import { 
  Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine, 
  ChevronRight, Clock,
  TrendingUp, Star
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [marketTab, setMarketTab] = useState<'favorites' | 'gainers' | 'losers'>('favorites');
  const { getAllCryptosWithPrices } = useCryptoPrices();
  const { accountType, currentBalance, transactions } = useAccount();

  const cryptoAssets = getAllCryptosWithPrices();
  const favorites = cryptoAssets.filter(c => ['bitcoin', 'ethereum', 'solana', 'binancecoin'].includes(c.id));
  const gainers = [...cryptoAssets].sort((a, b) => b.change24h - a.change24h).slice(0, 6);
  const losers = [...cryptoAssets].sort((a, b) => a.change24h - b.change24h).slice(0, 6);

  const displayList = marketTab === 'favorites' ? favorites : marketTab === 'gainers' ? gainers : losers;

  const recentTrades = transactions.filter(t => t.type === 'trade' || t.type === 'bot_trade').slice(0, 4);

  // Mock recent activity
  const recentActivity = [
    { icon: '↓', title: 'Deposit Successful', info: 'USD via M-Pesa', time: '5 mins ago', type: 'success' },
    { icon: '↑', title: 'Withdrawal Processed', info: '50.00 USD', time: '2 hours ago', type: 'warning' },
    { icon: 'B', title: 'Bot Trade Executed', info: 'BTC/USDT +0.5%', time: '4 hours ago', type: 'success' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-4 max-w-7xl mx-auto">
        {/* Balance Card */}
        <div className="card rounded-xl p-5 bg-card border border-border animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground">Account Balance</span>
            <button onClick={() => setBalanceVisible(!balanceVisible)} className="text-muted-foreground hover:text-foreground">
              {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>

          <div className="mb-4">
            <h2 className="text-3xl font-bold font-display text-foreground">
              {balanceVisible 
                ? `$${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                : '********'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {balanceVisible ? 'Estimated Value' : '********'}
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => setModalType('deposit')}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10"
            >
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              Deposit
            </Button>
            <Button 
              onClick={() => setModalType('withdraw')}
              variant="outline"
              className="flex-1 font-semibold h-10"
            >
              <ArrowUpFromLine className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </div>

          <div className="flex justify-between items-center text-sm mt-4 pt-4 border-t border-border">
            <span className="text-muted-foreground">Wallet Direct</span>
            <span className="text-muted-foreground">Last login: {new Date().toLocaleDateString()}</span>
          </div>
        </div>


        {/* Markets / Favorites */}
        <div className="card rounded-xl p-5 bg-card border border-border animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold font-display text-foreground">
              <Star className="h-4 w-4 inline mr-1 text-primary" /> Favorites
            </h3>
            <Link to="/markets" className="flex items-center text-sm text-primary font-medium hover:underline">
              See All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Tab Filters */}
          <div className="flex items-center gap-4 text-sm border-b border-border pb-2 mb-3">
            {(['favorites', 'gainers', 'losers'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setMarketTab(tab)}
                className={cn(
                  "capitalize font-medium transition-colors",
                  marketTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Market Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr] text-xs text-muted-foreground uppercase font-medium pb-2 border-b border-border">
            <span className="pl-1">Asset</span>
            <span>Price</span>
            <span className="text-right pr-1">24h Change</span>
          </div>

          {/* Market Rows - not clickable */}
          <div>
            {displayList.map((crypto) => {
              const isPositive = crypto.change24h >= 0;
              return (
                <div
                  key={crypto.id}
                  className="grid grid-cols-[2fr_1fr_1fr] items-center py-3 border-b border-border/50 transition-colors"
                >
                  <div className="flex items-center gap-2 pl-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                      <img src={getCoinIcon(crypto.symbol)} alt={crypto.symbol} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{crypto.symbol}</p>
                      <p className="text-xs text-muted-foreground">{crypto.name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatPrice(crypto.price)}</p>
                  </div>
                  <div className="text-right pr-1">
                    <span className={cn(
                      "inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold min-w-[64px]",
                      isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}>
                      {formatChange(crypto.change24h)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card rounded-xl p-5 bg-card border border-border animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold font-display text-foreground">
              <Clock className="h-4 w-4 inline mr-1 text-primary" /> Recent Activity
            </h3>
            <Link to="/history" className="text-sm text-primary font-medium hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-0">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm",
                  item.type === 'success' ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                )}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.info}</p>
                </div>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="card rounded-xl p-5 bg-card border border-border animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold font-display text-foreground">Recent Trades</h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="text-foreground font-medium">Today</span>
              <span>This Week</span>
              <span>This Month</span>
            </div>
          </div>
          {recentTrades.length > 0 ? (
            <div className="space-y-0">
              {recentTrades.map((trade) => (
                <div key={trade.id} className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
                  <span className="text-sm font-medium text-foreground">{trade.description}</span>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">${trade.amount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No recent trades. Start trading to see your activity here.
            </div>
          )}
        </div>
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
