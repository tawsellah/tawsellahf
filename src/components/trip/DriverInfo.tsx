"use client";

import type { Trip } from '@/types';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Car, Palette, BadgeCheck } from 'lucide-react'; 

interface DriverInfoProps {
  driver: Trip['driver'];
}

export function DriverInfo({ driver }: DriverInfoProps) {
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
