import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { useTradingSound } from '@/hooks/useTradingSound';
import { cn } from '@/lib/utils';
import { getTradeOutcome } from '@/lib/tradeOutcome';
import { executeBotTrade, type BotStrategy } from '@/lib/tradingStrategies';
import { supabase } from '@/integrations/supabase/client';
import {
  Bot, Upload, Key, Settings2, Play, Square, Trash2,
  ChevronDown, TrendingUp, Plus, Cpu
} from 'lucide-react';

// Crypto trading assets
const tradingAssets = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', icon: '₿', basePrice: 98000 },
  { symbol: 'ETHUSDT', name: 'Ethereum', icon: 'Ξ', basePrice: 3400 },
  { symbol: 'SOLUSDT', name: 'Solana', icon: '◎', basePrice: 180 },
  { symbol: 'BNBUSDT', name: 'BNB', icon: '◆', basePrice: 580 },
  { symbol: 'XRPUSDT', name: 'Ripple', icon: '✕', basePrice: 0.52 },
  { symbol: 'ADAUSDT', name: 'Cardano', icon: '₳', basePrice: 0.45 },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', icon: 'Ð', basePrice: 0.08 },
];

const tradeIntervals = [
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '2 minutes', value: 120000 },
  { label: '5 minutes', value: 300000 },
];

interface MyBot {
  id: string;
  name: string;
  strategy: BotStrategy;
  asset: typeof tradingAssets[0];
  tradeAmount: number;
  interval: number;
  status: 'idle' | 'running';
  totalPL: number;
  trades: number;
  wins: number;
}

