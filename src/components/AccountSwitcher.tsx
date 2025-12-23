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
          <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">Ð</span>
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
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
            <div className="w-full h-full flex items-center justify-center bg-white">
              <div className="relative w-10 h-10">
                {/* US Flag simplified */}
                <div className="absolute inset-0 flex flex-col">
                  <div className="h-1 bg-red-600" />
                  <div className="h-1 bg-white" />
                  <div className="h-1 bg-red-600" />
                  <div className="h-1 bg-white" />
                  <div className="h-1 bg-red-600" />
                  <div className="h-1 bg-white" />
                  <div className="h-1 bg-red-600" />
                </div>
                <div className="absolute top-0 left-0 w-4 h-4 bg-blue-900 flex items-center justify-center">
                  <span className="text-white text-[6px]">★</span>
                </div>
              </div>
            </div>
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
