
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
import { Loader2, User, Phone, Mail, Save, MessageSquare, ExternalLink, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageWrapper } from '@/components/layout/PageWrapper';

interface UserProfileData {
  fullName: string;
  phoneNumber: string;
  email: string;
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
    try {
      const supportNumRef = ref(dbRider, 'support/contactPhoneNumber');
      const snapshot = await get(supportNumRef);
      if (snapshot.exists() && typeof snapshot.val() === 'string') {
        setSupportPhoneNumber(snapshot.val() as string);
      } else {
        console.warn("Support phone number not found or not a string in dbRider at support/contactPhoneNumber. Using fallback.");
        setSupportPhoneNumber("0775580440"); 
      }
    } catch (error) {
      console.error("Error fetching support phone number:", error);
      toast({ title: "خطأ", description: "لم نتمكن من تحميل رقم هاتف الدعم.", variant: "destructive" });
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
          email: user.email || dbData.email || "", 
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
            phoneNumber: user.phoneNumber || "", // Auth might not have this for email/pass
            email: user.email || ""
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
      if (user) {
        setCurrentUserAuth(user);
        fetchUserData(user);
        fetchSupportPhoneNumber();
      } else {
        setCurrentUserAuth(null);
        setUserData(null);
        router.push('/auth/signin');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router, fetchUserData, fetchSupportPhoneNumber]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!currentUserAuth) return;
    setIsSaving(true);
    try {
      const userRef = ref(dbRider, `users/${currentUserAuth.uid}`);
      
      const updates: Partial<UserProfileData> & {updatedAt: any, email: string, uid: string, createdAt?: any} = {
        uid: currentUserAuth.uid,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        email: userData?.email || currentUserAuth.email || "", 
        updatedAt: serverTimestamp() // Use serverTimestamp for consistency
      };

      const userSnapshot = await get(userRef);
      if (!userSnapshot.exists()) {
        updates.createdAt = serverTimestamp(); // Set createdAt if user record is new in DB
      } else {
        // Preserve existing createdAt if it exists
        const existingData = userSnapshot.val();
        if (existingData.createdAt) {
            updates.createdAt = existingData.createdAt;
        } else {
            updates.createdAt = serverTimestamp(); // Fallback if somehow missing
        }
      }

      await update(userRef, updates);

      // Optimistically update local state, but prefer re-fetching or relying on Firebase listeners for production
      setUserData(prev => ({
        ...(prev || {}), 
        ...updates, 
        email: updates.email, // ensure email is part of UserProfileData
        updatedAt: Date.now() // Approximate client-side, actual is serverTimestamp
       } as UserProfileData)); 
       
      form.reset(data); // Reset form with new saved values
      toast({ title: "تم بنجاح", description: "تم تحديث بيانات ملفك الشخصي.", className: "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 border-green-300 dark:border-green-600"});
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "خطأ في التحديث", description: error.message || "لم نتمكن من حفظ التغييرات.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleWhatsAppSupport = () => {
    if (supportPhoneNumber) {
      let whatsappFormattedNumber = supportPhoneNumber.replace(/\s+/g, ''); // Remove spaces
      if (whatsappFormattedNumber.startsWith('0')) {
        whatsappFormattedNumber = `962${whatsappFormattedNumber.substring(1)}`;
      } else if (!whatsappFormattedNumber.startsWith('962')) {
        // If it's a local number without leading 0 and no country code, prepend 962
        // This case might need adjustment based on how numbers are stored
        // For now, assuming if it's not starting with 0 or 962, it might be missing country code.
        // To be safe, this might need more robust parsing or a fixed format in DB.
        // Let's assume for now numbers from DB are either 07... or 9627...
      }
      window.open(`https://wa.me/${whatsappFormattedNumber}`, '_blank', 'noopener,noreferrer');
    } else {
      toast({ title: "رقم الدعم غير متوفر", description: "عذراً، رقم هاتف الدعم غير متاح حالياً.", variant: "default" });
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

  if (!currentUserAuth || !userData) {
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
                      <Input placeholder="مثال: أحمد محمد" {...field} />
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
                      <Input type="tel" placeholder="مثال: 07XXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  البريد الإلكتروني
                </FormLabel>
                <Input type="email" value={userData.email || ''} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                <p className="text-xs text-muted-foreground pt-1">البريد الإلكتروني مرتبط بحسابك ولا يمكن تغييره من هنا.</p>
              </FormItem>

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
            disabled={!supportPhoneNumber}
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

    