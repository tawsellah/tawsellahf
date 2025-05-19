
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Trip, Seat as SeatType } from '@/types';
import { Button } from '@/components/ui/button';
import { DriverInfo } from '@/components/trip/DriverInfo';
import { SeatLayout } from '@/components/trip/SeatLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Info, Armchair, Check, ArrowLeft, Loader2, DollarSign, Smartphone, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { ref, get, set, update } from 'firebase/database'; // Added set and update
import { defaultSeats } from '@/lib/constants';


const CLICK_PAYMENT_CODE = "CLK123ABC789"; // Example Click payment code

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

  useEffect(() => {
    if (tripId) {
      const fetchTripDetails = async () => {
        setIsLoading(true);
        try {
          const tripRef = ref(db, `currentTrips/${tripId}`);
          const snapshot = await get(tripRef);
          if (snapshot.exists()) {
            // Ensure seats are initialized if not present or in a different format
            const fetchedTripData = snapshot.val() as Omit<Trip, 'seats'> & { seats?: SeatType[] | Record<string, SeatType> };
            let processedSeats: SeatType[];

            if (!fetchedTripData.seats) {
              processedSeats = JSON.parse(JSON.stringify(defaultSeats)); // Use default if no seats in DB
            } else if (Array.isArray(fetchedTripData.seats)) {
              processedSeats = fetchedTripData.seats;
            } else if (typeof fetchedTripData.seats === 'object') {
              // If seats are stored as an object in Firebase, convert to array
              processedSeats = Object.values(fetchedTripData.seats);
            } else {
              processedSeats = JSON.parse(JSON.stringify(defaultSeats)); // Fallback
            }
            
            setTrip({ ...fetchedTripData, id: tripId, seats: processedSeats } as Trip);

          } else {
            toast({ title: "خطأ", description: "الرحلة غير موجودة", variant: "destructive" });
            router.replace('/');
          }
        } catch (error) {
          console.error("Error fetching trip details:", error);
          toast({ title: "خطأ", description: "ไม่สามารถ تحميل تفاصيل الرحلة.", variant: "destructive" });
          router.replace('/');
        } finally {
          setIsLoading(false);
        }
      };
      fetchTripDetails();
    }
  }, [tripId, router, toast]);

  const handleSeatClick = useCallback((seatId: string) => {
    setTrip(currentTrip => {
      if (!currentTrip || isBooking) return currentTrip; // Return currentTrip instead of null to prevent UI flicker
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
  }, [selectedSeats, isBooking]);


  const displayStatusMessage = (type: 'success' | 'error', message: string) => {
    setStatusMessage({ type, message });
    // Consider using toast for more persistent messages or longer display time
    // setTimeout(() => setStatusMessage(null), 3000); 
  };

  const handleProceedToPayment = () => {
    if (selectedSeats.length === 0) {
      toast({ title: "خطأ", description: 'الرجاء اختيار مقعد واحد على الأقل.', variant: "destructive" });
      return;
    }
    setCurrentPaymentSelectionInDialog(null); 
    setIsPaymentDialogOpen(true);
  };

  const handleCopyClickCode = async () => {
    try {
      await navigator.clipboard.writeText(CLICK_PAYMENT_CODE);
      toast({
        title: "تم النسخ بنجاح!",
        description: "تم نسخ رمز الدفع كليك إلى الحافظة.",
        className: "bg-success text-success-foreground border-green-300"
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "خطأ",
        description: "لم نتمكن من نسخ الرمز. الرجاء المحاولة يدوياً.",
        variant: "destructive"
      });
    }
  };

  const handleDialogConfirmAndBook = async () => {
    if (!currentPaymentSelectionInDialog) {
      toast({ title: "خطأ", description: "يرجى اختيار طريقة الدفع.", variant: "destructive" });
      return;
    }
    
    setIsBooking(true);
    setIsPaymentDialogOpen(false); // Close dialog before processing
    try {
      await processBooking(currentPaymentSelectionInDialog);
    } catch (error) {
      console.error("Booking failed:", error);
      // Error toast is handled within processBooking
    } finally {
        setIsBooking(false);
    }
  };

  const processBooking = async (paymentType: 'cash' | 'click') => {
    if (selectedSeats.length === 0 || !trip) {
       toast({ title: "خطأ", description: 'الرجاء اختيار مقعد واحد على الأقل.', variant: "destructive" });
       setIsBooking(false); 
       throw new Error('No seats selected or trip is null');
    }
    console.log(`Booking confirmed for seats: ${selectedSeats.join(', ')} on trip: ${tripId} with payment: ${paymentType}`);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      
      const updatedSeatsArray = trip.seats.map(seat => {
        if (selectedSeats.includes(seat.id)) {
          return { ...seat, status: 'taken' as SeatType['status'] };
        }
        return seat;
      });

      // Update Firebase with the new seat statuses
      const tripSeatsRef = ref(db, `currentTrips/${tripId}/seats`);
      // Firebase RTDB works well with objects for lists where keys are indices or unique IDs.
      // If seats are stored as an array, you might need to set the whole array.
      // If seats are an object { "S1": {...}, "S2": {...} }, update specific seat paths.
      // Assuming seats are stored as an array in Firebase based on current types:
      await set(tripSeatsRef, updatedSeatsArray);
      
      setTrip(currentTrip => {
        if (!currentTrip) return null;
        return { ...currentTrip, seats: updatedSeatsArray };
      });
      
      const bookedSeatsCount = selectedSeats.length; 
      setSelectedSeats([]); 
      setCurrentPaymentSelectionInDialog(null); 

      toast({
        title: "تم تأكيد الحجز بنجاح!",
        description: `تم حجز ${bookedSeatsCount} ${bookedSeatsCount === 1 ? 'مقعد' : bookedSeatsCount === 2 ? 'مقعدين' : 'مقاعد'} بطريقة الدفع: ${paymentType === 'cash' ? 'كاش' : 'كليك'}. نتمنى لك رحلة سعيدة!`,
        className: "bg-success text-success-foreground border-green-300"
      });
      router.push('/');
    } catch (error) {
      console.error("Error during booking process or Firebase update:", error);
      toast({ title: "خطأ في الحجز", description: "لم نتمكن من إكمال الحجز. الرجاء المحاولة مرة أخرى.", variant: "destructive"});
      throw error; 
    }
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
          <Alert variant={statusMessage.type === 'success' ? 'default' : 'destructive'} className={statusMessage.type === 'success' ? 'bg-success text-success-foreground border-green-300' : 'border-red-300'}>
             {statusMessage.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <AlertTitle className="font-semibold">{statusMessage.type === 'success' ? 'نجاح!' : 'خطأ!'}</AlertTitle>
            <AlertDescription>{statusMessage.message}</AlertDescription>
          </Alert>
        )}

        <SeatLayout seats={trip.seats} onSeatClick={handleSeatClick} />
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        if (isBooking) return; 
        setIsPaymentDialogOpen(open);
        if (!open) setCurrentPaymentSelectionInDialog(null); 
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
              <Label htmlFor="r-cash" className="flex items-center space-x-2 space-x-reverse p-3 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer has-[:checked]:bg-seat-selected has-[:checked]:text-seat-selected-foreground has-[:checked]:border-seat-selected/70">
                <RadioGroupItem value="cash" id="r-cash" />
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="flex-1 text-base">كاش</span>
              </Label>
              <Label htmlFor="r-click" className="flex items-center space-x-2 space-x-reverse p-3 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer has-[:checked]:bg-seat-selected has-[:checked]:text-seat-selected-foreground has-[:checked]:border-seat-selected/70">
                <RadioGroupItem value="click" id="r-click" />
                <Smartphone className="h-5 w-5 text-primary" />
                <span className="flex-1 text-base">كليك</span>
              </Label>
            </RadioGroup>

            {currentPaymentSelectionInDialog === 'click' && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <h4 className="text-center text-lg font-semibold text-primary">الدفع بواسطة كليك</h4>
                <p className="text-center text-sm text-muted-foreground">يرجى استخدام الرمز التالي لإتمام عملية الدفع مع السائق:</p>
                <div className="flex items-center justify-center gap-2 my-2 p-3 bg-muted/30 rounded-lg shadow-sm border">
                  <span className="text-lg font-mono select-all" data-ai-hint="payment code" id="click-payment-code">{CLICK_PAYMENT_CODE}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyClickCode}
                    aria-label="نسخ رمز الدفع"
                  >
                    <Copy className="h-5 w-5 text-primary hover:text-primary/80" />
                  </Button>
                </div>
                <p className="text-center text-base">
                  اسم السائق: <span className="font-semibold">{trip?.driver.name}</span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" disabled={isBooking} onClick={() => {
                if (!isBooking) setCurrentPaymentSelectionInDialog(null);
              }}>إلغاء</Button>
            </DialogClose>
            <Button 
              onClick={handleDialogConfirmAndBook} 
              disabled={!currentPaymentSelectionInDialog || isBooking}
            >
              {isBooking && <Loader2 className="ms-2 h-5 w-5 animate-spin" />}
              {!currentPaymentSelectionInDialog ? "اختر طريقة أولاً" : 
               currentPaymentSelectionInDialog === 'cash' ? "تأكيد والدفع كاش" : "لقد دفعت، إتمام الحجز"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button 
          onClick={handleProceedToPayment} 
          className="flex-1 p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:bg-primary/90 hover:shadow-md active:scale-95"
          disabled={selectedSeats.length === 0 || isBooking}
        >
          <Check className="ms-2 h-5 w-5" />
          {selectedSeats.length > 0 ? "تأكيد الحجز والمتابعة للدفع" : "اختر مقعداً أولاً"}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            if (isBooking) return;
            setCurrentPaymentSelectionInDialog(null); 
            router.back();
          }}
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
