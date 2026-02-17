import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getTradeOutcome } from '@/lib/tradeOutcome';
import { supabase } from '@/integrations/supabase/client';
import { getCoinIcon } from '@/data/coinIcons';
import {
  Bot, Upload, Settings2, Play, Square, Trash2,
  ChevronDown, Plus, ScrollText
} from 'lucide-react';
import { useTradingSound } from '@/hooks/useTradingSound';

const tradingAssets = [
  { symbol: 'BTCUSDT', name: 'BTC/USD', basePrice: 98000 },
  { symbol: 'ETHUSDT', name: 'ETH/USD', basePrice: 3400 },
  { symbol: 'SOLUSDT', name: 'SOL/USD', basePrice: 180 },
  { symbol: 'BNBUSDT', name: 'BNB/USD', basePrice: 580 },
  { symbol: 'XRPUSDT', name: 'XRP/USD', basePrice: 0.52 },
  { symbol: 'ADAUSDT', name: 'ADA/USD', basePrice: 0.45 },
  { symbol: 'DOGEUSDT', name: 'DOGE/USD', basePrice: 0.08 },
];

const tradeIntervals = [
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '2 minutes', value: 120000 },
  { label: '5 minutes', value: 300000 },
];

const USD_FLAG = 'https://flagcdn.com/w40/us.png';

interface TradeLog {
  id: string;
  time: Date;
  asset: string;
  direction: 'BUY' | 'SELL';
  stake: number;
  result: 'WIN' | 'LOSS';
  profit: number;
  botName: string;
}

interface MyBot {
  id: string;
  name: string;
  strategy: string;
  asset: typeof tradingAssets[0];
  tradeAmount: number;
  interval: number;
  status: 'idle' | 'running';
  totalPL: number;
  trades: number;
  wins: number;
  payoutPercent: number;
  source: 'upload';
}

const ALLOWED_XML_BOTS = ['Crypto Printer Bot', 'Speed Scalper Bot'];

function parseXmlBot(xmlText: string): { name: string; symbol: string; strategy: string } | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const name = doc.querySelector('Name')?.textContent || '';
    const symbol = doc.querySelector('Symbol')?.textContent || 'BTCUSDT';
    const strategy = doc.querySelector('StrategyType')?.textContent || 'Trend';
    if (!ALLOWED_XML_BOTS.includes(name)) return null;
    return { name, symbol, strategy };
  } catch {
    return null;
  }
}

