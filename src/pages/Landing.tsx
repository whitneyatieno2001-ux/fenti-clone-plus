import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/contexts/AccountContext';
import { CandlestickVisual } from '@/components/CandlestickVisual';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  Globe, 
  BarChart3, 
  Bot, 
  ChevronRight,
  Users,
  Clock,
  Award,
  ArrowRight
} from 'lucide-react';
import professionalTrader from '@/assets/professional-trader.jpg';
import cryptoWaveLogo from '@/assets/crypto-wave-logo-transparent.png';

export default function Landing() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAccount();

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/dashboard');
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src={cryptoWaveLogo} 
                alt="Crypto Wave" 
                className="w-12 h-12 rounded-xl"
                style={{ mixBlendMode: 'multiply' }}
              />
              <span className="font-display font-bold text-xl text-foreground">Crypto Wave</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#markets" className="text-muted-foreground hover:text-foreground transition-colors">Markets</a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/auth')}
                className="text-foreground hover:text-primary"
              >
                Log in
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Open account
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <p className="text-primary font-semibold mb-4 tracking-wide">Start Your Journey</p>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-foreground leading-tight mb-6">
                Trade<br />
                <span className="text-gradient">Smarter</span><br />
                Grow Faster
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Experience the future of cryptocurrency trading with advanced tools, real-time analytics, and automated trading bots.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-14 px-8 text-lg"
                >
                  Open account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/auth')}
                  className="border-border text-foreground hover:bg-secondary h-14 px-8 text-lg"
                >
                  Start demo trading
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-6 mt-10 pt-10 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center">
                        <Users className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">10K+ traders</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-5 h-5 text-primary fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">4.8/5 rating</span>
                </div>
              </div>
            </div>

            {/* Professional trader image */}
            <div className="relative animate-slide-up hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={professionalTrader} 
                  alt="Professional Trader" 
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              </div>
              {/* Floating profit indicator */}
              <div className="absolute -top-4 -right-4 bg-success text-success-foreground px-4 py-2 rounded-lg shadow-lg animate-float">
                <p className="text-sm font-semibold">+$1,234.50</p>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-card border border-border px-4 py-3 rounded-lg shadow-lg">
                <p className="text-xs text-muted-foreground">Today&apos;s Profit</p>
                <p className="text-lg font-bold text-success">+12.5%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-4xl font-display font-bold text-primary">$2B+</p>
              <p className="text-muted-foreground mt-2">Monthly Volume</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-display font-bold text-primary">10K+</p>
              <p className="text-muted-foreground mt-2">Active Traders</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-display font-bold text-primary">50+</p>
              <p className="text-muted-foreground mt-2">Crypto Assets</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-display font-bold text-primary">24/7</p>
              <p className="text-muted-foreground mt-2">Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
              Everything you need to trade
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools and features designed for both beginners and professional traders
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: 'Advanced Charts',
                description: 'Professional-grade charts with technical indicators and real-time data'
              },
              {
                icon: Bot,
                title: 'Automated Trading',
                description: 'Set up trading bots with custom strategies that work 24/7'
              },
              {
                icon: Shield,
                title: 'Secure Platform',
                description: 'Bank-level security with 2FA and cold storage protection'
              },
              {
                icon: Zap,
                title: 'Instant Execution',
                description: 'Lightning-fast order execution with minimal slippage'
              },
              {
                icon: Globe,
                title: 'Global Markets',
                description: 'Access to 50+ cryptocurrencies and global markets'
              },
              {
                icon: Clock,
                title: '24/7 Trading',
                description: 'Trade anytime with round-the-clock market access'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group p-6 bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-300 opacity-0 animate-fade-in"
                style={{ 
                  animationDelay: `${index * 150}ms`,
                  animationFillMode: 'forwards'
                }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors group-hover:scale-110 transform duration-300">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Markets Preview */}
      <section id="markets" className="py-20 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-display font-bold text-foreground mb-2">Popular Markets</h2>
              <p className="text-muted-foreground">Start trading the most popular cryptocurrencies</p>
            </div>
            <Button variant="ghost" className="text-primary hover:text-primary/80" onClick={() => navigate('/auth')}>
              View all markets <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { symbol: 'BTC', name: 'Bitcoin', price: '$67,234.50', change: '+2.45%', positive: true },
              { symbol: 'ETH', name: 'Ethereum', price: '$3,456.78', change: '+1.23%', positive: true },
              { symbol: 'SOL', name: 'Solana', price: '$145.67', change: '-0.89%', positive: false },
              { symbol: 'BNB', name: 'BNB', price: '$567.89', change: '+3.12%', positive: true },
            ].map((coin, index) => (
              <div 
                key={index}
                className="p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => navigate('/auth')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{coin.symbol.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{coin.symbol}</p>
                    <p className="text-xs text-muted-foreground">{coin.name}</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-foreground">{coin.price}</p>
                <p className={`text-sm ${coin.positive ? 'text-success' : 'text-destructive'}`}>
                  {coin.change}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Award className="w-4 h-4" />
            <span className="text-sm font-medium">Start with $10,000 demo balance</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Ready to start trading?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of traders and start your crypto journey today. No experience needed.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-14 px-10 text-lg"
          >
            Create free account
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={cryptoWaveLogo} 
                  alt="Crypto Wave" 
                  className="w-12 h-12 rounded-xl"
                  style={{ mixBlendMode: 'multiply' }}
                />
                <span className="font-display font-bold text-lg text-foreground">Crypto Wave</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your trusted partner for cryptocurrency trading. Trade smarter, not harder.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Products</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/auth" className="hover:text-foreground transition-colors">Spot Trading</Link></li>
                <li><Link to="/auth" className="hover:text-foreground transition-colors">Futures Trading</Link></li>
                <li><Link to="/auth" className="hover:text-foreground transition-colors">Trading Bots</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Risk Disclosure</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2024 Crypto Wave. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
