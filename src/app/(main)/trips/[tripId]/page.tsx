
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Trip, Seat as SeatType, FirebaseTrip as FirebaseTripType, FirebaseUser } from '@/types';
import { Button } from '@/components/ui/button';
import { DriverInfo } from '@/components/trip/DriverInfo';
import { SeatLayout } from '@/components/trip/SeatLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Info, Armchair, Check, ArrowLeft, Loader2, DollarSign, Smartphone, Copy, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { ref, get, runTransaction } from 'firebase/database';
import { generateSeatsFromTripData, formatTimeToArabicAMPM, formatDateToArabic } from '@/lib/constants';
import { cn } from '@/lib/utils'; // Added missing import

const CLICK_PAYMENT_CODE_PLACEHOLDER = "CLK_DRIVER_CODE"; 

export default function TripDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const tripId = typeof params.tripId === 'string' ? params.tripId : '';

  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [currentPaymentSelectionInDialog, setCurrentPaymentSelectionInDialog] = useState<'cash' | 'click' | null>(null);
  const [actualClickCode, setActualClickCode] = useState<string>(CLICK_PAYMENT_CODE_PLACEHOLDER);

  const fetchTripDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const tripRef = ref(db, `currentTrips/${tripId}`);
      const tripSnapshot = await get(tripRef);

      if (tripSnapshot.exists()) {
        const fbTrip = tripSnapshot.val() as FirebaseTripType;
        
        const driverSnapshot = await get(ref(db, `users/${fbTrip.driverId}`));
        if (driverSnapshot.exists()) {
          const driverData = driverSnapshot.val() as FirebaseUser;
          const processedSeats = generateSeatsFromTripData(fbTrip);
          
          const enrichedTrip: Trip = {
            id: fbTrip.id,
            firebaseTripData: fbTrip,
            driver: {
              id: driverData.id,
              name: driverData.fullName,
              rating: driverData.rating || 0,
              photoUrl: driverData.idPhotoUrl || driverData.vehiclePhotosUrl || `https://placehold.co/100x100.png?text=${driverData.fullName?.charAt(0) || 'D'}`,
              carNumber: driverData.vehiclePlateNumber || "غير متوفر",
              carModel: driverData.vehicleMakeModel || "غير متوفر",
              carColor: driverData.vehicleColor || "#FFFFFF",
              carColorName: driverData.vehicleColor,
              clickCode: driverData.paymentMethods?.clickCode || CLICK_PAYMENT_CODE_PLACEHOLDER,
            },
            car: {
              name: driverData.vehicleMakeModel || "غير متوفر",
              color: driverData.vehicleColor || "#FFFFFF",
              colorName: driverData.vehicleColor,
            },
            date: formatDateToArabic(fbTrip.dateTime),
            departureTime: formatTimeToArabicAMPM(fbTrip.dateTime),
            arrivalTime: fbTrip.expectedArrivalTime,
            price: fbTrip.pricePerPassenger,
            startPoint: fbTrip.startPoint,
            endPoint: fbTrip.destination,
            meetingPoint: fbTrip.meetingPoint,
            notes: fbTrip.notes,
            status: fbTrip.status,
            seats: processedSeats,
          };
          setTrip(enrichedTrip);
          setActualClickCode(enrichedTrip.driver.clickCode || CLICK_PAYMENT_CODE_PLACEHOLDER);
        } else {
           toast({ title: "خطأ", description: "لم يتم العثور على بيانات السائق لهذه الرحلة.", variant: "destructive" });
           router.replace('/');
        }
      } else {
        toast({ title: "خطأ", description: "الرحلة غير موجودة", variant: "destructive" });
        router.replace('/');
      }
    } catch (error) {
      console.error("Error fetching trip details:", error);
      toast({ title: "خطأ", description: "لا يمكن تحميل تفاصيل الرحلة.", variant: "destructive" });
      router.replace('/');
    } finally {
      setIsLoading(false);
    }
  }, [tripId, router, toast]);

  useEffect(() => {
    if (tripId) {
      fetchTripDetails();
    }
  }, [tripId, fetchTripDetails]);

  const handleSeatClick = useCallback((seatId: string) => {
    setTrip(currentTrip => {
      if (!currentTrip || isBooking) return currentTrip;
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

  const handleProceedToPayment = () => {
    if (selectedSeats.length === 0) {
      toast({ title: "خطأ", description: 'الرجاء اختيار مقعد واحد على الأقل.', variant: "destructive" });
      return;
    }
    setCurrentPaymentSelectionInDialog(null); 
    setIsPaymentDialogOpen(true);
  };

  const handleCopyClickCode = async () => {
    if (!trip || !trip.driver.clickCode || trip.driver.clickCode === CLICK_PAYMENT_CODE_PLACEHOLDER) {
         toast({ title: "خطأ", description: "رمز كليك للسائق غير متوفر.", variant: "destructive" });
        return;
    }
    try {
      await navigator.clipboard.writeText(trip.driver.clickCode);
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
      console.error("Booking failed in handleDialogConfirmAndBook:", error);
      // Toast is handled within processBooking, but we ensure isBooking is reset
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
    
    try {
      const tripRef = ref(db, `currentTrips/${tripId}`);
      
      await runTransaction(tripRef, (currentFirebaseTripData: FirebaseTripType | null): FirebaseTripType | undefined => {
        if (!currentFirebaseTripData) {
          // Trip was deleted or path is wrong
          throw new Error("Trip data not found in transaction.");
        }

        // Ensure the trip is still upcoming
        if (currentFirebaseTripData.status !== 'upcoming') {
            throw new Error("هذه الرحلة لم تعد متاحة للحجز (حالتها ليست 'upcoming').");
        }

        let seatsUpdated = false;

        if (currentFirebaseTripData.offeredSeatsConfig) {
          let newOfferedSeatsConfig = { ...(currentFirebaseTripData.offeredSeatsConfig || {}) };
          selectedSeats.forEach(seatId => {
            if (newOfferedSeatsConfig[seatId] === true) { // Check if seat is available (true)
              newOfferedSeatsConfig[seatId] = false; // Mark as taken (false)
              seatsUpdated = true;
            } else {
              throw new Error(`المقعد ${seatId} غير متاح أو تم حجزه بالفعل.`);
            }
          });
          currentFirebaseTripData.offeredSeatsConfig = newOfferedSeatsConfig;
        } 
        else if (currentFirebaseTripData.offeredSeatIds) {
           let newOfferedSeatIds = [...currentFirebaseTripData.offeredSeatIds];
           const originalLength = newOfferedSeatIds.length;
           newOfferedSeatIds = newOfferedSeatIds.filter(id => !selectedSeats.includes(id));
           if (newOfferedSeatIds.length !== originalLength - selectedSeats.length) {
             throw new Error("واحد أو أكثر من المقاعد المختارة غير متوفر.");
           }
           currentFirebaseTripData.offeredSeatIds = newOfferedSeatIds;
           seatsUpdated = true;
        } else {
            throw new Error("لم يتم العثور على تكوين المقاعد لهذه الرحلة.");
        }
        
        if (!seatsUpdated && selectedSeats.length > 0) { // Should not happen if logic above is correct
             throw new Error("لم يتم تحديث المقاعد المختارة في قاعدة البيانات (قد تكون محجوزة أو غير صالحة).");
        }
        
        return currentFirebaseTripData; // Return the modified trip data
      });
      
      // Update UI state after successful transaction
      const updatedUiSeats = trip.seats.map(seat => 
        selectedSeats.includes(seat.id) ? { ...seat, status: 'taken' as SeatType['status'] } : seat
      );
      
      // Update local trip state for UI consistency
      // Need to ensure firebaseTripData in local state also reflects the change
      setTrip(currentTrip => {
        if (!currentTrip) return null;
        
        let updatedFirebaseTripData = { ...currentTrip.firebaseTripData };
        if (updatedFirebaseTripData.offeredSeatsConfig) {
            const newConfig = {...updatedFirebaseTripData.offeredSeatsConfig};
            selectedSeats.forEach(seatId => {
                if (newConfig.hasOwnProperty(seatId)) {
                    newConfig[seatId] = false;
                }
            });
            updatedFirebaseTripData.offeredSeatsConfig = newConfig;
        } else if (updatedFirebaseTripData.offeredSeatIds) {
            updatedFirebaseTripData.offeredSeatIds = updatedFirebaseTripData.offeredSeatIds.filter(id => !selectedSeats.includes(id));
        }

        return { ...currentTrip, seats: updatedUiSeats, firebaseTripData: updatedFirebaseTripData };
      });
      
      const bookedSeatsCount = selectedSeats.length; 
      setSelectedSeats([]); 
      setCurrentPaymentSelectionInDialog(null); 

      toast({
        title: "تم تأكيد الحجز بنجاح!",
        description: `تم حجز ${bookedSeatsCount} ${bookedSeatsCount === 1 ? 'مقعد' : bookedSeatsCount === 2 ? 'مقعدين' : 'مقاعد'} بطريقة الدفع: ${paymentType === 'cash' ? 'كاش' : 'كليك'}. نتمنى لك رحلة سعيدة!`,
        className: "bg-success text-success-foreground border-green-300"
      });
      router.push('/'); // Navigate after successful booking

    } catch (error: any) {
      console.error("Error during booking transaction or UI update:", error);
       if (error.message === "Trip data not found in transaction.") {
        toast({ title: "خطأ في الحجز", description: "لم نتمكن من إكمال الحجز. هذه الرحلة لم تعد متوفرة أو تم حذفها.", variant: "destructive"});
      } else {
        toast({ title: "خطأ في الحجز", description: error.message || "لم نتمكن من إكمال الحجز. قد تكون المقاعد قد حُجزت أو أن الرحلة لم تعد متاحة. الرجاء المحاولة مرة أخرى.", variant: "destructive"});
      }
      fetchTripDetails(); // Refresh trip details from DB to reflect latest state
      // No need to re-throw error as it's handled for the user here
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
    // fetchTripDetails would have redirected if tripId was initially invalid.
    // This state might be reached if fetchTripDetails itself fails for other reasons or trip becomes null after loading.
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
      
      {trip.meetingPoint && (
        <Alert variant="default" className="bg-blue-50 border-blue-300 text-blue-700">
          <MapPin className="h-5 w-5 text-blue-600" />
          <AlertTitle className="font-semibold">نقطة الالتقاء</AlertTitle>
          <AlertDescription>{trip.meetingPoint}</AlertDescription>
        </Alert>
      )}
      {trip.notes && (
         <Alert variant="default" className="bg-purple-50 border-purple-300 text-purple-700">
          <Info className="h-5 w-5 text-purple-600" />
          <AlertTitle className="font-semibold">ملاحظات السائق</AlertTitle>
          <AlertDescription>{trip.notes}</AlertDescription>
        </Alert>
      )}


      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Armchair className="h-7 w-7 text-primary" />
          <h2 className="text-2xl font-semibold text-center">اختيار المقعد</h2>
        </div>
        
        <p className="text-center font-bold text-primary text-lg">
          المقاعد المختارة: {selectedSeats.length.toLocaleString('en-US')}
        </p>
        <p className="text-center font-bold text-lg">
          السعر الإجمالي: {(selectedSeats.length * trip.price).toLocaleString('en-US')} دينار
        </p>


        <SeatLayout seats={trip.seats} onSeatClick={handleSeatClick} />
      </div>

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
              <Label htmlFor="r-cash" className={cn("flex items-center space-x-2 space-x-reverse p-3 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer", currentPaymentSelectionInDialog === 'cash' ? "bg-seat-selected text-seat-selected-foreground border-seat-selected/70" : "border-border")}>
                <RadioGroupItem value="cash" id="r-cash" />
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="flex-1 text-base">كاش</span>
              </Label>
              <Label htmlFor="r-click" className={cn("flex items-center space-x-2 space-x-reverse p-3 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer", currentPaymentSelectionInDialog === 'click' ? "bg-seat-selected text-seat-selected-foreground border-seat-selected/70" : "border-border")}>
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
                  <span className="text-lg font-mono select-all" data-ai-hint="payment code" id="click-payment-code">{actualClickCode}</span>
                  { actualClickCode !== CLICK_PAYMENT_CODE_PLACEHOLDER && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyClickCode}
                        aria-label="نسخ رمز الدفع"
                    >
                        <Copy className="h-5 w-5 text-primary hover:text-primary/80" />
                    </Button>
                  )}
                </div>
                <p className="text-center text-base">
                  اسم السائق: <span className="font-semibold">{trip?.driver.name}</span>
                </p>
                 <p className="text-center text-xs text-muted-foreground mt-2">
                  (يجب عليك تحويل المبلغ إلى السائق قبل الضغط على "لقد دفعت")
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
              disabled={!currentPaymentSelectionInDialog || isBooking || (currentPaymentSelectionInDialog === 'click' && actualClickCode === CLICK_PAYMENT_CODE_PLACEHOLDER)}
            >
              {isBooking && <Loader2 className="ms-2 h-5 w-5 animate-spin" />}
              {!currentPaymentSelectionInDialog ? "اختر طريقة أولاً" : 
               currentPaymentSelectionInDialog === 'cash' ? "تأكيد والدفع كاش" : 
               (actualClickCode !== CLICK_PAYMENT_CODE_PLACEHOLDER ? "لقد دفعت، إتمام الحجز" : "رمز كليك للسائق غير متوفر")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button 
          onClick={handleProceedToPayment} 
          className="flex-1 p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:bg-primary/90 hover:shadow-md active:scale-95"
          disabled={selectedSeats.length === 0 || isBooking || trip.status !== 'upcoming'}
        >
          <Check className="ms-2 h-5 w-5" />
          {trip.status !== 'upcoming' ? "الرحلة غير متاحة للحجز" : selectedSeats.length > 0 ? "تأكيد الحجز والمتابعة للدفع" : "اختر مقعداً أولاً"}
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

