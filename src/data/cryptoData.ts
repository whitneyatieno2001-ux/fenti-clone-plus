export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  icon: string;
  color: string;
  marketCap: string;
  volume24h: string;
}

export const cryptoAssets: CryptoAsset[] = [
  {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 88309.45,
    change24h: 0.31,
    icon: '₿',
    color: '#F7931A',
    marketCap: '$1.74T',
    volume24h: '$28.5B',
  },
  {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 2983.06,
    change24h: -0.24,
    icon: 'Ξ',
    color: '#627EEA',
    marketCap: '$359.2B',
    volume24h: '$14.2B',
  },
  {
    id: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    price: 126.29,
    change24h: -0.64,
    icon: '◎',
    color: '#9945FF',
    marketCap: '$54.8B',
    volume24h: '$2.8B',
  },
  {
    id: 'usdc',
    symbol: 'USDC',
    name: 'USDC',
    price: 1.00,
    change24h: -0.02,
    icon: '$',
    color: '#2775CA',
    marketCap: '$32.1B',
    volume24h: '$5.6B',
  },
  {
    id: 'bnb',
    symbol: 'BNB',
    name: 'BNB',
    price: 612.45,
    change24h: 1.25,
    icon: 'B',
    color: '#F3BA2F',
    marketCap: '$91.2B',
    volume24h: '$1.4B',
  },
  {
    id: 'xrp',
    symbol: 'XRP',
    name: 'XRP',
    price: 0.5234,
    change24h: 2.15,
    icon: 'X',
    color: '#23292F',
    marketCap: '$27.8B',
    volume24h: '$1.2B',
  },
  {
    id: 'cardano',
    symbol: 'ADA',
    name: 'Cardano',
    price: 0.4521,
    change24h: -1.32,
    icon: 'A',
    color: '#0033AD',
    marketCap: '$15.9B',
    volume24h: '$456M',
  },
  {
    id: 'dogecoin',
    symbol: 'DOGE',
    name: 'Dogecoin',
    price: 0.0823,
    change24h: 3.45,
    icon: 'Ð',
    color: '#C2A633',
    marketCap: '$11.5B',
    volume24h: '$892M',
  },
  {
    id: 'polygon',
    symbol: 'MATIC',
    name: 'Polygon',
    price: 0.8912,
    change24h: -0.89,
    icon: 'M',
    color: '#8247E5',
    marketCap: '$8.2B',
    volume24h: '$324M',
  },
  {
    id: 'polkadot',
    symbol: 'DOT',
    name: 'Polkadot',
    price: 6.78,
    change24h: 0.56,
    icon: '●',
    color: '#E6007A',
    marketCap: '$8.9B',
    volume24h: '$245M',
  },
];

export const featuredCryptos = ['bitcoin', 'ethereum', 'solana', 'usdc'];

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else {
    return `$${price.toFixed(4)}`;
  }
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '↑' : '↓';
  return `${sign} ${Math.abs(change).toFixed(2)}%`;
}
