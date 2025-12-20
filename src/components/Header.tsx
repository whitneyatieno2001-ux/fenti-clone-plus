import { Link, useLocation } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { Button } from '@/components/ui/button';
import { Plus, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const location = useLocation();
  const { accountType, setAccountType, currentBalance, isLoggedIn } = useAccount();

  const getTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Crypto Wave';
      case '/markets':
        return 'Markets';
      case '/trade':
        return 'Trade';
      case '/futures':
        return 'Futures';
      case '/bot':
        return 'Trading Bot';
      case '/profile':
        return 'Profile';
      default:
        return 'Crypto Wave';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-glow">
            <Plus className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold font-display text-foreground">{getTitle()}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Account Type Toggle */}
          <button
            onClick={() => setAccountType(accountType === 'demo' ? 'real' : 'demo')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              "bg-gradient-to-r from-primary/80 to-primary text-primary-foreground shadow-glow"
            )}
          >
            <Wallet className="h-4 w-4" />
            ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </button>

          {/* Profile Button */}
          <Link to="/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Account Type Indicator */}
      <div className="flex justify-center pb-2">
        <div className="flex bg-secondary rounded-full p-1">
          <button
            onClick={() => setAccountType('demo')}
            className={cn(
              "px-4 py-1 text-xs font-medium rounded-full transition-all",
              accountType === 'demo'
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Demo
          </button>
          <button
            onClick={() => setAccountType('real')}
            className={cn(
              "px-4 py-1 text-xs font-medium rounded-full transition-all",
              accountType === 'real'
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Real
          </button>
        </div>
      </div>
    </header>
  );
}
