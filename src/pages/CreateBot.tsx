import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, Rocket, ChevronDown, TrendingUp, 
  Grid3X3, ArrowUpDown, Eye, Settings2
} from 'lucide-react';
import { type BotStrategy, executeBotTrade } from '@/lib/tradingStrategies';
import { BottomNav } from '@/components/BottomNav';

// Trading pair options
const tradingPairs = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', icon: '₿', basePrice: 98000 },
  { symbol: 'ETHUSDT', name: 'Ethereum', icon: 'Ξ', basePrice: 3400 },
  { symbol: 'XRPUSDT', name: 'Ripple', icon: '✕', basePrice: 0.52 },
  { symbol: 'BNBUSDT', name: 'BNB', icon: '◆', basePrice: 580 },
  { symbol: 'SOLUSDT', name: 'Solana', icon: '◎', basePrice: 180 },
  { symbol: 'ADAUSDT', name: 'Cardano', icon: '₳', basePrice: 0.45 },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', icon: 'Ð', basePrice: 0.08 },
  { symbol: 'DOTUSDT', name: 'Polkadot', icon: '●', basePrice: 7.2 },
];

// Strategy options
const strategies: { id: BotStrategy; name: string; tag: string; description: string; icon: React.ReactNode }[] = [
  { 
    id: 'trend', name: 'Trend Following', tag: 'AI-Powered',
    description: 'Identifies and follows market trends using advanced technical indicators and machine learning',
    icon: <TrendingUp className="h-5 w-5 text-primary" />
  },
  { 
    id: 'grid', name: 'Grid Trading', tag: 'Automated',
    description: 'Places buy and sell orders at predetermined price intervals to profit from market volatility',
    icon: <Grid3X3 className="h-5 w-5 text-primary" />
  },
  { 
    id: 'arbitrage', name: 'Arbitrage', tag: 'Multi-Exchange',
    description: 'Exploits price differences across multiple exchanges for risk-free profit opportunities',
    icon: <ArrowUpDown className="h-5 w-5 text-primary" />
  },
];

type RiskLevel = 'low' | 'medium' | 'high';

const riskConfig: Record<RiskLevel, { label: string; range: string; maxPos: string; stopLoss: string; takeProfit: string; estReturn: string; winRate: string; drawdown: string }> = {
  low:    { label: 'Low',    range: '1-2%', maxPos: '2% per trade', stopLoss: '1.5%', takeProfit: '3.0%', estReturn: '+5-8%', winRate: '~65%', drawdown: '-3.2%' },
  medium: { label: 'Medium', range: '3-5%', maxPos: '5% per trade', stopLoss: '3%',   takeProfit: '6%',   estReturn: '+8-15%', winRate: '~55%', drawdown: '-8%' },
  high:   { label: 'High',   range: '6-10%', maxPos: '10% per trade', stopLoss: '5%',  takeProfit: '10%',  estReturn: '+15-30%', winRate: '~45%', drawdown: '-15%' },
};

