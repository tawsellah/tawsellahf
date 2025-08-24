
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
import { CheckCircle, XCircle, Info, Armchair, Check, ArrowLeft, Loader2, DollarSign, Smartphone, Copy, MapPin, LogIn, CircleHelp, Route as RouteIcon, Users, Edit, PersonStanding, User as UserIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { dbPrimary, authRider, dbRider } from '@/lib/firebase';
import { ref, get, runTransaction, push, set as firebaseSet, child, update, serverTimestamp, query, orderByChild, equalTo } from 'firebase/database';
import { generateSeatsFromTripData, formatTimeToArabicAMPM, formatDateToArabic, getGovernorateDisplayNameAr, capitalizeFirstLetter } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { User as FirebaseUserAuth } from 'firebase/auth';

const CLICK_PAYMENT_CODE_PLACEHOLDER = "غير متوفر";
const BOOKING_FEE = 0.20; // 20 Piasters

export default function TripDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const tripIdFromParams = typeof params.tripId === 'string' ? params.tripId : '';

  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedStop, setSelectedStop] = useState<string>('destination');
  const [showOtherStopAlert, setShowOtherStopAlert] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [isCheckingTripStatus, setIsCheckingTripStatus] = useState(false);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [currentPaymentSelectionInDialog, setCurrentPaymentSelectionInDialog] = useState<'cash' | 'cliq' | null>(null);
  const [actualClickCode, setActualClickCode] = useState<string>(CLICK_PAYMENT_CODE_PLACEHOLDER);

  const fetchTripDetails = useCallback(async () => {
    if (!tripIdFromParams) {
        toast({ title: "خطأ", description: "معرّف الرحلة غير موجود.", variant: "destructive" });
        router.replace('/');
        return;
    }
    try {
      const tripRef = ref(dbPrimary, `currentTrips/${tripIdFromParams}`);
      const tripSnapshot = await get(tripRef);

      if (tripSnapshot.exists()) {
        const fbTrip = tripSnapshot.val() as FirebaseTripType;
        const driverSnapshot = await get(ref(dbPrimary, `users/${fbTrip.driverId}`));

        if (driverSnapshot.exists()) {
          const driverData = driverSnapshot.val() as FirebaseUser;
          const processedSeats = generateSeatsFromTripData(fbTrip);

          let enrichedTrip: Trip = {
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

          if (fbTrip.startPoint && fbTrip.destination) {
            const capitalizedStartPoint = capitalizeFirstLetter(fbTrip.startPoint);
            const capitalizedDestination = capitalizeFirstLetter(fbTrip.destination);
            const stopStationsPathKey = `${capitalizedStartPoint} to ${capitalizedDestination}`;
          
            try {
              const stopsRefFirebase = ref(dbPrimary, `stopstations/${stopStationsPathKey}`);
              const stopsSnapshot = await get(stopsRefFirebase);
              if (stopsSnapshot.exists() && stopsSnapshot.val().stops && Array.isArray(stopsSnapshot.val().stops)) {
                enrichedTrip.stops = stopsSnapshot.val().stops;
              }
            } catch (stopsError) {
              console.error(`Error fetching stop stations for key ${stopStationsPathKey}:`, stopsError);
            }
          }
          setTrip(enrichedTrip);
        } else {
           toast({ title: "خطأ", description: "لم يتم العثور على بيانات السائق لهذه الرحلة.", variant: "destructive" });
           setTrip(null);
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
    }
  }, [tripIdFromParams, router, toast]);

  useEffect(() => {
    if (tripIdFromParams) {
      setIsLoading(true);
      let hasCache = false;
      try {
        const cachedTripJSON = sessionStorage.getItem(`trip_${tripIdFromParams}`);
        if (cachedTripJSON) {
          const cachedTrip = JSON.parse(cachedTripJSON) as Trip;
          setTrip(cachedTrip);
          setActualClickCode(cachedTrip.driver.clickCode || CLICK_PAYMENT_CODE_PLACEHOLDER);
          hasCache = true;
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Could not get trip from session storage.", e);
      }
      
      fetchTripDetails().finally(() => {
        setIsLoading(false);
      });
    }
  }, [tripIdFromParams, fetchTripDetails]);

  const handleSeatClick = useCallback((seatId: string) => {
    // Only allow selecting ONE seat
    setTrip(currentTrip => {
        if (!currentTrip || isBooking || isCheckingTripStatus) return currentTrip;

        const seatIndex = currentTrip.seats.findIndex(s => s.id === seatId);
        if (seatIndex === -1) return currentTrip;

        const seat = currentTrip.seats[seatIndex];
        if (seat.status === 'taken' || seat.status === 'driver') return currentTrip;

        // If the clicked seat is already selected, deselect it.
        if (seat.status === 'selected') {
            const newSeats = [...currentTrip.seats];
            newSeats[seatIndex] = { ...seat, status: 'available' };
            setSelectedSeats([]);
            return { ...currentTrip, seats: newSeats };
        }

        // If any other seat is selected, deselect it first.
        const currentlySelectedSeatIndex = currentTrip.seats.findIndex(s => s.status === 'selected');
        const newSeats = [...currentTrip.seats];

        if (currentlySelectedSeatIndex > -1) {
            newSeats[currentlySelectedSeatIndex] = { ...newSeats[currentlySelectedSeatIndex], status: 'available' };
        }

        // Select the new seat.
        newSeats[seatIndex] = { ...seat, status: 'selected' };
        setSelectedSeats([seatId]);
        
        return { ...currentTrip, seats: newSeats };
    });
}, [isBooking, isCheckingTripStatus]);


  const checkUserCanBook = async (user: FirebaseUserAuth): Promise<{canBook: boolean; reason?: string; action?: 'redirect_profile' | 'info'}> => {
     // 1. Check for existing active bookings
    const userHistoryRef = ref(dbRider, `historytrips/${user.uid}`);
    const historySnapshot = await get(userHistoryRef);
    if (historySnapshot.exists()) {
        const historyTrips = historySnapshot.val() as Record<string, StoredHistoryTrip>;
        const activeBookingPromises = Object.values(historyTrips)
            .filter(trip => trip.status === 'booked')
            .map(async (trip) => {
                const originalTripRef = ref(dbPrimary, `currentTrips/${trip.tripId}`);
                const originalTripSnapshot = await get(originalTripRef);
                if (originalTripSnapshot.exists() && originalTripSnapshot.val().status === 'upcoming') {
                    return true;
                }
                return false;
            });
        
        const activeBookings = await Promise.all(activeBookingPromises);
        if (activeBookings.some(isActive => isActive)) {
            return { canBook: false, reason: "لديك حجز نشط في رحلة أخرى بالفعل. لا يمكنك حجز أكثر من مقعد واحد في المرة الواحدة.", action: 'info' };
        }
    }

    // 2. Check if user profile is complete (phone and gender)
    const userProfileRef = ref(dbRider, `users/${user.uid}`);
    const profileSnapshot = await get(userProfileRef);
    if (profileSnapshot.exists()) {
        const userData = profileSnapshot.val() as FirebaseUser;
        if (!userData.phoneNumber || !userData.gender) {
            return { canBook: false, reason: "الرجاء إكمال ملفك الشخصي (رقم الهاتف والجنس) قبل المتابعة.", action: 'redirect_profile'};
        }
    } else {
        // This case is unlikely if they are logged in, but good to handle
        return { canBook: false, reason: "لم نتمكن من العثور على ملفك الشخصي. الرجاء تحديثه.", action: 'redirect_profile' };
    }

    return { canBook: true };
  }

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
        // Check if user is allowed to book
        const bookingCheck = await checkUserCanBook(currentUser);
        if (!bookingCheck.canBook) {
            toast({
                title: "لا يمكن إكمال الحجز",
                description: bookingCheck.reason,
                variant: "destructive",
                action: bookingCheck.action === 'redirect_profile' ? (
                    <Button onClick={() => router.push('/profile')} variant="outline" size="sm">
                        <Edit className="ms-1 h-4 w-4" />
                        الذهاب للملف الشخصي
                    </Button>
                ) : undefined
            });
            setIsCheckingTripStatus(false);
            return;
        }

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
    userFullName: string,
    userGender: 'male' | 'female',
    paymentType: 'cash' | 'cliq',
    stopPoint: string
  ): Promise<void> => {
    const tripRef = ref(dbPrimary, `currentTrips/${currentTripId}`);
    const bookedAtTimestamp = Date.now();
    const bookingDetailsForDB = { 
        userId, 
        phone: userPhoneNumber, 
        fullName: userFullName, 
        gender: userGender,
        bookedAt: bookedAtTimestamp,
        paymentType: paymentType,
        selectedStop: stopPoint,
        fees: BOOKING_FEE,
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
    userGender: 'male' | 'female',
    paymentType: 'cash' | 'cliq',
    stopPoint: string
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
            bookedAt: Date.now(),
            userId: userId,
            status: 'booked',
            paymentType: paymentType,
            selectedStop: stopPoint,
            fees: BOOKING_FEE,
            gender: userGender,
          };
          await firebaseSet(newBookingRef, historyTripData);
        }
      }
    }
    
    const bookingDetailsForUI = { 
        userId, 
        phone: userPhoneNumber, 
        fullName: userFullName, 
        gender: userGender,
        bookedAt: Date.now(),
        paymentType: paymentType,
        selectedStop: stopPoint,
        fees: BOOKING_FEE
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

    const driverIdForCommission = trip.driver.id;
    const totalFees = BOOKING_FEE * bookedSeatsCount;
    
    if (!driverIdForCommission) {
        console.error("CRITICAL_COMMISSION_ABORT: driverIdForCommission is undefined or null. Commission cannot be deducted.", trip.driver);
    } else {
        const driverRefForUpdate = ref(dbPrimary, `users/${driverIdForCommission}`);
        console.log(`FEE_DEDUCTION: Deducting ${totalFees} from driver: ${driverIdForCommission}`);
        
        try {
            const driverSnapshot = await get(driverRefForUpdate);
            if (!driverSnapshot.exists()) {
                console.warn(`FEE_DEDUCTION_NOT_FOUND: Driver data NOT FOUND for ID ${driverIdForCommission}. Fees cannot be deducted.`);
            } else {
                const driverData = driverSnapshot.val() as FirebaseUser;
                const currentBalance = Number(driverData.walletBalance) || 0;
                const newBalance = currentBalance - totalFees;

                await update(driverRefForUpdate, { walletBalance: newBalance, updatedAt: serverTimestamp() });
                console.log(`FEE_DEDUCTION_SUCCESS: Successfully updated wallet for driver ${driverIdForCommission}. New balance is ${newBalance}.`);
            }
        } catch (error: any) {
            console.error(`FEE_DEDUCTION_ERROR: Failed to deduct fees for driver ${driverIdForCommission}. Error:`, error.message);
        }
    }

    toast({
      title: "تم تأكيد الحجز بنجاح!",
      description: `تم حجز ${bookedSeatsCount} ${bookedSeatsCount === 1 ? 'مقعد' : bookedSeatsCount === 2 ? 'مقعدين' : 'مقاعد'} بطريقة الدفع: ${paymentType === 'cash' ? 'كاش' : 'كليك'}. نتمنى لك رحلة سعيدة!`,
      className: "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 border-green-300 dark:border-green-600"
    });
    router.push('/my-trips');
  };


  const processBooking = async (paymentType: 'cash' | 'cliq') => {
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
    let userGender: 'male' | 'female' | undefined;
    const stopPoint = selectedStop; // Use the state variable

    try {
        const userRef = ref(dbRider, `users/${userId}`);
        const userSnapshot = await get(userRef);
        if (!userSnapshot.exists() || !userSnapshot.val().phoneNumber || !userSnapshot.val().fullName || !userSnapshot.val().gender) {
            toast({ title: "خطأ في الحجز", description: "الرجاء إكمال ملفك الشخصي (رقم الهاتف والجنس) أولاً.", variant: "destructive" });
            setIsBooking(false);
            return;
        }
        const userData = userSnapshot.val();
        userPhoneNumber = userData.phoneNumber as string;
        userFullName = userData.fullName as string;
        userGender = userData.gender as 'male' | 'female';
        
    } catch (error: any) {
        console.error("Error fetching user data from dbRider for booking:", error);
        toast({ title: "خطأ في الحجز", description: `خطأ في جلب بيانات المستخدم: ${error.message || 'خطأ غير معروف'}`, variant: "destructive" });
        setIsBooking(false);
        return;
    }

    if (!userGender) { // Redundant check, but good for type safety and logic clarity
        toast({ title: "خطأ في الحجز", description: "لم يتم تحديد جنس المستخدم في الملف الشخصي. الرجاء التحديث والمحاولة مرة أخرى.", variant: "destructive" });
        setIsBooking(false);
        return;
    }
    
    const tripRef = ref(dbPrimary, `currentTrips/${currentTripId}`);
    let preReadError = false;
    try {
        const preReadSnapshot = await get(tripRef);
        if (!preReadSnapshot.exists()) {
            preReadError = true;
        } else if (preReadSnapshot.val().status !== 'upcoming') {
            preReadError = true;
        }
        if (preReadError) {
             toast({ title: "خطأ في الحجز", description: `تعذر إكمال الحجز. الرحلة (${currentTripId}) لم تعد متوفرة أو حالتها تغيرت.`, variant: "destructive"});
             await fetchTripDetails();
             setIsBooking(false);
             return;
        }
    } catch (e: any) {
        console.error(`Pre-read error for trip ${currentTripId}:`, e);
        toast({ title: "خطأ في الحجز", description: `حدث خطأ أثناء التحقق من توفر الرحلة: ${e.message || 'خطأ غير معروف'}`, variant: "destructive"});
        await fetchTripDetails();
        setIsBooking(false);
        return;
    }

    try {
      await performSeatUpdateTransaction(currentTripId, userId, userPhoneNumber, userFullName, userGender, paymentType, stopPoint);
      await handleSuccessfulBookingFinalization(currentTripId, userId, userPhoneNumber, userFullName, userGender, paymentType, stopPoint);
    } catch (error: any) {
      if (error.message === "Trip data not found in transaction.") {
        console.warn(`HANDLED (Attempt 1 Failed - Not Found): Transaction failed for trip ${currentTripId}. User ${currentUser?.uid}, seats ${selectedSeats.join(', ')}. Error: ${error.message}. Retrying after delay...`);
        await new Promise(resolve => setTimeout(resolve, 1200)); 
        try {
          await performSeatUpdateTransaction(currentTripId, userId, userPhoneNumber, userFullName, userGender, paymentType, stopPoint);
          await handleSuccessfulBookingFinalization(currentTripId, userId, userPhoneNumber, userFullName, userGender, paymentType, stopPoint);
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

  const handleStopChange = (value: string) => {
    setSelectedStop(value);
    if (value === 'other') {
      setShowOtherStopAlert(true);
    } else {
      setShowOtherStopAlert(false);
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

      {(trip.stops && trip.stops.length > 0) && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <RouteIcon className="h-6 w-6 text-primary" />
              محطات التوقف ونقطة النزول
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
              <div>
                  <h4 className="font-medium mb-2">نقاط التوقف المتاحة:</h4>
                  <ul className="list-disc ps-5 space-y-1 text-sm text-muted-foreground">
                    {trip.stops.map((stop, index) => (
                      <li key={index}>{stop}</li>
                    ))}
                  </ul>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stop-select" className="font-medium">اختر نقطة النزول (اختياري):</Label>
                <Select value={selectedStop} onValueChange={handleStopChange}>
                    <SelectTrigger id="stop-select" className="w-full">
                        <SelectValue placeholder="اختر نقطة نزولك" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="destination">الوجهة النهائية ({trip.endPoint})</SelectItem>
                        {trip.stops.map((stop, index) => (
                            <SelectItem key={index} value={stop}>{stop}</SelectItem>
                        ))}
                        <SelectItem value="other">أخرى (سيتم التواصل معك)</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              {showOtherStopAlert && (
                  <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-700 dark:text-yellow-300">
                      <CircleHelp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <AlertTitle className="font-semibold">تنويه</AlertTitle>
                      <AlertDescription>
                          لقد اخترت "أخرى". سيقوم السائق بالتواصل معك لتأكيد نقطة النزول النهائية.
                      </AlertDescription>
                  </Alert>
              )}
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
        <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-seat-taken"></div>
            <span>محجوز (ذكر)</span>
             <PersonStanding className="w-4 h-4" />
          </div>
           <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-seat-taken"></div>
            <span>محجوز (أنثى)</span>
            <UserIcon className="w-4 h-4" />
          </div>
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
              onValueChange={(value: 'cash' | 'cliq') => setCurrentPaymentSelectionInDialog(value)}
              className="space-y-3"
            >
              <Label htmlFor="r-cash" className={cn("flex items-center space-x-2 space-x-reverse p-3 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer", currentPaymentSelectionInDialog === 'cash' ? "bg-seat-selected text-seat-selected-foreground border-seat-selected/70" : "border-border")}>
                <RadioGroupItem value="cash" id="r-cash" />
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="flex-1 text-base">كاش</span>
              </Label>
              <Label htmlFor="r-cliq" className={cn("flex items-center space-x-2 space-x-reverse p-3 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer", currentPaymentSelectionInDialog === 'cliq' ? "bg-seat-selected text-seat-selected-foreground border-seat-selected/70" : "border-border")}>
                <RadioGroupItem value="cliq" id="r-cliq" />
                <Smartphone className="h-5 w-5 text-primary" />
                <span className="flex-1 text-base">كليك</span>
              </Label>
            </RadioGroup>

            {currentPaymentSelectionInDialog === 'cliq' && (
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
              disabled={!currentPaymentSelectionInDialog || isBooking || (currentPaymentSelectionInDialog === 'cliq' && actualClickCode === CLICK_PAYMENT_CODE_PLACEHOLDER)}
            >
              {isBooking && <Loader2 className="ms-2 h-5 w-5 animate-spin" />}
              {!currentPaymentSelectionInDialog ? "اختر طريقة أولاً" :
               currentPaymentSelectionInDialog === 'cash' ? "تأكيد والدفع كاش" :
               (actualClickCode !== CLICK_PAYMENT_CODE_PLACEHOLDER ? "اتمام الحجز" : "رمز كليك للسائق غير متوفر")}
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

    