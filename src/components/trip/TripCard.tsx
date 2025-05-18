
"use client";

import type { Trip } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Car, CalendarDays, Clock, Timer, CircleDollarSign, ArrowLeft } from 'lucide-react'; 
import Link from 'next/link'; // Link might still be used if button action differs, but for now, card handles it
import { useRouter } from 'next/navigation';

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/trips/${trip.id}`);
  };

  return (
    <Card 
      className="overflow-hidden shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-[1.02] cursor-pointer"
      onClick={handleCardClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      aria-label={`تفاصيل رحلة من ${trip.startPoint} إلى ${trip.endPoint} مع السائق ${trip.driver.name}`}
    >
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">{trip.driver.name}</CardTitle>
          <div className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span>{trip.driver.rating.toFixed(1)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Car className="h-5 w-5" />
          <span>{trip.car.name}</span>
          {trip.car.color && (
            <div 
              className="h-5 w-5 rounded-sm border border-border" 
              style={{ backgroundColor: trip.car.color }}
              aria-label={`لون السيارة: ${trip.car.colorName || trip.car.color}`}
              data-ai-hint="color swatch"
            ></div>
          )}
          <span>{trip.car.colorName}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>{new Date(trip.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" /> 
          <span>{trip.duration}</span>
        </div>
        <div className="flex items-center gap-2 text-orange-600">
          <Clock className="h-4 w-4" />
          <span>وقت الانطلاق: {trip.departureTime}</span>
        </div>
        <div className="flex items-center gap-2 text-green-600">
          <Clock className="h-4 w-4" />
          <span>وقت الوصول: {trip.arrivalTime}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 flex items-center justify-between bg-muted/50">
        <div className="flex items-center gap-2 text-lg font-bold text-primary">
          <CircleDollarSign className="h-6 w-6" />
          <span>{trip.price} ريال</span>
        </div>
        {/* The button is now part of the clickable card area.
            If clicked, the card's onClick will handle navigation.
            We stop propagation here if the button were to have a *different* action in the future,
            but for now, it simply acts as a visual cue within the larger clickable area.
        */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={(e) => {
            e.stopPropagation(); // Prevents card's onClick if button had a separate action
            handleCardClick(); // Explicitly navigate if button itself is clicked
          }}
          aria-hidden="true" // Since the card is the primary link, button can be hidden from assistive tech
          tabIndex={-1} // Remove button from tab order as card is tabbable
        >
          عرض التفاصيل
          <ArrowLeft className="ms-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

