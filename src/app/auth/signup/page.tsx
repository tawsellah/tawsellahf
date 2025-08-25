
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, User, Phone, Lock, Check, ArrowLeft, Loader2, Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { authRider, dbRider } from '@/lib/firebase';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ref, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
    </svg>
);

const signUpSchema = z.object({
  fullName: z.string().min(3, "يجب أن يكون الاسم الكامل 3 أحرف على الأقل"),
  phoneNumber: z.string().regex(/^(07[789])\d{7}$/, "يجب أن يكون رقم الهاتف أردني صالح مكون من 10 أرقام ويبدأ بـ 077, 078, أو 079"),
  email: z.string().email("الرجاء إدخال بريد إلكتروني صالح").optional().or(z.literal('')),
  gender: z.enum(["male", "female"], { required_error: "الرجاء تحديد الجنس" }),
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

  const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(authRider, provider);
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
        toast({ title: "أهلاً بك مجدداً!", description: "تم تسجيل دخولك بنجاح. هذا الحساب موجود بالفعل." });
      }
      router.push('/');
    } catch (error: any) {
      console.error("Google sign-up error:", error);
      toast({
        title: "خطأ في التسجيل",
        description: error.message || "فشل التسجيل باستخدام Google.",
        variant: "destructive",
      });
    }
  };


  const onSubmit = async (data: SignUpFormData) => {
    form.clearErrors();
    
    // Check if phone number is already registered
    const usersRef = ref(dbRider, 'users');
    const phoneQuery = query(usersRef, orderByChild('phoneNumber'), equalTo(data.phoneNumber));
    const phoneSnapshot = await get(phoneQuery);

    if (phoneSnapshot.exists()) {
        form.setError("phoneNumber", { message: "رقم الهاتف هذا مسجل بالفعل." });
        toast({
            title: "خطأ في التسجيل",
            description: "رقم الهاتف هذا مسجل بالفعل.",
            variant: "destructive",
        });
        return;
    }

    const emailForAuth = data.email || `t${data.phoneNumber}@tawsellah.com`;

    try {
      const userCredential = await createUserWithEmailAndPassword(authRider, emailForAuth, data.password);
      const user = userCredential.user;

      await set(ref(dbRider, 'users/' + user.uid), {
        uid: user.uid,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        email: emailForAuth, // Save the email used for auth
        gender: data.gender,
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
            errorMessage = "هذا البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل.";
            form.setError("phoneNumber", { message: "رقم الهاتف أو البريد الإلكتروني مرتبط بحساب آخر" });
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
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3">
        <UserPlus className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-center">إنشاء حساب جديد</h1>
      </div>

      <Button
        variant="outline"
        onClick={handleGoogleSignUp}
        className="w-full p-3 rounded-lg text-base font-semibold"
      >
        <GoogleIcon />
        إنشاء حساب باستخدام Google
      </Button>

      <div className="flex items-center my-4">
        <hr className="flex-grow border-t" />
        <span className="mx-4 text-sm text-muted-foreground">أو</span>
        <hr className="flex-grow border-t" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  البريد الإلكتروني (اختياري)
                </FormLabel>
                <FormControl>
                  <Input type="email" placeholder="مثال: user@example.com" {...field} />
                </FormControl>
                 <p className="text-xs text-muted-foreground pt-1">إذا تركته فارغاً، سيتم إنشاء بريد إلكتروني تلقائي مرتبط برقم هاتفك.</p>
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
                     <Users className="h-5 w-5 text-primary" />
                     الجنس
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

    