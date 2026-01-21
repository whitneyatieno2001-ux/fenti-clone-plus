import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Bell, TrendingUp, Wallet, Gift, MessageSquare, AlertTriangle
} from 'lucide-react';

export default function Notifications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    priceAlerts: true,
    tradeNotifications: true,
    depositWithdrawal: true,
    promotions: false,
    news: true,
    security: true,
  });

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: value ? "Enabled" : "Disabled",
      description: `Notification setting has been updated`,
    });
  };

  const notificationItems = [
    { 
      key: 'priceAlerts' as const, 
      icon: TrendingUp, 
      title: 'Price Alerts', 
      description: 'Get notified when prices hit your targets' 
    },
    { 
      key: 'tradeNotifications' as const, 
      icon: Bell, 
      title: 'Trade Notifications', 
      description: 'Updates on your open trades' 
    },
    { 
      key: 'depositWithdrawal' as const, 
      icon: Wallet, 
      title: 'Deposit & Withdrawal', 
      description: 'Transaction confirmations' 
    },
    { 
      key: 'promotions' as const, 
      icon: Gift, 
      title: 'Promotions', 
      description: 'Special offers and bonuses' 
    },
    { 
      key: 'news' as const, 
      icon: MessageSquare, 
      title: 'Market News', 
      description: 'Important market updates' 
    },
    { 
      key: 'security' as const, 
      icon: AlertTriangle, 
      title: 'Security Alerts', 
      description: 'Login and security notifications' 
    },
  ];

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
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">Manage your notification preferences</p>
        </div>

        {/* Notification Settings */}
        <div className="space-y-3">
          {notificationItems.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.key}
                className="p-4 rounded-xl bg-card border border-border/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings[item.key]} 
                    onCheckedChange={(value) => handleToggle(item.key, value)} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
