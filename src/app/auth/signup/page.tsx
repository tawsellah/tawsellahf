"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, User, Phone, Lock, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';

const signUpSchema = z.object({
  fullName: z.string().min(3, "يجب أن يكون الاسم الكامل 3 أحرف على الأقل"),
  phoneNumber: z.string().regex(/^[0-9]{10}$/, "يجب أن يتكون رقم الهاتف من 10 أرقام"),
  password: z.string().min(6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"),
  confirmPassword: z.string().min(6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"], // Set error on confirmPassword field
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
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    // Placeholder for actual sign-up logic
    console.log("Sign-up data:", data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate successful registration
    const generatedEmail = `${data.phoneNumber.slice(1)}@tawsellah.app`; // Example email generation
    toast({
      title: "تم إنشاء الحساب بنجاح!",
      description: `بريدك الإلكتروني المسجل هو: ${generatedEmail}`,
      className: "bg-success text-success-foreground border-green-300"
    });
    router.push('/auth/signin'); // Navigate to sign-in page after successful sign-up
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
                  <Input type="tel" placeholder="مثال: 05XXXXXXXX" {...field} />
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
             <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Button 
              type="submit" 
              className="flex-1 p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:bg-primary/90 hover:shadow-md active:scale-95"
              disabled={form.formState.isSubmitting}
            >
              <Check className="ms-2 h-5 w-5" />
              {form.formState.isSubmitting ? "جارِ التسجيل..." : "تسجيل"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/auth/signin')}
              className="flex-1 p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:shadow-md active:scale-95"
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
