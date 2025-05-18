import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { PageWrapper } from '@/components/layout/PageWrapper';

export default function MainAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen-svh flex-col">
      <Navbar />
      <PageWrapper>
        {children}
      </PageWrapper>
    </div>
  );
}
