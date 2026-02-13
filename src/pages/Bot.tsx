import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/contexts/AccountContext';
import { Bot, Plus, Cpu, TrendingUp, Grid3X3, ArrowUpDown } from 'lucide-react';

export default function BotPage() {
  const navigate = useNavigate();
  const { currentBalance, accountType } = useAccount();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-3 py-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center">
            <Cpu className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AI Trading Bots</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Create custom automated trading bots with AI-powered strategies
          </p>
        </div>

        {/* Balance Card */}
        <div className="p-4 rounded-xl bg-card border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Balance ({accountType})</p>
              <p className="text-2xl font-bold text-foreground">
                ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Bot className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* Strategy Preview Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <TrendingUp className="h-5 w-5 text-primary" />, label: 'Trend' },
            { icon: <Grid3X3 className="h-5 w-5 text-primary" />, label: 'Grid' },
            { icon: <ArrowUpDown className="h-5 w-5 text-primary" />, label: 'Arbitrage' },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl bg-card border border-border/50 flex flex-col items-center gap-2">
              {s.icon}
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Create Bot Button */}
        <Button
          onClick={() => navigate('/create-bot')}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Custom Bot
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
