import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { BottomNavbar } from '@/components/layout/BottomNavbar';

export default function MainAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen-svh flex-col">
      <Navbar />
      <div className="flex-grow pb-16">
        <PageWrapper>
          {children}
        </PageWrapper>
      </div>
      <BottomNavbar />
    </div>
  );
}
