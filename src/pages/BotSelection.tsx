import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { cn } from '@/lib/utils';
import { TrendingUp, Bot, Zap } from 'lucide-react';
import botForexImage from '@/assets/bot-forex.jpg';
import botArbitrageImage from '@/assets/bot-arbitrage.jpg';

export default function BotSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Bot Trading</h1>
          <p className="text-muted-foreground">Choose your trading bot type</p>
        </div>

        <div className="grid gap-4">
          {/* Forex Bot Option */}
          <button
            onClick={() => navigate('/forex-bot')}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-0 text-left transition-all hover:border-primary/50 hover:shadow-lg active:scale-[0.98]"
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={botForexImage} 
                alt="Forex Bot" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Forex EA Bot</h3>
                    <p className="text-xs text-white/70">MetaTrader Style Trading</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Professional forex expert advisor. Trades XAU/USD and major forex pairs with small lot sizes. Closes at each profit automatically.
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-500">
                  Forex Logic
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success">
                  Auto Close Profit
                </span>
              </div>
            </div>
          </button>

          {/* Normal Bot Option */}
          <button
            onClick={() => navigate('/bot')}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-0 text-left transition-all hover:border-primary/50 hover:shadow-lg active:scale-[0.98]"
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={botArbitrageImage} 
                alt="Normal Bot" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Crypto Bots</h3>
                    <p className="text-xs text-white/70">Automated Strategies</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Three specialized bots: Arbitrage Hunter, Speed Scalper, and Signal Master. Each uses different strategies for crypto trading.
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                  Arbitrage
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive">
                  Scalping
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-warning/20 text-warning">
                  Signals
                </span>
              </div>
            </div>
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
