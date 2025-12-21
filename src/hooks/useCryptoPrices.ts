import { useState, useEffect, useCallback } from 'react';
import { cryptoAssets, CryptoAsset } from '@/data/cryptoData';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export function useCryptoPrices() {
  const [prices, setPrices] = useState<Record<string, { price: number; change24h: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const ids = cryptoAssets.map(c => c.id).join(',');
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }
      
      const data = await response.json();
      
      const newPrices: Record<string, { price: number; change24h: number }> = {};
      for (const [id, values] of Object.entries(data)) {
        const v = values as { usd: number; usd_24h_change?: number };
        newPrices[id] = {
          price: v.usd || 0,
          change24h: v.usd_24h_change || 0,
        };
      }
      
      setPrices(newPrices);
      setError(null);
    } catch (err) {
      console.error('Error fetching prices:', err);
      setError('Failed to load prices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    
    // Refresh prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const getCryptoWithPrice = useCallback((crypto: CryptoAsset): CryptoAsset => {
    const priceData = prices[crypto.id];
    if (priceData) {
      return {
        ...crypto,
        price: priceData.price,
        change24h: priceData.change24h,
      };
    }
    return crypto;
  }, [prices]);

  const getAllCryptosWithPrices = useCallback((): CryptoAsset[] => {
    return cryptoAssets.map(getCryptoWithPrice);
  }, [getCryptoWithPrice]);

  return {
    prices,
    isLoading,
    error,
    getCryptoWithPrice,
    getAllCryptosWithPrices,
    refetch: fetchPrices,
  };
}
