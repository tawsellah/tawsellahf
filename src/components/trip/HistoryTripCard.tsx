
"use client";

import type { DisplayableHistoryTrip } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CalendarDays, Clock, DollarSign, MapPin, ChevronLeft, Tag, Car, User, CheckCircle, XCircle, AlertTriangle, RefreshCwIcon } from 'lucide-react'; // Added User icon
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HistoryTripCardProps {
  trip: DisplayableHistoryTrip;
}

const statusStyles: Record<DisplayableHistoryTrip['currentTripStatusDisplay'], string> = {
  'مكتملة': 'bg-green-100 text-green-700 border-green-300 dark:bg-green-800 dark:text-green-200 dark:border-green-600',
  'حالية': 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:border-blue-600',
  'قادمة': 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:border-yellow-600',
  'ملغاة': 'bg-red-100 text-red-700 border-red-300 dark:bg-red-800 dark:text-red-200 dark:border-red-600',
  'مؤرشفة (غير معروفة)': 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
};

const statusIcons: Record<DisplayableHistoryTrip['currentTripStatusDisplay'], React.ElementType> = {
    'مكتملة': CheckCircle,
    'حالية': RefreshCwIcon, // Or another icon for ongoing
    'قادمة': Clock,
    'ملغاة': XCircle,
    'مؤرشفة (غير معروفة)': AlertTriangle,
};


export function HistoryTripCard({ trip }: HistoryTripCardProps) {
  const StatusIcon = statusIcons[trip.currentTripStatusDisplay] || AlertTriangle;

  return (
    <Card className="overflow-hidden shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader className="p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <span>{trip.departureCityDisplay}</span>
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            <span>{trip.arrivalCityDisplay}</span>
          </CardTitle>
          <Badge variant="outline" className={cn("text-sm px-3 py-1", statusStyles[trip.currentTripStatusDisplay])}>
            <StatusIcon className="ms-1 h-4 w-4" />
            {trip.currentTripStatusDisplay}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
           رقم الحجز: {trip.bookingId}
        </div>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <span>المقعد: {trip.seatName}</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <span>السعر: {trip.tripPrice.toLocaleString('ar-JO')} دينار</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>التاريخ: {trip.tripDateDisplay} ({trip.dayOfWeekDisplay})</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>الوقت: {trip.tripTimeDisplay}</span>
        </div>
         <div className="flex items-center gap-2 text-muted-foreground col-span-full sm:col-span-1">
          <User className="h-4 w-4" />
          <span>السائق: {trip.driverNameSnapshot}</span>
        </div>
      </CardContent>
      {/* <CardFooter className="p-4 flex items-center justify-end bg-muted/50">
        {/* You can add actions here if needed, e.g., rebook, view original trip details
        <Button variant="ghost" size="sm">
          تفاصيل إضافية
        </Button>
      </CardFooter> */}
    </Card>
  );
}
