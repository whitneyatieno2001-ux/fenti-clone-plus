import { Link, useLocation } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import usFlag from '@/assets/us-flag.png';
import keFlag from '@/assets/ke-flag.png';
import zaFlag from '@/assets/za-flag.png';
import { ThemeToggle } from '@/components/ThemeToggle';

// Country phone prefixes to flag mapping
const getCountryFlagFromPhone = (phoneNumber: string | null): string => {
  if (!phoneNumber) return usFlag;
  
  // Remove any + or spaces
  const cleanPhone = phoneNumber.replace(/[\s+\-]/g, '');
  
  // Check for country prefixes (international format)
  if (cleanPhone.startsWith('254')) return keFlag;  // Kenya
  if (cleanPhone.startsWith('27')) return zaFlag;   // South Africa
  if (cleanPhone.startsWith('1')) return usFlag;    // USA
  
  // Check for local formats (without country code)
  if (cleanPhone.startsWith('07') || cleanPhone.startsWith('01')) return keFlag;  // Kenya local (07xx, 01xx)
  if (cleanPhone.startsWith('0')) return zaFlag;   // South Africa local (0xx)
  
  return usFlag; // Default to US flag
};

export function Header() {
  const location = useLocation();
  const { accountType, setAccountType, currentBalance } = useAccount();
  const countryFlag = usFlag;

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Tap to toggle account (no dropdown) */}
        <button
          onClick={() => setAccountType(accountType === 'demo' ? 'real' : 'demo')}
          className="flex items-center gap-2 active:scale-95 transition-transform"
        >
          {accountType === 'demo' ? (
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">Ð</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full overflow-hidden border border-border">
              <img src={countryFlag} alt="Country flag" className="w-full h-full object-cover object-center" loading="lazy" />
            </div>
          )}
          <div className="text-left">
            <span className="text-foreground font-medium text-sm block leading-tight">
              {accountType === 'demo' ? 'Demo' : 'Real'}
            </span>
            <span className="text-teal-500 font-bold text-sm">
              {currentBalance.toFixed(2)} USD
            </span>
          </div>
        </button>

        {/* Center - empty space (badge only on Landing page) */}
        <div className="flex-1" />

        {/* Right - Theme Toggle + Profile */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link to="/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
