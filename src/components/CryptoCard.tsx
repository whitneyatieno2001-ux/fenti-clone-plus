import { cn } from '@/lib/utils';
import { formatPrice, formatChange, type CryptoAsset } from '@/data/cryptoData';

interface CryptoCardProps {
  crypto: CryptoAsset;
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

export function CryptoCard({ crypto, onClick, variant = 'default' }: CryptoCardProps) {
  const isPositive = crypto.change24h >= 0;

  if (variant === 'compact') {
    return (
      <div 
        onClick={onClick}
        className={cn(
          "flex items-center justify-between p-4 rounded-xl transition-all duration-200 cursor-pointer",
          "bg-card hover:bg-secondary border border-border/50"
        )}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: `${crypto.color}20`, color: crypto.color }}
          >
            {crypto.icon}
          </div>
          <div>
            <p className="font-semibold text-foreground">{crypto.symbol}</p>
            <p className="text-sm text-muted-foreground">{crypto.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-foreground">{formatPrice(crypto.price)}</p>
          <p className={cn(
            "text-sm font-medium",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {formatChange(crypto.change24h)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-4 rounded-2xl transition-all duration-300 cursor-pointer border-2",
        isPositive 
          ? "bg-crypto-card-green border-crypto-card-green-border" 
          : "bg-crypto-card-red border-crypto-card-red-border",
        "hover:scale-[1.02] hover:shadow-card"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-sm"
          style={{ backgroundColor: crypto.color, color: 'white' }}
        >
          {crypto.icon}
        </div>
        <span className={cn(
          "text-sm font-semibold px-2 py-0.5 rounded",
          isPositive ? "text-success" : "text-destructive"
        )}>
          {formatChange(crypto.change24h)}
        </span>
      </div>
      <div>
        <p className="font-bold text-foreground">{crypto.symbol}</p>
        <p className="text-sm text-muted-foreground mb-2">{crypto.name}</p>
        <p className="font-bold text-lg text-foreground">{formatPrice(crypto.price)}</p>
      </div>
    </div>
  );
}
