import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Play, Square, ChevronRight, ChevronDown } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { getCoinIcon } from '@/data/coinIcons';
import { getTradeOutcome } from '@/lib/tradeOutcome';
import { supabase } from '@/integrations/supabase/client';

interface TradeLog {
  id: string;
  time: Date;
  asset: string;
  direction: 'BUY' | 'SELL';
  stake: number;
  result: 'WIN' | 'LOSS';
  profit: number;
  buyPrice: number;
  sellPrice: number;
  entryPrice: number;
}

interface LocationState {
  botName: string;
  symbol: string;
  strategy: string;
  riskLevel: string;
  investmentAmount: string;
}



export default function DeployedBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { toast } = useToast();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();

  const botName = state?.botName || 'Custom Bot';
  const symbol = state?.symbol || 'BTCUSDT';
  const investmentAmount = state?.investmentAmount || '10';

  const [isRunning, setIsRunning] = useState(false);
  const [totalPL, setTotalPL] = useState(0);
  const [tradesCount, setTradesCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [activeDuration, setActiveDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);
  const balanceRef = useRef(currentBalance);
  const isRunningRef = useRef(false);

  useEffect(() => { balanceRef.current = currentBalance; }, [currentBalance]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, []);

  const basePrice = symbol === 'BTCUSDT' ? 98000 : symbol === 'ETHUSDT' ? 3400 : symbol === 'SOLUSDT' ? 180 : symbol === 'BNBUSDT' ? 580 : 100;

  const executeTrade = useCallback(async () => {
    const stake = parseFloat(investmentAmount) || 10;
    if (balanceRef.current < stake) {
      setIsRunning(false);
      if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
      toast({ title: 'Insufficient Balance', description: 'Bot stopped due to low balance', variant: 'destructive' });
      return;
    }

    const outcome = getTradeOutcome({ accountType, userEmail });
    const isWin = outcome === 'win';

    const buyPrice = basePrice * (1 + (Math.random() - 0.5) * 0.01);
    const priceMove = buyPrice * (0.001 + Math.random() * 0.005);
    const sellPrice = isWin ? buyPrice + priceMove : buyPrice - priceMove;

    // Over 0 payout (Deriv style) - ~10.5% payout like over 0 digit
    const payoutPercent = 9.5 + Math.random() * 2; // 9.5-11.5%
    const actualProfit = isWin ? stake * (payoutPercent / 100) : -stake;

    if (user && accountType !== 'binance') {
      const operation = actualProfit > 0 ? 'add' : 'subtract';
      const ok = await updateBalance(accountType, Math.abs(actualProfit), operation);
      if (!ok) {
        setIsRunning(false);
        if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
        toast({ title: 'Balance update failed', variant: 'destructive' });
        return;
      }

      try {
        await supabase.from('transactions').insert({
          user_id: user.id, type: 'bot_trade', amount: Math.abs(actualProfit),
          currency: 'USD', status: 'completed',
          description: `${botName} - ${isWin ? 'WIN' : 'LOSS'}: ${actualProfit >= 0 ? '+' : ''}$${actualProfit.toFixed(2)} on ${symbol}`,
          account_type: accountType, profit_loss: actualProfit,
        });
      } catch (err) { console.error(err); }
    }

    const log: TradeLog = {
      id: Date.now().toString(), time: new Date(), asset: symbol,
      direction: isWin ? 'BUY' : 'SELL', stake,
      result: isWin ? 'WIN' : 'LOSS', profit: actualProfit,
      buyPrice, sellPrice, entryPrice: buyPrice,
    };
    setTradeLogs(prev => [log, ...prev].slice(0, 100));
    setTotalPL(prev => prev + actualProfit);
    setTradesCount(prev => prev + 1);
    if (isWin) setWinsCount(prev => prev + 1);
  }, [investmentAmount, accountType, userEmail, user, updateBalance, toast, botName, symbol, basePrice]);

  const scheduleNextTrade = useCallback(() => {
    intervalRef.current = setTimeout(async () => {
      if (!isRunningRef.current) return;
      await executeTrade();
      if (isRunningRef.current) {
        scheduleNextTrade();
      }
    }, 3000 + Math.random() * 2000);
  }, [executeTrade]);

  const toggleBot = () => {
    if (!isRunning) {
      const stake = parseFloat(investmentAmount) || 10;
      if (currentBalance < stake) {
        toast({ title: 'Insufficient Balance', variant: 'destructive' });
        return;
      }
      setIsRunning(true);
      executeTrade();
      scheduleNextTrade();
      durationRef.current = setInterval(() => setActiveDuration(prev => prev + 1), 1000);
      toast({ title: 'Bot Started', description: `${botName} is now trading` });
    } else {
      if (intervalRef.current) { clearTimeout(intervalRef.current); intervalRef.current = null; }
      if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
      setIsRunning(false);
      toast({ title: 'Bot Stopped' });
    }
  };

  const formatDuration = (s: number) => {
    const d = Math.floor(s / 86400);
    const hrs = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}D ${hrs}h ${m}m`;
  };

  const winRate = tradesCount > 0 ? ((winsCount / tradesCount) * 100).toFixed(1) : '0.0';
  const profitPercent = parseFloat(investmentAmount) > 0 ? ((totalPL / parseFloat(investmentAmount)) * 100).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/bot')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg text-foreground">My Grid Bots</h1>
          </div>
        </div>
      </header>

      <main className="space-y-0">
        {/* Active / Completed tabs */}
        <div className="flex border-b border-border/30 px-4">
          <button onClick={() => setActiveTab('active')}
            className={cn("px-4 py-3 text-sm font-semibold border-b-2 transition-colors",
              activeTab === 'active' ? "text-foreground border-foreground" : "text-muted-foreground border-transparent")}>
            Active
          </button>
          <button onClick={() => setActiveTab('completed')}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'completed' ? "text-foreground border-foreground" : "text-muted-foreground border-transparent")}>
            Completed
          </button>
        </div>

        {/* Bot card - like screenshot 2 (My Grid Bots) */}
        <div className="px-4 py-4">
          <div className="rounded-xl bg-card border border-border/50 p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={getCoinIcon(symbol.replace('USDT', ''))} alt="" className="w-8 h-8 rounded-full" />
                <span className="font-semibold text-foreground">{symbol.replace('USDT', '/USDT')}</span>
              </div>
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                View More <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Active duration */}
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("w-2 h-2 rounded-full", isRunning ? "bg-success animate-pulse" : "bg-muted-foreground")} />
              <span className="text-muted-foreground">
                {isRunning ? `Active Duration: ${formatDuration(activeDuration)}` : 'Idle'}
              </span>
            </div>

            {/* Investment / Profit boxes */}
            <div className="grid grid-cols-2 gap-0 border border-border rounded-lg overflow-hidden">
              <div className="p-3 border-r border-border">
                <p className="text-xs text-muted-foreground">Investment (USDT)</p>
                <p className="text-xl font-bold text-foreground">{investmentAmount}</p>
              </div>
              <div className="p-3">
                <p className="text-xs text-muted-foreground">Profit (USDT) ⓘ</p>
                <p className={cn("text-xl font-bold", totalPL >= 0 ? "text-success" : "text-destructive")}>
                  {totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)}
                  <span className="text-sm ml-1">{profitPercent}%</span>
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="text-foreground font-medium">{winRate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">No. of Trades</span>
                <span className="text-foreground font-medium">{tradesCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Grid Profit (USDT) ⓘ</span>
                <span className={cn("font-medium", totalPL >= 0 ? "text-success" : "text-destructive")}>
                  {totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Start/Stop button */}
            <Button onClick={toggleBot} className={cn("w-full h-11 font-semibold",
              isRunning ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "bg-success hover:bg-success/90 text-success-foreground")}>
              {isRunning ? <><Square className="h-4 w-4 mr-2" />Stop Bot</> : <><Play className="h-4 w-4 mr-2" />Start Bot</>}
            </Button>
          </div>
        </div>

        {/* No chart for custom bots */}

        {/* Positions Panel */}
        {tradeLogs.length > 0 && (
          <div className="px-4 py-4">
            <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
              <div className="flex border-b border-border/30">
                <button className="flex-1 py-3 text-sm font-medium text-foreground bg-muted/30">All ({tradeLogs.length})</button>
                <button className="flex-1 py-3 text-sm font-medium text-muted-foreground">Positions ({tradeLogs.length})</button>
                <button className="flex-1 py-3 text-sm font-medium text-muted-foreground">Orders (0)</button>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <span className="text-sm font-medium text-foreground">Total P&L</span>
                <span className={cn("text-lg font-bold", totalPL >= 0 ? "text-success" : "text-destructive")}>
                  {totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)}
                </span>
              </div>
              <div className="px-4 pb-2">
                <span className="text-xs text-muted-foreground">{winsCount} winning / {tradesCount - winsCount} losing trades</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {tradeLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between px-4 py-3 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                        log.direction === 'BUY' ? "bg-success/10" : "bg-destructive/10")}>
                        <span className={cn("text-sm font-bold", log.direction === 'BUY' ? "text-success" : "text-destructive")}>
                          {log.direction === 'BUY' ? '↗' : '↘'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{log.asset.replace('USDT', '/USD')}</p>
                        <p className="text-xs text-muted-foreground">0.01 • {log.direction}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-semibold", log.profit >= 0 ? "text-success" : "text-destructive")}>
                        {log.profit >= 0 ? '+' : '-'}${Math.abs(log.profit).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">@ {log.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
