import { useState, useEffect, ReactNode } from 'react';

interface PageLoaderProps {
  children: ReactNode;
  duration?: number;
}

export function PageLoader({ children, duration = 800 }: PageLoaderProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        {/* Top loading bar - golden */}
        <div className="fixed top-0 left-0 right-0 h-[3px] z-[100] overflow-hidden bg-amber-900/20">
          <div className="h-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 animate-[loading-bar_1.2s_ease-in-out_infinite]" />
        </div>

        {/* Skeleton header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur">
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
              <div className="h-8 w-20 bg-muted rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Center bars loader - golden, like Deriv */}
        <div className="flex items-end gap-1.5">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="w-2.5 rounded-sm bg-gradient-to-t from-amber-500 to-yellow-400"
              style={{
                animation: `bar-bounce 1s ease-in-out ${i * 0.12}s infinite`,
                height: '24px',
              }}
            />
          ))}
        </div>

        <p className="mt-6 text-muted-foreground text-base font-medium">Loading...</p>

        <style>{`
          @keyframes loading-bar {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
          }
          @keyframes bar-bounce {
            0%, 100% { transform: scaleY(1); opacity: 0.6; }
            50% { transform: scaleY(2.2); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return <div className="animate-fade-in">{children}</div>;
}
