import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { ArrowDownToLine, ArrowUpFromLine, Bot, TrendingUp, Filter } from 'lucide-react';

type FilterType = 'all' | 'deposit' | 'withdrawal' | 'trade' | 'bot_trade';

export default function TransactionHistory() {
  const { transactions, loadTransactions, isLoggedIn } = useAccount();
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (isLoggedIn) {
      loadTransactions();
    }
  }, [isLoggedIn]);

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownToLine className="h-5 w-5 text-success" />;
      case 'withdrawal':
        return <ArrowUpFromLine className="h-5 w-5 text-destructive" />;
      case 'bot_trade':
        return <Bot className="h-5 w-5 text-primary" />;
      case 'trade':
        return <TrendingUp className="h-5 w-5 text-primary" />;
      default:
        return <TrendingUp className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit': return 'Deposit';
      case 'withdrawal': return 'Withdrawal';
      case 'bot_trade': return 'Bot Trade';
      case 'trade': return 'Trade';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Transaction History</h1>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'deposit', 'withdrawal', 'trade', 'bot_trade'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {f === 'all' ? 'All' : getTypeLabel(f)}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <p className="text-xs text-muted-foreground">Total Deposits</p>
            <p className="text-lg font-bold text-success">
              ${transactions
                .filter(t => t.type === 'deposit' && t.status === 'completed')
                .reduce((sum, t) => sum + t.amount, 0)
                .toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <p className="text-xs text-muted-foreground">Total Withdrawals</p>
            <p className="text-lg font-bold text-destructive">
              ${transactions
                .filter(t => t.type === 'withdrawal' && t.status === 'completed')
                .reduce((sum, t) => sum + t.amount, 0)
                .toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            filteredTransactions.map((transaction, index) => (
              <div
                key={transaction.id}
                className="p-4 rounded-xl bg-card border border-border/50 animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      {getIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{getTypeLabel(transaction.type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.date.toLocaleDateString()} • {transaction.account_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold",
                      transaction.type === 'deposit' ? "text-success" : 
                      transaction.type === 'withdrawal' ? "text-destructive" : "text-foreground"
                    )}>
                      {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className={cn(
                      "text-xs",
                      transaction.status === 'completed' ? "text-success" :
                      transaction.status === 'pending' ? "text-warning" : "text-destructive"
                    )}>
                      {transaction.status}
                    </p>
                  </div>
                </div>
                {transaction.description && (
                  <p className="text-sm text-muted-foreground mt-2">{transaction.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
