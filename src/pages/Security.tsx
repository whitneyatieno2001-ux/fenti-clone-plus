import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Shield, Lock, Smartphone, Eye, EyeOff, Key
} from 'lucide-react';

export default function Security() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [twoFactor, setTwoFactor] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handleTwoFactorToggle = (enabled: boolean) => {
    setTwoFactor(enabled);
    toast({
      title: enabled ? "2FA Enabled" : "2FA Disabled",
      description: enabled 
        ? "Two-factor authentication is now active" 
        : "Two-factor authentication has been turned off",
    });
  };

  const handleBiometricToggle = (enabled: boolean) => {
    setBiometric(enabled);
    toast({
      title: enabled ? "Biometric Enabled" : "Biometric Disabled",
      description: enabled 
        ? "You can now use fingerprint/face to login" 
        : "Biometric login has been turned off",
    });
  };

  const handleChangePassword = () => {
    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }
    if (passwords.new.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Password Updated",
      description: "Your password has been changed successfully",
    });
    setShowChangePassword(false);
    setPasswords({ current: '', new: '', confirm: '' });
  };

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
          <h1 className="text-2xl font-bold text-foreground">Security</h1>
          <p className="text-muted-foreground">Protect your account</p>
        </div>

        {/* Security Options */}
        <div className="space-y-3">
          {/* Two Factor */}
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                </div>
              </div>
              <Switch checked={twoFactor} onCheckedChange={handleTwoFactorToggle} />
            </div>
          </div>

          {/* Biometric */}
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Biometric Login</p>
                  <p className="text-sm text-muted-foreground">Use fingerprint or face ID</p>
                </div>
              </div>
              <Switch checked={biometric} onCheckedChange={handleBiometricToggle} />
            </div>
          </div>

          {/* Change Password */}
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Change Password</p>
                  <p className="text-sm text-muted-foreground">Update your password</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowChangePassword(true)}>
                Change
              </Button>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Active Sessions</p>
                <p className="text-sm text-muted-foreground">Manage your logged in devices</p>
              </div>
            </div>
            <div className="pl-13 space-y-2">
              <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-secondary/50">
                <span className="text-foreground">Current Device</span>
                <span className="text-primary">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        {showChangePassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4">
              <h2 className="text-lg font-bold text-foreground">Change Password</h2>
              
              <div className="space-y-3">
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Current Password" 
                    value={passwords.current}
                    onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                  />
                </div>
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password" 
                  value={passwords.new}
                  onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                />
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm New Password" 
                    value={passwords.confirm}
                    onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowChangePassword(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleChangePassword}>
                  Update
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
