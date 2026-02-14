import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Home',
    path: '/dashboard',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className={cn("h-6 w-6", active ? "fill-primary stroke-primary" : "fill-none stroke-current")} strokeWidth={active ? 1 : 1.5}>
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      </svg>
    ),
  },
  {
    label: 'Markets',
    path: '/markets',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 14l4-4 3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Trade',
    path: '/trade',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" />
        <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" />
        <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" />
        <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" />
        <path d="M6.5 6.5h0M17.5 6.5h0M6.5 17.5h0M17.5 17.5h0" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Futures',
    path: '/futures',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 3l2 2M8 3L6 5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Bot',
    path: '/bot',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 9h16" />
        <path d="M9 4v5M15 4v5" strokeLinecap="round" />
        <circle cx="9" cy="14.5" r="1.5" />
        <circle cx="15" cy="14.5" r="1.5" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around px-1 py-1.5 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/bot' && location.pathname.startsWith('/bot')) ||
            (item.path === '/bot' && location.pathname === '/create-bot') ||
            (item.path === '/bot' && location.pathname === '/deployed-bot');
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-1.5 rounded-lg transition-all duration-200 min-w-[56px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon(isActive)}
              <span className={cn(
                "text-[10px] mt-0.5 font-medium",
                isActive && "text-primary"
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
