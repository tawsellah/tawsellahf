
"use client";

import type { Trip } from '@/types';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Car, Palette, BadgeCheck, Phone, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface DriverInfoProps {
  driver: Trip['driver'];
}

export function DriverInfo({ driver }: DriverInfoProps) {
  const { toast } = useToast();

  const handleCopyPhoneNumber = async () => {
    if (!driver.phoneNumber || driver.phoneNumber === "غير متوفر") {
      toast({ title: "خطأ", description: "رقم هاتف السائق غير متوفر.", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(driver.phoneNumber);
      toast({
        title: "تم النسخ بنجاح!",
        description: "تم نسخ رقم هاتف السائق إلى الحافظة.",
        className: "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 border-green-300 dark:border-green-600"
      });
    } catch (err) {
      console.error('Failed to copy phone number: ', err);
      toast({
        title: "خطأ",
        description: "لم نتمكن من نسخ الرقم. الرجاء المحاولة يدوياً.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="overflow-hidden shadow-md">
      <CardHeader>
        <CardTitle className="text-xl text-center font-semibold">معلومات السائق</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Image
            src={driver.photoUrl || `https://placehold.co/100x100.png`}
            alt={`صورة السائق ${driver.name}`}
            width={100}
            height={100}
            className="rounded-full border-2 border-primary shadow-md object-cover"
            data-ai-hint="driver person"
          />
          <div className="flex-1 space-y-2 text-center sm:text-start">
            <h3 className="text-2xl font-bold text-primary">{driver.name}</h3>
            
            {driver.phoneNumber && driver.phoneNumber !== "غير متوفر" && (
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Phone className="h-5 w-5 text-gray-500" />
                <span className="text-muted-foreground font-mono" dir="ltr">{driver.phoneNumber}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyPhoneNumber}
                    className="h-7 w-7"
                    aria-label="نسخ رقم الهاتف"
                >
                    <Copy className="h-4 w-4 text-primary hover:text-primary/80" />
                </Button>
              </div>
            )}

            <p className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
              <Car className="h-5 w-5 text-gray-500" />
              <span>{driver.carModel}</span>
            </p>
            <p className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
              <BadgeCheck className="h-5 w-5 text-gray-500" /> 
              <span>{driver.carNumber}</span>
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
              <Palette className="h-5 w-5 text-gray-500" />
              <span>لون السيارة: {driver.carColorName || driver.carColor}</span>
              {driver.carColor && (
                <div 
                  className="h-5 w-5 rounded-sm border border-border" 
                  style={{ backgroundColor: driver.carColor }}
                  aria-label={`لون السيارة: ${driver.carColorName || driver.carColor}`}
                  data-ai-hint="color swatch"
                ></div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