export default function BotPage() {
  const navigate = useNavigate();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();
  const { toast } = useToast();
  const { playTradeSound } = useTradingSound();

  // Upload / Passkey
  const [passkey, setPasskey] = useState('');

  // Bot Settings
  const [tradeAmount, setTradeAmount] = useState('10');
  const [selectedInterval, setSelectedInterval] = useState(tradeIntervals[1]);
  const [selectedAsset, setSelectedAsset] = useState(tradingAssets[0]);
  const [intervalOpen, setIntervalOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);

  // My Bots
  const [myBots, setMyBots] = useState<MyBot[]>([]);
  const botIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      botIntervalsRef.current.forEach((interval) => clearInterval(interval));
    };
  }, []);

  const handleSubmitPasskey = () => {
    if (!passkey.trim()) {
      toast({ title: 'Enter Passkey', description: 'Please enter a valid bot passkey', variant: 'destructive' });
      return;
    }

    // Create a bot from passkey
    const newBot: MyBot = {
      id: Date.now().toString(),
      name: 'Pro Trading Bot',
      strategy: 'scalping',
      asset: selectedAsset,
      tradeAmount: parseFloat(tradeAmount) || 10,
      interval: selectedInterval.value,
      status: 'idle',
      totalPL: 0,
      trades: 0,
      wins: 0,
    };

    setMyBots(prev => [...prev, newBot]);
    setPasskey('');
    toast({ title: 'Bot Added', description: 'Your trading bot has been activated' });
  };

  const handleUpload = () => {
    // Simulate file upload creating a bot
    const newBot: MyBot = {
      id: Date.now().toString(),
      name: `Custom Bot v${(myBots.length + 1).toFixed(1)}`,
      strategy: 'trend',
      asset: selectedAsset,
      tradeAmount: parseFloat(tradeAmount) || 10,
      interval: selectedInterval.value,
      status: 'idle',
      totalPL: 0,
      trades: 0,
      wins: 0,
    };

    setMyBots(prev => [...prev, newBot]);
    toast({ title: 'Bot Uploaded', description: 'Your trading bot has been added' });
  };

  const executeTrade = useCallback(async (botId: string) => {
    setMyBots(prev => {
      const bot = prev.find(b => b.id === botId);
      if (!bot || bot.status !== 'running') return prev;
      return prev;
    });

    const bot = myBots.find(b => b.id === botId);
    if (!bot) return;

    if (currentBalance < bot.tradeAmount) {
      stopBot(botId);
      toast({ title: 'Insufficient Balance', description: 'Bot stopped due to low balance', variant: 'destructive' });
      return;
    }

    const outcome = getTradeOutcome({ accountType, userEmail });
    const isWin = outcome === 'win';

    const result = executeBotTrade(bot.strategy, bot.tradeAmount, bot.asset.basePrice);
    const minProfit = 0.15 + Math.random() * 0.50;
    const baseProfit = Math.abs(result.netProfit) < minProfit ? minProfit : Math.abs(result.netProfit);
    const actualProfit = isWin ? baseProfit : -baseProfit;

    if (user) {
      const operation = actualProfit > 0 ? 'add' : 'subtract';
      const ok = await updateBalance(accountType, Math.abs(actualProfit), operation as 'add' | 'subtract');
      if (!ok) {
        stopBot(botId);
        toast({ title: 'Balance update failed', description: 'Bot stopped', variant: 'destructive' });
        return;
      }

      // Log trade
      try {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'bot_trade',
          amount: Math.abs(actualProfit),
          currency: 'USD',
          status: 'completed',
          description: `${bot.name} - ${isWin ? 'WIN' : 'LOSS'}: ${actualProfit >= 0 ? '+' : ''}$${actualProfit.toFixed(2)} on ${bot.asset.symbol}`,
          account_type: accountType,
          profit_loss: actualProfit,
        });
      } catch (err) {
        console.error('Error logging trade:', err);
      }
    }

    playTradeSound(isWin);

    setMyBots(prev => prev.map(b =>
      b.id === botId
        ? {
            ...b,
            totalPL: b.totalPL + actualProfit,
            trades: b.trades + 1,
            wins: b.wins + (isWin ? 1 : 0),
          }
        : b
    ));
  }, [myBots, currentBalance, accountType, userEmail, user, updateBalance, toast, playTradeSound]);

  const startBot = useCallback((botId: string) => {
    const bot = myBots.find(b => b.id === botId);
    if (!bot) return;

    if (currentBalance < bot.tradeAmount) {
      toast({ title: 'Insufficient Balance', description: `You need at least $${bot.tradeAmount}`, variant: 'destructive' });
      return;
    }

    setMyBots(prev => prev.map(b => b.id === botId ? { ...b, status: 'running' as const } : b));

    // Execute first trade immediately
    setTimeout(() => executeTrade(botId), 500);

    const interval = setInterval(() => {
      executeTrade(botId);
    }, bot.interval);

    botIntervalsRef.current.set(botId, interval);
    toast({ title: 'Bot Started', description: `${bot.name} is now trading` });
  }, [myBots, currentBalance, executeTrade, toast]);

  const stopBot = useCallback((botId: string) => {
    const interval = botIntervalsRef.current.get(botId);
    if (interval) {
      clearInterval(interval);
      botIntervalsRef.current.delete(botId);
    }
    setMyBots(prev => prev.map(b => b.id === botId ? { ...b, status: 'idle' as const } : b));
  }, []);

  const deleteBot = useCallback((botId: string) => {
    stopBot(botId);
    setMyBots(prev => prev.filter(b => b.id !== botId));
    toast({ title: 'Bot Deleted' });
  }, [stopBot, toast]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="px-4 py-4 space-y-4">
        {/* Balance Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-primary">Trading Bots</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-bold text-primary">
              ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Create Custom Bot */}
        <Button
          onClick={() => navigate('/create-bot')}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Custom Bot
        </Button>

        {/* Upload Your Trading Bot */}
        <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Upload Your Trading Bot</h2>
          </div>

          {/* Upload Area */}
          <button
            onClick={handleUpload}
            className="w-full p-8 rounded-lg border-2 border-dashed border-border/70 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
          >
            <Bot className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Passkey */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Enter Your Trading Bot Passkey:</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="ENTER PASSKEY"
                className="bg-card border-border flex-1"
              />
              <Button
                onClick={handleSubmitPasskey}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4"
              >
                Submit Passkey
              </Button>
            </div>
          </div>
        </div>

        {/* Bot Settings */}
        <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Bot Settings</h2>
              <p className="text-xs text-muted-foreground">Configure your bot before starting</p>
            </div>
          </div>

          {/* Trade Amount */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Trade Amount ($ min. $10)</label>
            <Input
              type="text"
              inputMode="decimal"
              value={tradeAmount}
              onChange={(e) => {
                if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                  setTradeAmount(e.target.value);
                }
              }}
              placeholder="10"
              className="bg-card border-border"
            />
          </div>

          {/* Trade Interval */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Trade Interval</label>
            <div className="relative">
              <button
                onClick={() => setIntervalOpen(!intervalOpen)}
                className="w-full flex items-center justify-between p-2.5 bg-card border border-border rounded-md text-sm text-foreground hover:border-primary transition-colors"
              >
                <span>{selectedInterval.label}</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", intervalOpen && "rotate-180")} />
              </button>
              {intervalOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-20">
                  {tradeIntervals.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => { setSelectedInterval(item); setIntervalOpen(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors",
                        selectedInterval.value === item.value ? "text-primary font-medium" : "text-foreground"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trading Asset */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Trading Asset</label>
            <div className="relative">
              <button
                onClick={() => setAssetOpen(!assetOpen)}
                className="w-full flex items-center justify-between p-2.5 bg-card border border-border rounded-md text-sm text-foreground hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedAsset.icon}</span>
                  <span>{selectedAsset.symbol}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", assetOpen && "rotate-180")} />
              </button>
              {assetOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto z-20">
                  {tradingAssets.map((asset) => (
                    <button
                      key={asset.symbol}
                      onClick={() => { setSelectedAsset(asset); setAssetOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors",
                        selectedAsset.symbol === asset.symbol ? "text-primary font-medium" : "text-foreground"
                      )}
                    >
                      <span className="text-lg">{asset.icon}</span>
                      <span>{asset.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My Bots */}
        {myBots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-foreground" />
              <h2 className="text-base font-semibold text-foreground">My Bots ({myBots.length})</h2>
            </div>

            {myBots.map((bot) => (
              <div key={bot.id} className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Bot className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{bot.name}</h3>
                      <p className="text-xs text-muted-foreground">v2.1</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                      balanced
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      bot.status === 'running'
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {bot.status}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Professional algorithmic trading bot with advanced market analysis
                </p>

                {/* P/L display when running or has traded */}
                {bot.trades > 0 && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className={cn("font-medium", bot.totalPL >= 0 ? "text-success" : "text-destructive")}>
                      P/L: {bot.totalPL >= 0 ? '+' : ''}${bot.totalPL.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">{bot.trades} trades</span>
                    <span className="text-muted-foreground">{bot.trades > 0 ? ((bot.wins / bot.trades) * 100).toFixed(0) : 0}% win</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {bot.status === 'idle' ? (
                    <Button
                      onClick={() => startBot(bot.id)}
                      className="bg-success hover:bg-success/90 text-success-foreground"
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  ) : (
                    <Button
                      onClick={() => stopBot(bot.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  )}
                  <Button
                    onClick={() => deleteBot(bot.id)}
                    variant="outline"
                    size="sm"
                    disabled={bot.status === 'running'}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
