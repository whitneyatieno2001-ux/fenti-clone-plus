import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, BarChart3, Clock, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: TrendingUp, label: 'Markets', path: '/markets' },
  { icon: BarChart3, label: 'Trade', path: '/trade' },
  { icon: Clock, label: 'Futures', path: '/futures' },
  { icon: Bot, label: 'Bot', path: '/bot' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label === 'Trade' ? (
                <div className={cn(
                  "p-3 rounded-full -mt-6 shadow-glow transition-all duration-300",
                  isActive 
                    ? "bg-primary text-primary-foreground scale-110" 
                    : "bg-primary/80 text-primary-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
              ) : (
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110"
                )} />
              )}
              <span className={cn(
                "text-xs mt-1 font-medium",
                item.label === 'Trade' && "mt-2"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
