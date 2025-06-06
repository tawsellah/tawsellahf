
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authRider, dbRider } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUserAuth } from 'firebase/auth';
import { ref, get, update, serverTimestamp } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, User, Phone, Save, MessageSquare, ExternalLink, AlertCircle } from 'lucide-react';
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

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUserAuth | null>(null);
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [supportPhoneNumber, setSupportPhoneNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
    },
  });

  const fetchSupportPhoneNumber = useCallback(async () => {
    console.log("PROFILE_PAGE: Attempting to fetch support phone number...");
    try {
      const supportNumRef = ref(dbRider, 'support/contactPhoneNumber');
      const snapshot = await get(supportNumRef);
      console.log("PROFILE_PAGE: Snapshot for support/contactPhoneNumber exists:", snapshot.exists());

      if (snapshot.exists()) {
        const val = snapshot.val();
        console.log("PROFILE_PAGE: Value from support/contactPhoneNumber:", JSON.stringify(val)); // Log the raw value
        console.log("PROFILE_PAGE: Typeof value from support/contactPhoneNumber:", typeof val);

        if (typeof val === 'string' && val.trim() !== '') {
          console.log("PROFILE_PAGE: Successfully fetched support number from DB as string:", val);
          setSupportPhoneNumber(val);
        } else {
          console.warn("PROFILE_PAGE: Support phone number found in DB, but it's NOT a valid non-empty string. Value:", JSON.stringify(val), ". Using fallback '0775580440'.");
          setSupportPhoneNumber("0775580440");
        }
      } else {
        console.warn("PROFILE_PAGE: Support phone number NOT FOUND in dbRider at support/contactPhoneNumber. Using fallback '0775580440'.");
        setSupportPhoneNumber("0775580440");
      }
    } catch (error) {
      console.error("PROFILE_PAGE: Error fetching support phone number:", error);
      toast({ title: "خطأ", description: "لم نتمكن من تحميل رقم هاتف الدعم. سيتم استخدام الرقم الافتراضي.", variant: "destructive" });
      setSupportPhoneNumber("0775580440");
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
      setIsLoading(true); // Set loading true at the start of auth check
      if (user) {
        setCurrentUserAuth(user);
        Promise.all([fetchUserData(user), fetchSupportPhoneNumber()]).then(() => {
          setIsLoading(false);
        });
      } else {
        setCurrentUserAuth(null);
        setUserData(null);
        setSupportPhoneNumber(null);
        router.push('/auth/signin');
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, fetchUserData, fetchSupportPhoneNumber]);

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
            updates.createdAt = serverTimestamp();
        }
      }

      await update(userRef, updates);

      setUserData(prev => ({
        ...(prev || { fullName: "", phoneNumber: ""}),
        ...updates,
        updatedAt: Date.now()
       } as UserProfileData));

      form.reset(data);
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
    if (supportPhoneNumber && supportPhoneNumber.trim() !== "") {
      let whatsappFormattedNumber = supportPhoneNumber.replace(/\s+/g, ''); // Remove spaces

      if (whatsappFormattedNumber.startsWith('+')) { // Remove leading + for wa.me links
        whatsappFormattedNumber = whatsappFormattedNumber.substring(1);
      }

      // Ensure it starts with country code if not already (assuming Jordanian numbers)
      if (whatsappFormattedNumber.startsWith('07')) { // e.g., 077..., 078..., 079...
        whatsappFormattedNumber = `962${whatsappFormattedNumber.substring(1)}`;
      } else if (whatsappFormattedNumber.startsWith('7') && whatsappFormattedNumber.length === 9 && ['7','8','9'].includes(whatsappFormattedNumber.charAt(0))) {
        // Handles cases like 77xxxxxxx, 78xxxxxxx, 79xxxxxxx (9 digits)
         if (!whatsappFormattedNumber.startsWith('962')) { // Double check it doesn't already have 962
            whatsappFormattedNumber = `962${whatsappFormattedNumber}`;
         }
      }
      // Numbers already in international format like 9627... will pass through.

      console.log("PROFILE_PAGE: Opening WhatsApp with number for wa.me:", whatsappFormattedNumber);
      window.open(`https://wa.me/${whatsappFormattedNumber}`, '_blank', 'noopener,noreferrer');
    } else {
      console.warn("PROFILE_PAGE: WhatsApp button clicked, but supportPhoneNumber is null, empty, or fallback. Using hardcoded fallback for wa.me: 962775580440");
      toast({ title: "رقم الدعم غير متوفر", description: "عذراً، رقم هاتف الدعم غير متاح حالياً. الرجاء المحاولة لاحقاً أو الاتصال بالرقم الافتراضي.", variant: "default" });
      // Fallback directly in the wa.me link if all else fails and state is still the default app fallback
      window.open(`https://wa.me/962775580440`, '_blank', 'noopener,noreferrer');
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

  if (!currentUserAuth) { // Removed !userData check here as it might be briefly null during initial load
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

              <Button type="submit" className="w-full p-3 text-base" disabled={isSaving}>
                {isSaving ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <Save className="ms-2 h-5 w-5" />}
                {isSaving ? "جارِ الحفظ..." : "حفظ التغييرات"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-6 border-t">
           <Button
            onClick={handleWhatsAppSupport}
            disabled={isSaving} // Enable button even if number is loading, will use fallback if necessary
            className="w-full p-3 text-base bg-[#25D366] text-white hover:bg-[#1DAE54] focus:bg-[#1DAE54] focus:ring-[#25D366]"
            aria-label="تواصل مع الدعم عبر واتساب"
            >
            <MessageSquare className="ms-2 h-5 w-5" />
            تواصل مع الدعم عبر واتساب
            {supportPhoneNumber && <ExternalLink className="me-2 h-4 w-4 opacity-70" />}
          </Button>
        </CardFooter>
      </Card>
    </PageWrapper>
  );
}

    