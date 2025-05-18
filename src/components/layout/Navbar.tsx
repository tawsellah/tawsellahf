"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogIn, UserPlus, Route } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/auth/signin', label: 'تسجيل الدخول', icon: LogIn },
  { href: '/auth/signup', label: 'إنشاء حساب جديد', icon: UserPlus },
  // Example for a main page link if user is logged in (placeholder)
  // { href: '/', label: 'الرئيسية', icon: Home }, 
];

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="h-16 bg-card shadow-md"></div>; // Placeholder for SSR to avoid hydration mismatch
  }

  const NavLinkItem = ({ href, label, icon: Icon, isMobile }: typeof navLinks[0] & {isMobile?: boolean}) => (
    <Link href={href} passHref legacyBehavior>
      <a
        onClick={() => isMobile && isMobileMenuOpen && setIsMobileMenuOpen(false)}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-300 ease-in-out",
          pathname === href
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        )}
        aria-current={pathname === href ? "page" : undefined}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </a>
    </Link>
  );


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/95 shadow-md backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" passHref legacyBehavior>
          <a className="flex items-center gap-2 text-xl font-bold text-primary transition-transform hover:scale-105">
            <Route className="h-7 w-7" />
            <span>رحلتي السريعة</span>
          </a>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <NavLinkItem key={link.href} {...link} />
          ))}
        </nav>

        {/* Mobile Navigation Trigger */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="فتح القائمة">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                 <Link href="/" passHref legacyBehavior>
                  <a onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-lg font-bold text-primary">
                    <Route className="h-6 w-6" />
                    <span>رحلتي السريعة</span>
                  </a>
                </Link>
                <SheetClose asChild>
                   <Button variant="ghost" size="icon" aria-label="إغلاق القائمة">
                    <X className="h-6 w-6" />
                  </Button>
                </SheetClose>
              </div>
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <NavLinkItem key={link.href} {...link} isMobile={true} />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
