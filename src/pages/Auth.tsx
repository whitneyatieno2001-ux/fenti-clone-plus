import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');
const phoneSchema = z.string().min(9, 'Please enter a valid phone number');

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string; phone?: string }>({});
  const navigate = useNavigate();
  const { login, signup, isLoggedIn } = useAccount();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/dashboard');
    }
  }, [isLoggedIn, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; name?: string; phone?: string } = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.email = e.errors[0].message;
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.password = e.errors[0].message;
    }

    if (mode === 'signup') {
      try {
        nameSchema.parse(name);
      } catch (e) {
        if (e instanceof z.ZodError) newErrors.name = e.errors[0].message;
      }
      try {
        phoneSchema.parse(phone);
      } catch (e) {
        if (e instanceof z.ZodError) newErrors.phone = e.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (mode === 'signup' && !agreed) {
      toast({ title: 'Agreement Required', description: 'Please agree to the Privacy Notice', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(email, password, phone);
      } else {
        result = await signup(email, password, name, phone);
      }

      if (result.success) {
        if (mode === 'signup') {
          toast({
            title: "Account Created!",
            description: "Welcome to CryptoWave. You are now logged in.",
          });
          navigate('/dashboard');
        } else {
          toast({
            title: "Welcome Back!",
            description: "You have successfully logged in",
          });
          navigate('/dashboard');
        }
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

  const handleGoogleSignIn = async () => {
    try {
      const isCustomDomain =
        !window.location.hostname.includes('lovable.app') &&
        !window.location.hostname.includes('lovableproject.com');

      if (isCustomDomain) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        }
      } else {
        const { error } = await lovable.auth.signInWithOAuth('google', {
          redirect_uri: window.location.origin,
        });
        if (error) {
          throw error;
        }
      }
    } catch (error: any) {
      toast({
        title: 'Google Sign-In Failed',
        description: error?.message || String(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Brand Header */}
      <div className="px-6 pt-6 pb-2">
        <span className="text-primary font-bold text-2xl cursor-pointer" onClick={() => navigate('/')}>
          ₵₽¥₱₮₩₳∇€
        </span>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-4 pb-12">
        <h1 className="text-3xl font-bold font-display text-foreground mb-8">
          {mode === 'signup' ? 'Welcome to ₵₽¥₱₮₩₳∇€' : 'Welcome Back'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          {/* Email */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Email</label>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn("h-12 bg-background border-border focus:border-primary", errors.email && "border-destructive")}
              required
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
          </div>

          {/* Password - always shown */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'Create a password (min 6 characters)' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn("h-12 pr-10 bg-background border-border focus:border-primary", errors.password && "border-destructive")}
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
            {mode === 'login' && (
              <div className="text-right mt-2">
                <button type="button" className="text-sm text-primary hover:underline">Forgot password?</button>
              </div>
            )}
          </div>

          {/* Name - signup */}
          {mode === 'signup' && (
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Full Name</label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn("h-12 bg-background border-border focus:border-primary", errors.name && "border-destructive")}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>
          )}

          {/* Phone - both login and signup */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Phone Number</label>
            <Input
              type="tel"
              placeholder="e.g. 0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={cn("h-12 bg-background border-border focus:border-primary", errors.phone && "border-destructive")}
            />
            {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
          </div>

          {/* Privacy checkbox - signup */}
          {mode === 'signup' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">
                By creating an account, I agree to ₵₽¥₱₮₩₳∇€'s{' '}
                <button
                  type="button"
                  onClick={() => navigate('/trading-risk-policy')}
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Privacy Notice
                </button>.
              </span>
            </label>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading || (mode === 'signup' && !agreed)}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {mode === 'login' ? 'Logging in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'signup' ? 'Sign Up' : 'Log In'
            )}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social Buttons - Google only */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full h-12 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-all duration-200 flex items-center justify-center gap-3 text-foreground font-medium"
              onClick={handleGoogleSignIn}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Bottom toggle */}
          <div className="text-center pt-2">
            {mode === 'signup' ? (
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')} className="text-primary font-semibold hover:underline">Log in</button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button type="button" onClick={() => setMode('signup')} className="text-primary font-semibold hover:underline">Sign up</button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
