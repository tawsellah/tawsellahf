
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, User, Phone, Lock, Check, ArrowLeft, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { authRider, dbRider } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get, query, orderByChild, equalTo } from 'firebase/database';

const signUpSchema = z.object({
  fullName: z.string().min(3, "يجب أن يكون الاسم الكامل 3 أحرف على الأقل"),
  phoneNumber: z.string().regex(/^(07[789])\d{7}$/, "يجب أن يكون رقم الهاتف أردني صالح مكون من 10 أرقام ويبدأ بـ 077, 078, أو 079"),
  email: z.string().email("الرجاء إدخال بريد إلكتروني صالح"),
  password: z.string().min(6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"),
  confirmPassword: z.string().min(6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    form.clearErrors();
    
    try {
      // IMPORTANT: To query by phoneNumber, you MUST have an index in your Firebase Rules.
      // Go to Realtime Database -> Rules and add: { "rules": { "users": { ".indexOn": "phoneNumber" } } }
      // The following check is temporarily disabled to prevent app crashes due to missing index.
      /*
      const usersRef = ref(dbRider, 'users');
      const phoneQuery = query(usersRef, orderByChild('phoneNumber'), equalTo(data.phoneNumber));
      const snapshot = await get(phoneQuery);

      if (snapshot.exists()) {
        form.setError("phoneNumber", { message: "رقم الهاتف هذا مسجل بالفعل." });
        toast({ title: "خطأ في التسجيل", description: "رقم الهاتف الذي أدخلته مستخدم بالفعل.", variant: "destructive" });
        return;
      }
      */

      // Use the real email for auth creation
      const userCredential = await createUserWithEmailAndPassword(authRider, data.email, data.password);
      const user = userCredential.user;

      // Save additional user info to Realtime Database
      await set(ref(dbRider, 'users/' + user.uid), {
        uid: user.uid,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        email: data.email, // Save the real email
        createdAt: Date.now(),
      });

      toast({
        title: "تم إنشاء الحساب بنجاح!",
        description: `أهلاً بك ${data.fullName}. يمكنك الآن تسجيل الدخول.`,
        className: "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 border-green-300 dark:border-green-600"
      });
      router.push('/auth/signin');

    } catch (error) {
      console.error("Error signing up:", error);
      let errorMessage = "حدث خطأ أثناء إنشاء الحساب. الرجاء المحاولة مرة أخرى.";
      let hasSetFieldSpecificError = false;

      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message: string };
        switch (firebaseError.code) {
          case 'auth/email-already-in-use':
            errorMessage = "هذا البريد الإلكتروني مستخدم بالفعل.";
            form.setError("email", { message: errorMessage });
            hasSetFieldSpecificError = true;
            break;
          case 'auth/weak-password':
            errorMessage = "كلمة المرور ضعيفة جداً. يجب أن تكون 6 أحرف على الأقل.";
            form.setError("password", { message: errorMessage });
            hasSetFieldSpecificError = true;
            break;
          case 'auth/invalid-email':
            errorMessage = "صيغة البريد الإلكتروني غير صالحة.";
            form.setError("email", { message: errorMessage });
            hasSetFieldSpecificError = true;
            break;
          default:
            errorMessage = `فشل إنشاء الحساب: ${firebaseError.message || 'خطأ غير معروف'}`;
        }
      }

      toast({
        title: "خطأ في إنشاء الحساب",
        description: errorMessage,
        variant: "destructive",
      });
      
      if (!hasSetFieldSpecificError) {
         form.setError("root", { message: errorMessage });
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-3">
        <UserPlus className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-center">إنشاء حساب جديد</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  الاسم الكامل
                </FormLabel>
                <FormControl>
                  <Input placeholder="مثال: محمد أحمد" {...field} />
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
                  <Phone className="h-5 w-5 text-primary" />
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  البريد الإلكتروني
                </FormLabel>
                <FormControl>
                  <Input type="email" placeholder="مثال: user@example.com" {...field} />
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
                <FormLabel className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  كلمة المرور
                </FormLabel>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  تأكيد كلمة المرور
                </FormLabel>
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

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Button 
              type="submit" 
              className="flex-1 p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:bg-primary/90 hover:shadow-md active:scale-95"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <Check className="ms-2 h-5 w-5" />}
              {form.formState.isSubmitting ? "جارِ التسجيل..." : "تسجيل"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/auth/signin')}
              className="flex-1 p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:shadow-md active:scale-95"
              disabled={form.formState.isSubmitting}
            >
              <ArrowLeft className="ms-2 h-5 w-5" /> 
              رجوع
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
