import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Rocket, ChevronDown, TrendingUp,
  Grid3X3, ArrowUpDown, Eye, Settings2, Play, Square, ScrollText
} from 'lucide-react';
import { type BotStrategy, executeBotTrade } from '@/lib/tradingStrategies';
import { BottomNav } from '@/components/BottomNav';
import { getCoinIcon } from '@/data/coinIcons';
import { getTradeOutcome } from '@/lib/tradeOutcome';
import { supabase } from '@/integrations/supabase/client';
import { useTradingSound } from '@/hooks/useTradingSound';

const tradingPairs = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', basePrice: 98000 },
  { symbol: 'ETHUSDT', name: 'Ethereum', basePrice: 3400 },
  { symbol: 'XRPUSDT', name: 'Ripple', basePrice: 0.52 },
  { symbol: 'BNBUSDT', name: 'BNB', basePrice: 580 },
  { symbol: 'SOLUSDT', name: 'Solana', basePrice: 180 },
  { symbol: 'ADAUSDT', name: 'Cardano', basePrice: 0.45 },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', basePrice: 0.08 },
  { symbol: 'DOTUSDT', name: 'Polkadot', basePrice: 7.2 },
];

const strategies: { id: BotStrategy; name: string; tag: string; description: string; icon: React.ReactNode }[] = [
  { id: 'trend', name: 'Trend Following', tag: 'AI-Powered', description: 'Identifies and follows market trends using advanced technical indicators', icon: <TrendingUp className="h-5 w-5 text-primary" /> },
  { id: 'grid', name: 'Grid Trading', tag: 'Automated', description: 'Places buy and sell orders at predetermined price intervals', icon: <Grid3X3 className="h-5 w-5 text-primary" /> },
  { id: 'arbitrage', name: 'Arbitrage', tag: 'Multi-Exchange', description: 'Exploits price differences across multiple exchanges', icon: <ArrowUpDown className="h-5 w-5 text-primary" /> },
];

type RiskLevel = 'low' | 'medium' | 'high';

const riskConfig: Record<RiskLevel, { label: string; range: string; maxPos: string; stopLoss: string; takeProfit: string; estReturn: string; winRate: string; drawdown: string }> = {
  low:    { label: 'Low',    range: '1-2%', maxPos: '2% per trade', stopLoss: '1.5%', takeProfit: '3.0%', estReturn: '+5-8%', winRate: '~65%', drawdown: '-3.2%' },
  medium: { label: 'Medium', range: '3-5%', maxPos: '5% per trade', stopLoss: '3%',   takeProfit: '6%',   estReturn: '+8-15%', winRate: '~55%', drawdown: '-8%' },
  high:   { label: 'High',   range: '6-10%', maxPos: '10% per trade', stopLoss: '5%',  takeProfit: '10%',  estReturn: '+15-30%', winRate: '~45%', drawdown: '-15%' },
};

interface TradeLog {
  id: string;
  time: Date;
  asset: string;
  direction: 'BUY' | 'SELL';
  stake: number;
  result: 'WIN' | 'LOSS';
  profit: number;
}

