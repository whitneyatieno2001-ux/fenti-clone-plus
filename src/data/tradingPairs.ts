export interface TradingPair {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  type: 'forex' | 'crypto' | 'commodities' | 'indices' | 'stocks';
  basePrice?: number;
}

export const tradingPairs: TradingPair[] = [
  // Forex Major Pairs
  { id: 'eurusd', symbol: 'EUR/USD', name: 'Euro / US Dollar', icon: 'EU', type: 'forex', basePrice: 1.0862 },
  { id: 'gbpusd', symbol: 'GBP/USD', name: 'Pound / US Dollar', icon: 'GB', type: 'forex', basePrice: 1.2645 },
  { id: 'usdjpy', symbol: 'USD/JPY', name: 'US Dollar / Yen', icon: 'JP', type: 'forex', basePrice: 149.85 },
  { id: 'usdchf', symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', icon: 'CH', type: 'forex', basePrice: 0.8854 },
  { id: 'audusd', symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', icon: 'AU', type: 'forex', basePrice: 0.6523 },
  { id: 'usdcad', symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', icon: 'CA', type: 'forex', basePrice: 1.3542 },
  { id: 'nzdusd', symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', icon: 'NZ', type: 'forex', basePrice: 0.5987 },
  
  // Forex Cross Pairs
  { id: 'eurgbp', symbol: 'EUR/GBP', name: 'Euro / Pound', icon: 'EG', type: 'forex', basePrice: 0.8592 },
  { id: 'eurjpy', symbol: 'EUR/JPY', name: 'Euro / Yen', icon: 'EJ', type: 'forex', basePrice: 162.78 },
  { id: 'gbpjpy', symbol: 'GBP/JPY', name: 'Pound / Yen', icon: 'GJ', type: 'forex', basePrice: 189.45 },
  
  // Crypto
  { id: 'bitcoin', symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', icon: '₿', type: 'crypto' },
  { id: 'ethereum', symbol: 'ETH/USD', name: 'Ethereum / US Dollar', icon: 'Ξ', type: 'crypto' },
  { id: 'solana', symbol: 'SOL/USD', name: 'Solana / US Dollar', icon: '◎', type: 'crypto' },
  { id: 'ripple', symbol: 'XRP/USD', name: 'Ripple / US Dollar', icon: '✕', type: 'crypto' },
  { id: 'cardano', symbol: 'ADA/USD', name: 'Cardano / US Dollar', icon: '₳', type: 'crypto' },
  { id: 'dogecoin', symbol: 'DOGE/USD', name: 'Dogecoin / US Dollar', icon: 'Ð', type: 'crypto' },
  { id: 'polkadot', symbol: 'DOT/USD', name: 'Polkadot / US Dollar', icon: '●', type: 'crypto' },
  { id: 'chainlink', symbol: 'LINK/USD', name: 'Chainlink / US Dollar', icon: '⬡', type: 'crypto' },
  
  // Commodities
  { id: 'xauusd', symbol: 'XAU/USD', name: 'Gold / US Dollar', icon: 'Au', type: 'commodities', basePrice: 2365.50 },
  { id: 'xagusd', symbol: 'XAG/USD', name: 'Silver / US Dollar', icon: 'Ag', type: 'commodities', basePrice: 28.45 },
  { id: 'wti', symbol: 'WTI/USD', name: 'Crude Oil WTI', icon: 'OIL', type: 'commodities', basePrice: 78.32 },
  { id: 'brent', symbol: 'BRENT/USD', name: 'Brent Crude Oil', icon: 'BRT', type: 'commodities', basePrice: 82.15 },
  { id: 'natgas', symbol: 'NATGAS/USD', name: 'Natural Gas', icon: 'NG', type: 'commodities', basePrice: 2.45 },
  
  // Indices
  { id: 'us500', symbol: 'US500', name: 'S&P 500 Index', icon: 'SPX', type: 'indices', basePrice: 5234.50 },
  { id: 'us30', symbol: 'US30', name: 'Dow Jones Industrial', icon: 'DJI', type: 'indices', basePrice: 38654.20 },
  { id: 'ustec', symbol: 'USTEC', name: 'NASDAQ 100', icon: 'NDX', type: 'indices', basePrice: 18245.80 },
  { id: 'uk100', symbol: 'UK100', name: 'FTSE 100', icon: 'UK', type: 'indices', basePrice: 7865.30 },
  { id: 'ger40', symbol: 'GER40', name: 'DAX 40', icon: 'DE', type: 'indices', basePrice: 18234.50 },
  { id: 'jpn225', symbol: 'JPN225', name: 'Nikkei 225', icon: 'JP', type: 'indices', basePrice: 38456.20 },
  
  // Stocks (Popular)
  { id: 'aapl', symbol: 'AAPL', name: 'Apple Inc.', icon: 'AAPL', type: 'stocks', basePrice: 178.50 },
  { id: 'tsla', symbol: 'TSLA', name: 'Tesla Inc.', icon: 'TSLA', type: 'stocks', basePrice: 245.80 },
  { id: 'amzn', symbol: 'AMZN', name: 'Amazon.com Inc.', icon: 'AMZN', type: 'stocks', basePrice: 178.25 },
  { id: 'googl', symbol: 'GOOGL', name: 'Alphabet Inc.', icon: 'GOOG', type: 'stocks', basePrice: 142.65 },
  { id: 'msft', symbol: 'MSFT', name: 'Microsoft Corp.', icon: 'MSFT', type: 'stocks', basePrice: 425.30 },
  { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA Corp.', icon: 'NVDA', type: 'stocks', basePrice: 875.40 },
  { id: 'meta', symbol: 'META', name: 'Meta Platforms', icon: 'META', type: 'stocks', basePrice: 485.20 },
];

export const getMarketCategories = () => {
  const categories = [
    { id: 'all', name: 'All', icon: 'ALL' },
    { id: 'forex', name: 'Forex', icon: 'FX' },
    { id: 'crypto', name: 'Crypto', icon: 'CR' },
    { id: 'commodities', name: 'Commodities', icon: 'CMD' },
    { id: 'indices', name: 'Indices', icon: 'IDX' },
    { id: 'stocks', name: 'Stocks', icon: 'STK' },
  ];
  return categories;
};

export const getPairsByCategory = (category: string) => {
  if (category === 'all') return tradingPairs;
  return tradingPairs.filter(pair => pair.type === category);
};
