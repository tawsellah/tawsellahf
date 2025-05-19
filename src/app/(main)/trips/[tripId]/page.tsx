
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Trip, Seat as SeatType } from '@/types';
import { getTripById } from '@/lib/constants';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { DriverInfo } from '@/components/trip/DriverInfo';
import { SeatLayout } from '@/components/trip/SeatLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [currentPaymentSelectionInDialog, setCurrentPaymentSelectionInDialog] = useState<'cash' | 'click' | null>(null);
  const [finalPaymentMethod, setFinalPaymentMethod] = useState<'cash' | 'click' | null>(null);


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
      if (!currentTrip || isBooking) return null; // Prevent changes during booking
      const seatIndex = currentTrip.seats.findIndex(s => s.id === seatId);
      if (seatIndex === -1) return currentTrip;

      const seat = currentTrip.seats[seatIndex];
      if (seat.status === 'taken' || seat.status === 'driver') return currentTrip;
      
      // If a payment method ('click') is already chosen and details are shown,
      // changing seats should reset the payment choice to force re-confirmation.
      if (finalPaymentMethod === 'click') {
        setFinalPaymentMethod(null); 
      }

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
  }, [selectedSeats, isBooking, finalPaymentMethod]);


  const displayStatusMessage = (type: 'success' | 'error', message: string) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleProceedToPayment = () => {
    if (selectedSeats.length === 0) {
      displayStatusMessage('error', 'الرجاء اختيار مقعد واحد على الأقل.');
      return;
    }
    setCurrentPaymentSelectionInDialog(finalPaymentMethod); // Pre-fill if re-opened
    setIsPaymentDialogOpen(true);
  };

  const handleConfirmPaymentChoice = () => {
    if (!currentPaymentSelectionInDialog) {
      toast({ title: "خطأ", description: "يرجى اختيار طريقة الدفع.", variant: "destructive" });
      return;
    }
    setFinalPaymentMethod(currentPaymentSelectionInDialog);
    setIsPaymentDialogOpen(false);

    if (currentPaymentSelectionInDialog === 'cash') {
      processBooking('cash');
    }
    // If 'click', UI will update based on finalPaymentMethod to show QR code and new button.
  };

  const processBooking = async (paymentType: 'cash' | 'click') => {
    if (selectedSeats.length === 0) {
       displayStatusMessage('error', 'الرجاء اختيار مقعد واحد على الأقل.');
       return;
    }
    setIsBooking(true);
    console.log(`Booking confirmed for seats: ${selectedSeats.join(', ')} on trip: ${tripId} with payment: ${paymentType}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    
    setIsBooking(false);
    
    setTrip(currentTrip => {
      if (!currentTrip) return null;
      const newSeatsArray = currentTrip.seats.map(seat => {
        if (selectedSeats.includes(seat.id)) {
          return { ...seat, status: 'taken' as SeatType['status'] };
        }
        return seat;
      });
      return { ...currentTrip, seats: newSeatsArray };
    });
    
    // Reset states after booking logic is complete
    const bookedSeatsCount = selectedSeats.length; // Store before clearing
    setSelectedSeats([]); 
    setFinalPaymentMethod(null); 
    setCurrentPaymentSelectionInDialog(null);


    toast({
      title: "تم تأكيد الحجز بنجاح!",
      description: `تم حجز ${bookedSeatsCount} ${bookedSeatsCount === 1 ? 'مقعد' : bookedSeatsCount === 2 ? 'مقعدين' : 'مقاعد'} بطريقة الدفع: ${paymentType === 'cash' ? 'كاش' : 'كليك'}. نتمنى لك رحلة سعيدة!`,
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
          المقاعد المختارة: {selectedSeats.length.toLocaleString('en-US')}
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

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        if (isBooking) return; // Prevent closing dialog during booking action from within dialog
        setIsPaymentDialogOpen(open);
        if (!open) setCurrentPaymentSelectionInDialog(null); // Reset if closed via X or overlay
      }}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">اختر طريقة الدفع</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <RadioGroup
              value={currentPaymentSelectionInDialog || undefined}
              onValueChange={(value: 'cash' | 'click') => setCurrentPaymentSelectionInDialog(value)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2 space-x-reverse p-2 border rounded-md hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="cash" id="r-cash" />
                <Label htmlFor="r-cash" className="cursor-pointer flex-1 text-base">كاش</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse p-2 border rounded-md hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="click" id="r-click" />
                <Label htmlFor="r-click" className="cursor-pointer flex-1 text-base">كليك</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" disabled={isBooking}>إلغاء</Button>
            </DialogClose>
            <Button onClick={handleConfirmPaymentChoice} disabled={!currentPaymentSelectionInDialog || isBooking}>
              {isBooking && currentPaymentSelectionInDialog === 'cash' ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : null}
              تأكيد واختيار الدفع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Click Payment Info Section */}
      {finalPaymentMethod === 'click' && !isBooking && (
        <div className="mt-6 p-6 border rounded-lg shadow-lg bg-card space-y-4">
          <h3 className="text-xl font-semibold text-center text-primary">الدفع بواسطة كليك</h3>
          <p className="text-center text-muted-foreground">يرجى استخدام الرمز التالي لإتمام عملية الدفع مع السائق:</p>
          <div className="flex justify-center my-4">
            <Image
              src="https://placehold.co/180x180.png"
              alt="رمز كليك للدفع"
              width={180}
              height={180}
              className="rounded-lg shadow-md border"
              data-ai-hint="qr code payment"
            />
          </div>
          <p className="text-center text-lg">
            اسم السائق: <span className="font-semibold">{trip?.driver.name}</span>
          </p>
          <Button 
            onClick={() => processBooking('click')} 
            className="w-full p-3 rounded-lg text-base font-semibold mt-4 transition-all duration-300 ease-in-out hover:bg-primary/90 hover:shadow-md active:scale-95"
            disabled={isBooking || selectedSeats.length === 0}
          >
            {isBooking ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <Check className="ms-2 h-5 w-5" />}
            {isBooking ? "جارِ الإتمام..." : "لقد دفعت، إتمام الحجز"}
          </Button>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        {finalPaymentMethod !== 'click' && (
          <Button 
            onClick={handleProceedToPayment} 
            className="flex-1 p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:bg-primary/90 hover:shadow-md active:scale-95"
            disabled={selectedSeats.length === 0 || isBooking}
          >
            {isBooking && finalPaymentMethod !== 'click' ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <Check className="ms-2 h-5 w-5" />}
            {isBooking && finalPaymentMethod !== 'click' ? "جارِ تأكيد الحجز..." : (selectedSeats.length > 0 ? "تأكيد الحجز والمتابعة للدفع" : "اختر مقعداً أولاً")}
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={() => {
            if (isBooking) return;
            if (finalPaymentMethod === 'click') {
              setFinalPaymentMethod(null); 
              setCurrentPaymentSelectionInDialog(null);
            } else {
              router.back();
            }
          }}
          className="flex-1 p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:shadow-md active:scale-95"
          disabled={isBooking}
        >
          <ArrowLeft className="ms-2 h-5 w-5" />
          {finalPaymentMethod === 'click' ? "تغيير طريقة الدفع / رجوع" : "رجوع"}
        </Button>
      </div>
    </div>
  );
}
