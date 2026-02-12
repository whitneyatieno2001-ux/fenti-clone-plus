import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(true);
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

    if (mode === 'login') {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.password = e.errors[0].message;
        }
      }
    }

    if (mode === 'signup') {
      // signup only needs email for step 1
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
      {/* Brand Header */}
      <div className="px-6 pt-6 pb-2">
        <span className="text-primary font-bold text-2xl cursor-pointer" onClick={() => navigate('/')}>
          CryptoWave
        </span>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-4 pb-12">
        {/* Title */}
        <h1 className="text-3xl font-bold font-display text-foreground mb-8">
          {mode === 'signup' ? 'Welcome to CryptoWave' : 'Welcome Back'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          {/* Email / Phone label */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              {mode === 'signup' ? 'Email/Phone number' : 'Email'}
            </label>
            <Input
              type="email"
              placeholder="Email/Phone (without country code)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "h-12 bg-background border-border focus:border-primary",
                errors.email && "border-destructive"
              )}
              required
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
          </div>

          {/* Password - only on login */}
          {mode === 'login' && (
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "h-12 pr-10 bg-background border-border focus:border-primary",
                    errors.password && "border-destructive"
                  )}
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
              <div className="text-right mt-2">
                <button type="button" className="text-sm text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
            </div>
          )}

          {/* Name - signup */}
          {mode === 'signup' && (
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Full Name</label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn(
                  "h-12 bg-background border-border focus:border-primary",
                  errors.name && "border-destructive"
                )}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>
          )}

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
                By creating an account, I agree to CryptoWave's{' '}
                <button type="button" className="text-primary underline underline-offset-2 hover:text-primary/80">
                  Privacy Notice
                </button>.
              </span>
            </label>
          )}

          {/* Continue / Login Button */}
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
              mode === 'signup' ? 'Continue' : 'Log In'
            )}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full h-12 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors flex items-center justify-center gap-3 text-foreground font-medium"
              onClick={() => toast({ title: 'Coming Soon', description: 'Google sign-in will be available soon' })}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              className="w-full h-12 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors flex items-center justify-center gap-3 text-foreground font-medium"
              onClick={() => toast({ title: 'Coming Soon', description: 'Apple sign-in will be available soon' })}
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          {/* Bottom toggle */}
          <div className="text-center pt-2">
            {mode === 'signup' ? (
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')} className="text-primary font-semibold hover:underline">
                  Log in
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button type="button" onClick={() => setMode('signup')} className="text-primary font-semibold hover:underline">
                  Sign up
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
