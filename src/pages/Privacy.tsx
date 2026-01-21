import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Eye, UserX, Database, Share2, FileText, Trash2
} from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    profileVisibility: false,
    activityStatus: true,
    dataSharing: false,
  });

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Setting Updated",
      description: `Your privacy setting has been updated`,
    });
  };

  const handleDownloadData = () => {
    toast({
      title: "Request Submitted",
      description: "Your data export will be ready within 24 hours",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Contact Support",
      description: "Please contact support to delete your account",
      variant: "destructive",
    });
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
          <h1 className="text-2xl font-bold text-foreground">Privacy</h1>
          <p className="text-muted-foreground">Control your privacy settings</p>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Profile Visibility</p>
                  <p className="text-sm text-muted-foreground">Allow others to see your profile</p>
                </div>
              </div>
              <Switch 
                checked={settings.profileVisibility} 
                onCheckedChange={(value) => handleToggle('profileVisibility', value)} 
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserX className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Activity Status</p>
                  <p className="text-sm text-muted-foreground">Show when you're online</p>
                </div>
              </div>
              <Switch 
                checked={settings.activityStatus} 
                onCheckedChange={(value) => handleToggle('activityStatus', value)} 
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Data Sharing</p>
                  <p className="text-sm text-muted-foreground">Share data for personalization</p>
                </div>
              </div>
              <Switch 
                checked={settings.dataSharing} 
                onCheckedChange={(value) => handleToggle('dataSharing', value)} 
              />
            </div>
          </div>
        </div>

        {/* Data Actions */}
        <div className="space-y-3 pt-4">
          <h2 className="text-lg font-semibold text-foreground">Your Data</h2>
          
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Download Your Data</p>
                  <p className="text-sm text-muted-foreground">Get a copy of your data</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadData}>
                Download
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Privacy Policy</p>
                  <p className="text-sm text-muted-foreground">Read our privacy policy</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                View
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-destructive/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account</p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
