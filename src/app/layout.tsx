import type { Metadata } from 'next';
import { cairo } from '@/lib/fonts';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'رحلتي السريعة',
  description: 'تطبيق لحجز الرحلات ومشاركة السيارات',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
