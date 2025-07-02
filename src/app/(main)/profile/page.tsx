
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authRider, dbRider } from '@/lib/firebase';
import { onAuthStateChanged, signOut, type User as FirebaseUserAuth } from 'firebase/auth';
import { ref, get, update, serverTimestamp } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, User, Phone, Save, AlertCircle, MessageCircle, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageWrapper } from '@/components/layout/PageWrapper';

interface UserProfileData {
  fullName: string;
  phoneNumber: string;
  createdAt?: number;
  updatedAt?: number;
}

const profileFormSchema = z.object({
  fullName: z.string().min(3, "يجب أن يكون الاسم الكامل 3 أحرف على الأقل"),
  phoneNumber: z.string().regex(/^(07[789])\d{7}$/, "يجب أن يكون رقم الهاتف أردني صالح مكون من 10 أرقام ويبدأ بـ 077, 078, أو 079"),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

const FALLBACK_SUPPORT_PHONE = "0775580440"; 

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUserAuth | null>(null);
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [supportPhoneNumber, setSupportPhoneNumber] = useState<string>(FALLBACK_SUPPORT_PHONE);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
    },
  });

  const fetchSupportPhoneNumber = useCallback(async () => {
    const specificPath = 'support/contactPhoneNumber/contact';
    console.log(`PROFILE_PAGE: Attempting to fetch support phone number from path: ${specificPath}...`);
    try {
      const supportNumRef = ref(dbRider, specificPath);
      const snapshot = await get(supportNumRef);
      console.log(`PROFILE_PAGE_DEBUG: Snapshot for ${specificPath} exists:`, snapshot.exists());

      if (snapshot.exists()) {
        const val = snapshot.val();
        console.log(`PROFILE_PAGE_DEBUG: Raw value from ${specificPath}:`, JSON.stringify(val));
        console.log(`PROFILE_PAGE_DEBUG: Type of raw value from ${specificPath}:`, typeof val);

        if (typeof val === 'string' && val.trim() !== '') {
          setSupportPhoneNumber(val.trim());
          console.log(`PROFILE_PAGE: SUCCESS: Updated supportPhoneNumber state to: "${val.trim()}" (from string value in DB) from ${specificPath}`);
        } else if (typeof val === 'number') {
          const stringVal = String(val);
          setSupportPhoneNumber(stringVal);
          console.log(`PROFILE_PAGE: SUCCESS: Updated supportPhoneNumber state to: "${stringVal}" (converted from number in DB) from ${specificPath}`);
        } else {
          if (val === null) {
             console.warn(`PROFILE_PAGE_DEBUG: FALLBACK_REASON: Value from DB at ${specificPath} is NULL. Using fallback.`);
          } else if (typeof val !== 'string' && typeof val !== 'number') { 
            console.warn(`PROFILE_PAGE_DEBUG: FALLBACK_REASON: Value from DB at ${specificPath} is NOT a string or number. Type: ${typeof val}. Value: ${JSON.stringify(val)}. Using fallback.`);
          } else { 
            console.warn(`PROFILE_PAGE_DEBUG: FALLBACK_REASON: Value from DB at ${specificPath} is an EMPTY string or whitespace. Value: "${val}". Using fallback.`);
          }
          setSupportPhoneNumber(FALLBACK_SUPPORT_PHONE);
        }
      } else {
        console.warn(`PROFILE_PAGE_DEBUG: FALLBACK_REASON: Path ${specificPath} NOT FOUND in dbRider. Using fallback '${FALLBACK_SUPPORT_PHONE}'.`);
        setSupportPhoneNumber(FALLBACK_SUPPORT_PHONE);
      }
    } catch (error) {
      console.error(`PROFILE_PAGE: ERROR fetching support phone number from ${specificPath}:`, error);
      toast({ title: "خطأ", description: "لم نتمكن من تحميل رقم هاتف الدعم. سيتم استخدام الرقم الافتراضي.", variant: "destructive" });
      setSupportPhoneNumber(FALLBACK_SUPPORT_PHONE);
    }
  }, [toast]);

  const fetchUserData = useCallback(async (user: FirebaseUserAuth) => {
    try {
      const userRef = ref(dbRider, `users/${user.uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const dbData = snapshot.val();
        const profileData: UserProfileData = {
          fullName: dbData.fullName || "",
          phoneNumber: dbData.phoneNumber || "",
          createdAt: dbData.createdAt,
          updatedAt: dbData.updatedAt,
        };
        setUserData(profileData);
        form.reset({
          fullName: profileData.fullName,
          phoneNumber: profileData.phoneNumber,
        });
      } else {
        const profileData: UserProfileData = {
            fullName: user.displayName || "",
            phoneNumber: user.phoneNumber || "",
        };
        setUserData(profileData);
        form.reset({
          fullName: profileData.fullName,
          phoneNumber: profileData.phoneNumber,
        });
        toast({ title: "ملاحظة", description: "لم يتم العثور على بيانات ملفك الشخصي في قاعدة البيانات. يرجى إكمالها وحفظها.", variant: "default"});
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({ title: "خطأ", description: "لم نتمكن من تحميل بيانات ملفك الشخصي.", variant: "destructive" });
    }
  }, [form, toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authRider, (user) => {
      setIsLoading(true);
      if (user) {
        setCurrentUserAuth(user);
        // Initial fetch for user data and support phone number
        Promise.all([fetchUserData(user), fetchSupportPhoneNumber()]).then(() => {
          setIsLoading(false);
        });
      } else {
        setCurrentUserAuth(null);
        setUserData(null);
        router.push('/auth/signin');
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, fetchUserData, fetchSupportPhoneNumber]);

  // useEffect for periodically fetching the support phone number
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (currentUserAuth) {
      // Interval starts after user is authenticated.
      // fetchSupportPhoneNumber is already called once in the onAuthStateChanged effect.
      intervalId = setInterval(() => {
        console.log("PROFILE_PAGE_INTERVAL: Re-fetching support phone number every 30 seconds.");
        fetchSupportPhoneNumber();
      }, 30000); // 30 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log("PROFILE_PAGE_INTERVAL: Cleared support phone number fetch interval.");
      }
    };
  }, [currentUserAuth, fetchSupportPhoneNumber]);


  const onSubmit = async (data: ProfileFormData) => {
    if (!currentUserAuth) return;
    setIsSaving(true);
    try {
      const userRef = ref(dbRider, `users/${currentUserAuth.uid}`);

      const updates: Partial<Omit<UserProfileData, 'email'>> & {updatedAt: any, uid: string, createdAt?: any, email?: string } = {
        uid: currentUserAuth.uid,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        updatedAt: serverTimestamp()
      };

      if (currentUserAuth.email) {
          updates.email = currentUserAuth.email;
      }

      const userSnapshot = await get(userRef);
      if (!userSnapshot.exists()) {
        updates.createdAt = serverTimestamp();
      } else {
        const existingData = userSnapshot.val();
        if (existingData.createdAt) {
            updates.createdAt = existingData.createdAt;
        } else {
            updates.createdAt = serverTimestamp(); // Should ideally not happen if createdAt is always set on creation
        }
      }

      await update(userRef, updates);

      setUserData(prev => ({
        ...(prev || { fullName: "", phoneNumber: ""}), // Ensure prev is not null
        ...updates,
        updatedAt: Date.now() // Use client time for immediate UI update of updatedAt
       } as UserProfileData)); // Cast to UserProfileData

      form.reset(data); // Update form with successfully saved data
      toast({ title: "تم بنجاح", description: "تم تحديث بيانات ملفك الشخصي.", className: "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 border-green-300 dark:border-green-600"});
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "خطأ في التحديث", description: error.message || "لم نتمكن من حفظ التغييرات.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleWhatsAppSupport = () => {
    console.log("PROFILE_PAGE: handleWhatsAppSupport called. Current supportPhoneNumber state:", supportPhoneNumber);
    if (!supportPhoneNumber) {
        toast({ title: "خطأ", description: "رقم هاتف الدعم غير متوفر حاليًا.", variant: "destructive" });
        return;
    }

    let numberToUse = String(supportPhoneNumber).replace(/\s+/g, ""); 

    if (numberToUse.startsWith("00")) {
      numberToUse = numberToUse.substring(2);
    }
    if (numberToUse.startsWith("+")) {
      numberToUse = numberToUse.substring(1);
    }

    if (numberToUse.startsWith("07") && numberToUse.length === 10) { 
       numberToUse = "962" + numberToUse.substring(1);
    }

    if (!/^\d+$/.test(numberToUse)) { 
        console.error("PROFILE_PAGE: Invalid characters in support phone number after formatting:", numberToUse);
        toast({ title: "خطأ", description: "رقم هاتف الدعم غير صالح.", variant: "destructive" });
        return;
    }

    const whatsappLink = `https://wa.me/${numberToUse}`;
    console.log("PROFILE_PAGE: Opening WhatsApp with number for wa.me:", numberToUse);
    console.log("PROFILE_PAGE: Full WhatsApp link:", whatsappLink);
    window.open(whatsappLink, '_blank', 'noopener,noreferrer');
  };

  const handleSignOut = async () => {
    try {
      await signOut(authRider);
      toast({ title: "تم تسجيل الخروج بنجاح" });
      router.push('/auth/signin');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء تسجيل الخروج.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex flex-col justify-center items-center min-h-[calc(100vh-300px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ms-4 text-lg mt-4">جاري تحميل ملفك الشخصي...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!currentUserAuth) {
    return (
      <PageWrapper>
        <div className="text-center py-10">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
            <p className="text-destructive text-lg">الرجاء تسجيل الدخول لعرض ملفك الشخصي.</p>
            <Button onClick={() => router.push('/auth/signin')} className="mt-4">
                الذهاب لتسجيل الدخول
            </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <User className="h-8 w-8 text-primary" />
            ملفي الشخصي
          </CardTitle>
          <CardDescription>عرض وتعديل معلومات حسابك.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      الاسم الكامل
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: أحمد محمد" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      رقم الهاتف
                    </FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="مثال: 07XXXXXXXX" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full p-3 text-base" disabled={isSaving || isLoading}>
                {isSaving ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <Save className="ms-2 h-5 w-5" />}
                {isSaving ? "جارِ الحفظ..." : "حفظ التغييرات"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-6 border-t">
          <Button
            onClick={handleWhatsAppSupport}
            className="w-full p-3 text-base bg-[#25D366] text-white hover:bg-[#1DAE54] focus:bg-[#1DAE54] focus:ring-[#25D366]"
            aria-label="تواصل مع الدعم"
            disabled={isLoading} 
          >
            <MessageCircle className="ms-2 h-5 w-5" />
            <strong>تواصل مع الدعم</strong>
          </Button>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="w-full p-3 text-base"
            disabled={isSaving}
          >
            <LogOut className="ms-2 h-5 w-5" />
            تسجيل الخروج
          </Button>
        </CardFooter>
      </Card>
    </PageWrapper>
  );
}