export default function CreateBot() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();
  const { playTradeSound } = useTradingSound();

  const [botName, setBotName] = useState('BTC Master Bot');
  const [selectedPair, setSelectedPair] = useState(tradingPairs[0]);
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<BotStrategy>('trend');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('low');
  const [investmentAmount, setInvestmentAmount] = useState('10');
  const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');
  const [isDeployed, setIsDeployed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [totalPL, setTotalPL] = useState(0);
  const [tradesCount, setTradesCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setPairDropdownOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const risk = riskConfig[riskLevel];

  const executeTrade = useCallback(async () => {
    const stake = parseFloat(investmentAmount) || 10;
    if (currentBalance < stake) {
      setIsRunning(false);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      toast({ title: 'Insufficient Balance', description: 'Bot stopped due to low balance', variant: 'destructive' });
      return;
    }

    const outcome = getTradeOutcome({ accountType, userEmail });
    const isWin = outcome === 'win';
    const payoutAmount = stake * 0.05; // 5% payout
    const actualProfit = isWin ? payoutAmount : -payoutAmount;

    if (user) {
      const operation = actualProfit > 0 ? 'add' : 'subtract';
      const ok = await updateBalance(accountType, Math.abs(actualProfit), operation);
      if (!ok) {
        setIsRunning(false);
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        toast({ title: 'Balance update failed', description: 'Bot stopped', variant: 'destructive' });
        return;
      }

      try {
        await supabase.from('transactions').insert({
          user_id: user.id, type: 'bot_trade', amount: Math.abs(actualProfit),
          currency: 'USD', status: 'completed',
          description: `${botName} - ${isWin ? 'WIN' : 'LOSS'}: ${actualProfit >= 0 ? '+' : ''}$${actualProfit.toFixed(2)} on ${selectedPair.symbol}`,
          account_type: accountType, profit_loss: actualProfit,
        });
      } catch (err) { console.error('Error logging trade:', err); }
    }

    playTradeSound(isWin);

    const log: TradeLog = {
      id: Date.now().toString(), time: new Date(), asset: selectedPair.symbol,
      direction: Math.random() > 0.5 ? 'BUY' : 'SELL', stake,
      result: isWin ? 'WIN' : 'LOSS', profit: actualProfit,
    };
    setTradeLogs(prev => [log, ...prev].slice(0, 100));
    setTotalPL(prev => prev + actualProfit);
    setTradesCount(prev => prev + 1);
    if (isWin) setWinsCount(prev => prev + 1);
  }, [investmentAmount, currentBalance, accountType, userEmail, user, updateBalance, toast, playTradeSound, botName, selectedPair]);

  const handleDeploy = () => {
    const amount = parseFloat(investmentAmount);
    if (!amount || amount < 1) {
      toast({ title: 'Invalid Amount', description: 'Minimum investment is $1', variant: 'destructive' });
      return;
    }
    setIsDeployed(true);
    toast({ title: 'Bot Deployed!', description: `${botName} is ready. Press Start to begin trading.` });
  };

  const toggleBot = () => {
    if (!isRunning) {
      const stake = parseFloat(investmentAmount) || 10;
      if (currentBalance < stake) {
        toast({ title: 'Insufficient Balance', description: `You need at least $${stake}`, variant: 'destructive' });
        return;
      }
      setIsRunning(true);
      executeTrade();
      intervalRef.current = setInterval(executeTrade, 3000 + Math.random() * 2000);
      toast({ title: 'Bot Started', description: `${botName} is now trading continuously` });
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      setIsRunning(false);
      toast({ title: 'Bot Stopped', description: `${botName} has been stopped` });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/bot')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg text-foreground">AI Trading Bot Creator</h1>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Deployed Bot Controls */}
        {isDeployed && (
          <>
            <div className={cn("p-4 rounded-xl border-2",
              totalPL >= 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30")}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{botName} • {selectedPair.symbol}</p>
                  <p className={cn("text-2xl font-bold", totalPL >= 0 ? "text-success" : "text-destructive")}>
                    {totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)} USD
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{tradesCount} trades</span>
                    <span className="text-success">{winsCount} wins</span>
                    <span className="text-destructive">{tradesCount - winsCount} losses</span>
                  </div>
                </div>
                <Button onClick={toggleBot} className={isRunning ? "bg-destructive hover:bg-destructive/90" : "bg-success hover:bg-success/90"} size="lg">
                  {isRunning ? <><Square className="h-5 w-5 mr-2" />Stop</> : <><Play className="h-5 w-5 mr-2" />Start</>}
                </Button>
              </div>
            </div>

            {/* Trade Logs */}
            {tradeLogs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Trade Logs</span>
                </div>
                <div className="rounded-xl bg-card border border-border/50 overflow-hidden max-h-48 overflow-y-auto">
                  {tradeLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between px-3 py-2 border-b border-border/30 last:border-0 text-xs">
                      <div className="flex items-center gap-2">
                        <img src={getCoinIcon(log.asset.replace('USDT', ''))} alt="" className="w-4 h-4 rounded-full" />
                        <span className="text-foreground">{log.asset}</span>
                        <span className={cn("px-1 py-0.5 rounded", log.direction === 'BUY' ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>{log.direction}</span>
                      </div>
                      <span className={cn("font-medium", log.result === 'WIN' ? "text-success" : "text-destructive")}>
                        {log.profit >= 0 ? '+' : ''}${log.profit.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">{log.time.toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Configuration - hide after deploy */}
        {!isDeployed && (
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4">
              {/* LEFT PANEL */}
              <div className="space-y-4 md:border-r md:border-border/50 md:pr-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Bot Name</label>
                  <Input value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="My Trading Bot" className="bg-card border-border" />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Trading Pair</label>
                  <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setPairDropdownOpen(!pairDropdownOpen)}
                      className="w-full flex items-center justify-between p-2.5 bg-card border border-border rounded-md text-sm text-foreground hover:border-primary transition-colors">
                      <div className="flex items-center gap-2">
                        <img src={getCoinIcon(selectedPair.symbol.replace('USDT', ''))} alt="" className="w-5 h-5 rounded-full" />
                        <div className="text-left"><p className="font-medium">{selectedPair.symbol}</p><p className="text-xs text-muted-foreground">Spot Trading</p></div>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", pairDropdownOpen && "rotate-180 text-primary")} />
                    </button>
                    {pairDropdownOpen && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto z-20">
                        {tradingPairs.map((pair) => (
                          <button key={pair.symbol} onClick={() => { setSelectedPair(pair); setPairDropdownOpen(false); }}
                            className={cn("w-full flex items-center gap-2 p-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors", selectedPair.symbol === pair.symbol && "bg-muted/50")}>
                            <img src={getCoinIcon(pair.symbol.replace('USDT', ''))} alt="" className="w-5 h-5 rounded-full" />
                            <span className="font-medium">{pair.symbol}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-foreground mb-3">Strategy Type</h3>
                  <div className="space-y-2">
                    {strategies.map((s) => (
                      <button key={s.id} onClick={() => setSelectedStrategy(s.id)}
                        className={cn("w-full text-left p-3 bg-card border rounded-md transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary relative overflow-hidden",
                          selectedStrategy === s.id ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]" : "border-border")}>
                        <div className="flex items-center gap-2 mb-1">
                          {s.icon}
                          <div><p className="font-semibold text-sm text-foreground">{s.name}</p><span className="text-[11px] text-muted-foreground">{s.tag}</span></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                        <span className={cn("absolute top-0 right-0 px-2 py-0.5 text-[11px] font-medium bg-primary text-primary-foreground transition-opacity",
                          selectedStrategy === s.id ? "opacity-100" : "opacity-0")}>Selected</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div className="space-y-4 md:pl-4">
                <div className="flex border-b border-border">
                  <button onClick={() => setActiveTab('config')}
                    className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                      activeTab === 'config' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-primary")}>
                    <Settings2 className="h-4 w-4 inline mr-1" />Configuration
                  </button>
                  <button onClick={() => setActiveTab('preview')}
                    className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                      activeTab === 'preview' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-primary")}>
                    <Eye className="h-4 w-4 inline mr-1" />Preview
                  </button>
                </div>

                {activeTab === 'config' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                    <h4 className="text-sm font-semibold text-foreground">Risk Management</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as RiskLevel[]).map((level) => (
                        <button key={level} onClick={() => setRiskLevel(level)}
                          className={cn("flex flex-col items-center justify-center p-3 border text-sm font-medium rounded-md transition-all",
                            riskLevel === level
                              ? level === 'low' ? "bg-success text-success-foreground border-success"
                                : level === 'medium' ? "bg-primary text-primary-foreground border-primary"
                                : "bg-destructive text-destructive-foreground border-destructive"
                              : "border-border text-muted-foreground hover:border-primary")}>
                          <span className="font-semibold capitalize">{level}</span>
                          <span className="text-[11px] opacity-80">{riskConfig[level].range}</span>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {[{ label: 'Max Position Size', value: risk.maxPos }, { label: 'Stop Loss', value: risk.stopLoss }, { label: 'Take Profit', value: risk.takeProfit }].map((item) => (
                        <div key={item.label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">Stake Amount (5% payout)</label>
                      <div className="relative">
                        <Input type="text" inputMode="decimal" value={investmentAmount}
                          onChange={(e) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setInvestmentAmount(e.target.value); }}
                          className="bg-card border-border pr-16" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">USDT</span>
                      </div>
                    </div>

                    <Button onClick={handleDeploy} disabled={!botName.trim()}
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                      <Rocket className="h-4 w-4 mr-2" />Deploy Bot
                    </Button>
                  </div>
                )}

                {activeTab === 'preview' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                    <div className="p-4 rounded-md bg-card border border-border space-y-3">
                      <h4 className="font-semibold text-foreground">Bot Configuration Summary</h4>
                      <div className="space-y-2">
                        {[
                          { label: 'Bot Name', value: botName || 'My Trading Bot' },
                          { label: 'Trading Pair', value: selectedPair.symbol },
                          { label: 'Strategy', value: strategies.find(s => s.id === selectedStrategy)?.name || '' },
                          { label: 'Risk Level', value: `${risk.label} (${risk.range})` },
                          { label: 'Stake', value: `${investmentAmount || '0'} USDT` },
                          { label: 'Payout', value: '5% per trade' },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-medium text-foreground">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button onClick={handleDeploy} disabled={!botName.trim()}
                      className="w-full h-11 bg-success hover:bg-success/90 text-success-foreground font-semibold">
                      <Rocket className="h-4 w-4 mr-2" />Deploy Bot Now
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
