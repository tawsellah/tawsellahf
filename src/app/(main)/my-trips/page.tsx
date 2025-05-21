
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authRider, dbRider, dbPrimary } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUserAuth } from 'firebase/auth';
import { ref, get, child, query, orderByChild, equalTo, DataSnapshot, runTransaction, set as firebaseSet, push } from 'firebase/database';
import type { StoredHistoryTrip, DisplayableHistoryTrip, FirebaseTrip, FirebaseUser } from '@/types';
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
  const [historyTrips, setHistoryTrips] = useState<DisplayableHistoryTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for cancellation flow
  const [showCancelSingleConfirmDialog, setShowCancelSingleConfirmDialog] = useState(false);
  const [showCancelMultipleSeatsDialog, setShowCancelMultipleSeatsDialog] = useState(false);
  const [bookingsForCurrentCancellationScope, setBookingsForCurrentCancellationScope] = useState<DisplayableHistoryTrip[]>([]);
  const [singleBookingToCancel, setSingleBookingToCancel] = useState<DisplayableHistoryTrip | null>(null);
  const [selectedBookingIdsInDialog, setSelectedBookingIdsInDialog] = useState<string[]>([]);
  const [isProcessingCancellation, setIsProcessingCancellation] = useState(false);

  const fetchHistoryTrips = useCallback(async (currentAuthUser: FirebaseUserAuth | null) => {
    if (!currentAuthUser) {
      setHistoryTrips([]);
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

          let currentTripStatusDisplay: DisplayableHistoryTrip['currentTripStatusDisplay'] = 'مؤرشفة (غير معروفة)';
          
          if (storedTrip.status === 'user-cancelled') {
            currentTripStatusDisplay = 'ملغاة (بواسطتك)';
          } else if (storedTrip.status === 'system-cancelled') {
            currentTripStatusDisplay = 'ملغاة (النظام)';
          } else if (originalTrip) {
            const seatBookedByThisUser = originalTrip.offeredSeatsConfig && 
                                         typeof originalTrip.offeredSeatsConfig[storedTrip.seatId] === 'object' &&
                                         (originalTrip.offeredSeatsConfig[storedTrip.seatId] as any)?.userId === currentAuthUser.uid;
            
            const seatAvailableViaSeatIds = originalTrip.offeredSeatIds && 
                                            !originalTrip.offeredSeatIds.includes(storedTrip.seatId) && 
                                            originalTrip.passengerDetails &&
                                            originalTrip.passengerDetails[storedTrip.seatId]?.userId === currentAuthUser.uid;

            const isSeatStillBookedByCurrentUser = seatBookedByThisUser || seatAvailableViaSeatIds;

            if (!isSeatStillBookedByCurrentUser && originalTrip.status === 'upcoming') {
               currentTripStatusDisplay = 'ملغاة (النظام)';
               // Update status in dbRider if system cancelled it
               const specificHistoryTripRef = ref(dbRider, `historytrips/${currentAuthUser.uid}/${storedTrip.bookingId}`);
               await firebaseSet(child(specificHistoryTripRef, 'status'), 'system-cancelled').catch(err => console.error("Failed to update history trip status to system-cancelled", err));
               storedTrip.status = 'system-cancelled'; // Update local object for immediate UI reflection
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
            if (tripDate < new Date()) {
              currentTripStatusDisplay = storedTrip.status === 'booked' ? 'مكتملة' : currentTripStatusDisplay;
            } else {
              currentTripStatusDisplay = storedTrip.status === 'booked' ? 'ملغاة' : currentTripStatusDisplay;
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
          };
        });

        const resolvedTrips = (await Promise.all(displayableTripsPromises)) as DisplayableHistoryTrip[];
        resolvedTrips.sort((a, b) => new Date(b.tripDateTime).getTime() - new Date(a.tripDateTime).getTime());
        setHistoryTrips(resolvedTrips);

      } else {
        setHistoryTrips([]);
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
        setIsLoading(false); // Not loading if no user
        router.push('/auth/signin');
      }
    });
    return () => unsubscribe();
  }, [router, fetchHistoryTrips]);


  const handleInitiateCancellation = (clickedBooking: DisplayableHistoryTrip) => {
    if (!currentUserAuth) return;

    const activeBookingsForOriginalTrip = historyTrips.filter(
      b => b.tripId === clickedBooking.tripId &&
           b.status !== 'user-cancelled' &&
           b.status !== 'system-cancelled' &&
           b.currentTripStatusDisplay === 'قادمة' // Ensure original trip is upcoming
    );
    
    setBookingsForCurrentCancellationScope(activeBookingsForOriginalTrip);

    if (activeBookingsForOriginalTrip.length === 0) {
        toast({title: "لا يمكن الإلغاء", description: "هذا الحجز لم يعد فعالاً أو أن الرحلة لم تعد قادمة.", variant: "default"});
        return;
    }
    
    if (activeBookingsForOriginalTrip.length === 1) {
      setSingleBookingToCancel(activeBookingsForOriginalTrip[0]);
      setShowCancelSingleConfirmDialog(true);
    } else {
      setSelectedBookingIdsInDialog([]); // Reset selection
      setShowCancelMultipleSeatsDialog(true);
    }
  };

  const executeCancellation = async (bookingsToCancel: DisplayableHistoryTrip[]) => {
    if (!currentUserAuth || bookingsToCancel.length === 0) return;

    setIsProcessingCancellation(true);
    let allSucceeded = true;
    let errorsEncountered: string[] = [];

    for (const booking of bookingsToCancel) {
      try {
        const originalTripRef = ref(dbPrimary, `currentTrips/${booking.tripId}`);
        await runTransaction(originalTripRef, (currentFirebaseTrip: FirebaseTrip | null) => {
          if (!currentFirebaseTrip) {
            throw new Error("الرحلة الأصلية غير موجودة.");
          }
          if (currentFirebaseTrip.status !== 'upcoming') {
            throw new Error("لا يمكن إلغاء الحجز لرحلة ليست قادمة.");
          }

          if (currentFirebaseTrip.offeredSeatsConfig) {
            const seatDetail = currentFirebaseTrip.offeredSeatsConfig[booking.seatId];
            if (typeof seatDetail === 'object' && seatDetail !== null && seatDetail.userId === currentUserAuth.uid) {
              currentFirebaseTrip.offeredSeatsConfig[booking.seatId] = true; // Mark as available
            } else {
              // Seat not booked by this user or already available
              throw new Error(`المقعد ${booking.seatName} ليس محجوزاً بواسطتك أو أنه متاح بالفعل.`);
            }
          } else if (currentFirebaseTrip.offeredSeatIds && currentFirebaseTrip.passengerDetails) {
            // Fallback for older structure, ensure it's robust
            const passengerDetail = currentFirebaseTrip.passengerDetails[booking.seatId];
            if (passengerDetail && passengerDetail.userId === currentUserAuth.uid) {
              delete currentFirebaseTrip.passengerDetails[booking.seatId];
              if (!currentFirebaseTrip.offeredSeatIds.includes(booking.seatId)) {
                currentFirebaseTrip.offeredSeatIds.push(booking.seatId);
              }
            } else {
              throw new Error(`المقعد ${booking.seatName} ليس محجوزاً بواسطتك أو أنه متاح بالفعل (IDs).`);
            }
          } else {
            throw new Error("تكوين مقاعد الرحلة الأصلية غير صالح.");
          }
          currentFirebaseTrip.updatedAt = Date.now();
          return currentFirebaseTrip;
        });

        // If primary DB transaction succeeded, update history trip status in rider DB
        const historyTripRef = ref(dbRider, `historytrips/${currentUserAuth.uid}/${booking.bookingId}`);
        await firebaseSet(child(historyTripRef, 'status'), 'user-cancelled');

      } catch (error: any) {
        allSucceeded = false;
        errorsEncountered.push(`فشل إلغاء حجز المقعد ${booking.seatName}: ${error.message}`);
        console.error(`Cancellation error for booking ${booking.bookingId} (seat ${booking.seatName}):`, error);
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
    fetchHistoryTrips(currentUserAuth); // Refresh the list
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
            </Button>
        </div>
      )}

      {!isLoading && !error && historyTrips.length === 0 && (
        <div className="text-center py-10">
          <Frown className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-xl">ليس لديك أي رحلات محفوظة.</p>
          <Button onClick={() => router.push('/')} className="mt-6">
            ابحث عن رحلة جديدة
          </Button>
        </div>
      )}

      {!isLoading && !error && historyTrips.length > 0 && (
        <div className="space-y-6">
          {historyTrips.map((trip) => (
            <HistoryTripCard 
                key={trip.bookingId} 
                trip={trip} 
                onInitiateCancel={handleInitiateCancellation}
                isProcessingCancellation={isProcessingCancellation}
            />
          ))}
        </div>
      )}

        {/* Single Cancellation Confirmation Dialog */}
        <AlertDialog open={showCancelSingleConfirmDialog} onOpenChange={setShowCancelSingleConfirmDialog}>
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

        {/* Multiple Seats Cancellation Dialog */}
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
