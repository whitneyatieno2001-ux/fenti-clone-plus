import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  User, Settings, Shield, CreditCard, HelpCircle, LogOut, 
  ChevronRight, Bell, Lock, History, RefreshCw, ScanFace,
  Star, UserPlus, Coins, ArrowDownToLine, Edit
} from 'lucide-react';

const shortcuts = [
  { icon: Star, label: 'Rewards Hub', path: '/dashboard' },
  { icon: UserPlus, label: 'Referral', path: '/dashboard' },
  { icon: Coins, label: 'Earn', path: '/dashboard' },
  { icon: ArrowDownToLine, label: 'Deposit', path: '/dashboard' },
  { icon: Edit, label: 'Edit', path: '/settings' },
];

const recommendItems = [
  { icon: Coins, label: 'Earn', path: '/dashboard' },
  { icon: UserPlus, label: 'Referral', path: '/dashboard' },
  { icon: Star, label: 'Rewards', path: '/dashboard' },
  { icon: RefreshCw, label: 'Convert', path: '/trade' },
];

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

  const isVerified = userEmail === 'whitneyatieno86@gmail.com';

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
        {/* Profile Header - Binance style */}
        <div className="flex items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground font-bold text-2xl">
            {userName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{userName || 'User'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded border border-primary/30 text-primary font-medium">
                Regular
              </span>
              {isVerified && (
                <span className="text-xs px-2 py-0.5 rounded border border-success/30 text-success font-medium">
                  Verified
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="h-px bg-border" />

        {/* Shortcut Section */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-4">Shortcut</h3>
          <div className="grid grid-cols-4 gap-4">
            {shortcuts.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <span className="text-xs text-foreground font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4">
            {shortcuts.slice(4).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <span className="text-xs text-foreground font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recommend Section */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-4">Recommend</h3>
          <div className="grid grid-cols-4 gap-4">
            {recommendItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <span className="text-xs text-foreground font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* More Services */}
        <button
          onClick={() => {}}
          className="w-full py-3 rounded-full bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          More Services
        </button>

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
