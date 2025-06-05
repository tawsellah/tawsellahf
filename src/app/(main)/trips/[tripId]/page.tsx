
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Trip, Seat as SeatType, FirebaseTrip as FirebaseTripType, FirebaseUser, StoredHistoryTrip } from '@/types';
import { Button } from '@/components/ui/button';
import { DriverInfo } from '@/components/trip/DriverInfo';
import { SeatLayout } from '@/components/trip/SeatLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Info, Armchair, Check, ArrowLeft, Loader2, DollarSign, Smartphone, Copy, MapPin, LogIn, CircleHelp, Route as RouteIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dbPrimary, authRider, dbRider } from '@/lib/firebase';
import { ref, get, runTransaction, push, set as firebaseSet, child } from 'firebase/database';
import { generateSeatsFromTripData, formatTimeToArabicAMPM, formatDateToArabic, getGovernorateDisplayNameAr, capitalizeFirstLetter } from '@/lib/constants';
import { cn } from '@/lib/utils';

const CLICK_PAYMENT_CODE_PLACEHOLDER = "غير متوفر";

export default function TripDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const tripIdFromParams = typeof params.tripId === 'string' ? params.tripId : '';

  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [isCheckingTripStatus, setIsCheckingTripStatus] = useState(false);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [currentPaymentSelectionInDialog, setCurrentPaymentSelectionInDialog] = useState<'cash' | 'click' | null>(null);
  const [actualClickCode, setActualClickCode] = useState<string>(CLICK_PAYMENT_CODE_PLACEHOLDER);

  const fetchTripDetails = useCallback(async () => {
    setIsLoading(true);
    setTrip(null);
    setSelectedSeats([]);
    setCurrentPaymentSelectionInDialog(null);
    setIsCheckingTripStatus(false);
    console.log(`Fetching details for tripId: ${tripIdFromParams}`);

    if (!tripIdFromParams) {
        toast({ title: "خطأ", description: "معرّف الرحلة غير موجود.", variant: "destructive" });
        setIsLoading(false);
        router.replace('/');
        return;
    }
    try {
      const tripRef = ref(dbPrimary, `currentTrips/${tripIdFromParams}`);
      const tripSnapshot = await get(tripRef);

      if (tripSnapshot.exists()) {
        const fbTrip = tripSnapshot.val() as FirebaseTripType;
        console.log("Fetched fbTrip from currentTrips:", fbTrip);

        const driverSnapshot = await get(ref(dbPrimary, `users/${fbTrip.driverId}`));

        if (driverSnapshot.exists()) {
          const driverData = driverSnapshot.val() as FirebaseUser;
          const processedSeats = generateSeatsFromTripData(fbTrip);

          const enrichedTrip: Trip = {
            id: fbTrip.id,
            firebaseTripData: fbTrip,
            driver: {
              id: driverData.id || fbTrip.driverId,
              name: driverData.fullName || "اسم غير متوفر",
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
            arrivalTime: fbTrip.expectedArrivalTime || "غير محدد",
            price: fbTrip.pricePerPassenger,
            startPoint: getGovernorateDisplayNameAr(fbTrip.startPoint),
            endPoint: getGovernorateDisplayNameAr(fbTrip.destination),
            meetingPoint: fbTrip.meetingPoint,
            notes: fbTrip.notes,
            status: fbTrip.status,
            seats: processedSeats,
            stops: [], 
          };
          setActualClickCode(enrichedTrip.driver.clickCode || CLICK_PAYMENT_CODE_PLACEHOLDER);

          console.log("Raw fbTrip.startPoint from currentTrips:", fbTrip.startPoint);
          console.log("Raw fbTrip.destination from currentTrips:", fbTrip.destination);

          if (fbTrip.startPoint && fbTrip.destination) {
            const capitalizedStartPoint = capitalizeFirstLetter(fbTrip.startPoint);
            const capitalizedDestination = capitalizeFirstLetter(fbTrip.destination);
            const stopStationsPathKey = `${capitalizedStartPoint} to ${capitalizedDestination}`;
          
            console.log(`Attempting to fetch stops for key: stopstations/${stopStationsPathKey}`);
          
            try {
              const stopsRefFirebase = ref(dbPrimary, `stopstations/${stopStationsPathKey}`);
              const stopsSnapshot = await get(stopsRefFirebase);
              if (stopsSnapshot.exists() && stopsSnapshot.val().stops && Array.isArray(stopsSnapshot.val().stops)) {
                enrichedTrip.stops = stopsSnapshot.val().stops;
                console.log(`Found stops for key ${stopStationsPathKey}:`, stopsSnapshot.val().stops);
              } else {
                console.log(`No stops found or 'stops' field missing/invalid for key: stopstations/${stopStationsPathKey}. Snapshot exists: ${stopsSnapshot.exists()}. Snapshot val:`, stopsSnapshot.val());
              }
            } catch (stopsError) {
              console.error(`Error fetching stop stations for key ${stopStationsPathKey}:`, stopsError);
            }
          } else {
            console.log("fbTrip.startPoint or fbTrip.destination is missing, skipping stops fetch.");
          }
          setTrip(enrichedTrip);

        } else {
           toast({ title: "خطأ", description: "لم يتم العثور على بيانات السائق لهذه الرحلة.", variant: "destructive" });
           router.replace('/');
        }
      } else {
        toast({ title: "خطأ", description: "الرحلة غير موجودة", variant: "destructive" });
        setTrip(null);
        router.replace('/');
      }
    } catch (error) {
      console.error("Error fetching trip details:", error);
      toast({ title: "خطأ", description: "لا يمكن تحميل تفاصيل الرحلة.", variant: "destructive" });
      setTrip(null);
      router.replace('/');
    } finally {
      setIsLoading(false);
    }
  }, [tripIdFromParams, router, toast]);

  useEffect(() => {
    if (tripIdFromParams) {
      fetchTripDetails();
    }
  }, [tripIdFromParams, fetchTripDetails]);

  const handleSeatClick = useCallback((seatId: string) => {
    setTrip(currentTrip => {
      if (!currentTrip || isBooking || isCheckingTripStatus) return currentTrip;
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
  }, [selectedSeats, isBooking, isCheckingTripStatus]);

  const handleProceedToPayment = async () => {
    const currentUser = authRider.currentUser;
    if (!currentUser) {
      toast({
        title: "يرجى تسجيل الدخول",
        description: "يجب عليك تسجيل الدخول أولاً لتتمكن من حجز رحلة.",
        variant: "destructive",
        action: (
          <Button onClick={() => router.push('/auth/signin')} variant="outline" size="sm">
            <LogIn className="ms-1 h-4 w-4" />
            تسجيل الدخول
          </Button>
        )
      });
      return;
    }

    if (selectedSeats.length === 0) {
      toast({ title: "خطأ", description: 'الرجاء اختيار مقعد واحد على الأقل.', variant: "destructive" });
      return;
    }
    if (!trip) {
        toast({ title: "خطأ", description: 'بيانات الرحلة غير متوفرة حاليًا.', variant: "destructive" });
        return;
    }

    setIsCheckingTripStatus(true);
    try {
        const tripRef = ref(dbPrimary, `currentTrips/${trip.id}`);
        const currentTripSnapshot = await get(tripRef);

        if (!currentTripSnapshot.exists() || currentTripSnapshot.val().status !== 'upcoming') {
            toast({
                title: "الرحلة غير متاحة",
                description: "هذه الرحلة لم تعد متاحة للحجز أو أن حالتها قد تغيرت. يتم تحديث التفاصيل...",
                variant: "destructive"
            });
            await fetchTripDetails(); 
            setIsCheckingTripStatus(false);
            return;
        }
        
        setCurrentPaymentSelectionInDialog(null);
        setIsPaymentDialogOpen(true);

    } catch (error) {
        console.error("Error checking trip status before payment:", error);
        toast({ title: "خطأ", description: "حدث خطأ أثناء التحقق من حالة الرحلة.", variant: "destructive" });
        await fetchTripDetails();
    }
    setIsCheckingTripStatus(false);
  };

  const handleCopyClickCode = async () => {
    if (!actualClickCode || actualClickCode === CLICK_PAYMENT_CODE_PLACEHOLDER) {
         toast({ title: "خطأ", description: "رمز كليك للسائق غير متوفر.", variant: "destructive" });
        return;
    }
    try {
      await navigator.clipboard.writeText(actualClickCode);
      toast({
        title: "تم النسخ بنجاح!",
        description: "تم نسخ رمز الدفع كليك إلى الحافظة.",
        className: "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 border-green-300 dark:border-green-600"
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
    setIsPaymentDialogOpen(false);
    await processBooking(currentPaymentSelectionInDialog);
  };

  const performSeatUpdateTransaction = async (
    currentTripId: string,
    userId: string,
    userPhoneNumber: string,
    userFullName: string
  ): Promise<void> => {
    const tripRef = ref(dbPrimary, `currentTrips/${currentTripId}`);
    const bookedAtTimestamp = Date.now();
    const bookingDetailsForDB = { 
        userId, 
        phone: userPhoneNumber, 
        fullName: userFullName, 
        bookedAt: bookedAtTimestamp 
    };

    await runTransaction(tripRef, (currentFirebaseTripData: FirebaseTripType | null): FirebaseTripType | undefined => {
      if (!currentFirebaseTripData) {
        throw new Error("Trip data not found in transaction.");
      }
      if (currentFirebaseTripData.status !== 'upcoming') {
        throw new Error("هذه الرحلة لم تعد متاحة للحجز (حالتها ليست 'upcoming').");
      }

      let seatsUpdatedInTransaction = false;

      if (currentFirebaseTripData.offeredSeatsConfig) {
        let newOfferedSeatsConfig = { ...(currentFirebaseTripData.offeredSeatsConfig || {}) };
        selectedSeats.forEach(seatId => {
          if (newOfferedSeatsConfig.hasOwnProperty(seatId) && newOfferedSeatsConfig[seatId] === true) {
            newOfferedSeatsConfig[seatId] = bookingDetailsForDB;
            seatsUpdatedInTransaction = true;
          } else {
            throw new Error(`المقعد ${seatId} غير متاح أو تم حجزه بالفعل.`);
          }
        });
        currentFirebaseTripData.offeredSeatsConfig = newOfferedSeatsConfig;
      } else if (currentFirebaseTripData.offeredSeatIds) {
         let newOfferedSeatIds = [...currentFirebaseTripData.offeredSeatIds];
         const originalLength = newOfferedSeatIds.length;
         newOfferedSeatIds = newOfferedSeatIds.filter(id => !selectedSeats.includes(id));

         if (newOfferedSeatIds.length !== originalLength - selectedSeats.length) {
           throw new Error("واحد أو أكثر من المقاعد المختارة غير متوفر.");
         }
         currentFirebaseTripData.offeredSeatIds = newOfferedSeatIds;

         if (!currentFirebaseTripData.passengerDetails) {
            currentFirebaseTripData.passengerDetails = {};
         }
         selectedSeats.forEach(seatId => {
           if(currentFirebaseTripData.passengerDetails) {
              currentFirebaseTripData.passengerDetails[seatId] = bookingDetailsForDB;
           }
         });
         seatsUpdatedInTransaction = true;
      } else {
          throw new Error("لم يتم العثور على تكوين المقاعد لهذه الرحلة.");
      }

      if (!seatsUpdatedInTransaction && selectedSeats.length > 0) {
           throw new Error("لم يتم تحديث المقاعد المختارة في قاعدة البيانات (قد تكون محجوزة أو غير صالحة).");
      }
      currentFirebaseTripData.updatedAt = Date.now();
      return currentFirebaseTripData;
    });
  };

  const handleSuccessfulBookingFinalization = async (
    currentTripId: string,
    userId: string,
    userPhoneNumber: string,
    userFullName: string,
    paymentType: 'cash' | 'click'
  ) => {
    if (!trip) {
        console.error("CRITICAL_BOOKING_ABORT: Trip data is null in handleSuccessfulBookingFinalization. Cannot proceed.");
        toast({ title: "خطأ فادح", description: "بيانات الرحلة غير متوفرة بشكل غير متوقع. لا يمكن إكمال الحجز.", variant: "destructive" });
        return;
    }

    const originalSelectedSeats = [...selectedSeats]; 
    const bookedSeatsCount = originalSelectedSeats.length;

    for (const seatId of originalSelectedSeats) {
      const seatInfo = trip.seats.find(s => s.id === seatId);
      if (seatInfo) {
        const historyTripsUserRef = ref(dbRider, `historytrips/${userId}`);
        const newBookingRef = push(historyTripsUserRef);
        const bookingId = newBookingRef.key;

        if (bookingId) {
          const historyTripData: StoredHistoryTrip = {
            bookingId: bookingId,
            tripId: currentTripId,
            seatId: seatId,
            seatName: seatInfo.name,
            tripPrice: trip.price,
            tripDateTime: trip.firebaseTripData.dateTime,
            departureCityValue: trip.firebaseTripData.startPoint,
            arrivalCityValue: trip.firebaseTripData.destination,
            driverId: trip.driver.id,
            driverNameSnapshot: trip.driver.name,
            fullNameSnapshot: userFullName,
            phoneSnapshot: userPhoneNumber,
            bookedAt: Date.now(),
            userId: userId,
            status: 'booked',
          };
          await firebaseSet(newBookingRef, historyTripData);
        }
      }
    }
    
    const bookingDetailsForUI = { 
        userId, 
        phone: userPhoneNumber, 
        fullName: userFullName, 
        bookedAt: Date.now() 
    };

    setTrip(currentTripUiState => {
      if (!currentTripUiState) return null;
      const updatedUiSeats = currentTripUiState.seats.map(seat =>
        originalSelectedSeats.includes(seat.id) ? { ...seat, status: 'taken' as SeatType['status'], bookedBy: bookingDetailsForUI } : seat
      );
      let updatedFirebaseTripDataForUi = { ...currentTripUiState.firebaseTripData };
      if (updatedFirebaseTripDataForUi.offeredSeatsConfig) {
          const newConfig = {...updatedFirebaseTripDataForUi.offeredSeatsConfig};
          originalSelectedSeats.forEach(seatId => {
              if (newConfig.hasOwnProperty(seatId)) {
                  newConfig[seatId] = bookingDetailsForUI;
              }
          });
          updatedFirebaseTripDataForUi.offeredSeatsConfig = newConfig;
      } else if (updatedFirebaseTripDataForUi.offeredSeatIds) {
          updatedFirebaseTripDataForUi.offeredSeatIds = updatedFirebaseTripDataForUi.offeredSeatIds.filter(id => !originalSelectedSeats.includes(id));
          if (!updatedFirebaseTripDataForUi.passengerDetails) {
              updatedFirebaseTripDataForUi.passengerDetails = {};
          }
          originalSelectedSeats.forEach(seatId => {
               if(updatedFirebaseTripDataForUi.passengerDetails) {
                  updatedFirebaseTripDataForUi.passengerDetails[seatId] = bookingDetailsForUI;
               }
          });
      }
      return { ...currentTripUiState, seats: updatedUiSeats, firebaseTripData: updatedFirebaseTripDataForUi };
    });
    
    setSelectedSeats([]); 
    setCurrentPaymentSelectionInDialog(null);

    // Commission Deduction Logic
    const driverIdForCommission = trip.driver.id;
    const commissionAmount = 0.20;
    let deductionAttemptedAndDataFoundInTransaction = false; 

    if (!driverIdForCommission) {
        console.error("CRITICAL_COMMISSION_ABORT: driverIdForCommission is undefined or null in trip.driver.id. Commission cannot be deducted.", trip.driver);
    } else {
        const driverUserRef = ref(dbPrimary, `users/${driverIdForCommission}`); 
        console.log(`COMMISSION_DEDUCTION_INFO: Attempting for driver: ${driverIdForCommission} (path: ${driverUserRef.toString()}) for booking of ${bookedSeatsCount} seat(s): ${originalSelectedSeats.join(', ')}`);

        try {
            const preTransactionDriverSnapshot = await get(driverUserRef);
            if (preTransactionDriverSnapshot.exists()) {
                console.log(`COMMISSION_DEDUCTION_PRE_GET_SUCCESS: Successfully fetched driver data for ${driverIdForCommission} (path: ${driverUserRef.toString()}) BEFORE transaction:`, JSON.parse(JSON.stringify(preTransactionDriverSnapshot.val())));
            } else {
                console.warn(`COMMISSION_DEDUCTION_PRE_GET_NOT_FOUND: Driver data NOT FOUND for ID ${driverIdForCommission} at path ${driverUserRef.toString()} in dbPrimary (BEFORE transaction).`);
            }
        } catch (e: any) {
            console.error(`COMMISSION_DEDUCTION_PRE_GET_ERROR: Error fetching driver data for ${driverIdForCommission} (path: ${driverUserRef.toString()}) BEFORE transaction:`, e.message, e);
        }
        
        console.log(`COMMISSION_DEDUCTION_DELAY: Adding a 1.5s delay before driver wallet transaction for ${driverIdForCommission}. Current time: ${new Date().toISOString()}`);
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        console.log(`COMMISSION_DEDUCTION_DELAY: Delay finished for ${driverIdForCommission}. Proceeding with transaction. Current time: ${new Date().toISOString()}`);

        try {
          await runTransaction(driverUserRef, (currentDriverData: FirebaseUser | null): FirebaseUser | undefined => {
            if (currentDriverData) { 
              deductionAttemptedAndDataFoundInTransaction = true; 
              const currentBalance = Number(currentDriverData.walletBalance) || 0;
              console.log(`COMMISSION_DEDUCTION_TRANSACTION_INSIDE: Driver ${driverIdForCommission}, Path: ${driverUserRef.toString()}, Current WalletBalance: ${currentBalance}`);
              
              const newBalance = currentBalance - commissionAmount;
              console.log(`COMMISSION_DEDUCTION_TRANSACTION_INSIDE: New WalletBalance for driver ${driverIdForCommission} will be: ${newBalance.toFixed(2)}`);
              
              currentDriverData.walletBalance = newBalance;
              currentDriverData.updatedAt = Date.now(); 
              
              return currentDriverData; 
            } else {
              deductionAttemptedAndDataFoundInTransaction = false; 
              console.warn(`COMMISSION_DEDUCTION_TRANSACTION_NO_DATA: Driver user data NOT FOUND for ID ${driverIdForCommission} in dbPrimary at path ${driverUserRef.toString()} (inside transaction). Commission cannot be deducted.`);
              return undefined; 
            }
          });

          if(deductionAttemptedAndDataFoundInTransaction){
            console.log(`COMMISSION_DEDUCTION_TRANSACTION_APPLIED: Wallet deduction transaction for driver ${driverIdForCommission} (path: ${driverUserRef.toString()}) was processed by Firebase. Data was found and update was attempted.`);
          } else {
            console.warn(`COMMISSION_DEDUCTION_TRANSACTION_ABORTED_NO_DATA: Wallet deduction transaction for driver ${driverIdForCommission} (path: ${driverUserRef.toString()}) completed, but no driver data was found by the transaction to update.`);
          }

        } catch (error: any) {
          console.error(`COMMISSION_DEDUCTION_TRANSACTION_ERROR: Failed to deduct commission for driver ${driverIdForCommission} (path: ${driverUserRef.toString()}). Error:`, error.message);
          console.error("COMMISSION_DEDUCTION_TRANSACTION_ERROR_FULL: Full error object:", error);
        }
    }

    toast({
      title: "تم تأكيد الحجز بنجاح!",
      description: `تم حجز ${bookedSeatsCount} ${bookedSeatsCount === 1 ? 'مقعد' : bookedSeatsCount === 2 ? 'مقعدين' : 'مقاعد'} بطريقة الدفع: ${paymentType === 'cash' ? 'كاش' : 'كليك'}. نتمنى لك رحلة سعيدة!`,
      className: "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 border-green-300 dark:border-green-600"
    });
    router.push('/');
  };


  const processBooking = async (paymentType: 'cash' | 'click') => {
    const currentUser = authRider.currentUser;
    const currentTripForBooking = trip; 

    if (!currentTripForBooking) {
      toast({ title: "خطأ في الحجز", description: "بيانات الرحلة غير متوفرة.", variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: "خطأ في الحجز", description: "المستخدم غير مسجل الدخول.", variant: "destructive" });
      return;
    }
    if (selectedSeats.length === 0) {
      toast({ title: "خطأ", description: 'الرجاء اختيار مقعد واحد على الأقل.', variant: "destructive" });
      return;
    }

    setIsBooking(true);
    const currentTripId = currentTripForBooking.id;
    const userId = currentUser.uid;
    let userPhoneNumber = '';
    let userFullName = '';

    try {
        const userRef = ref(dbRider, `users/${userId}`);
        const userSnapshot = await get(userRef);
        if (!userSnapshot.exists() || !userSnapshot.val().phoneNumber || !userSnapshot.val().fullName) {
            toast({ title: "خطأ في الحجز", description: "لم يتم العثور على بيانات المستخدم أو رقم الهاتف أو الاسم.", variant: "destructive" });
            setIsBooking(false);
            return;
        }
        userPhoneNumber = userSnapshot.val().phoneNumber as string;
        userFullName = userSnapshot.val().fullName as string;
    } catch (error: any) {
        console.error("Error fetching user data from dbRider for booking:", error);
        toast({ title: "خطأ في الحجز", description: `خطأ في جلب بيانات المستخدم: ${error.message || 'خطأ غير معروف'}`, variant: "destructive" });
        setIsBooking(false);
        return;
    }
    
    const tripRef = ref(dbPrimary, `currentTrips/${currentTripId}`);
    let preReadError = false;
    try {
        console.log(`Pre-read check for trip ${currentTripId} at ${new Date().toISOString()}`);
        const preReadSnapshot = await get(tripRef);
        if (!preReadSnapshot.exists()) {
            console.warn(`Pre-read: Trip ${currentTripId} not found before transaction attempt.`);
            preReadError = true;
        } else if (preReadSnapshot.val().status !== 'upcoming') {
            console.warn(`Pre-read: Trip ${currentTripId} status is ${preReadSnapshot.val().status}, not 'upcoming'.`);
            preReadError = true;
        }
        if (preReadError) {
             toast({ title: "خطأ في الحجز", description: `تعذر إكمال الحجز. الرحلة (${currentTripId}) لم تعد متوفرة أو حالتها تغيرت.`, variant: "destructive"});
             await fetchTripDetails();
             setIsBooking(false);
             return;
        }
        console.log(`Pre-read for trip ${currentTripId} successful.`);
    } catch (e: any) {
        console.error(`Pre-read error for trip ${currentTripId}:`, e);
        toast({ title: "خطأ في الحجز", description: `حدث خطأ أثناء التحقق من توفر الرحلة: ${e.message || 'خطأ غير معروف'}`, variant: "destructive"});
        await fetchTripDetails();
        setIsBooking(false);
        return;
    }

    try {
      console.log(`Attempt 1: Booking trip ${currentTripId} for user ${userId} at ${new Date().toISOString()}`);
      await performSeatUpdateTransaction(currentTripId, userId, userPhoneNumber, userFullName);
      await handleSuccessfulBookingFinalization(currentTripId, userId, userPhoneNumber, userFullName, paymentType);
    } catch (error: any) {
      if (error.message === "Trip data not found in transaction.") {
        console.warn(`HANDLED (Attempt 1 Failed - Not Found): Transaction failed for trip ${currentTripId}. User ${currentUser?.uid}, seats ${selectedSeats.join(', ')}. Error: ${error.message}. Retrying after delay...`);
        await new Promise(resolve => setTimeout(resolve, 1200)); 
        try {
          console.log(`Attempt 2: Booking trip ${currentTripId} for user ${userId} at ${new Date().toISOString()}`);
          await performSeatUpdateTransaction(currentTripId, userId, userPhoneNumber, userFullName);
          await handleSuccessfulBookingFinalization(currentTripId, userId, userPhoneNumber, userFullName, paymentType);
        } catch (retryError: any) {
          console.error(`HANDLED (Retry Failed): Transaction failed for trip ${currentTripId} after retry. User ${currentUser?.uid}, seats ${selectedSeats.join(', ')}. Error:`, retryError);
          toast({ title: "خطأ في الحجز", description: `لم نتمكن من إكمال الحجز للرحلة (${currentTripId}). قد تكون الرحلة قد حذفت أو لم تعد متوفرة.`, variant: "destructive"});
          await fetchTripDetails();
        }
      } else {
        console.error(`HANDLED (First Attempt Other Error): Transaction or other failure for trip ${currentTripId}. User ${currentUser?.uid}, seats ${selectedSeats.join(', ')}. Error:`, error);
        toast({ title: "خطأ في الحجز", description: error.message || "حدث خطأ غير متوقع أثناء محاولة الحجز.", variant: "destructive"});
        await fetchTripDetails();
      }
    } finally {
      setIsBooking(false);
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

  const totalSeatsPrice = selectedSeats.length * trip.price;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-3">
        <Info className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-center">تفاصيل الرحلة</h1>
      </div>

      <DriverInfo driver={trip.driver} />

      {trip.meetingPoint && (
        <Alert variant="default" className="bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300">
          <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="font-semibold">نقطة الالتقاء</AlertTitle>
          <AlertDescription>{trip.meetingPoint}</AlertDescription>
        </Alert>
      )}

      {trip.stops && trip.stops.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <RouteIcon className="h-6 w-6 text-primary" />
              محطات التوقف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc ps-5 space-y-1 text-sm text-muted-foreground">
              {trip.stops.map((stop, index) => (
                <li key={index}>{stop}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {trip.notes && (
         <Alert variant="default" className="mt-6 bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-300">
          <CircleHelp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
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
          المقاعد المختارة: {selectedSeats.length.toLocaleString('ar-JO')}
        </p>
        <p className="text-center font-bold text-lg">
          السعر الإجمالي: {totalSeatsPrice.toLocaleString('ar-JO')} دينار
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
          <DialogDescription className="text-center text-sm text-muted-foreground pt-1 pb-3">
            الرجاء تحديد طريقة الدفع المفضلة لإتمام الحجز.
          </DialogDescription>
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
                <div className="flex items-center justify-center gap-2 my-2 p-3 bg-muted/30 dark:bg-muted/10 rounded-lg shadow-sm border">
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
                  (يجب عليك تحويل مبلغ {totalSeatsPrice.toLocaleString('ar-JO')} دينار إلى السائق قبل الضغط على "لقد دفعت")
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
          disabled={selectedSeats.length === 0 || isBooking || isCheckingTripStatus || trip.status !== 'upcoming'}
        >
          {isCheckingTripStatus ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <Check className="ms-2 h-5 w-5" />}
          {isCheckingTripStatus ? "جار التحقق..." : trip.status !== 'upcoming' ? "الرحلة غير متاحة للحجز" : selectedSeats.length > 0 ? "تأكيد الحجز والمتابعة للدفع" : "اختر مقعداً أولاً"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (isBooking || isCheckingTripStatus) return;
            setCurrentPaymentSelectionInDialog(null);
            router.back();
          }}
          className="flex-1 p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:shadow-md active:scale-95"
          disabled={isBooking || isCheckingTripStatus}
        >
          <ArrowLeft className="ms-2 h-5 w-5" />
          رجوع
        </Button>
      </div>
    </div>
  );
}

    

    