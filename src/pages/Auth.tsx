import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import cryptoWaveLogo from '@/assets/crypto-wave-logo-transparent.png';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const navigate = useNavigate();
  const { login, signup, isLoggedIn } = useAccount();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/dashboard');
    }
  }, [isLoggedIn, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; name?: string } = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (mode === 'signup') {
      try {
        nameSchema.parse(name);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.name = e.errors[0].message;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let result;
      
      if (mode === 'login') {
        result = await login(email, password);
      } else {
        result = await signup(email, password, name);
      }

      if (result.success) {
        toast({
          title: mode === 'login' ? "Welcome Back!" : "Account Created!",
          description: mode === 'login' ? "You have successfully logged in" : "Your account has been created with $10,000 demo balance",
        });
        navigate('/dashboard');
      } else {
        toast({
          title: "Error",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={cryptoWaveLogo} 
            alt="Crypto Wave" 
            className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-lg"
          />
          <h1 className="text-2xl font-bold font-display text-foreground">Welcome to Crypto Wave</h1>
          <p className="text-muted-foreground mt-1">Your trusted platform for cryptocurrency trading</p>
        </div>

        {/* Toggle */}
        <div className="flex bg-secondary rounded-xl p-1 mb-6">
          <button
            onClick={() => setMode('login')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold rounded-lg transition-all",
              mode === 'login'
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Login
          </button>
          <button
            onClick={() => setMode('signup')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold rounded-lg transition-all",
              mode === 'signup'
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">
              {mode === 'login' ? 'Login to your account' : 'Create your account'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {mode === 'login' 
                ? 'Enter your email and password to access your account' 
                : 'Start with $10,000 demo balance to practice trading'}
            </p>
          </div>

          {mode === 'signup' && (
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn("pl-10 h-12 bg-input border-border", errors.name && "border-destructive")}
                />
              </div>
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>
          )}

          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn("pl-10 h-12 bg-input border-border", errors.email && "border-destructive")}
                required
              />
            </div>
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn("pl-10 pr-10 h-12 bg-input border-border", errors.password && "border-destructive")}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
          </div>

          {mode === 'login' && (
            <div className="text-right">
              <button type="button" className="text-sm text-primary hover:underline">
                Forgot password?
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {mode === 'login' ? 'Logging in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'login' ? 'Login' : 'Create Account'
            )}
          </Button>
        </form>

        {/* Terms */}
        {mode === 'signup' && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            By creating an account, you agree to our{' '}
            <button className="text-primary hover:underline">Terms of Service</button>
            {' '}and{' '}
            <button className="text-primary hover:underline">Privacy Policy</button>
          </p>
        )}
      </div>
    </div>
  );
}
