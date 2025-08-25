
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Phone, Lock, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { authRider, dbRider } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { ref, query, orderByChild, equalTo, get, set } from 'firebase/database';
import { useEffect, useState } from 'react';

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
    </svg>
);


const signInSchema = z.object({
  phoneNumber: z.string().regex(/^(07[789])\d{7}$/, "يجب أن يكون رقم الهاتف أردني صالح مكون من 10 أرقام ويبدأ بـ 077, 078, أو 079"),
  password: z.string().min(6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessingGoogle, setIsProcessingGoogle] = useState(true);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      phoneNumber: "",
      password: "",
    },
  });

  useEffect(() => {
    const processRedirectResult = async () => {
      try {
        const result = await getRedirectResult(authRider);
        if (result) {
          const user = result.user;
          const userRef = ref(dbRider, `users/${user.uid}`);
          const snapshot = await get(userRef);

          if (!snapshot.exists()) {
            await set(userRef, {
              uid: user.uid,
              fullName: user.displayName || 'مستخدم Google',
              email: user.email,
              phoneNumber: user.phoneNumber || '',
              createdAt: Date.now(),
            });
            toast({ title: "مرحباً بك!", description: "تم إنشاء حسابك بنجاح باستخدام Google." });
          } else {
            toast({ title: "أهلاً بك مجدداً!", description: "تم تسجيل دخولك بنجاح." });
          }
          router.push('/');
        }
      } catch (error: any) {
        // Handle specific errors from getRedirectResult
        if (error.code !== 'auth/no-user-for-redirect') {
             toast({
                title: "خطأ في تسجيل الدخول عبر Google",
                description: error.message || "فشل إكمال تسجيل الدخول باستخدام Google.",
                variant: "destructive",
            });
        }
        console.error("Google sign-in getRedirectResult error:", error);
      } finally {
        setIsProcessingGoogle(false);
      }
    };
    
    processRedirectResult();
  }, [router, toast]);


  const handlePasswordReset = async () => {
    const phoneNumber = form.getValues("phoneNumber");
    const isPhoneValid = await form.trigger("phoneNumber");

    if (!isPhoneValid || !phoneNumber) {
      toast({
        title: "رقم هاتف غير صالح",
        description: "الرجاء إدخال رقم هاتف صالح أولاً.",
        variant: "destructive",
      });
      return;
    }

    try {
      const usersRef = ref(dbRider, 'users');
      const userQuery = query(usersRef, orderByChild('phoneNumber'), equalTo(phoneNumber));
      const snapshot = await get(userQuery);

      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const userId = Object.keys(usersData)[0];
        const userEmail = usersData[userId].email;

        if (userEmail) {
          await sendPasswordResetEmail(authRider, userEmail);
          toast({
            title: "تم إرسال رابط إعادة التعيين",
            description: `تم إرسال بريد إلكتروني إلى البريد المرتبط برقمك مع تعليمات لإعادة تعيين كلمة المرور.`,
            variant: "default",
          });
        } else {
           toast({ title: "خطأ", description: "لم يتم العثور على بريد إلكتروني مرتبط بهذا الحساب.", variant: "destructive" });
        }
      } else {
        toast({ title: "خطأ", description: "لم يتم العثور على حساب مرتبط برقم الهاتف هذا.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "خطأ في إعادة تعيين كلمة المرور",
        description: error.message || "فشل إرسال بريد إعادة التعيين. الرجاء المحاولة مرة أخرى.",
        variant: "destructive",
      });
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsProcessingGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(authRider, provider);
    } catch (error: any) {
      console.error("Google sign-in redirect initiation error:", error);
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error.message || "فشل بدء تسجيل الدخول باستخدام Google.",
        variant: "destructive",
      });
      setIsProcessingGoogle(false);
    }
  };


  const onSubmit = async (data: SignInFormData) => {
    form.clearErrors();
    const manufacturedEmail = `t${data.phoneNumber}@tawsellah.com`;
    
    try {
      await signInWithEmailAndPassword(authRider, manufacturedEmail, data.password);
      toast({
        title: "تم تسجيل الدخول بنجاح!",
        description: "أهلاً بك مجدداً.",
        className: "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 border-green-300 dark:border-green-600"
      });
      router.push('/');
    } catch (error) {
      console.error("Error signing in:", error);
      let errorMessage = "فشل تسجيل الدخول. الرجاء التحقق من المعلومات والمحاولة مرة أخرى.";
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message: string };
        switch (firebaseError.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
             errorMessage = "رقم الهاتف أو كلمة المرور غير صحيحة.";
            break;
          case 'auth/invalid-email':
            errorMessage = "صيغة البريد الإلكتروني المُصنّعة غير صالحة.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "تم حظر الوصول مؤقتًا بسبب عدد كبير جدًا من محاولات تسجيل الدخول الفاشلة. يرجى المحاولة مرة أخرى لاحقًا.";
            break;
          default:
            errorMessage = `فشل تسجيل الدخول: ${firebaseError.message || 'خطأ غير معروف'}`;
        }
      }

      toast({
        title: "خطأ في تسجيل الدخول",
        description: errorMessage,
        variant: "destructive",
      });
      form.setError("root", { message: "رقم الهاتف أو كلمة المرور غير صحيحة." });
    }
  };
  
  if (isProcessingGoogle) {
    return (
        <div className="flex flex-col justify-center items-center min-h-[200px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ms-4 text-lg mt-4">جارِ التحقق من تسجيل الدخول...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3">
        <LogIn className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-center">تسجيل الدخول</h1>
      </div>

      <Button
        variant="outline"
        onClick={handleGoogleSignIn}
        className="w-full p-3 rounded-lg text-base font-semibold"
        disabled={form.formState.isSubmitting}
      >
        <GoogleIcon />
        تسجيل الدخول باستخدام Google
      </Button>

      <div className="flex items-center my-4">
        <hr className="flex-grow border-t" />
        <span className="mx-4 text-sm text-muted-foreground">أو</span>
        <hr className="flex-grow border-t" />
      </div>


      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  رقم الهاتف
                </FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="07XXXXXXXX" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                 <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-primary" />
                      كلمة المرور
                    </FormLabel>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      نسيت كلمة السر؟
                    </button>
                 </div>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {form.formState.errors.root && (
             <p className="text-sm font-medium text-destructive text-center">{form.formState.errors.root.message}</p>
          )}

          <Button 
            type="submit" 
            className="w-full p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:bg-primary/90 hover:shadow-md active:scale-95"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <LogIn className="ms-2 h-5 w-5" />}
            {form.formState.isSubmitting ? "جارِ الدخول..." : "دخول"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm">
        ليس لديك حساب؟{' '}
        <Link href="/auth/signup" className="font-medium text-primary hover:underline">
          إنشاء حساب جديد
        </Link>
      </p>
    </div>
  );
}
