import { useState } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import usFlag from '@/assets/us-flag.png';

export function AccountSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { accountType, setAccountType, demoBalance, realBalance, binanceBalance, isBinanceConnected } = useAccount();

  const toggleDropdown = () => setIsOpen(!isOpen);

  const selectAccount = (type: 'demo' | 'real' | 'binance') => {
    setAccountType(type);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden w-64">
        {/* Demo Account */}
        <div
          onClick={() => selectAccount('demo')}
          className={cn("flex items-center gap-3 p-4 cursor-pointer transition-all", accountType === 'demo' ? "bg-gray-50" : "hover:bg-gray-50")}
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
              <ChevronDown onClick={(e) => { e.stopPropagation(); toggleDropdown(); }}
                className={cn("h-5 w-5 text-gray-600 cursor-pointer transition-transform", isOpen && accountType === 'demo' && "rotate-180")} />
            </div>
            <span className="text-teal-500 font-bold text-xl">{demoBalance.toFixed(2)} USD</span>
          </div>
        </div>

        <div className="h-2 bg-gray-700" />

        {/* Real Account */}
        <div
          onClick={() => selectAccount('real')}
          className={cn("flex items-center gap-3 p-4 cursor-pointer transition-all", accountType === 'real' ? "bg-gray-50" : "hover:bg-gray-50")}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-200">
            <img src={usFlag} alt="USA flag (real account)" className="w-full h-full object-cover object-center" loading="lazy" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-medium text-lg">Real</span>
              <ChevronDown onClick={(e) => { e.stopPropagation(); toggleDropdown(); }}
                className={cn("h-5 w-5 text-gray-600 cursor-pointer transition-transform", isOpen && accountType === 'real' && "rotate-180")} />
            </div>
            <span className="text-teal-500 font-bold text-xl">{realBalance.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Binance Account - only show if connected */}
        {isBinanceConnected && (
          <>
            <div className="h-2 bg-gray-700" />
            <div
              onClick={() => selectAccount('binance')}
              className={cn("flex items-center gap-3 p-4 cursor-pointer transition-all", accountType === 'binance' ? "bg-gray-50" : "hover:bg-gray-50")}
            >
              <div className="w-12 h-12 rounded-full bg-[#F0B90B] flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 48 48" className="w-full h-full">
                  <circle cx="24" cy="24" r="24" fill="#F0B90B" />
                  <text x="24" y="32" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" fontFamily="Arial, sans-serif">B</text>
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-medium text-lg">Binance</span>
                  <ChevronDown onClick={(e) => { e.stopPropagation(); toggleDropdown(); }}
                    className={cn("h-5 w-5 text-gray-600 cursor-pointer transition-transform", isOpen && accountType === 'binance' && "rotate-180")} />
                </div>
                <span className="text-teal-500 font-bold text-xl">{binanceBalance.toFixed(2)} USD</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
