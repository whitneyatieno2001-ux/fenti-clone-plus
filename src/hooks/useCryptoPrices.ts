import { useState, useEffect, useCallback, useRef } from 'react';
import { cryptoAssets, CryptoAsset } from '@/data/cryptoData';


// Stablecoins don't have USDT pairs
const STABLECOINS = ['USDT', 'USDC'];

const BINANCE_WS = 'wss://stream.binance.com:9443/ws';

interface PriceData {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

export function useCryptoPrices() {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const binanceSymbols = cryptoAssets
    .filter(c => !STABLECOINS.includes(c.symbol))
    .map(c => `${c.symbol}USDT`);

  const fetchPrices = useCallback(async () => {
    try {
      const symbolsParam = JSON.stringify(binanceSymbols);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/binance-proxy?endpoint=ticker24hr&symbols=${encodeURIComponent(symbolsParam)}`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }

      const tickers = await response.json();

      const newPrices: Record<string, PriceData> = {};

      // Set stablecoin defaults
      STABLECOINS.forEach(s => {
        const asset = cryptoAssets.find(c => c.symbol === s);
        if (asset) {
          newPrices[asset.id] = {
            price: 1.0, change24h: 0, high24h: 1.0, low24h: 1.0,
            volume24h: 0, quoteVolume24h: 0,
          };
        }
      });

      if (Array.isArray(tickers)) {
        tickers.forEach((ticker: any) => {
          const ourSymbol = ticker.symbol?.replace('USDT', '');
          const asset = cryptoAssets.find(c => c.symbol === ourSymbol);
          if (asset) {
            newPrices[asset.id] = {
              price: parseFloat(ticker.lastPrice),
              change24h: parseFloat(ticker.priceChangePercent),
              high24h: parseFloat(ticker.highPrice),
              low24h: parseFloat(ticker.lowPrice),
              volume24h: parseFloat(ticker.volume),
              quoteVolume24h: parseFloat(ticker.quoteVolume),
            };
          }
        });
      }

      setPrices(newPrices);
      setError(null);
    } catch (err) {
      console.error('Error fetching Binance prices:', err);
      setError('Failed to load prices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Try WebSocket for real-time, fall back to polling
  useEffect(() => {
    fetchPrices();

    // Try WebSocket connection
    try {
      const streams = cryptoAssets
        .filter(c => !STABLECOINS.includes(c.symbol))
        .map(c => `${c.symbol.toLowerCase()}usdt@miniTicker`)
        .join('/');

      const ws = new WebSocket(`${BINANCE_WS}/${streams}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const ourSymbol = data.s?.replace('USDT', '');
          const asset = cryptoAssets.find(c => c.symbol === ourSymbol);
          if (asset && data.c) {
            setPrices(prev => ({
              ...prev,
              [asset.id]: {
                ...prev[asset.id],
                price: parseFloat(data.c),
                high24h: parseFloat(data.h) || prev[asset.id]?.high24h || 0,
                low24h: parseFloat(data.l) || prev[asset.id]?.low24h || 0,
                volume24h: parseFloat(data.v) || prev[asset.id]?.volume24h || 0,
                quoteVolume24h: parseFloat(data.q) || prev[asset.id]?.quoteVolume24h || 0,
                change24h: prev[asset.id]?.change24h || 0,
              },
            }));
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        console.warn('Binance WS unavailable, using polling');
        ws.close();
      };

      ws.onclose = () => {
        // Start polling fallback
        if (!pollRef.current) {
          pollRef.current = setInterval(fetchPrices, 5000);
        }
      };
    } catch {
      // WS not available, poll
      pollRef.current = setInterval(fetchPrices, 5000);
    }

    // Refresh full 24hr data periodically
    const refreshInterval = setInterval(fetchPrices, 30000);

    return () => {
      clearInterval(refreshInterval);
      if (pollRef.current) clearInterval(pollRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [fetchPrices]);

  const getCryptoWithPrice = useCallback((crypto: CryptoAsset): CryptoAsset & { high24h?: number; low24h?: number; volume24hNum?: number; quoteVolume24h?: number } => {
    const priceData = prices[crypto.id];
    if (priceData) {
      return {
        ...crypto,
        price: priceData.price,
        change24h: priceData.change24h,
        high24h: priceData.high24h,
        low24h: priceData.low24h,
        volume24hNum: priceData.volume24h,
        quoteVolume24h: priceData.quoteVolume24h,
      };
    }
    return crypto;
  }, [prices]);

  const getAllCryptosWithPrices = useCallback((): CryptoAsset[] => {
    return cryptoAssets.map(c => {
      const priceData = prices[c.id];
      if (priceData) {
        return {
          ...c,
          price: priceData.price,
          change24h: priceData.change24h,
          volume24h: priceData.quoteVolume24h
            ? priceData.quoteVolume24h >= 1e9
              ? `$${(priceData.quoteVolume24h / 1e9).toFixed(1)}B`
              : priceData.quoteVolume24h >= 1e6
              ? `$${(priceData.quoteVolume24h / 1e6).toFixed(1)}M`
              : `$${priceData.quoteVolume24h.toLocaleString()}`
            : c.volume24h,
        };
      }
      return c;
    });
  }, [prices]);

  return {
    prices,
    isLoading,
    error,
    getCryptoWithPrice,
    getAllCryptosWithPrices,
    refetch: fetchPrices,
  };
}