export default function BotPage() {
  const navigate = useNavigate();
  const { currentBalance, accountType, updateBalance, user, userEmail } = useAccount();
  const { toast } = useToast();
  const { playTradeSound } = useTradingSound();

  const [tradeAmount, setTradeAmount] = useState('10');
  const [selectedInterval, setSelectedInterval] = useState(tradeIntervals[1]);
  const [selectedAsset, setSelectedAsset] = useState(tradingAssets[0]);
  const [intervalOpen, setIntervalOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const [myBots, setMyBots] = useState<MyBot[]>([]);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const botIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use refs to avoid stale closures in executeTrade
  const myBotsRef = useRef<MyBot[]>([]);
  const balanceRef = useRef(currentBalance);
  const accountTypeRef = useRef(accountType);
  const userEmailRef = useRef(userEmail);
  const userRef = useRef(user);

  useEffect(() => { myBotsRef.current = myBots; }, [myBots]);
  useEffect(() => { balanceRef.current = currentBalance; }, [currentBalance]);
  useEffect(() => { accountTypeRef.current = accountType; }, [accountType]);
  useEffect(() => { userEmailRef.current = userEmail; }, [userEmail]);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    return () => {
      botIntervalsRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xml')) {
      toast({ title: 'Invalid File', description: 'Please upload an XML bot file', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const xmlText = ev.target?.result as string;
      const parsed = parseXmlBot(xmlText);
      if (!parsed) {
        toast({ title: 'Unsupported Bot', description: 'Only Crypto Printer Bot and Speed Scalper Bot are supported', variant: 'destructive' });
        return;
      }
      const matchAsset = tradingAssets.find(a => a.symbol === parsed.symbol) || tradingAssets[0];
      const newBot: MyBot = {
        id: Date.now().toString(),
        name: parsed.name,
        strategy: parsed.strategy.toLowerCase().includes('scalp') ? 'scalping' : 'trend',
        asset: matchAsset,
        tradeAmount: parseFloat(tradeAmount) || 10,
        interval: selectedInterval.value,
        status: 'idle',
        totalPL: 0,
        trades: 0,
        wins: 0,
        payoutPercent: 55,
        source: 'upload',
      };
      setMyBots(prev => [...prev, newBot]);
      toast({ title: 'Bot Uploaded!', description: `${parsed.name} has been loaded successfully` });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const stopBot = useCallback((botId: string) => {
    const timeout = botIntervalsRef.current.get(botId);
    if (timeout) { clearTimeout(timeout); botIntervalsRef.current.delete(botId); }
    setMyBots(prev => prev.map(b => b.id === botId ? { ...b, status: 'idle' as const } : b));
  }, []);

  const executeTrade = useCallback(async (botId: string) => {
    const bot = myBotsRef.current.find(b => b.id === botId);
    if (!bot) return;

    const bal = balanceRef.current;
    if (bal < bot.tradeAmount) {
      stopBot(botId);
      toast({ title: 'Insufficient Balance', description: 'Bot stopped due to low balance', variant: 'destructive' });
      return;
    }

    const outcome = getTradeOutcome({ accountType: accountTypeRef.current, userEmail: userEmailRef.current });
    const isWin = outcome === 'win';

    // XML bots use payout percentage of stake (55%)
    const payoutAmount = bot.tradeAmount * (bot.payoutPercent / 100);
    const actualProfit = isWin ? payoutAmount : -payoutAmount;

    // Generate display prices
    const buyPrice = bot.asset.basePrice * (1 + (Math.random() - 0.5) * 0.01);
    const priceMove = buyPrice * (0.001 + Math.random() * 0.005);
    const sellPrice = isWin ? buyPrice + priceMove : buyPrice - priceMove;

    // Play trading sound
    playTradeSound(isWin);

    const currentUser = userRef.current;
    const acctType = accountTypeRef.current;
    if (currentUser && acctType !== 'binance') {
      const operation = actualProfit > 0 ? 'add' : 'subtract';
      const ok = await updateBalance(acctType, Math.abs(actualProfit), operation as 'add' | 'subtract');
      if (!ok) {
        stopBot(botId);
        toast({ title: 'Balance update failed', description: 'Bot stopped', variant: 'destructive' });
        return;
      }

      try {
        await supabase.from('transactions').insert({
          user_id: currentUser.id, type: 'bot_trade', amount: Math.abs(actualProfit),
          currency: 'USD', status: 'completed',
          description: `${bot.name} - ${isWin ? 'WIN' : 'LOSS'}: ${actualProfit >= 0 ? '+' : ''}$${actualProfit.toFixed(4)} on ${bot.asset.symbol}`,
          account_type: acctType, profit_loss: actualProfit,
        });
      } catch (err) { console.error(err); }
    }

    const log: TradeLog = {
      id: Date.now().toString(), time: new Date(), asset: bot.asset.symbol,
      direction: isWin ? 'BUY' : 'SELL', stake: bot.tradeAmount,
      result: isWin ? 'WIN' : 'LOSS', profit: actualProfit, botName: bot.name,
    };
    setTradeLogs(prev => [log, ...prev].slice(0, 100));

    setMyBots(prev => prev.map(b =>
      b.id === botId
        ? { ...b, totalPL: b.totalPL + actualProfit, trades: b.trades + 1, wins: b.wins + (isWin ? 1 : 0) }
        : b
    ));
  }, [stopBot, updateBalance, toast, playTradeSound]);

  const startBot = useCallback((botId: string) => {
    const bot = myBots.find(b => b.id === botId);
    if (!bot) return;
    if (currentBalance < bot.tradeAmount) {
      toast({ title: 'Insufficient Balance', description: `You need at least $${bot.tradeAmount}`, variant: 'destructive' });
      return;
    }
    setMyBots(prev => prev.map(b => b.id === botId ? { ...b, status: 'running' as const } : b));
    // Use a recursive setTimeout for continuous trading with varied delays
    const scheduleNext = () => {
      const timeout = setTimeout(async () => {
        const currentBot = myBotsRef.current.find(b => b.id === botId);
        if (!currentBot || currentBot.status !== 'running') return;
        await executeTrade(botId);
        // Schedule next trade only if still running
        const stillRunning = myBotsRef.current.find(b => b.id === botId);
        if (stillRunning?.status === 'running') {
          scheduleNext();
        }
      }, 3000 + Math.random() * 2000);
      botIntervalsRef.current.set(botId, timeout);
    };
    // Execute first trade immediately
    executeTrade(botId);
    scheduleNext();
    toast({ title: 'Bot Started', description: `${bot.name} is now trading continuously` });
  }, [myBots, currentBalance, executeTrade, toast]);

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
        <Button onClick={() => navigate('/create-bot')}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base">
          <Plus className="h-5 w-5 mr-2" />Create Custom Bot
        </Button>

        {/* Upload Your Trading Bot */}
        <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Upload Your Trading Bot</h2>
          </div>
          <input ref={fileInputRef} type="file" accept=".xml" className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full p-8 rounded-lg border-2 border-dashed border-border/70 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors">
            <Bot className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click to upload XML bot file</p>
            <p className="text-xs text-muted-foreground">Supports: Crypto Printer Bot, Speed Scalper Bot</p>
          </button>
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

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Trade Amount ($ min. $10)</label>
            <Input type="text" inputMode="decimal" value={tradeAmount}
              onChange={(e) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setTradeAmount(e.target.value); }}
              placeholder="10" className="bg-card border-border" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Trade Interval</label>
            <div className="relative">
              <button onClick={() => setIntervalOpen(!intervalOpen)} className="w-full flex items-center justify-between p-2.5 bg-card border border-border rounded-md text-sm text-foreground hover:border-primary transition-colors">
                <span>{selectedInterval.label}</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", intervalOpen && "rotate-180")} />
              </button>
              {intervalOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-md shadow-lg z-20">
                  {tradeIntervals.map((item) => (
                    <button key={item.value} onClick={() => { setSelectedInterval(item); setIntervalOpen(false); }}
                      className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors", selectedInterval.value === item.value ? "text-primary font-medium" : "text-foreground")}>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Trading Asset</label>
            <div className="relative">
              <button onClick={() => setAssetOpen(!assetOpen)} className="w-full flex items-center justify-between p-3 bg-card border border-border rounded-md text-sm text-foreground hover:border-primary transition-colors">
                <div className="flex items-center gap-2">
                  <div className="flex items-center -space-x-1">
                    <img src={getCoinIcon(selectedAsset.symbol.replace('USDT', ''))} alt="" className="w-6 h-6 rounded-full border-2 border-card z-10" />
                    <img src={USD_FLAG} alt="USD" className="w-6 h-6 rounded-full border-2 border-card" />
                  </div>
                  <span className="font-medium ml-1">{selectedAsset.name}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", assetOpen && "rotate-180")} />
              </button>
              {assetOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto z-20">
                  {tradingAssets.map((asset) => (
                    <button key={asset.symbol} onClick={() => { setSelectedAsset(asset); setAssetOpen(false); }}
                      className={cn("w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors", selectedAsset.symbol === asset.symbol ? "text-primary font-medium" : "text-foreground")}>
                      <div className="flex items-center -space-x-1">
                        <img src={getCoinIcon(asset.symbol.replace('USDT', ''))} alt="" className="w-6 h-6 rounded-full border-2 border-card z-10" />
                        <img src={USD_FLAG} alt="USD" className="w-6 h-6 rounded-full border-2 border-card" />
                      </div>
                      <span className="font-medium">{asset.name}</span>
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
                    <img src={getCoinIcon(bot.asset.symbol.replace('USDT', ''))} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <h3 className="font-semibold text-foreground">{bot.name}</h3>
                      <p className="text-xs text-muted-foreground">{bot.asset.name} • {bot.payoutPercent}% payout</p>
                    </div>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium",
                    bot.status === 'running' ? "bg-success/20 text-success" : "bg-muted text-muted-foreground")}>
                    {bot.status}
                  </span>
                </div>

                {bot.trades > 0 && (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                      <p className="font-semibold text-foreground">{((bot.wins / bot.trades) * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total P/L</p>
                      <p className={cn("font-semibold", bot.totalPL >= 0 ? "text-success" : "text-destructive")}>
                        ${bot.totalPL.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Trades</p>
                      <p className="font-semibold text-foreground">{bot.trades}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {bot.status === 'idle' ? (
                    <Button onClick={() => startBot(bot.id)} className="bg-success hover:bg-success/90 text-success-foreground" size="sm">
                      <Play className="h-4 w-4 mr-1" />Start
                    </Button>
                  ) : (
                    <Button onClick={() => stopBot(bot.id)} variant="destructive" size="sm">
                      <Square className="h-4 w-4 mr-1" />Stop
                    </Button>
                  )}
                  <Button onClick={() => deleteBot(bot.id)} variant="outline" size="sm" disabled={bot.status === 'running'}>
                    <Trash2 className="h-4 w-4 mr-1" />Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Positions Panel - like screenshot 3 */}
        {tradeLogs.length > 0 && (
          <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-border/30">
              <button className="flex-1 py-3 text-sm font-medium text-foreground bg-muted/30">
                All ({tradeLogs.length})
              </button>
              <button className="flex-1 py-3 text-sm font-medium text-muted-foreground">
                Positions ({tradeLogs.length})
              </button>
              <button className="flex-1 py-3 text-sm font-medium text-muted-foreground">
                Orders (0)
              </button>
            </div>

            {/* Total P&L */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-muted-foreground">$</span>
                <span className="text-sm font-medium text-foreground">Total P&L</span>
              </div>
              {(() => {
                const totalPL = tradeLogs.reduce((sum, l) => sum + l.profit, 0);
                const wins = tradeLogs.filter(l => l.result === 'WIN').length;
                const losses = tradeLogs.filter(l => l.result === 'LOSS').length;
                return (
                  <span className={cn("text-lg font-bold", totalPL >= 0 ? "text-success" : "text-destructive")}>
                    {totalPL >= 0 ? '' : '-'}${Math.abs(totalPL).toFixed(2)}
                  </span>
                );
              })()}
            </div>
            <div className="px-4 pb-2">
              <span className="text-xs text-muted-foreground">
                {tradeLogs.filter(l => l.result === 'WIN').length} winning /{tradeLogs.filter(l => l.result === 'LOSS').length} losing trades
              </span>
            </div>

            {/* Position rows */}
            <div className="max-h-64 overflow-y-auto">
              {tradeLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-4 py-3 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                      log.direction === 'BUY' ? "bg-success/10" : "bg-destructive/10")}>
                      <span className={cn("text-sm font-bold", log.direction === 'BUY' ? "text-success" : "text-destructive")}>
                        {log.direction === 'BUY' ? '↗' : '↘'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{log.asset.replace('USDT', 'USD')}</p>
                      <p className="text-xs text-muted-foreground">0.01 • {log.direction}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className={cn("text-sm font-semibold", log.profit >= 0 ? "text-success" : "text-destructive")}>
                        {log.profit >= 0 ? '+' : '-'}${Math.abs(log.profit).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">@ {log.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
      <BottomNav />
    </div>
  );
}
