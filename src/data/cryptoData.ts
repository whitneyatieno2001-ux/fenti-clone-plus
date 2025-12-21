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

// Extended crypto list like Binance
export const cryptoAssets: CryptoAsset[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 0, change24h: 0, icon: '₿', color: '#F7931A', marketCap: '$1.74T', volume24h: '$28.5B' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 0, change24h: 0, icon: 'Ξ', color: '#627EEA', marketCap: '$359.2B', volume24h: '$14.2B' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', price: 0, change24h: 0, icon: 'B', color: '#F3BA2F', marketCap: '$91.2B', volume24h: '$1.4B' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', price: 0, change24h: 0, icon: '◎', color: '#9945FF', marketCap: '$54.8B', volume24h: '$2.8B' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', price: 0, change24h: 0, icon: 'X', color: '#23292F', marketCap: '$27.8B', volume24h: '$1.2B' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', price: 0, change24h: 0, icon: 'A', color: '#0033AD', marketCap: '$15.9B', volume24h: '$456M' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0, change24h: 0, icon: 'Ð', color: '#C2A633', marketCap: '$11.5B', volume24h: '$892M' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', price: 0, change24h: 0, icon: '●', color: '#E6007A', marketCap: '$8.9B', volume24h: '$245M' },
  { id: 'matic-network', symbol: 'MATIC', name: 'Polygon', price: 0, change24h: 0, icon: 'M', color: '#8247E5', marketCap: '$8.2B', volume24h: '$324M' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', price: 0, change24h: 0, icon: 'A', color: '#E84142', marketCap: '$12.1B', volume24h: '$512M' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', price: 0, change24h: 0, icon: '⬡', color: '#375BD2', marketCap: '$7.8B', volume24h: '$298M' },
  { id: 'tron', symbol: 'TRX', name: 'TRON', price: 0, change24h: 0, icon: 'T', color: '#FF0013', marketCap: '$6.2B', volume24h: '$189M' },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', price: 0, change24h: 0, icon: '🦄', color: '#FF007A', marketCap: '$5.1B', volume24h: '$156M' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', price: 0, change24h: 0, icon: 'Ł', color: '#BFBBBB', marketCap: '$5.8B', volume24h: '$234M' },
  { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos', price: 0, change24h: 0, icon: '⚛', color: '#2E3148', marketCap: '$3.2B', volume24h: '$98M' },
  { id: 'stellar', symbol: 'XLM', name: 'Stellar', price: 0, change24h: 0, icon: '*', color: '#14B6E7', marketCap: '$3.5B', volume24h: '$87M' },
  { id: 'filecoin', symbol: 'FIL', name: 'Filecoin', price: 0, change24h: 0, icon: 'F', color: '#0090FF', marketCap: '$2.1B', volume24h: '$76M' },
  { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', price: 0, change24h: 0, icon: 'N', color: '#00C08B', marketCap: '$4.2B', volume24h: '$167M' },
  { id: 'aptos', symbol: 'APT', name: 'Aptos', price: 0, change24h: 0, icon: 'A', color: '#2DD8A3', marketCap: '$2.8B', volume24h: '$123M' },
  { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum', price: 0, change24h: 0, icon: 'A', color: '#28A0F0', marketCap: '$2.4B', volume24h: '$145M' },
  { id: 'optimism', symbol: 'OP', name: 'Optimism', price: 0, change24h: 0, icon: 'O', color: '#FF0420', marketCap: '$1.8B', volume24h: '$89M' },
  { id: 'injective-protocol', symbol: 'INJ', name: 'Injective', price: 0, change24h: 0, icon: 'I', color: '#00F2FE', marketCap: '$1.9B', volume24h: '$112M' },
  { id: 'sui', symbol: 'SUI', name: 'Sui', price: 0, change24h: 0, icon: 'S', color: '#4DA2FF', marketCap: '$2.1B', volume24h: '$98M' },
  { id: 'render-token', symbol: 'RNDR', name: 'Render', price: 0, change24h: 0, icon: 'R', color: '#FF4F4F', marketCap: '$1.5B', volume24h: '$78M' },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe', price: 0, change24h: 0, icon: '🐸', color: '#00A300', marketCap: '$1.2B', volume24h: '$234M' },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', price: 0, change24h: 0, icon: '🐕', color: '#F9A825', marketCap: '$4.5B', volume24h: '$156M' },
  { id: 'tether', symbol: 'USDT', name: 'Tether', price: 1.00, change24h: 0, icon: '₮', color: '#26A17B', marketCap: '$95.2B', volume24h: '$45.6B' },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', price: 1.00, change24h: 0, icon: '$', color: '#2775CA', marketCap: '$32.1B', volume24h: '$5.6B' },
];

export const featuredCryptos = ['bitcoin', 'ethereum', 'solana', 'binancecoin'];

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else if (price >= 0.0001) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(8)}`;
  }
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '↑' : '↓';
  return `${sign} ${Math.abs(change).toFixed(2)}%`;
}
