import { useState, useEffect, ReactNode } from 'react';

interface PageLoaderProps {
  children: ReactNode;
  duration?: number;
}

export function PageLoader({ children, duration = 600 }: PageLoaderProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top loading bar */}
        <div className="fixed top-0 left-0 right-0 h-[2px] z-[100] overflow-hidden">
          <div className="h-full bg-primary animate-[loading-bar_0.8s_ease-in-out_infinite]" />
        </div>

        {/* Skeleton content */}
        <div className="flex-1 p-4 space-y-4 animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center justify-between h-14">
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-muted rounded-full" />
              <div className="h-8 w-8 bg-muted rounded-full" />
            </div>
          </div>

          {/* Content skeletons */}
          <div className="h-24 bg-muted rounded-xl" />
          <div className="flex gap-3">
            <div className="h-10 flex-1 bg-muted rounded-lg" />
            <div className="h-10 flex-1 bg-muted rounded-lg" />
            <div className="h-10 flex-1 bg-muted rounded-lg" />
          </div>
          <div className="h-64 bg-muted rounded-xl" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes loading-bar {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return <div className="animate-fade-in">{children}</div>;
}
