import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { Bot, Play, Pause, TrendingUp, TrendingDown, Zap, Shield, DollarSign } from 'lucide-react';

interface TradingBot {
  id: string;
  name: string;
  description: string;
  profit: number;
  status: 'active' | 'paused';
  risk: 'low' | 'medium' | 'high';
  crypto: string;
  stakeAmount: number;
  tradesCount: number;
  winRate: number;
}

const defaultBots: TradingBot[] = [
  {
    id: '1',
    name: 'Wave Rider Pro',
    description: 'Automated grid trading with smart entry points',
    profit: 0,
    status: 'paused',
    risk: 'low',
    crypto: 'BTC',
    stakeAmount: 10,
    tradesCount: 0,
    winRate: 65,
  },
  {
    id: '2',
    name: 'Tsunami Accumulator',
    description: 'Dollar cost averaging for long-term gains',
    profit: 0,
    status: 'paused',
    risk: 'low',
    crypto: 'ETH',
    stakeAmount: 10,
    tradesCount: 0,
    winRate: 72,
  },
  {
    id: '3',
    name: 'Storm Chaser',
    description: 'High-frequency momentum trading strategy',
    profit: 0,
    status: 'paused',
    risk: 'high',
    crypto: 'SOL',
    stakeAmount: 25,
    tradesCount: 0,
    winRate: 58,
  },
];

