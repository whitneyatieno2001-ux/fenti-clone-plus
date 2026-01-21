import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { 
  ArrowLeft, Globe, Moon, Sun, Volume2, Vibrate, 
  Languages, DollarSign, Clock
} from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    sound: true,
    vibration: true,
  });
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('English');

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Setting Updated",
      description: `${key.charAt(0).toUpperCase() + key.slice(1)} has been ${value ? 'enabled' : 'disabled'}`,
    });
  };

  const currencies = ['USD', 'EUR', 'GBP', 'KES'];
  const languages = ['English', 'Swahili', 'French', 'Spanish'];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-4">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Profile</span>
        </button>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Customize your app experience</p>
        </div>

        {/* Appearance */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
          
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5 text-primary" />
                  ) : (
                    <Sun className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Toggle dark/light theme</p>
                </div>
              </div>
              <Switch 
                checked={theme === 'dark'} 
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} 
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
          
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Currency</p>
                  <p className="text-sm text-muted-foreground">Display currency</p>
                </div>
              </div>
              <select 
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  toast({ title: "Currency Updated", description: `Currency set to ${e.target.value}` });
                }}
                className="bg-secondary text-foreground rounded-lg px-3 py-1 text-sm border border-border"
              >
                {currencies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Languages className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Language</p>
                  <p className="text-sm text-muted-foreground">App language</p>
                </div>
              </div>
              <select 
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  toast({ title: "Language Updated", description: `Language set to ${e.target.value}` });
                }}
                className="bg-secondary text-foreground rounded-lg px-3 py-1 text-sm border border-border"
              >
                {languages.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Timezone</p>
                  <p className="text-sm text-muted-foreground">Africa/Nairobi (EAT)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sound & Haptics */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Sound & Haptics</h2>
          
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Volume2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Sound Effects</p>
                  <p className="text-sm text-muted-foreground">Play sounds on actions</p>
                </div>
              </div>
              <Switch 
                checked={settings.sound} 
                onCheckedChange={(value) => handleToggle('sound', value)} 
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Vibrate className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Vibration</p>
                  <p className="text-sm text-muted-foreground">Haptic feedback</p>
                </div>
              </div>
              <Switch 
                checked={settings.vibration} 
                onCheckedChange={(value) => handleToggle('vibration', value)} 
              />
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="pt-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Crypto Wave v1.0.0</p>
          <p className="text-xs text-muted-foreground">© 2024 Crypto Wave. All rights reserved.</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
