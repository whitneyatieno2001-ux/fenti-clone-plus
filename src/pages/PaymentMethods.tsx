import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, CreditCard, Plus, Smartphone, Building2, Trash2, Shield, ChevronRight
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'card' | 'mobile' | 'bank';
  name: string;
  details: string;
  isDefault: boolean;
}

export default function PaymentMethods() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: '1', type: 'mobile', name: 'M-Pesa', details: '+254 *** *** 890', isDefault: true },
  ]);

  const handleAddMethod = () => {
    toast({
      title: "Coming Soon",
      description: "Adding new payment methods will be available soon",
    });
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    setPaymentMethods(prev => prev.filter(m => m.id !== id));
    toast({
      title: "Payment Method Removed",
      description: "The payment method has been removed",
    });
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(prev => prev.map(m => ({
      ...m,
      isDefault: m.id === id
    })));
    toast({
      title: "Default Updated",
      description: "Default payment method has been updated",
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'card': return CreditCard;
      case 'mobile': return Smartphone;
      case 'bank': return Building2;
      default: return CreditCard;
    }
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
          <h1 className="text-2xl font-bold text-foreground">Payment Methods</h1>
          <p className="text-muted-foreground">Manage your payment options</p>
        </div>

        {/* KYC Banner */}
        <button
          onClick={() => navigate('/kyc')}
          className="w-full p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3 hover:bg-primary/15 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground text-sm">Complete KYC Verification</p>
            <p className="text-xs text-muted-foreground">Verify your identity to enable withdrawals and higher limits</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>

        {/* Payment Methods List */}
        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const Icon = getIcon(method.type);
            return (
              <div 
                key={method.id}
                className="p-4 rounded-xl bg-card border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{method.name}</p>
                      {method.isDefault && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{method.details}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(method.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                {!method.isDefault && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3 w-full"
                    onClick={() => handleSetDefault(method.id)}
                  >
                    Set as Default
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Payment Method Button */}
        <Button 
          onClick={() => setShowAddForm(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>

        {/* Add Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4">
              <h2 className="text-lg font-bold text-foreground">Add Payment Method</h2>
              
              <div className="grid grid-cols-3 gap-2">
                <button className="p-4 rounded-xl border border-primary bg-primary/10 flex flex-col items-center gap-2">
                  <Smartphone className="h-6 w-6 text-primary" />
                  <span className="text-xs text-foreground">Mobile Money</span>
                </button>
                <button className="p-4 rounded-xl border border-border flex flex-col items-center gap-2 opacity-50">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Card</span>
                </button>
                <button className="p-4 rounded-xl border border-border flex flex-col items-center gap-2 opacity-50">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Bank</span>
                </button>
              </div>

              <Input placeholder="Phone Number" type="tel" />

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddMethod}>
                  Add
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
