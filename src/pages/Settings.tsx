import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { useAccount } from '@/contexts/AccountContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, Moon, Sun, Volume2, Vibrate, 
  Languages, DollarSign, Clock, Link2, Unlink, Eye, EyeOff, Shield
} from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user } = useAccount();
  const [settings, setSettings] = useState({ sound: true, vibration: true });
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('English');
  
  // Binance connection
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadConnection = async () => {
      const { data } = await supabase
        .from('binance_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setIsConnected(data.is_connected);
        setMaskedKey(data.api_key_masked);
      }
    };
    loadConnection();
  }, [user]);

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({ title: "Setting Updated", description: `${key.charAt(0).toUpperCase() + key.slice(1)} ${value ? 'enabled' : 'disabled'}` });
  };

  const connectBinance = async () => {
    if (!user || !apiKey.trim() || !apiSecret.trim()) {
      toast({ title: 'Missing Fields', description: 'Please enter both API Key and Secret', variant: 'destructive' });
      return;
    }
    if (apiKey.length < 10 || apiSecret.length < 10) {
      toast({ title: 'Invalid Keys', description: 'API Key and Secret must be valid', variant: 'destructive' });
      return;
    }

    setConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke('binance-connect', {
        body: { apiKey, apiSecret },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsConnected(true);
      setMaskedKey(data.maskedKey || apiKey.substring(0, 6) + '****' + apiKey.substring(apiKey.length - 4));
      setApiKey('');
      setApiSecret('');
      toast({ title: 'Connected!', description: 'Binance account connected successfully' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Connection Failed', description: err.message || 'Please check your API keys', variant: 'destructive' });
    }
    setConnecting(false);
  };

  const disconnectBinance = async () => {
    if (!user) return;
    await supabase.from('binance_connections').delete().eq('user_id', user.id);
    setIsConnected(false);
    setMaskedKey('');
    toast({ title: 'Disconnected', description: 'Binance account disconnected' });
  };

  const currencies = ['USD', 'EUR', 'GBP', 'KES'];
  const languages = ['English', 'Swahili', 'French', 'Spanish'];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-4">
        <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" /><span>Back to Profile</span>
        </button>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Customize your app experience</p>
        </div>

        {/* Binance API Connection */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Binance Connection</h2>
          
          {isConnected ? (
            <div className="p-4 rounded-xl bg-card border border-success/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <Link2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Binance Connected</p>
                    <p className="text-sm text-muted-foreground">API Key: {maskedKey}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">Active</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Read-only access • Keys encrypted</span>
              </div>
              <Button onClick={disconnectBinance} variant="outline" size="sm" className="text-destructive border-destructive/30">
                <Unlink className="h-4 w-4 mr-1" />Disconnect
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Connect Binance</p>
                  <p className="text-sm text-muted-foreground">Link your Binance account</p>
                </div>
              </div>

              <div className="space-y-3 p-3 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
                <p className="font-medium text-foreground text-sm">How to get your API keys:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Log in to your Binance account</li>
                  <li>Go to API Management (Profile → API Management)</li>
                  <li>Create a new API key with <strong>Read-Only</strong> permissions</li>
                  <li>Copy both the API Key and Secret Key</li>
                  <li>Paste them below to connect</li>
                </ol>
                <p className="text-destructive font-medium">⚠️ Never enable withdrawal permissions on API keys shared with third-party apps.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">API Key</label>
                <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter your Binance API Key" className="bg-background border-border" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Secret Key</label>
                <div className="relative">
                  <Input type={showSecret ? 'text' : 'password'} value={apiSecret} onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your Binance Secret Key" className="bg-background border-border pr-10" />
                  <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button onClick={connectBinance} disabled={connecting || !apiKey.trim() || !apiSecret.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {connecting ? 'Connecting...' : 'Connect Binance Account'}
              </Button>
            </div>
          )}
        </div>

        {/* Appearance */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {theme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <p className="font-medium text-foreground">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Toggle dark/light theme</p>
                </div>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
                <div><p className="font-medium text-foreground">Currency</p><p className="text-sm text-muted-foreground">Display currency</p></div>
              </div>
              <select value={currency} onChange={(e) => { setCurrency(e.target.value); toast({ title: "Currency Updated" }); }}
                className="bg-secondary text-foreground rounded-lg px-3 py-1 text-sm border border-border">
                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Languages className="h-5 w-5 text-primary" /></div>
                <div><p className="font-medium text-foreground">Language</p><p className="text-sm text-muted-foreground">App language</p></div>
              </div>
              <select value={language} onChange={(e) => { setLanguage(e.target.value); toast({ title: "Language Updated" }); }}
                className="bg-secondary text-foreground rounded-lg px-3 py-1 text-sm border border-border">
                {languages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Clock className="h-5 w-5 text-primary" /></div>
              <div><p className="font-medium text-foreground">Timezone</p><p className="text-sm text-muted-foreground">Africa/Nairobi (EAT)</p></div>
            </div>
          </div>
        </div>

        {/* Sound & Haptics */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Sound & Haptics</h2>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Volume2 className="h-5 w-5 text-primary" /></div>
                <div><p className="font-medium text-foreground">Sound Effects</p><p className="text-sm text-muted-foreground">Play sounds on actions</p></div>
              </div>
              <Switch checked={settings.sound} onCheckedChange={(value) => handleToggle('sound', value)} />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Vibrate className="h-5 w-5 text-primary" /></div>
                <div><p className="font-medium text-foreground">Vibration</p><p className="text-sm text-muted-foreground">Haptic feedback</p></div>
              </div>
              <Switch checked={settings.vibration} onCheckedChange={(value) => handleToggle('vibration', value)} />
            </div>
          </div>
        </div>

        <div className="pt-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Crypto Wave v1.0.0</p>
          <p className="text-xs text-muted-foreground">© 2024 Crypto Wave. All rights reserved.</p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
