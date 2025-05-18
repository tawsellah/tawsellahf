"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Trip, Seat as SeatType } from '@/types';
import { getTripById } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { DriverInfo } from '@/components/trip/DriverInfo';
import { SeatLayout } from '@/components/trip/SeatLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Info, Armchair, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TripDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const tripId = typeof params.tripId === 'string' ? params.tripId : '';

  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (tripId) {
      const fetchedTrip = getTripById(tripId);
      if (fetchedTrip) {
        setTrip(fetchedTrip);
      } else {
        toast({ title: "خطأ", description: "الرحلة غير موجودة", variant: "destructive" });
        router.replace('/');
      }
      setIsLoading(false);
    }
  }, [tripId, router, toast]);

  const handleSeatClick = useCallback((seatId: string) => {
    setTrip(currentTrip => {
      if (!currentTrip) return null;
      const seatIndex = currentTrip.seats.findIndex(s => s.id === seatId);
      if (seatIndex === -1) return currentTrip;

      const seat = currentTrip.seats[seatIndex];
      if (seat.status === 'taken' || seat.status === 'driver') return currentTrip;

      const newSeats = [...currentTrip.seats];
      let newSelectedSeatIds: string[];

      if (seat.status === 'selected') {
        newSeats[seatIndex] = { ...seat, status: 'available' };
        newSelectedSeatIds = selectedSeats.filter(id => id !== seatId);
      } else {
        newSeats[seatIndex] = { ...seat, status: 'selected' };
        newSelectedSeatIds = [...selectedSeats, seatId];
      }
      setSelectedSeats(newSelectedSeatIds);
      return { ...currentTrip, seats: newSeats };
    });
  }, [selectedSeats]);


  const displayStatusMessage = (type: 'success' | 'error', message: string) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleConfirmBooking = async () => {
    if (selectedSeats.length === 0) {
      displayStatusMessage('error', 'الرجاء اختيار مقعد واحد على الأقل.');
      return;
    }
    setIsBooking(true);
    // Simulate booking process
    console.log("Booking confirmed for seats:", selectedSeats, "on trip:", tripId);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsBooking(false);

    toast({
      title: "تم تأكيد الحجز بنجاح!",
      description: `تم حجز ${selectedSeats.length} ${selectedSeats.length === 1 ? 'مقعد' : selectedSeats.length === 2 ? 'مقعدين' : 'مقاعد'}. نتمنى لك رحلة سعيدة!`,
      className: "bg-success text-success-foreground border-green-300"
    });
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ms-4 text-lg mt-4">جاري تحميل تفاصيل الرحلة...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-10">
        <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">الرحلة غير موجودة</h2>
        <p className="text-muted-foreground mt-2">عذراً, لم نتمكن من العثور على تفاصيل هذه الرحلة.</p>
        <Button onClick={() => router.push('/')} className="mt-6 p-3 rounded-lg text-base font-semibold">
          <ArrowLeft className="ms-2 h-4 w-4" />
          العودة إلى البحث
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-3">
        <Info className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-center">تفاصيل الرحلة</h1>
      </div>

      <DriverInfo driver={trip.driver} />

      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Armchair className="h-7 w-7 text-primary" />
          <h2 className="text-2xl font-semibold text-center">اختيار المقعد</h2>
        </div>
        
        <p className="text-center font-bold text-primary text-lg">
          المقاعد المختارة: {selectedSeats.length}
        </p>

        {statusMessage && (
          <Alert variant={statusMessage.type === 'success' ? 'default' : 'destructive'} className={statusMessage.type === 'success' ? 'bg-success text-success-foreground border-green-300' : 'bg-error text-error-foreground border-red-300'}>
             {statusMessage.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <AlertTitle className="font-semibold">{statusMessage.type === 'success' ? 'نجاح!' : 'خطأ!'}</AlertTitle>
            <AlertDescription>{statusMessage.message}</AlertDescription>
          </Alert>
        )}

        <SeatLayout seats={trip.seats} onSeatClick={handleSeatClick} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button 
          onClick={handleConfirmBooking} 
          className="flex-1 p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:bg-primary/90 hover:shadow-md active:scale-95"
          disabled={selectedSeats.length === 0 || isBooking}
        >
          {isBooking ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <Check className="ms-2 h-5 w-5" />}
          {isBooking ? "جارِ تأكيد الحجز..." : "تأكيد الحجز"}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="flex-1 p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:shadow-md active:scale-95"
          disabled={isBooking}
        >
          <ArrowLeft className="ms-2 h-5 w-5" />
          رجوع
        </Button>
      </div>
    </div>
  );
}