export default function CreateBot() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentBalance, accountType, updateBalance, user } = useAccount();

  const [botName, setBotName] = useState('BTC Master Bot');
  const [selectedPair, setSelectedPair] = useState(tradingPairs[0]);
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<BotStrategy>('trend');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('low');
  const [investmentAmount, setInvestmentAmount] = useState('1000');
  const [tradingFrequency, setTradingFrequency] = useState('24');
  const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');
  const [isDeploying, setIsDeploying] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPairDropdownOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const risk = riskConfig[riskLevel];
  const strategyInfo = strategies.find(s => s.id === selectedStrategy)!;

  const handleDeploy = async () => {
    const amount = parseFloat(investmentAmount);
    if (!amount || amount < 1) {
      toast({ title: 'Invalid Amount', description: 'Minimum investment is $1', variant: 'destructive' });
      return;
    }
    if (amount > currentBalance) {
      toast({ title: 'Insufficient Balance', description: `You need $${amount} but have $${currentBalance.toFixed(2)}`, variant: 'destructive' });
      return;
    }

    setIsDeploying(true);

    // Simulate deployment delay
    await new Promise(r => setTimeout(r, 2000));

    toast({
      title: 'Bot Deployed',
      description: `${botName} is now trading ${selectedPair.symbol} with ${strategyInfo.name} strategy`,
    });

    setIsDeploying(false);
    navigate('/bot');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/bot')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg text-foreground">AI Trading Bot Creator</h1>
        </div>
      </header>

      <main className="px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-4">
            {/* LEFT PANEL */}
            <div className="space-y-4 md:border-r md:border-border/50 md:pr-4">
              {/* Bot Name */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Bot Name</label>
                <Input
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="My Trading Bot"
                  className="bg-card border-border"
                />
              </div>

              {/* Trading Pair Select */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Trading Pair</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setPairDropdownOpen(!pairDropdownOpen)}
                    className="w-full flex items-center justify-between p-2.5 bg-card border border-border rounded-md text-sm text-foreground hover:border-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedPair.icon}</span>
                      <div className="text-left">
                        <p className="font-medium">{selectedPair.symbol}</p>
                        <p className="text-xs text-muted-foreground">Spot Trading</p>
                      </div>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", pairDropdownOpen && "rotate-180 text-primary")} />
                  </button>

                  {pairDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto z-20">
                      {tradingPairs.map((pair) => (
                        <button
                          key={pair.symbol}
                          onClick={() => { setSelectedPair(pair); setPairDropdownOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2 p-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors",
                            selectedPair.symbol === pair.symbol && "bg-muted/50"
                          )}
                        >
                          <span className="text-lg">{pair.icon}</span>
                          <span className="font-medium">{pair.symbol}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Strategy Selection */}
              <div>
                <h3 className="text-base font-semibold text-foreground mb-3">Strategy Type</h3>
                <div className="space-y-2">
                  {strategies.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStrategy(s.id)}
                      className={cn(
                        "w-full text-left p-3 bg-card border rounded-md transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary relative overflow-hidden",
                        selectedStrategy === s.id
                          ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]"
                          : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {s.icon}
                        <div>
                          <p className="font-semibold text-sm text-foreground">{s.name}</p>
                          <span className="text-[11px] text-muted-foreground">{s.tag}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                      {/* Selected badge */}
                      <span className={cn(
                        "absolute top-0 right-0 px-2 py-0.5 text-[11px] font-medium bg-primary text-primary-foreground transition-opacity",
                        selectedStrategy === s.id ? "opacity-100" : "opacity-0"
                      )}>
                        Selected
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="space-y-4 md:pl-4">
              {/* Tabs */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab('config')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    activeTab === 'config'
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:text-primary"
                  )}
                >
                  <Settings2 className="h-4 w-4 inline mr-1" />
                  Configuration
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    activeTab === 'preview'
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:text-primary"
                  )}
                >
                  <Eye className="h-4 w-4 inline mr-1" />
                  Preview
                </button>
              </div>

              {/* Config Tab */}
              {activeTab === 'config' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <h4 className="text-sm font-semibold text-foreground">Risk Management</h4>

                  {/* Risk Selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {(['low', 'medium', 'high'] as RiskLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setRiskLevel(level)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 border text-sm font-medium rounded-md transition-all",
                          riskLevel === level
                            ? level === 'low'
                              ? "bg-success text-success-foreground border-success"
                              : level === 'medium'
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-destructive text-destructive-foreground border-destructive"
                            : "border-border text-muted-foreground hover:border-primary"
                        )}
                      >
                        <span className="font-semibold capitalize">{level}</span>
                        <span className="text-[11px] opacity-80">{riskConfig[level].range}</span>
                      </button>
                    ))}
                  </div>

                  {/* Risk Info */}
                  <div className="space-y-2">
                    {[
                      { label: 'Max Position Size', value: risk.maxPos },
                      { label: 'Stop Loss', value: risk.stopLoss },
                      { label: 'Take Profit', value: risk.takeProfit },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Investment Amount */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Investment Amount</label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={investmentAmount}
                        onChange={(e) => {
                          if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                            setInvestmentAmount(e.target.value);
                          }
                        }}
                        className="bg-card border-border pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">USDT</span>
                    </div>
                  </div>

                  {/* Trading Frequency */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Trading Frequency</label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={tradingFrequency}
                        onChange={(e) => {
                          if (e.target.value === '' || /^\d*$/.test(e.target.value)) {
                            setTradingFrequency(e.target.value);
                          }
                        }}
                        className="bg-card border-border pr-24"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">trades/day</span>
                    </div>
                  </div>

                  {/* Deploy Button */}
                  <Button
                    onClick={handleDeploy}
                    disabled={isDeploying || !botName.trim()}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    {isDeploying ? 'Deploying...' : 'Deploy Bot'}
                  </Button>
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === 'preview' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <div className="p-4 rounded-md bg-card border border-border space-y-3">
                    <h4 className="font-semibold text-foreground">Bot Configuration Summary</h4>
                    <div className="space-y-2">
                      {[
                        { label: 'Bot Name', value: botName || 'My Trading Bot' },
                        { label: 'Trading Pair', value: selectedPair.symbol },
                        { label: 'Strategy', value: strategyInfo.name },
                        { label: 'Risk Level', value: `${risk.label} (${risk.range})` },
                        { label: 'Investment', value: `${investmentAmount || '0'} USDT` },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-foreground">{item.value}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <span className="font-medium text-success">Ready to Deploy</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-md bg-card border border-border space-y-3">
                    <h4 className="font-semibold text-foreground">Expected Performance</h4>
                    <div className="space-y-2">
                      {[
                        { label: 'Est. Monthly Return', value: risk.estReturn, highlight: true },
                        { label: 'Win Rate', value: risk.winRate },
                        { label: 'Avg. Trade Duration', value: '4.5 hours' },
                        { label: 'Max Drawdown', value: risk.drawdown },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className={cn("font-medium", 'highlight' in item && item.highlight ? "text-success" : "text-foreground")}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleDeploy}
                    disabled={isDeploying || !botName.trim()}
                    className="w-full h-11 bg-success hover:bg-success/90 text-success-foreground font-semibold"
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    {isDeploying ? 'Deploying...' : 'Deploy Bot Now'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