export default function BotPage() {
  const [bots, setBots] = useState<TradingBot[]>(defaultBots);
  const [showCreate, setShowCreate] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [stakeAmount, setStakeAmount] = useState('10');
  const { toast } = useToast();
  const { currentBalance, accountType, updateBalance, user, isLoggedIn } = useAccount();
  const tradingIntervals = useRef<Record<string, NodeJS.Timeout>>({});

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(tradingIntervals.current).forEach(interval => clearInterval(interval));
    };
  }, []);

  const executeTrade = async (bot: TradingBot) => {
    if (currentBalance < bot.stakeAmount) {
      // Not enough balance, pause the bot
      setBots(prev => prev.map(b => 
        b.id === bot.id ? { ...b, status: 'paused' } : b
      ));
      if (tradingIntervals.current[bot.id]) {
        clearInterval(tradingIntervals.current[bot.id]);
        delete tradingIntervals.current[bot.id];
      }
      toast({
        title: "Insufficient Balance",
        description: `${bot.name} has been paused due to insufficient funds`,
        variant: "destructive",
      });
      return;
    }

    // Simulate trade with win rate probability
    const isWin = Math.random() * 100 < bot.winRate;
    const profitMultiplier = isWin ? (Math.random() * 0.15 + 0.05) : -(Math.random() * 0.1 + 0.05);
    const tradeProfit = bot.stakeAmount * profitMultiplier;

    // Update balance
    if (user) {
      await updateBalance(accountType, tradeProfit, tradeProfit > 0 ? 'add' : 'subtract');
    }

    // Update bot stats
    setBots(prev => prev.map(b => {
      if (b.id === bot.id) {
        return {
          ...b,
          profit: b.profit + tradeProfit,
          tradesCount: b.tradesCount + 1,
        };
      }
      return b;
    }));
  };

  const toggleBot = (id: string) => {
    const bot = bots.find(b => b.id === id);
    if (!bot) return;

    if (bot.status === 'paused') {
      // Starting the bot
      if (currentBalance < bot.stakeAmount) {
        toast({
          title: "Insufficient Balance",
          description: `You need at least $${bot.stakeAmount} to start this bot`,
          variant: "destructive",
        });
        return;
      }

      if (currentBalance === 0) {
        toast({
          title: "Zero Balance",
          description: "Please deposit funds before starting a bot",
          variant: "destructive",
        });
        return;
      }

      // Start trading interval (every 10-30 seconds for demo)
      const interval = setInterval(() => {
        const currentBot = bots.find(b => b.id === id);
        if (currentBot && currentBot.status === 'active') {
          executeTrade(currentBot);
        }
      }, Math.random() * 20000 + 10000);

      tradingIntervals.current[id] = interval;

      toast({
        title: "Bot Activated",
        description: `${bot.name} is now trading with $${bot.stakeAmount} stake`,
      });
    } else {
      // Stopping the bot
      if (tradingIntervals.current[id]) {
        clearInterval(tradingIntervals.current[id]);
        delete tradingIntervals.current[id];
      }
      toast({
        title: "Bot Paused",
        description: `${bot.name} has been stopped`,
      });
    }

    setBots(prev => prev.map(b => {
      if (b.id === id) {
        return { ...b, status: b.status === 'active' ? 'paused' : 'active' };
      }
      return b;
    }));
  };

  const updateStakeAmount = (id: string, amount: string) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) return;

    setBots(prev => prev.map(b => {
      if (b.id === id) {
        return { ...b, stakeAmount: numAmount };
      }
      return b;
    }));
  };

  const createBot = () => {
    if (!newBotName) {
      toast({
        title: "Missing Information",
        description: "Please enter a bot name",
        variant: "destructive",
      });
      return;
    }

    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake < 1) {
      toast({
        title: "Invalid Stake",
        description: "Minimum stake is $1",
        variant: "destructive",
      });
      return;
    }

    const newBot: TradingBot = {
      id: Date.now().toString(),
      name: newBotName,
      description: 'Custom trading strategy',
      profit: 0,
      status: 'paused',
      risk: 'medium',
      crypto: selectedCrypto,
      stakeAmount: stake,
      tradesCount: 0,
      winRate: 55 + Math.random() * 20,
    };

    setBots(prev => [newBot, ...prev]);
    toast({
      title: "Bot Created!",
      description: `${newBotName} is ready to trade`,
    });
    setNewBotName('');
    setStakeAmount('10');
    setShowCreate(false);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-success bg-success/20';
      case 'medium': return 'text-warning bg-warning/20';
      case 'high': return 'text-destructive bg-destructive/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const totalProfit = bots.reduce((sum, bot) => sum + bot.profit, 0);
  const activeBots = bots.filter(bot => bot.status === 'active').length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-5">
        {/* Account Info */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available Balance ({accountType})</p>
              <p className="text-2xl font-bold text-foreground">
                ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            {currentBalance === 0 && (
              <span className="px-3 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
                Deposit Required
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Active Bots</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{activeBots}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <span className="text-sm text-muted-foreground">Total Profit</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              totalProfit >= 0 ? "text-success" : "text-destructive"
            )}>
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Create Bot Section */}
        {showCreate ? (
          <div className="p-4 rounded-xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">Create New Bot</h3>
              <button 
                onClick={() => setShowCreate(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            
            <Input
              placeholder="Bot Name"
              value={newBotName}
              onChange={(e) => setNewBotName(e.target.value)}
              className="bg-input border-border"
            />

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Trading Pair</label>
              <div className="flex gap-2 flex-wrap">
                {['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE'].map((crypto) => (
                  <button
                    key={crypto}
                    onClick={() => setSelectedCrypto(crypto)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedCrypto === crypto
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {crypto}/USDT
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Stake Amount (USD)</label>
              <Input
                type="number"
                placeholder="Min $1"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="bg-input border-border"
                min="1"
              />
            </div>

            <Button onClick={createBot} className="w-full bg-primary hover:bg-primary/90">
              <Zap className="h-4 w-4 mr-2" />
              Create Bot
            </Button>
          </div>
        ) : (
          <Button 
            onClick={() => setShowCreate(true)}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Bot className="h-4 w-4 mr-2" />
            Create New Bot
          </Button>
        )}

        {/* Bot List */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground">Your Bots</h3>
          
          {bots.map((bot, index) => (
            <div 
              key={bot.id}
              className="p-4 rounded-xl bg-card border border-border/50 animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    bot.status === 'active' ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Bot className={cn(
                      "h-5 w-5",
                      bot.status === 'active' ? "text-primary animate-pulse" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{bot.name}</p>
                    <p className="text-xs text-muted-foreground">{bot.crypto}/USDT</p>
                  </div>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  bot.status === 'active' 
                    ? "bg-success/20 text-success" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {bot.status === 'active' ? 'Running' : 'Stopped'}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{bot.description}</p>

              {/* Stake Amount Control */}
              <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-secondary/50">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Stake:</span>
                <Input
                  type="number"
                  value={bot.stakeAmount}
                  onChange={(e) => updateStakeAmount(bot.id, e.target.value)}
                  className="w-20 h-8 text-sm bg-input border-border"
                  disabled={bot.status === 'active'}
                  min="1"
                />
                <span className="text-sm text-muted-foreground">USD</span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    getRiskColor(bot.risk)
                  )}>
                    <Shield className="h-3 w-3 inline mr-1" />
                    {bot.risk} risk
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {bot.tradesCount} trades
                  </span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 font-semibold",
                  bot.profit >= 0 ? "text-success" : "text-destructive"
                )}>
                  {bot.profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {bot.profit >= 0 ? '+' : ''}${bot.profit.toFixed(2)}
                </div>
              </div>

              <Button
                onClick={() => toggleBot(bot.id)}
                disabled={bot.status === 'paused' && currentBalance < bot.stakeAmount}
                className={cn(
                  "w-full",
                  bot.status === 'active'
                    ? "bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/30"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
                variant={bot.status === 'active' ? "outline" : "default"}
              >
                {bot.status === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Trading
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Trading
                  </>
                )}
              </Button>
              {bot.status === 'paused' && currentBalance < bot.stakeAmount && (
                <p className="text-xs text-destructive text-center mt-2">
                  Insufficient balance (need ${bot.stakeAmount})
                </p>
              )}
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
