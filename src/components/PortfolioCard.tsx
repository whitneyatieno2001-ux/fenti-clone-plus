import { useAccount } from '@/contexts/AccountContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TrendingUp, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

interface PortfolioCardProps {
  onDeposit: () => void;
  onWithdraw: () => void;
}

export function PortfolioCard({ onDeposit, onWithdraw }: PortfolioCardProps) {
  const { accountType, currentBalance } = useAccount();

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-secondary to-card border border-border">
      {/* Floating crypto icons */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3">
        <div className="w-10 h-10 rounded-full bg-[#F7931A] flex items-center justify-center text-white font-bold text-sm shadow-lg animate-float" style={{ animationDelay: '0s' }}>
          ₿
        </div>
        <div className="w-10 h-10 rounded-full bg-[#9945FF] flex items-center justify-center text-white font-bold text-sm shadow-lg animate-float" style={{ animationDelay: '0.5s' }}>
          ◎
        </div>
        <div className="w-10 h-10 rounded-full bg-[#627EEA] flex items-center justify-center text-white font-bold text-sm shadow-lg animate-float" style={{ animationDelay: '1s' }}>
          Ξ
        </div>
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-xl shadow-lg animate-float" style={{ animationDelay: '1.5s' }}>
          ✕
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn(
            "text-sm font-medium px-2 py-1 rounded-full",
            accountType === 'demo' 
              ? "bg-primary/20 text-primary" 
              : "bg-success/20 text-success"
          )}>
            {accountType === 'demo' ? 'Demo Portfolio' : 'Real Portfolio'}
          </span>
        </div>

        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="text-4xl font-bold font-display text-foreground">
            ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>

        <div className="flex items-center gap-1 text-success mb-6">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">↑ 0.35%</span>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={onDeposit}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-glow"
          >
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            Deposit
          </Button>
          <Button 
            onClick={onWithdraw}
            variant="secondary"
            className="flex-1 font-semibold"
          >
            <ArrowUpFromLine className="h-4 w-4 mr-2" />
            Withdraw
          </Button>
        </div>
      </div>
    </div>
  );
}
