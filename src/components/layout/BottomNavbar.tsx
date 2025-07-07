"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUserAuth } from 'firebase/auth';
import { authRider } from '@/lib/firebase';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/my-trips', label: 'رحلاتي', icon: History },
  { href: '/', label: 'بحث', icon: Search },
  { href: '/profile', label: 'ملفي الشخصي', icon: User },
];

export function BottomNavbar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<FirebaseUserAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authRider, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading || !currentUser) {
    return null; // Don't render anything if loading or not logged in
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 shadow-[0_-1px_3px_rgba(0,0,0,0.05)] backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto grid h-16 max-w-lg grid-cols-3 items-center justify-items-center px-4">
        {navItems.map((item) => {
          const isActive = (item.href === '/' && pathname === '/') || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} passHref legacyBehavior>
              <a className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-primary">
                <div
                  className={cn(
                    'flex flex-col items-center gap-1',
                    isActive ? 'text-primary' : ''
                  )}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
