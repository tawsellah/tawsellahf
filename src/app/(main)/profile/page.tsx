
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
import { Loader2, User, Phone, Save, AlertCircle, LogOut, Mail, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserProfileData {
  fullName: string;
  phoneNumber: string;
  email: string;
  gender?: 'male' | 'female';
  createdAt?: number;
  updatedAt?: number;
}

const profileFormSchema = z.object({
  fullName: z.string().min(3, "يجب أن يكون الاسم الكامل 3 أحرف على الأقل"),
  phoneNumber: z.string().regex(/^(07[789])\d{7}$/, "يجب أن يكون رقم الهاتف أردني صالح مكون من 10 أرقام ويبدأ بـ 077, 078, أو 079").optional().or(z.literal('')),
  gender: z.enum(["male", "female"], { required_error: "الرجاء تحديد الجنس" }),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUserAuth | null>(null);
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
    },
  });
  
  const readOnlyForm = useForm<{ email: string; }>({
    defaultValues: { email: "" }
  });

  const fetchUserData = useCallback(async (user: FirebaseUserAuth) => {
    try {
      const userRef = ref(dbRider, `users/${user.uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const dbData = snapshot.val();
        const profileData: UserProfileData = {
          fullName: dbData.fullName || user.displayName || "",
          phoneNumber: dbData.phoneNumber || user.phoneNumber || "",
          email: dbData.email || user.email || "غير متوفر",
          gender: dbData.gender,
          createdAt: dbData.createdAt,
          updatedAt: dbData.updatedAt,
        };
        setUserData(profileData);
        form.reset({ 
            fullName: profileData.fullName,
            phoneNumber: profileData.phoneNumber,
            gender: profileData.gender
        });
        readOnlyForm.reset({ email: profileData.email });
      } else {
        const profileData: UserProfileData = {
            fullName: user.displayName || "",
            phoneNumber: user.phoneNumber || "",
            email: user.email || "غير متوفر",
        };
        setUserData(profileData);
        form.reset({ 
            fullName: profileData.fullName,
            phoneNumber: profileData.phoneNumber,
        });
        readOnlyForm.reset({ email: profileData.email });
        toast({ title: "ملاحظة", description: "لم يتم العثور على بيانات ملفك الشخصي في قاعدة البيانات. يرجى إكمالها وحفظها.", variant: "default"});
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({ title: "خطأ", description: "لم نتمكن من تحميل بيانات ملفك الشخصي.", variant: "destructive" });
    }
  }, [form, readOnlyForm, toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authRider, (user) => {
      setIsLoading(true);
      if (user) {
        setCurrentUserAuth(user);
        fetchUserData(user).then(() => {
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
  }, [router, fetchUserData]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!currentUserAuth || !userData) return;
    setIsSaving(true);
    try {
      const userRef = ref(dbRider, `users/${currentUserAuth.uid}`);
      
      const updates: Partial<UserProfileData> & {updatedAt: any} = {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        gender: data.gender,
        updatedAt: serverTimestamp()
      };

      await update(userRef, updates);

      const updatedProfileData: UserProfileData = {
        ...userData,
        ...updates,
        updatedAt: Date.now(),
       };

      setUserData(updatedProfileData); 

      toast({ title: "تم بنجاح", description: "تم تحديث بيانات ملفك الشخصي.", className: "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 border-green-300 dark:border-green-600"});
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "خطأ في التحديث", description: error.message || "لم نتمكن من حفظ التغييرات.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
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
    <>
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
                  control={readOnlyForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        البريد الإلكتروني
                      </FormLabel>
                      <FormControl>
                        <Input type="email" {...field} readOnly className="cursor-not-allowed bg-muted/50" />
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

                <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            الجنس
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر الجنس" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="male">ذكر</SelectItem>
                            <SelectItem value="female">أنثى</SelectItem>
                            </SelectContent>
                        </Select>
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
    </>
  );
}
