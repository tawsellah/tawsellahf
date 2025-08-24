
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authRider, dbRider, dbPrimary } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUserAuth } from 'firebase/auth';
import { ref, get, child, query, orderByChild, equalTo, DataSnapshot, runTransaction, set as firebaseSet, push, update } from 'firebase/database';
import type { StoredHistoryTrip, DisplayableHistoryTrip, FirebaseTrip, FirebaseUser, GroupedDisplayableTrip } from '@/types';
import { Button } from '@/components/ui/button';
import { HistoryTripCard } from '@/components/trip/HistoryTripCard';
import { Loader2, History, Frown, XCircle, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { 
  formatDateToArabic, 
  formatTimeToArabicAMPM, 
  getDayOfWeekArabic,
  getGovernorateDisplayNameAr
} from '@/lib/constants';

export default function MyTripsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUserAuth | null>(null);
  const [groupedHistoryTrips, setGroupedHistoryTrips] = useState<GroupedDisplayableTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancelSingleConfirmDialog, setShowCancelSingleConfirmDialog] = useState(false);
  const [showCancelMultipleSeatsDialog, setShowCancelMultipleSeatsDialog] = useState(false);
  const [bookingsForCurrentCancellationScope, setBookingsForCurrentCancellationScope] = useState<DisplayableHistoryTrip[]>([]);
  const [singleBookingToCancel, setSingleBookingToCancel] = useState<DisplayableHistoryTrip | null>(null);
  const [selectedBookingIdsInDialog, setSelectedBookingIdsInDialog] = useState<string[]>([]);
  const [isProcessingCancellation, setIsProcessingCancellation] = useState(false);

  const fetchHistoryTrips = useCallback(async (currentAuthUser: FirebaseUserAuth | null) => {
    if (!currentAuthUser) {
      setGroupedHistoryTrips([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const userHistoryRef = ref(dbRider, `historytrips/${currentAuthUser.uid}`);
      const snapshot = await get(userHistoryRef);

      if (snapshot.exists()) {
        const storedTripsData = snapshot.val() as Record<string, StoredHistoryTrip>;
        
        const displayableTripsPromises = Object.values(storedTripsData).map(async (storedTrip) => {
          let originalTrip: FirebaseTrip | null = null;
          let originalTripExists = false;
          let driverDetails: Partial<FirebaseUser> = {};

          try {
            const originalTripRef = ref(dbPrimary, `currentTrips/${storedTrip.tripId}`);
            const originalTripSnapshot = await get(originalTripRef);
            if (originalTripSnapshot.exists()) {
              originalTrip = originalTripSnapshot.val() as FirebaseTrip;
              originalTripExists = true;
            }
          } catch (e) {
            console.warn(`Could not fetch original trip ${storedTrip.tripId}:`, e);
          }
          
          try {
              const driverRef = ref(dbPrimary, `users/${storedTrip.driverId}`);
              const driverSnapshot = await get(driverRef);
              if (driverSnapshot.exists()) {
                  driverDetails = driverSnapshot.val() as FirebaseUser;
              }
          } catch (e) {
              console.warn(`Could not fetch driver details for ${storedTrip.driverId}`, e);
          }

          let currentTripStatusDisplay: DisplayableHistoryTrip['currentTripStatusDisplay'] = 'مؤرشفة (غير معروفة)';
          let currentStoredTripStatus = storedTrip.status || 'booked';

          if (currentStoredTripStatus === 'user-cancelled') {
            currentTripStatusDisplay = 'ملغاة (بواسطتك)';
          } else if (currentStoredTripStatus === 'system-cancelled') {
            currentTripStatusDisplay = 'ملغاة (النظام)';
          } else if (originalTrip) {
            let isSeatStillBookedByCurrentUser = false;
            if (originalTrip.offeredSeatsConfig && typeof originalTrip.offeredSeatsConfig[storedTrip.seatId] === 'object') {
                const seatDetail = originalTrip.offeredSeatsConfig[storedTrip.seatId] as { userId: string };
                isSeatStillBookedByCurrentUser = seatDetail.userId === currentAuthUser.uid;
            } else if (originalTrip.passengerDetails && originalTrip.passengerDetails[storedTrip.seatId]) {
                isSeatStillBookedByCurrentUser = originalTrip.passengerDetails[storedTrip.seatId].userId === currentAuthUser.uid;
            }

            if (!isSeatStillBookedByCurrentUser && originalTrip.status === 'upcoming' && currentStoredTripStatus === 'booked') {
               currentTripStatusDisplay = 'ملغاة (النظام)';
               const specificHistoryTripRef = ref(dbRider, `historytrips/${currentAuthUser.uid}/${storedTrip.bookingId}`);
               await firebaseSet(child(specificHistoryTripRef, 'status'), 'system-cancelled').catch(err => console.error("Failed to update history trip status to system-cancelled", err));
               storedTrip.status = 'system-cancelled'; 
            } else {
              switch (originalTrip.status) {
                case 'completed': currentTripStatusDisplay = 'مكتملة'; break;
                case 'ongoing': currentTripStatusDisplay = 'حالية'; break;
                case 'upcoming': currentTripStatusDisplay = 'قادمة'; break;
                case 'cancelled': currentTripStatusDisplay = 'ملغاة'; break;
                default: currentTripStatusDisplay = 'مؤرشفة (غير معروفة)';
              }
            }
          } else { 
            const tripDate = new Date(storedTrip.tripDateTime);
            if (currentStoredTripStatus === 'booked') {
                currentTripStatusDisplay = tripDate < new Date() ? 'مكتملة' : 'ملغاة (النظام)'; 
                 if (tripDate >= new Date()) { 
                    const specificHistoryTripRef = ref(dbRider, `historytrips/${currentAuthUser.uid}/${storedTrip.bookingId}`);
                    await firebaseSet(child(specificHistoryTripRef, 'status'), 'system-cancelled').catch(err => console.error("Failed to update history trip status to system-cancelled (original missing)", err));
                    storedTrip.status = 'system-cancelled';
                 }
            }
          }
          
          return {
            ...storedTrip,
            tripDateDisplay: formatDateToArabic(storedTrip.tripDateTime),
            tripTimeDisplay: formatTimeToArabicAMPM(storedTrip.tripDateTime),
            dayOfWeekDisplay: getDayOfWeekArabic(storedTrip.tripDateTime),
            departureCityDisplay: getGovernorateDisplayNameAr(storedTrip.departureCityValue),
            arrivalCityDisplay: getGovernorateDisplayNameAr(storedTrip.arrivalCityValue),
            currentTripStatusDisplay,
            originalTripExists,
            originalActualTripStatus: originalTrip?.status,
            driverPhoneNumberSnapshot: driverDetails.phoneNumber || driverDetails.phone,
            driverCarModelSnapshot: driverDetails.vehicleMakeModel,
            driverCarNumberSnapshot: driverDetails.vehiclePlateNumber,
            driverCarColorSnapshot: driverDetails.vehicleColor,
            driverCarColorNameSnapshot: driverDetails.vehicleColor,
          };
        });

        const resolvedIndividualTrips = (await Promise.all(displayableTripsPromises)) as DisplayableHistoryTrip[];
        
        const groupedTripsMap = new Map<string, GroupedDisplayableTrip>();
        resolvedIndividualTrips.forEach(individualTrip => {
          if (!groupedTripsMap.has(individualTrip.tripId)) {
            let overallStatusForCancellation: FirebaseTrip['status'] | 'unknown' = 'unknown';
            let cardHeaderDisplay: GroupedDisplayableTrip['cardHeaderStatusDisplay'] = 'مؤرشفة';

            if (individualTrip.originalTripExists && individualTrip.originalActualTripStatus) {
                overallStatusForCancellation = individualTrip.originalActualTripStatus;
                switch(individualTrip.originalActualTripStatus) {
                    case 'upcoming': cardHeaderDisplay = 'قادمة'; break;
                    case 'completed': cardHeaderDisplay = 'مكتملة'; break;
                    case 'cancelled': cardHeaderDisplay = 'ملغاة'; break;
                    case 'ongoing': cardHeaderDisplay = 'حالية'; break;
                    default: cardHeaderDisplay = 'مؤرشفة';
                }
            } else if (!individualTrip.originalTripExists) {
                 const tripDate = new Date(individualTrip.tripDateTime);
                 cardHeaderDisplay = tripDate < new Date() ? 'مكتملة' : 'ملغاة';
            }


            groupedTripsMap.set(individualTrip.tripId, {
              originalTripId: individualTrip.tripId,
              tripDateDisplay: individualTrip.tripDateDisplay,
              tripTimeDisplay: individualTrip.tripTimeDisplay,
              dayOfWeekDisplay: individualTrip.dayOfWeekDisplay,
              departureCityDisplay: individualTrip.departureCityDisplay,
              arrivalCityDisplay: individualTrip.arrivalCityDisplay,
              driverNameSnapshot: individualTrip.driverNameSnapshot,
              driverPhoneNumberSnapshot: individualTrip.driverPhoneNumberSnapshot,
              driverCarModelSnapshot: individualTrip.driverCarModelSnapshot,
              driverCarNumberSnapshot: individualTrip.driverCarNumberSnapshot,
              driverCarColorSnapshot: individualTrip.driverCarColorSnapshot,
              driverCarColorNameSnapshot: individualTrip.driverCarColorNameSnapshot,
              overallTripStatusForCancellationLogic: overallStatusForCancellation,
              originalTripExists: individualTrip.originalTripExists,
              userBookingsForThisTrip: [],
              cardHeaderStatusDisplay: cardHeaderDisplay,
              canCancelAnyBookingInGroup: false,
            });
          }
          const group = groupedTripsMap.get(individualTrip.tripId)!;
          group.userBookingsForThisTrip.push(individualTrip);
        });

        const finalGroupedTrips: GroupedDisplayableTrip[] = Array.from(groupedTripsMap.values()).map(group => {
            const activeBookings = group.userBookingsForThisTrip.filter(
              b => b.status !== 'user-cancelled' && b.status !== 'system-cancelled'
            );
            group.canCancelAnyBookingInGroup = group.overallTripStatusForCancellationLogic === 'upcoming' && activeBookings.length > 0;
            
            if (activeBookings.length === 0 && group.userBookingsForThisTrip.length > 0) {
                const allUserCancelled = group.userBookingsForThisTrip.every(b => b.status === 'user-cancelled');
                const allSystemCancelled = group.userBookingsForThisTrip.every(b => b.status === 'system-cancelled');
                if (allUserCancelled) group.cardHeaderStatusDisplay = 'ملغاة (بواسطتك)';
                else if (allSystemCancelled) group.cardHeaderStatusDisplay = 'ملغاة (النظام)';
                else group.cardHeaderStatusDisplay = 'ملغاة';
            } else if (activeBookings.length > 0 && activeBookings.length < group.userBookingsForThisTrip.length) {
                group.cardHeaderStatusDisplay = 'متعدد الحالات';
            } else if (activeBookings.length > 0 && group.overallTripStatusForCancellationLogic !== 'upcoming') {
                if (group.overallTripStatusForCancellationLogic === 'completed') group.cardHeaderStatusDisplay = 'مكتملة';
                else if (group.overallTripStatusForCancellationLogic === 'cancelled') group.cardHeaderStatusDisplay = 'ملغاة';
            }

            group.userBookingsForThisTrip.sort((a, b) => a.seatName.localeCompare(b.seatName));
            return group;
        });
        
        finalGroupedTrips.sort((a, b) => 
          new Date(b.userBookingsForThisTrip[0].tripDateTime).getTime() - new Date(a.userBookingsForThisTrip[0].tripDateTime).getTime()
        );
        setGroupedHistoryTrips(finalGroupedTrips);

      } else {
        setGroupedHistoryTrips([]);
      }
    } catch (err) {
      console.error("Error fetching history trips:", err);
      setError("حدث خطأ أثناء جلب سجل رحلاتك. الرجاء المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authRider, (user) => {
      if (user) {
        setCurrentUserAuth(user);
        fetchHistoryTrips(user);
      } else {
        setCurrentUserAuth(null);
        setIsLoading(false); 
        router.push('/auth/signin');
      }
    });
    return () => unsubscribe();
  }, [router, fetchHistoryTrips]);


  const handleInitiateCancellation = (tripGroup: GroupedDisplayableTrip) => {
    if (!currentUserAuth) return;
  
    const CANCELLATION_WINDOW_MS = 15 * 60 * 1000;
    const now = Date.now();
  
    const cancellableBookings = tripGroup.userBookingsForThisTrip.filter(
      b => b.status === 'booked' && 
           b.originalActualTripStatus === 'upcoming' &&
           (now - b.bookedAt) < CANCELLATION_WINDOW_MS
    );
    
    setBookingsForCurrentCancellationScope(cancellableBookings);
  
    if (cancellableBookings.length === 0) {
        toast({
            title: "لا يمكن الإلغاء", 
            description: "لا توجد حجوزات يمكن إلغاؤها. قد تكون الرحلة غير قادمة أو قد مر أكثر من 15 دقيقة على حجزك.", 
            variant: "default"
        });
        return;
    }
    
    if (cancellableBookings.length === 1) {
      setSingleBookingToCancel(cancellableBookings[0]);
      setShowCancelSingleConfirmDialog(true);
    } else {
      setSelectedBookingIdsInDialog([]); 
      setShowCancelMultipleSeatsDialog(true);
    }
  };

  const executeCancellation = async (bookingsToCancel: DisplayableHistoryTrip[]) => {
    if (!currentUserAuth || bookingsToCancel.length === 0) return;

    setIsProcessingCancellation(true);
    let allSucceeded = true;
    let errorsEncountered: string[] = [];
    let totalRefundAmount = 0;
    
    // Pre-flight check for all bookings
    for (const booking of bookingsToCancel) {
        const originalTripRef = ref(dbPrimary, `currentTrips/${booking.tripId}`);
        const snapshot = await get(originalTripRef);
        if (!snapshot.exists() || snapshot.val().status !== 'upcoming') {
            toast({
                title: "فشل الإلغاء",
                description: `لم يعد من الممكن إلغاء حجز المقعد "${booking.seatName}" لأن حالة الرحلة قد تغيرت.`,
                variant: "destructive"
            });
            setIsProcessingCancellation(false);
            fetchHistoryTrips(currentUserAuth); // Refresh list
            return;
        }
    }


    for (const booking of bookingsToCancel) {
      try {
        const originalTripRef = ref(dbPrimary, `currentTrips/${booking.tripId}`);
        await runTransaction(originalTripRef, (currentFirebaseTrip: FirebaseTrip | null): FirebaseTrip | undefined => {
          if (!currentFirebaseTrip) {
            // This case should be caught by pre-flight check, but as a safeguard:
            throw new Error("الرحلة الأصلية غير موجودة.");
          }
          if (currentFirebaseTrip.status !== 'upcoming') {
            throw new Error("لا يمكن إلغاء الحجز لرحلة ليست قادمة.");
          }

          let seatUpdated = false;
          if (currentFirebaseTrip.offeredSeatsConfig) {
            const seatDetail = currentFirebaseTrip.offeredSeatsConfig[booking.seatId];
            if (typeof seatDetail === 'object' && seatDetail !== null && seatDetail.userId === currentUserAuth.uid) {
              const feeToRefund = seatDetail.fees || 0;
              totalRefundAmount += feeToRefund;
              currentFirebaseTrip.offeredSeatsConfig[booking.seatId] = true; 
              seatUpdated = true;
            }
          } else if (currentFirebaseTrip.passengerDetails && currentFirebaseTrip.offeredSeatIds) {
            const passengerDetail = currentFirebaseTrip.passengerDetails[booking.seatId];
            if (passengerDetail && passengerDetail.userId === currentUserAuth.uid) {
              const feeToRefund = passengerDetail.fees || 0;
              totalRefundAmount += feeToRefund;
              delete currentFirebaseTrip.passengerDetails[booking.seatId];
              if (!currentFirebaseTrip.offeredSeatIds.includes(booking.seatId)) {
                currentFirebaseTrip.offeredSeatIds.push(booking.seatId);
              }
              seatUpdated = true;
            }
          }
          
          if (!seatUpdated) {
             throw new Error(`المقعد ${booking.seatName} ليس محجوزاً بواسطتك أو أن تكوين الرحلة غير صالح.`);
          }
          currentFirebaseTrip.updatedAt = Date.now();
          return currentFirebaseTrip;
        });

        const historyTripRef = ref(dbRider, `historytrips/${currentUserAuth.uid}/${booking.bookingId}`);
        await firebaseSet(child(historyTripRef, 'status'), 'user-cancelled');

      } catch (error: any) {
        allSucceeded = false;
        totalRefundAmount = 0; // Reset refund if any transaction fails
        errorsEncountered.push(`فشل إلغاء حجز المقعد ${booking.seatName}: ${error.message}`);
        console.error(`Cancellation error for booking ${booking.bookingId} (seat ${booking.seatName}):`, error);
      }
    }
    
    // Refund fees to driver's wallet if all cancellations succeeded
    if (allSucceeded && totalRefundAmount > 0 && bookingsToCancel.length > 0) {
      const driverId = bookingsToCancel[0].driverId;
      const driverWalletRef = ref(dbPrimary, `users/${driverId}/walletBalance`);
      try {
        const snapshot = await get(driverWalletRef);
        const currentBalance = Number(snapshot.val()) || 0;
        const newBalance = currentBalance + totalRefundAmount;
        await update(ref(dbPrimary, `users/${driverId}`), { walletBalance: newBalance, updatedAt: Date.now() });
        console.log(`FEE_REFUND_SUCCESS: Successfully refunded ${totalRefundAmount} to driver ${driverId}. New balance: ${newBalance}`);
      } catch (refundError: any) {
        console.error(`FEE_REFUND_ERROR: Failed to refund fees to driver ${driverId}. Error:`, refundError.message);
        // Do not block user feedback for this, but log it critically
        errorsEncountered.push(`فشل في إعادة الرسوم إلى محفظة السائق.`);
      }
    }


    setIsProcessingCancellation(false);
    setShowCancelSingleConfirmDialog(false);
    setShowCancelMultipleSeatsDialog(false);

    if (allSucceeded) {
      toast({ title: "تم الإلغاء بنجاح", description: `تم إلغاء ${bookingsToCancel.length} حجز/حجوزات بنجاح.` });
    } else {
      toast({
        title: "خطأ في الإلغاء",
        description: `حدث خطأ أثناء إلغاء بعض الحجوزات. ${errorsEncountered.join('. ')}`,
        variant: "destructive"
      });
    }
    fetchHistoryTrips(currentUserAuth); 
  };
  
  const handleConfirmSingleCancellation = () => {
    if (singleBookingToCancel) {
      executeCancellation([singleBookingToCancel]);
    }
    setSingleBookingToCancel(null);
  };

  const handleConfirmMultipleCancellations = () => {
    const bookingsToEffectivelyCancel = bookingsForCurrentCancellationScope.filter(b => selectedBookingIdsInDialog.includes(b.bookingId));
    if (bookingsToEffectivelyCancel.length > 0) {
        executeCancellation(bookingsToEffectivelyCancel);
    } else {
        toast({title: "لم يتم تحديد مقاعد", description: "الرجاء تحديد مقعد واحد على الأقل للإلغاء.", variant: "default"});
    }
    setSelectedBookingIdsInDialog([]);
    setBookingsForCurrentCancellationScope([]);
  };


  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ms-4 text-lg mt-4">جاري تحميل رحلاتك...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-3">
        <History className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-center">رحلاتي</h1>
      </div>

      {error && (
        <div className="text-center py-6">
            <Frown className="mx-auto h-12 w-12 text-destructive mb-3" />
            <p className="text-destructive text-lg">{error}</p>
            <Button onClick={() => currentUserAuth && fetchHistoryTrips(currentUserAuth)} className="mt-4">
                حاول مرة أخرى
            </Button>        </div>
      )}

      {!isLoading && !error && groupedHistoryTrips.length === 0 && (
        <div className="text-center py-10">
          <Frown className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-xl">ليس لديك أي رحلات محفوظة.</p>
          <Button onClick={() => router.push('/')} className="mt-6">
            ابحث عن رحلة جديدة
          </Button>
        </div>
      )}

      {!isLoading && !error && groupedHistoryTrips.length > 0 && (
        <div className="space-y-6">
          {groupedHistoryTrips.map((group) => (
            <HistoryTripCard 
                key={group.originalTripId} 
                tripGroup={group} 
                onInitiateCancel={handleInitiateCancellation}
                isProcessingCancellation={isProcessingCancellation}
            />
          ))}
        </div>
      )}

        <AlertDialog open={showCancelSingleConfirmDialog} onOpenChange={(open) => {
            if (isProcessingCancellation) return;
            setShowCancelSingleConfirmDialog(open);
            if(!open) setSingleBookingToCancel(null);
        }}>
            <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                <AlertDialogTitle>تأكيد إلغاء الحجز</AlertDialogTitle>
                <AlertDialogDescription>
                    هل أنت متأكد أنك تريد إلغاء حجزك للمقعد "{singleBookingToCancel?.seatName}" في الرحلة من {singleBookingToCancel?.departureCityDisplay} إلى {singleBookingToCancel?.arrivalCityDisplay}؟
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={isProcessingCancellation} onClick={() => setSingleBookingToCancel(null)}>تراجع</AlertDialogCancel>
                <AlertDialogAction 
                    disabled={isProcessingCancellation} 
                    onClick={handleConfirmSingleCancellation}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                    {isProcessingCancellation && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                    نعم، قم بالإلغاء
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showCancelMultipleSeatsDialog} onOpenChange={(open) => {
            if (isProcessingCancellation) return;
            setShowCancelMultipleSeatsDialog(open);
            if (!open) {
                setBookingsForCurrentCancellationScope([]);
                setSelectedBookingIdsInDialog([]);
            }
        }}>
            <DialogContent className="sm:max-w-md" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl">إلغاء حجوزات متعددة</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-muted-foreground text-center">
                        لديك عدة حجوزات لهذه الرحلة. الرجاء تحديد المقاعد التي ترغب في إلغائها:
                    </p>
                    {bookingsForCurrentCancellationScope.map((booking) => (
                        <div key={booking.bookingId} className="flex items-center space-x-2 space-x-reverse p-3 border rounded-md hover:bg-accent/50 transition-colors">
                            <Checkbox
                                id={`cancel-${booking.bookingId}`}
                                checked={selectedBookingIdsInDialog.includes(booking.bookingId)}
                                onCheckedChange={(checked) => {
                                    setSelectedBookingIdsInDialog(prev => 
                                        checked ? [...prev, booking.bookingId] : prev.filter(id => id !== booking.bookingId)
                                    );
                                }}
                            />
                            <Label htmlFor={`cancel-${booking.bookingId}`} className="flex-1 cursor-pointer">
                                <span className="font-medium">{booking.seatName}</span>
                                <span className="text-xs text-muted-foreground block">
                                    (رحلة من {booking.departureCityDisplay} إلى {booking.arrivalCityDisplay} في {booking.tripDateDisplay})
                                </span>
                            </Label>
                        </div>
                    ))}
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isProcessingCancellation}>إغلاق</Button>
                    </DialogClose>
                    <Button 
                        variant="destructive" 
                        onClick={handleConfirmMultipleCancellations} 
                        disabled={isProcessingCancellation || selectedBookingIdsInDialog.length === 0}
                    >
                        {isProcessingCancellation && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                        إلغاء المقاعد المحددة ({selectedBookingIdsInDialog.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}

    