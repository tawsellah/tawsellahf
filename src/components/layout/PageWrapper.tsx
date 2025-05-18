import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <main className={cn("mx-auto w-full max-w-[600px] bg-card rounded-xl shadow-lg p-8 md:p-10 my-6 md:my-10", className)}>
      {children}
    </main>
  );
}
