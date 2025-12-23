import { useState } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AccountSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { accountType, setAccountType, demoBalance, realBalance } = useAccount();

  const toggleDropdown = () => setIsOpen(!isOpen);

  const selectAccount = (type: 'demo' | 'real') => {
    setAccountType(type);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Account Selector - Deriv Style */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden w-64">
        {/* Demo Account */}
        <div
          onClick={() => selectAccount('demo')}
          className={cn(
            "flex items-center gap-3 p-4 cursor-pointer transition-all",
            accountType === 'demo' ? "bg-gray-50" : "hover:bg-gray-50"
          )}
        >
          <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 48 48" className="w-full h-full">
              <circle cx="24" cy="24" r="24" fill="#14b8a6" />
              <text x="24" y="32" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="Arial, sans-serif">D</text>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-medium text-lg">Demo</span>
              <ChevronDown 
                onClick={(e) => { e.stopPropagation(); toggleDropdown(); }}
                className={cn(
                  "h-5 w-5 text-gray-600 cursor-pointer transition-transform",
                  isOpen && accountType === 'demo' && "rotate-180"
                )} 
              />
            </div>
            <span className="text-teal-500 font-bold text-xl">
              {demoBalance.toFixed(2)} USD
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-2 bg-gray-700" />

        {/* Real Account */}
        <div
          onClick={() => selectAccount('real')}
          className={cn(
            "flex items-center gap-3 p-4 cursor-pointer transition-all",
            accountType === 'real' ? "bg-gray-50" : "hover:bg-gray-50"
          )}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
            {/* USA Flag SVG that fills circle completely */}
            <svg viewBox="0 0 48 48" className="w-full h-full">
              <defs>
                <clipPath id="circleClip">
                  <circle cx="24" cy="24" r="24" />
                </clipPath>
              </defs>
              <g clipPath="url(#circleClip)">
                {/* Red and white stripes */}
                <rect x="0" y="0" width="48" height="3.7" fill="#B22234" />
                <rect x="0" y="3.7" width="48" height="3.7" fill="white" />
                <rect x="0" y="7.4" width="48" height="3.7" fill="#B22234" />
                <rect x="0" y="11.1" width="48" height="3.7" fill="white" />
                <rect x="0" y="14.8" width="48" height="3.7" fill="#B22234" />
                <rect x="0" y="18.5" width="48" height="3.7" fill="white" />
                <rect x="0" y="22.2" width="48" height="3.7" fill="#B22234" />
                <rect x="0" y="25.9" width="48" height="3.7" fill="white" />
                <rect x="0" y="29.6" width="48" height="3.7" fill="#B22234" />
                <rect x="0" y="33.3" width="48" height="3.7" fill="white" />
                <rect x="0" y="37" width="48" height="3.7" fill="#B22234" />
                <rect x="0" y="40.7" width="48" height="3.7" fill="white" />
                <rect x="0" y="44.4" width="48" height="3.6" fill="#B22234" />
                {/* Blue canton */}
                <rect x="0" y="0" width="20" height="26" fill="#3C3B6E" />
                {/* Stars (simplified) */}
                <g fill="white" fontSize="4">
                  <text x="2" y="5">★</text>
                  <text x="6" y="5">★</text>
                  <text x="10" y="5">★</text>
                  <text x="14" y="5">★</text>
                  <text x="4" y="9">★</text>
                  <text x="8" y="9">★</text>
                  <text x="12" y="9">★</text>
                  <text x="16" y="9">★</text>
                  <text x="2" y="13">★</text>
                  <text x="6" y="13">★</text>
                  <text x="10" y="13">★</text>
                  <text x="14" y="13">★</text>
                  <text x="4" y="17">★</text>
                  <text x="8" y="17">★</text>
                  <text x="12" y="17">★</text>
                  <text x="16" y="17">★</text>
                  <text x="2" y="21">★</text>
                  <text x="6" y="21">★</text>
                  <text x="10" y="21">★</text>
                  <text x="14" y="21">★</text>
                  <text x="4" y="25">★</text>
                  <text x="8" y="25">★</text>
                  <text x="12" y="25">★</text>
                </g>
              </g>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-medium text-lg">Real</span>
              <ChevronDown 
                onClick={(e) => { e.stopPropagation(); toggleDropdown(); }}
                className={cn(
                  "h-5 w-5 text-gray-600 cursor-pointer transition-transform",
                  isOpen && accountType === 'real' && "rotate-180"
                )} 
              />
            </div>
            <span className="text-teal-500 font-bold text-xl">
              {realBalance.toFixed(2)} USD
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
