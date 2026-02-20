import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { Button } from '@/components/ui/button';
import { User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import usFlag from '@/assets/us-flag.png';
import keFlag from '@/assets/ke-flag.png';
import zaFlag from '@/assets/za-flag.png';
import { ThemeToggle } from '@/components/ThemeToggle';
import cryptoWaveBadge from '@/assets/crypto-wave-badge.png';

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
  const { accountType, setAccountType, demoBalance, realBalance, currentBalance, user } = useAccount();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const countryFlag = usFlag;

  // Badge is NOT shown in the header - only on Landing page

  const toggleAccount = (type: 'demo' | 'real') => {
    setAccountType(type);
    setDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Account Switcher (Deriv style) */}
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2"
          >
            {/* Current Account Display */}
            <div className="flex items-center gap-2">
              {accountType === 'demo' ? (
                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">Ð</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full overflow-hidden border border-border">
                  <img
                    src={countryFlag}
                    alt="Country flag (real account)"
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="text-left">
                <div className="flex items-center gap-1">
                  <span className="text-foreground font-medium text-sm">
                    {accountType === 'demo' ? 'Demo' : 'Real'}
                  </span>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    dropdownOpen && "rotate-180"
                  )} />
                </div>
                <span className="text-teal-500 font-bold text-sm">
                  {currentBalance.toFixed(2)} USD
                </span>
              </div>
            </div>
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setDropdownOpen(false)} 
              />
              <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden w-56">
                {/* Demo Account */}
                <div
                  onClick={() => toggleAccount('demo')}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer transition-all",
                    accountType === 'demo' ? "bg-gray-50" : "hover:bg-gray-50"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">Ð</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-900 font-medium">Demo</span>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </div>
                    <span className="text-teal-500 font-bold">
                      {demoBalance.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-1.5 bg-gray-700" />

                {/* Real Account */}
                <div
                  onClick={() => toggleAccount('real')}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer transition-all",
                    accountType === 'real' ? "bg-gray-50" : "hover:bg-gray-50"
                  )}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                    <img
                      src={countryFlag}
                      alt="USA flag (real account)"
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-900 font-medium">Real</span>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </div>
                    <span className="text-teal-500 font-bold">
                      {realBalance.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

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
