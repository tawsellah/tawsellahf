
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Phone, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { authRider, dbRider } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, get } from 'firebase/database';

const signInSchema = z.object({
  phoneNumber: z.string().regex(/^(07[789])\d{7}$/, "يجب أن يكون رقم الهاتف أردني صالح مكون من 10 أرقام ويبدأ بـ 077, 078, أو 079"),
  password: z.string().min(6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      phoneNumber: "",
      password: "",
    },
  });

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
      const snapshot = await get(usersRef);

      let userEmail: string | null = null;
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        for (const userId in usersData) {
          if (usersData[userId].phoneNumber === phoneNumber) {
            userEmail = usersData[userId].email;
            break;
          }
        }
      }

      if (userEmail) {
        await sendPasswordResetEmail(authRider, userEmail);
        toast({
          title: "تم إرسال رابط إعادة التعيين",
          description: `تم إرسال بريد إلكتروني إلى البريد المرتبط برقمك مع تعليمات لإعادة تعيين كلمة المرور.`,
          variant: "default",
        });
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
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3">
        <LogIn className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-center">تسجيل الدخول</h1>
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

    