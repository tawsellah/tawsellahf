import type { ReactNode } from 'react';
import Link from 'next/link';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Route } from 'lucide-react'; // Changed ArrowRight to ArrowLeft for RTL "back"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen-svh flex-col items-center justify-center bg-background p-4">
       <div className="absolute top-6 start-6">
         <Button variant="ghost" asChild>
           <Link href="/">
             <ArrowLeft className="ms-2 h-5 w-5" /> 
             <span>العودة إلى الرئيسية</span>
           </Link>
         </Button>
       </div>
       <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold text-primary transition-transform hover:scale-105">
          <Route className="h-8 w-8" />
          <span>رحلتي السريعة</span>
        </Link>
      <PageWrapper className="w-full max-w-md"> {/* Max width for auth forms can be smaller */}
        {children}
      </PageWrapper>
    </div>
  );
}
