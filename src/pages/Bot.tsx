import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cryptoAssets } from '@/data/cryptoData';
import { cn } from '@/lib/utils';
import { Bot, Play, Pause, Settings, TrendingUp, TrendingDown, Zap, Shield } from 'lucide-react';

interface TradingBot {
  id: string;
  name: string;
  description: string;
  profit: number;
  status: 'active' | 'paused';
  risk: 'low' | 'medium' | 'high';
  crypto: string;
}

const defaultBots: TradingBot[] = [
  {
    id: '1',
    name: 'Grid Trading Bot',
    description: 'Automated buy low, sell high strategy',
    profit: 12.5,
    status: 'active',
    risk: 'low',
    crypto: 'BTC',
  },
  {
    id: '2',
    name: 'DCA Bot',
    description: 'Dollar cost averaging for long-term gains',
    profit: 8.2,
    status: 'paused',
    risk: 'low',
    crypto: 'ETH',
  },
  {
    id: '3',
    name: 'Momentum Bot',
    description: 'Follows market trends and momentum',
    profit: 25.8,
    status: 'active',
    risk: 'high',
    crypto: 'SOL',
  },
];

export default function BotPage() {
  const [bots, setBots] = useState<TradingBot[]>(defaultBots);
  const [showCreate, setShowCreate] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [investment, setInvestment] = useState('');
  const { toast } = useToast();

  const toggleBot = (id: string) => {
    setBots(prev => prev.map(bot => {
      if (bot.id === id) {
        const newStatus = bot.status === 'active' ? 'paused' : 'active';
        toast({
          title: newStatus === 'active' ? 'Bot Activated' : 'Bot Paused',
          description: `${bot.name} has been ${newStatus}`,
        });
        return { ...bot, status: newStatus };
      }
      return bot;
    }));
  };

  const createBot = () => {
    if (!newBotName || !investment) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const newBot: TradingBot = {
      id: Date.now().toString(),
      name: newBotName,
      description: 'Custom trading strategy',
      profit: 0,
      status: 'active',
      risk: 'medium',
      crypto: selectedCrypto,
    };

    setBots(prev => [newBot, ...prev]);
    toast({
      title: "Bot Created!",
      description: `${newBotName} is now active`,
    });
    setNewBotName('');
    setInvestment('');
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

  const totalProfit = bots.reduce((sum, bot) => sum + (bot.status === 'active' ? bot.profit : 0), 0);
  const activeBots = bots.filter(bot => bot.status === 'active').length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Active Bots</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{activeBots}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-success/20 to-success/5 border border-success/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <span className="text-sm text-muted-foreground">Total Profit</span>
            </div>
            <p className="text-2xl font-bold text-success">+{totalProfit.toFixed(1)}%</p>
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
                {['BTC', 'ETH', 'SOL', 'BNB'].map((crypto) => (
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

            <Input
              type="number"
              placeholder="Investment Amount (USD)"
              value={investment}
              onChange={(e) => setInvestment(e.target.value)}
              className="bg-input border-border"
            />

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
                      bot.status === 'active' ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{bot.name}</p>
                    <p className="text-xs text-muted-foreground">{bot.crypto}/USDT</p>
                  </div>
                </div>
                <Switch
                  checked={bot.status === 'active'}
                  onCheckedChange={() => toggleBot(bot.id)}
                />
              </div>

              <p className="text-sm text-muted-foreground mb-3">{bot.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    getRiskColor(bot.risk)
                  )}>
                    <Shield className="h-3 w-3 inline mr-1" />
                    {bot.risk} risk
                  </span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 font-semibold",
                  bot.profit >= 0 ? "text-success" : "text-destructive"
                )}>
                  {bot.profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {bot.profit >= 0 ? '+' : ''}{bot.profit}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
