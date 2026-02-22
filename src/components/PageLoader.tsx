import { ReactNode } from 'react';

interface PageLoaderProps {
  children: ReactNode;
  duration?: number;
}

// No loading animation - render children immediately
export function PageLoader({ children }: PageLoaderProps) {
  return <>{children}</>;
}
