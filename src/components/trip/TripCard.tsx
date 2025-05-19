
"use client";

import type { Trip } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Car, CalendarDays, Clock, Timer, CircleDollarSign, ArrowLeft, Users } from 'lucide-react'; 
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/trips/${trip.id}`);
  };

  const availableSeatsCount = trip.seats.filter(s => s.status === 'available').length;

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
           <div className="flex items-center gap-3">
            <Image
              src={trip.driver.photoUrl}
              alt={`صورة السائق ${trip.driver.name}`}
              width={40}
              height={40}
              className="rounded-full border-2 border-primary object-cover"
              data-ai-hint="driver person"
            />
            <CardTitle className="text-xl font-bold">{trip.driver.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span>{trip.driver.rating.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Car className="h-5 w-5" />
          <span>{trip.driver.carModel} ({trip.driver.carNumber})</span>
          {trip.driver.carColor && (
            <div 
              className="h-5 w-5 rounded-sm border border-border" 
              style={{ backgroundColor: trip.driver.carColor.startsWith('#') ? trip.driver.carColor : 'transparent' }}
              title={trip.driver.carColorName || trip.driver.carColor}
              aria-label={`لون السيارة: ${trip.driver.carColorName || trip.driver.carColor}`}
              data-ai-hint="color swatch"
            ></div>
          )}
          <span>{trip.driver.carColorName || trip.driver.carColor}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>{trip.date}</span>
        </div>
         <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span>{availableSeatsCount} مقاعد متاحة</span>
        </div>
        <div className="flex items-center gap-2 text-orange-600">
          <Clock className="h-4 w-4" />
          <span>وقت الانطلاق: {trip.departureTime}</span>
        </div>
        <div className="flex items-center gap-2 text-green-600">
          <Clock className="h-4 w-4" />
          <span>وقت الوصول: {trip.arrivalTime}</span>
        </div>
        {trip.meetingPoint && (
          <div className="flex items-center gap-2 col-span-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span>نقطة الالتقاء: {trip.meetingPoint}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 flex items-center justify-between bg-muted/50">
        <div className="flex items-center gap-2 text-lg font-bold text-primary">
          <CircleDollarSign className="h-6 w-6" />
          <span>{trip.price.toLocaleString('en-US')} دينار</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={(e) => {
            e.stopPropagation(); 
            handleCardClick(); 
          }}
          aria-hidden="true"
          tabIndex={-1}
        >
          عرض التفاصيل
          <ArrowLeft className="ms-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
