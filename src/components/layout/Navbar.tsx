
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogIn, UserPlus, Route, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { authRider, dbRider } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUserAuth } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { FirebaseUser } from '@/types'; 

interface UserDisplayData {
  fullName: string;
  phoneNumber: string;
}

const defaultNavLinks = [
  { href: '/auth/signin', label: 'تسجيل الدخول', icon: LogIn, id: 'signin' },
  { href: '/auth/signup', label: 'إنشاء حساب جديد', icon: UserPlus, id: 'signup' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUserAuth | null>(null);
  const [userData, setUserData] = useState<UserDisplayData | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    const unsubscribe = onAuthStateChanged(authRider, async (user) => {
      setIsLoadingAuth(true);
      if (user) {
        setCurrentUserAuth(user);
        const userRef = ref(dbRider, `users/${user.uid}`);
        try {
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const dbUserData = snapshot.val() as FirebaseUser; 
            setUserData({
              fullName: dbUserData.fullName || user.email || "مستخدم",
              phoneNumber: dbUserData.phoneNumber || "غير متوفر",
            });
          } else {
            setUserData({ // User in Auth but not DB
              fullName: user.displayName || user.email || "مستخدم",
              phoneNumber: user.phoneNumber || "يرجى التحديث",
            });
          }
        } catch (error) {
            console.error("Failed to fetch user data:", error);
            setUserData({ 
              fullName: user.email || "مستخدم",
              phoneNumber: "خطأ في تحميل البيانات",
            });
        }
      } else {
        setCurrentUserAuth(null);
        setUserData(null);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  
  const NavLinkItem = ({ href, label, icon: Icon, isMobile, id, onClickOverride }: {href: string, label: string, icon: React.ElementType, isMobile?: boolean, id: string, onClickOverride?: () => void}) => (
    <Link href={href} passHref legacyBehavior>
      <a
        onClick={(e) => {
          if (onClickOverride) {
            e.preventDefault(); // Prevent Link default navigation if onClickOverride exists
            onClickOverride();
          }
          if (isMobile && isMobileMenuOpen) setIsMobileMenuOpen(false);
        }}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-300 ease-in-out w-full md:w-auto justify-start md:justify-center",
          pathname === href && !onClickOverride 
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        )}
        aria-current={pathname === href && !onClickOverride ? "page" : undefined}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </a>
    </Link>
  );

  const renderNavItems = (isMobile = false) => {
    if (isLoadingAuth) {
      // Render skeleton or nothing on server and initial client render
      if (isMobile) {
        return (
           <div className="flex items-center gap-3 p-4 border-b">
              <Avatar>
                <AvatarFallback className="bg-muted animate-pulse"></AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="h-4 w-24 rounded-md bg-muted animate-pulse"></div>
                <div className="h-3 w-32 rounded-md bg-muted animate-pulse"></div>
              </div>
            </div>
        );
      }
      return <div className="h-8 w-48 rounded-md bg-muted animate-pulse hidden md:block"></div>;
    }

    if (currentUserAuth && userData) {
      if (isMobile) {
        return (
          <>
            <Link href="/profile" passHref legacyBehavior>
              <a 
                className="flex items-center gap-3 p-4 border-b hover:bg-accent/50 transition-colors"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  router.push('/profile');
                }}
              >
                <Avatar>
                  <AvatarImage src={currentUserAuth.photoURL || undefined} alt={userData.fullName} data-ai-hint="user avatar" />
                  <AvatarFallback>{userData.fullName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{userData.fullName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> 
                    {userData.phoneNumber}
                  </p>
                </div>
              </a>
            </Link>
          </>
        );
      } else {
        // Desktop logged-in view
        return (
          <div className="flex items-center gap-4">
            <Link href="/profile" passHref legacyBehavior>
              <a className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
                 onClick={() => router.push('/profile')}
              >
                <Avatar>
                  <AvatarImage src={currentUserAuth.photoURL || undefined} alt={userData.fullName} data-ai-hint="user avatar" />
                  <AvatarFallback>{userData.fullName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-sm text-right">
                  <div className="font-medium text-foreground">{userData.fullName}</div>
                  <div className="text-xs text-muted-foreground dir-ltr flex items-center justify-end gap-1">
                    {userData.phoneNumber}
                    <Phone className="h-3 w-3" /> 
                  </div>
                </div>
              </a>
            </Link>
          </div>
        );
      }
    } else {
      // Logged-out state
      return defaultNavLinks.map((link) => (
        <NavLinkItem key={link.id} {...link} isMobile={isMobile} id={link.id} />
      ));
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/95 shadow-md backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" passHref legacyBehavior>
          <a className="flex items-center gap-2 text-xl font-bold text-primary transition-transform hover:scale-105">
            <Route className="h-7 w-7" />
            <span>توصيلة</span>
          </a>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          {isMounted && renderNavItems(false)}
        </nav>

        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="فتح القائمة">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-card p-0 flex flex-col"> {/* Added flex flex-col */}
              <div className="mb-0 flex items-center justify-between px-6 py-4 border-b"> {/* Adjusted padding */}
                 <Link href="/" passHref legacyBehavior>
                  <a onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-lg font-bold text-primary">
                    <Route className="h-6 w-6" />
                    <span>توصيلة</span>
                  </a>
                </Link>
                <SheetClose asChild>
                   <Button variant="ghost" size="icon" aria-label="إغلاق القائمة">
                    <X className="h-6 w-6" />
                  </Button>
                </SheetClose>
              </div>
              <nav className="flex flex-col flex-grow"> {/* Added flex-grow */}
                {isMounted && renderNavItems(true)}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
