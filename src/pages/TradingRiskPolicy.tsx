import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TradingRiskPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">Privacy & Risk Disclosure</h1>
        </div>
      </header>

      <main className="px-6 py-8 max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
          <div>
            <h2 className="font-bold text-destructive text-lg">Risk Warning</h2>
            <p className="text-sm text-muted-foreground">Please read this disclosure carefully before using CryptoWave.</p>
          </div>
        </div>

        <section className="space-y-4">
          <h3 className="text-xl font-bold">1. Trading is Risky</h3>
          <p className="text-muted-foreground leading-relaxed">
            Trading cryptocurrencies and digital assets involves significant risk and may not be suitable for all investors. The value of cryptocurrencies can fluctuate widely and you may lose some or all of your invested capital. Past performance is not indicative of future results.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold">2. No Guaranteed Returns</h3>
          <p className="text-muted-foreground leading-relaxed">
            CryptoWave does not guarantee any returns or profits. All trading activities carry inherent risks including but not limited to market volatility, liquidity risks, and technological risks. You should only trade with funds you can afford to lose.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold">3. Automated Trading Risks</h3>
          <p className="text-muted-foreground leading-relaxed">
            Trading bots and automated trading strategies may result in losses. While bots are designed to execute trades based on predefined rules, market conditions can change rapidly and unpredictably, leading to unexpected outcomes.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold">4. Your Responsibility</h3>
          <p className="text-muted-foreground leading-relaxed">
            You are solely responsible for your trading decisions and any resulting gains or losses. CryptoWave provides tools and platforms for trading but does not provide financial advice. We recommend consulting with a qualified financial advisor before making any investment decisions.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold">5. Data Privacy</h3>
          <p className="text-muted-foreground leading-relaxed">
            CryptoWave collects and processes your personal data in accordance with applicable data protection laws. We use your data to provide and improve our services, process transactions, and comply with legal requirements. We do not sell your personal data to third parties.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold">6. Regulatory Compliance</h3>
          <p className="text-muted-foreground leading-relaxed">
            Cryptocurrency trading may be subject to regulatory requirements in your jurisdiction. It is your responsibility to ensure that your use of CryptoWave complies with all applicable laws and regulations in your country of residence.
          </p>
        </section>

        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
          <p className="text-sm text-foreground font-medium">
            By creating an account and using CryptoWave, you acknowledge that you have read, understood, and agree to accept the risks associated with cryptocurrency trading.
          </p>
        </div>

        <Button onClick={() => navigate(-1)} className="w-full">
          I Understand & Accept
        </Button>
      </main>
    </div>
  );
}
