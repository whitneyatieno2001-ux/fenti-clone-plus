import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  User, Settings, Shield, CreditCard, HelpCircle, LogOut, 
  ChevronRight, Bell, Lock, History, RefreshCw, ScanFace
} from 'lucide-react';

const menuItems = [
  { icon: History, label: 'Transaction History', path: '/history' },
  { icon: CreditCard, label: 'Payment Methods', path: '/payments' },
  { icon: ScanFace, label: 'KYC Verification', path: '/kyc' },
  { icon: Shield, label: 'Security', path: '/security' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: Lock, label: 'Privacy', path: '/privacy' },
  { icon: HelpCircle, label: 'Help & Support', path: '/support' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    isLoggedIn, 
    logout, 
    userName, 
    userEmail, 
    demoBalance, 
    realBalance,
    accountType,
    resetDemo,
  } = useAccount();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleResetDemo = async () => {
    await resetDemo();
    toast({
      title: "Demo Reset",
      description: "Your demo balance has been reset to $10,000",
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Welcome to Crypto Wave</h2>
          <p className="text-muted-foreground text-center mb-6">Sign in to access your account and start trading</p>
          <Button 
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90 px-8"
          >
            Sign In
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground font-bold text-2xl">
            {userName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{userName || 'User'}</h2>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                accountType === 'demo' ? "bg-primary/20 text-primary" : "bg-success/20 text-success"
              )}>
                {accountType === 'demo' ? 'Demo Account' : 'Real Account'}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Demo Balance</p>
              <button 
                onClick={handleResetDemo}
                className="text-primary hover:text-primary/80"
                title="Reset Demo Balance"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <p className="text-lg font-bold text-foreground">
              ${demoBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Real Balance</p>
            <p className="text-lg font-bold text-foreground">
              ${realBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border/50 hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground">
          Crypto Wave v1.0.0
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
