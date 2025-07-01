
"use client";

import type { DisplayableHistoryTrip, GroupedDisplayableTrip } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; 
import { CalendarDays, Clock, DollarSign, MapPin, ChevronLeft, Car, User, CheckCircle, XCircle, AlertTriangle, RefreshCwIcon, Ban, Users, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HistoryTripCardProps {
  tripGroup: GroupedDisplayableTrip;
  onInitiateCancel: (tripGroup: GroupedDisplayableTrip) => void;
  isProcessingCancellation: boolean;
}

const groupStatusStyles: Record<GroupedDisplayableTrip['cardHeaderStatusDisplay'], string> = {
  'قادمة': 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:border-yellow-600',
  'مكتملة': 'bg-green-100 text-green-700 border-green-300 dark:bg-green-800 dark:text-green-200 dark:border-green-600',
  'ملغاة': 'bg-red-100 text-red-700 border-red-300 dark:bg-red-800 dark:text-red-200 dark:border-red-600',
  'ملغاة (بواسطتك)': 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-800 dark:text-orange-200 dark:border-orange-600',
  'ملغاة (النظام)': 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-800 dark:text-purple-200 dark:border-purple-600',
  'متعدد الحالات': 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-800 dark:text-indigo-200 dark:border-indigo-600',
  'مؤرشفة': 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
  'حالية': 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:border-blue-600',
};

const groupStatusIcons: Record<GroupedDisplayableTrip['cardHeaderStatusDisplay'], React.ElementType> = {
    'قادمة': Clock,
    'مكتملة': CheckCircle,
    'ملغاة': XCircle,
    'ملغاة (بواسطتك)': Ban,
    'ملغاة (النظام)': Ban,
    'متعدد الحالات': Info,
    'مؤرشفة': AlertTriangle,
    'حالية': RefreshCwIcon,
};


export function HistoryTripCard({ tripGroup, onInitiateCancel, isProcessingCancellation }: HistoryTripCardProps) {
  const StatusIcon = groupStatusIcons[tripGroup.cardHeaderStatusDisplay] || AlertTriangle;
  const bookedSeatsNames = tripGroup.userBookingsForThisTrip
    .map(b => `${b.seatName}${b.status === 'user-cancelled' ? ' (ملغى)' : b.status === 'system-cancelled' ? ' (ملغى نظاماً)' : ''}`)
    .join('، ');
  const totalActivePrice = tripGroup.userBookingsForThisTrip
    .filter(b => b.status !== 'user-cancelled' && b.status !== 'system-cancelled')
    .reduce((sum, b) => sum + b.tripPrice, 0);

  const CANCELLATION_WINDOW_MS = 15 * 60 * 1000;

  // This check determines if the "Cancel" button and footer should appear at all.
  // It's true if the trip is upcoming and has at least one 'booked' seat.
  const canPotentiallyCancel = tripGroup.canCancelAnyBookingInGroup;

  // This check determines if the button is actually enabled.
  // It's true if there's at least one 'booked' seat within the 15-min window.
  const hasCancellableBookingInTimeWindow = canPotentiallyCancel && tripGroup.userBookingsForThisTrip.some(
      booking => booking.status === 'booked' && (Date.now() - booking.bookedAt) < CANCELLATION_WINDOW_MS
  );

  return (
    <Card className="overflow-hidden shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader className="p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <span>{tripGroup.departureCityDisplay}</span>
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            <span>{tripGroup.arrivalCityDisplay}</span>
          </CardTitle>
          <Badge variant="outline" className={cn("text-sm px-3 py-1", groupStatusStyles[tripGroup.cardHeaderStatusDisplay])}>
            <StatusIcon className="ms-1 h-4 w-4" />
            {tripGroup.cardHeaderStatusDisplay}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {tripGroup.cardHeaderStatusDisplay !== 'مكتملة' && (
          <div className="flex items-center gap-2 col-span-full">
            <Users className="h-4 w-4 text-primary" />
            <span>المقاعد: {bookedSeatsNames}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <span>السعر الإجمالي (نشط): {totalActivePrice.toLocaleString('ar-JO')} دينار</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>التاريخ: {tripGroup.tripDateDisplay} ({tripGroup.dayOfWeekDisplay})</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>الوقت: {tripGroup.tripTimeDisplay}</span>
        </div>
         <div className="flex items-center gap-2 text-muted-foreground col-span-full sm:col-span-1">
          <User className="h-4 w-4" />
          <span>السائق: {tripGroup.driverNameSnapshot}</span>
        </div>
      </CardContent>
      {canPotentiallyCancel && (
        <CardFooter className="p-4 flex items-center justify-end bg-muted/50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* This div wrapper is necessary for the tooltip to work on a disabled button */}
                <div className="inline-block">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onInitiateCancel(tripGroup)}
                    disabled={isProcessingCancellation || !hasCancellableBookingInTimeWindow}
                  >
                    <XCircle className="ms-2 h-4 w-4" />
                    إلغاء الحجز
                  </Button>
                </div>
              </TooltipTrigger>
              {!hasCancellableBookingInTimeWindow && (
                <TooltipContent>
                  <p>لا يمكن الإلغاء بعد مرور 15 دقيقة على الحجز.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      )}
    </Card>
  );
}
