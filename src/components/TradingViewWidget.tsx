import { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  theme?: 'light' | 'dark';
  height?: number;
}

function TradingViewWidgetComponent({ symbol, theme = 'dark', height = 400 }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    // Clear previous widget
    container.current.innerHTML = '';

    // Map symbol to TradingView format
    const getTradingViewSymbol = (sym: string): string => {
      const symbolMap: Record<string, string> = {
        'EUR/USD': 'FX:EURUSD',
        'GBP/USD': 'FX:GBPUSD',
        'USD/JPY': 'FX:USDJPY',
        'USD/CHF': 'FX:USDCHF',
        'AUD/USD': 'FX:AUDUSD',
        'USD/CAD': 'FX:USDCAD',
        'NZD/USD': 'FX:NZDUSD',
        'EUR/GBP': 'FX:EURGBP',
        'EUR/JPY': 'FX:EURJPY',
        'GBP/JPY': 'FX:GBPJPY',
        'BTC/USD': 'BINANCE:BTCUSDT',
        'ETH/USD': 'BINANCE:ETHUSDT',
        'SOL/USD': 'BINANCE:SOLUSDT',
        'XRP/USD': 'BINANCE:XRPUSDT',
        'ADA/USD': 'BINANCE:ADAUSDT',
        'DOGE/USD': 'BINANCE:DOGEUSDT',
        'DOT/USD': 'BINANCE:DOTUSDT',
        'LINK/USD': 'BINANCE:LINKUSDT',
        'XAU/USD': 'TVC:GOLD',
        'XAG/USD': 'TVC:SILVER',
        'WTI/USD': 'TVC:USOIL',
        'BRENT/USD': 'TVC:UKOIL',
        'NATGAS/USD': 'PEPPERSTONE:NATGAS',
        'US500': 'FOREXCOM:SPXUSD',
        'US30': 'FOREXCOM:DJI',
        'USTEC': 'PEPPERSTONE:NAS100',
        'UK100': 'FOREXCOM:UKXGBP',
        'GER40': 'PEPPERSTONE:GER40',
        'JPN225': 'TVC:NI225',
        'AAPL': 'NASDAQ:AAPL',
        'TSLA': 'NASDAQ:TSLA',
        'AMZN': 'NASDAQ:AMZN',
        'GOOGL': 'NASDAQ:GOOGL',
        'MSFT': 'NASDAQ:MSFT',
        'NVDA': 'NASDAQ:NVDA',
        'META': 'NASDAQ:META',
      };
      return symbolMap[sym] || 'FX:EURUSD';
    };

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: getTradingViewSymbol(symbol),
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      studies: [],
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
    });

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = `${height}px`;
    widgetContainer.style.width = '100%';

    container.current.appendChild(widgetContainer);
    container.current.appendChild(script);

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbol, theme, height]);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: `${height}px`, width: '100%' }}>
      <div className="tradingview-widget-container__widget" style={{ height: 'calc(100% - 32px)', width: '100%' }}></div>
    </div>
  );
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);
