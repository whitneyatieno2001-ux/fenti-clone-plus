import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import cryptoWaveLogo from '@/assets/crypto-wave-logo.png';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Landing() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAccount();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/dashboard');
    }
  }, [isLoggedIn, navigate]);

  // Scroll reveal
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.15 });
    reveals.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#EAECEF] overflow-x-hidden font-sans">
      {/* Navbar */}
      <header className="h-[72px] border-b border-[#2B3139] sticky top-0 bg-[#0b0e11]/90 backdrop-blur-xl z-50">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <img src={cryptoWaveLogo} alt="CryptoWave" className="w-8 h-8 rounded-lg" />
            <span className="text-[#FCD535] font-bold text-xl">CryptoWave</span>
          </div>

          <nav className="hidden md:flex gap-8">
            {['Buy Crypto', 'Markets', 'Trade', 'Futures', 'Earn', 'Web3 Wallet'].map((item, i) => (
              <span
                key={i}
                className={`text-sm cursor-pointer transition-colors relative after:content-[''] after:absolute after:w-0 after:h-0.5 after:bottom-[-4px] after:left-0 after:bg-[#FCD535] after:transition-all hover:after:w-full ${
                  item === 'Web3 Wallet' ? 'text-[#FCD535]' : 'text-[#848E9C] hover:text-[#EAECEF]'
                }`}
                onClick={() => navigate('/auth')}
              >
                {item}
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span
              className="text-sm text-[#EAECEF] cursor-pointer hover:text-[#FCD535] transition-colors hidden sm:inline"
              onClick={() => navigate('/auth')}
            >
              Log In
            </span>
            <button
              onClick={() => navigate('/auth')}
              className="bg-[#FCD535] text-[#181a20] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#F0B90B] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(252,213,53,0.3)]"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-10 py-16 md:py-24 flex flex-col md:flex-row items-center justify-between max-w-[1200px] mx-auto min-h-[80vh] gap-12">
        <div className="max-w-full md:max-w-[50%] text-center md:text-left z-10">
          <span className="text-[#FCD535] font-semibold text-lg md:text-xl mb-4 inline-block">CryptoWave Wallet</span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-8 bg-gradient-to-b from-white to-[#848E9C] bg-clip-text text-transparent">
            Secure.<br />Your World of Web3.
          </h1>
          <p className="text-[#848E9C] text-lg mb-8">
            The simplest and most secure way to explore the decentralized web.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <button
              onClick={() => navigate('/auth')}
              className="bg-[#FCD535] text-[#181a20] px-6 py-3 rounded-lg font-semibold hover:bg-[#F0B90B] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(252,213,53,0.3)] active:scale-[0.98]"
            >
              Get Wallet
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="bg-[#2B3139] text-[#EAECEF] px-6 py-3 rounded-lg font-semibold hover:bg-[#3A4049] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Start Trading
            </button>
          </div>
        </div>

        {/* Phone Mockup */}
        <div className="relative w-full max-w-[320px] flex-shrink-0" style={{ background: 'radial-gradient(circle, rgba(252,213,53,0.15) 0%, transparent 70%)' }}>
          <div className="w-full aspect-[1/2] bg-black border-[8px] border-[#333] rounded-[40px] relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] animate-float">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[25px] bg-[#333] rounded-b-xl z-10" />
            <div className="w-full h-full bg-[#1e2329] px-5 pt-10 pb-5 flex flex-col">
              <div className="flex justify-between items-center mt-4">
                <span className="text-[#848E9C] text-xs">Total Balance</span>
                <span className="text-[#FCD535] text-xs">●</span>
              </div>
              <p className="text-[32px] font-bold text-center mt-4">$1,120.22</p>

              {/* Action buttons */}
              <div className="flex justify-center gap-5 mt-6">
                {['↓', '↑', '↔', '⟳'].map((icon, i) => (
                  <div key={i} className="w-12 h-12 rounded-full bg-[#2b3139] flex items-center justify-center text-[#FCD535] cursor-pointer hover:bg-[#3A4049] hover:scale-110 transition-all">
                    {icon}
                  </div>
                ))}
              </div>

              {/* Token list */}
              <div className="mt-8 flex-1 overflow-hidden">
                {[
                  { symbol: 'B', name: 'BNB', price: '$315.20', amount: '2.50', value: '$788.00' },
                  { symbol: 'T', name: 'USDT', price: '$1.00', amount: '500.00', value: '$500.00' },
                  { symbol: 'E', name: 'ETH', price: '$1850.00', amount: '0.12', value: '$222.00' },
                ].map((token, i) => (
                  <div key={i} className="flex justify-between py-4 border-b border-[#2b3139] hover:bg-white/5 rounded-lg px-1 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FCD535]/20 flex items-center justify-center text-[#FCD535] font-bold text-sm">
                        {token.symbol}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{token.name}</p>
                        <p className="text-xs text-[#848E9C]">{token.price}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{token.amount}</p>
                      <p className="text-xs text-[#848E9C]">{token.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature: Trading */}
      <section className="max-w-[1200px] mx-auto px-6 md:px-10 py-20">
        <div className="reveal flex flex-col md:flex-row items-center gap-16 mb-24">
          <div className="flex-1 text-center md:text-left">
            <span className="text-[#FCD535] font-semibold uppercase tracking-wider text-sm block mb-4">CryptoWave Wallet Web</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">A Reimagined On-Chain Trading Experience</h2>
            <p className="text-[#848E9C] text-lg leading-relaxed mb-8">
              Built for a new generation of traders. It combines bank-level security with high-speed performance to deliver a faster, smarter, and more flexible trading experience—all in one place.
            </p>
            <button onClick={() => navigate('/auth')} className="text-[#FCD535] font-medium inline-flex items-center gap-2 hover:underline hover:gap-3 transition-all">
              Start Trading →
            </button>
          </div>
          <div className="flex-1 flex justify-center w-full">
            {/* Laptop mockup */}
            <div className="w-full max-w-[600px] hover:-translate-y-1 transition-transform">
              <div className="w-[90%] mx-auto aspect-video bg-[#1e2329] border-[12px] border-[#333] rounded-t-xl overflow-hidden flex">
                <div className="hidden md:block w-[30%] bg-[#161a1e] border-r border-[#333] p-4">
                  <div className="text-xs text-[#848E9C] mb-3">MARKETS</div>
                  {[1,2,3,4,5].map(i => <div key={i} className="h-3 bg-[#2b3139] mb-2.5 rounded-sm" />)}
                </div>
                <div className="flex-1 bg-[#1e2329] p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">BTC/USDT</span>
                    <span className="text-xs text-[#0ECB81]">+1.2%</span>
                  </div>
                  <div className="flex-1 bg-gradient-to-b from-[#FCD535]/10 to-transparent border border-[#333] mt-2 min-h-[80px] relative overflow-hidden rounded">
                    <div className="absolute bottom-0 left-0 w-full bg-[#FCD535]/20 animate-pulse" style={{ height: '60%' }} />
                  </div>
                </div>
              </div>
              <div className="w-full h-6 bg-[#444] rounded-b-2xl relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[15%] h-2 bg-[#222] rounded-b-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Feature: Swap */}
        <div className="reveal flex flex-col md:flex-row-reverse items-center gap-16 mb-24">
          <div className="flex-1 text-center md:text-left">
            <span className="text-[#FCD535] font-semibold uppercase tracking-wider text-sm block mb-4">Swap</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">Swap tokens cross-chain at the best prices</h2>
            <p className="text-[#848E9C] text-lg leading-relaxed mb-8">
              Trade thousands of tokens across various networks. Get the best prices thanks to deep liquidity and low slippage.
            </p>
            <button onClick={() => navigate('/auth')} className="text-[#FCD535] font-medium inline-flex items-center gap-2 hover:underline hover:gap-3 transition-all">
              Try Swap Now →
            </button>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-[#1E2329] p-8 rounded-3xl max-w-[400px] w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#2B3139] hover:-translate-y-2.5 hover:border-[#FCD535] transition-all text-center">
              <div className="w-20 h-20 bg-[#0ECB81] rounded-full flex items-center justify-center mx-auto mb-6 text-3xl text-white animate-pulse">
                ✓
              </div>
              <p className="text-2xl font-semibold">Swapped</p>
              <p className="text-[#848E9C] mt-2">1.5 ETH to 2500 USDT</p>
              <p className="text-xs text-[#848E9C] mt-4">Transaction Hash: 0x7a...8b2</p>
            </div>
          </div>
        </div>

        {/* Feature: Transfer */}
        <div className="reveal flex flex-col md:flex-row items-center gap-16 mb-24">
          <div className="flex-1 text-center md:text-left">
            <span className="text-[#FCD535] font-semibold uppercase tracking-wider text-sm block mb-4">Transfer</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">Bridge between the exchange and Web3</h2>
            <p className="text-[#848E9C] text-lg leading-relaxed mb-8">
              Why juggle multiple apps? Simply do it all in one! Transfer funds quickly and easily. Move across CeFi, DeFi, and Web3 in a single tap.
            </p>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-[280px] aspect-[1/2] bg-black border-[8px] border-[#333] rounded-[40px] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[25px] bg-[#333] rounded-b-xl z-10" />
              <div className="w-full h-full bg-[#1e2329] p-5 flex flex-col items-center justify-center gap-4">
                <div className="flex gap-4 text-xs text-[#848E9C]">
                  <span className="text-[#EAECEF]">From Exchange</span>
                  <span>To Wallet</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#FCD535]/20 flex items-center justify-center text-[#FCD535] text-xl">↓</div>
                <p className="text-2xl font-bold">$3,389.04</p>
                <button className="bg-[#FCD535] text-[#181a20] px-8 py-2.5 rounded-lg font-semibold text-sm">Deposit</button>
              </div>
            </div>
          </div>
        </div>

        {/* Feature: Earn */}
        <div className="reveal flex flex-col md:flex-row-reverse items-center gap-16 mb-24">
          <div className="flex-1 text-center md:text-left">
            <span className="text-[#FCD535] font-semibold uppercase tracking-wider text-sm block mb-4">Earn</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">Grow your portfolio with one click</h2>
            <p className="text-[#848E9C] text-lg leading-relaxed mb-8">
              Put your idle crypto to work. Find the best opportunities to earn yield on your assets in seconds.
            </p>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-[280px] aspect-[1/2] bg-black border-[8px] border-[#333] rounded-[40px] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
              <div className="w-full h-full bg-[#1e2329] p-5 flex flex-col items-center justify-center gap-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FCD535]/20 flex items-center justify-center text-[#FCD535] font-bold">B</div>
                  <div>
                    <p className="font-medium text-sm">BNB</p>
                    <p className="text-xs text-[#848E9C]">Venus</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[#848E9C]">APY</p>
                  <p className="text-[#0ECB81] text-2xl font-bold">0.75%</p>
                </div>
                <button className="bg-[#FCD535] text-[#181a20] px-8 py-2.5 rounded-lg font-semibold text-sm">Invest Now</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explore dApps */}
      <section className="text-center py-24 relative overflow-hidden" style={{ background: 'radial-gradient(circle at center, #1E2329 0%, #0b0e11 70%)' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FCD535] blur-[200px] opacity-5 z-0" />
        <div className="reveal relative z-10 max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Explore Web3 with Ease</h2>
          <p className="text-[#848E9C] text-lg max-w-2xl mx-auto mb-10">
            Trade your favorite tokens. Access multiple blockchains. Explore some of the best dApps. All without leaving your wallet.
          </p>
          <button onClick={() => navigate('/auth')} className="text-[#FCD535] font-medium inline-flex items-center gap-2 hover:underline hover:gap-3 transition-all text-lg">
            View Networks and dApps →
          </button>
        </div>
      </section>

      {/* Security Section */}
      <section className="max-w-[1200px] mx-auto px-6 md:px-10 py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Putting you in control.<br />Security at every stage.
        </h2>
        <div className="reveal grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: '🔒',
              title: 'Self-custody wallet',
              desc: 'Funds in the wallet are exclusively held and managed by the user. You are in complete control over your crypto assets.',
            },
            {
              icon: '🛡️',
              title: 'Powered by MPC',
              desc: 'Advanced multi-party computation (MPC) technology creates three separately stored "key shares". Enjoy unparalleled security without the need for a seed phrase.',
              link: true,
            },
            {
              icon: '⚠️',
              title: 'Built-in risk controls',
              desc: 'Get alerts if a token or blockchain carries security risks, including wrong address protection or malicious contract detection.',
            },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-[#181a20] p-8 md:p-10 rounded-2xl border border-transparent hover:border-[#FCD535]/20 hover:-translate-y-2.5 hover:bg-[#2b3139] hover:shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all flex flex-col justify-between min-h-[350px]"
            >
              <div>
                <div className="w-16 h-16 rounded-full bg-[#FCD535]/10 flex items-center justify-center text-2xl mb-6 hover:rotate-[10deg] hover:scale-110 transition-transform">
                  {card.icon}
                </div>
                <h3 className="text-2xl font-semibold mb-4">{card.title}</h3>
                <p className="text-[#848E9C] leading-relaxed mb-6">{card.desc}</p>
              </div>
              {card.link && (
                <button className="text-[#FCD535] font-medium inline-flex items-center gap-2 hover:underline hover:gap-3 transition-all">
                  Learn More →
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1200px] mx-auto px-6 md:px-10 pb-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        {[
          'What is CryptoWave Wallet?',
          'What are the benefits of using CryptoWave Wallet?',
          'How do I use my CryptoWave Wallet to send and receive tokens?',
          'Is CryptoWave Wallet a self-custody wallet? Who has control over my funds?',
        ].map((q, i) => (
          <div key={i} className="border-b border-[#2B3139] py-6 hover:bg-white/[0.02] transition-colors">
            <div
              className="flex justify-between items-center cursor-pointer text-lg font-medium"
              onClick={() => setFaqOpen(faqOpen === i ? null : i)}
            >
              <span>{i + 1}. {q}</span>
              <div className={`w-8 h-8 bg-[#2B3139] rounded-full flex items-center justify-center transition-all ${faqOpen === i ? 'bg-[#FCD535] text-black rotate-45' : 'text-[#EAECEF]'}`}>
                +
              </div>
            </div>
          </div>
        ))}
        <div className="text-center mt-8">
          <button className="text-[#FCD535] font-medium inline-flex items-center gap-2 hover:underline hover:gap-3 transition-all">
            View more →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2B3139] py-16 bg-[#0b0e11]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 text-center md:text-left">
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
                <img src={cryptoWaveLogo} alt="CryptoWave" className="w-8 h-8 rounded-lg" />
                <span className="text-[#FCD535] font-bold text-lg">CryptoWave</span>
              </div>
            </div>
            {[
              { title: 'About Us', links: ['About', 'Careers', 'Business Contacts', 'Community'] },
              { title: 'Products', links: ['Exchange', 'Bots', 'Futures', 'Launchpad'] },
              { title: 'Service', links: ['Downloads', 'Desktop Application', 'Buy Crypto', 'Referral'] },
              { title: 'Support', links: ['Give Us Feedback', 'Support Center', 'Submit a request', 'APIs'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <span className="text-[#848E9C] text-sm cursor-pointer hover:text-[#FCD535] transition-colors">{link}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center text-[#848E9C] text-sm mt-12 pt-8 border-t border-[#2B3139]">
            CryptoWave © {new Date().getFullYear()}
          </div>
        </div>
      </footer>

      {/* Scroll reveal CSS */}
      <style>{`
        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease-out;
        }
        .reveal.active {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
