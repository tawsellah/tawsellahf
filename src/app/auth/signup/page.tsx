
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, User, Phone, Lock, Check, ArrowLeft, Loader2, Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { authRider, dbRider } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const signUpSchema = z.object({
  fullName: z.string().min(3, "يجب أن يكون الاسم الكامل 3 أحرف على الأقل"),
  phoneNumber: z.string().regex(/^(07[789])\d{7}$/, "يجب أن يكون رقم الهاتف أردني صالح مكون من 10 أرقام ويبدأ بـ 077, 078, أو 079"),
  email: z.string().email("الرجاء إدخال بريد إلكتروني صالح").optional().or(z.literal('')),
  gender: z.enum(["male", "female"], { required_error: "الرجاء تحديد الجنس" }),
  password: z.string().min(6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"),
  confirmPassword: z.string().min(6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"),
  terms: z.literal(true, {
    errorMap: () => ({ message: "يجب الموافقة على الشروط والأحكام للمتابعة" }),
  }),
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
      terms: false,
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    form.clearErrors();
    
    try {
        const usersRef = ref(dbRider, 'users');
        const snapshot = await get(usersRef);
        let phoneExists = false;
        if (snapshot.exists()) {
            const usersData = snapshot.val();
            for (const userId in usersData) {
                if (usersData[userId].phoneNumber === data.phoneNumber) {
                    phoneExists = true;
                    break;
                }
            }
        }

        if (phoneExists) {
            form.setError("phoneNumber", { message: "رقم الهاتف هذا مسجل بالفعل." });
            toast({
                title: "خطأ في التسجيل",
                description: "رقم الهاتف هذا مسجل بالفعل.",
                variant: "destructive",
            });
            return;
        }

        const emailForAuth = data.email || `t${data.phoneNumber}@tawsellah.com`;
        
        const userCredential = await createUserWithEmailAndPassword(authRider, emailForAuth, data.password);
        const user = userCredential.user;

        await set(ref(dbRider, 'users/' + user.uid), {
            uid: user.uid,
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
            email: emailForAuth,
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

          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 space-x-reverse">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="terms"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    أوافق على{' '}
                    <Link href="/terms" className="underline hover:text-primary">
                      الشروط والأحكام
                    </Link>
                  </Label>
                  <FormMessage />
                </div>
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
            {form.formState.isSubmitting ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <Check className="ms-2 h-5 w-5" />}
            {form.formState.isSubmitting ? "جارِ التسجيل..." : "تسجيل"}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push('/auth/signin')}
            className="w-full p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:shadow-md active:scale-95"
            disabled={form.formState.isSubmitting}
          >
            <ArrowLeft className="ms-2 h-5 w-5" /> 
            رجوع
          </Button>
        </form>
      </Form>
    </div>
  );
}

    