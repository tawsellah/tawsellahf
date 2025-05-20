
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authRider, dbRider, dbPrimary } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUserAuth } from 'firebase/auth';
import { ref, get, child, query, orderByChild, equalTo, DataSnapshot } from 'firebase/database';
import type { StoredHistoryTrip, DisplayableHistoryTrip, FirebaseTrip } from '@/types';
import { Button } from '@/components/ui/button';
import { HistoryTripCard } from '@/components/trip/HistoryTripCard';
import { Loader2, History, Frown } from 'lucide-react';
import { 
  formatDateToArabic, 
  formatTimeToArabicAMPM, 
  getDayOfWeekArabic,
  getGovernorateDisplayNameAr
} from '@/lib/constants';

export default function MyTripsPage() {
  const router = useRouter();
  const [currentUserAuth, setCurrentUserAuth] = useState<FirebaseUserAuth | null>(null);
  const [historyTrips, setHistoryTrips] = useState<DisplayableHistoryTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authRider, (user) => {
      if (user) {
        setCurrentUserAuth(user);
      } else {
        setCurrentUserAuth(null);
        router.push('/auth/signin'); // Redirect if not logged in
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!currentUserAuth) {
      if(!isLoading) setIsLoading(true); // Show loader if auth is still pending then user is null
      return;
    }

    const fetchHistoryTrips = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userHistoryRef = ref(dbRider, `historytrips/${currentUserAuth.uid}`);
        const snapshot = await get(userHistoryRef);

        if (snapshot.exists()) {
          const tripsData = snapshot.val() as Record<string, StoredHistoryTrip>;
          const tripsPromises = Object.values(tripsData).map(async (storedTrip) => {
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
            if (originalTrip) {
              switch (originalTrip.status) {
                case 'completed':
                  currentTripStatusDisplay = 'مكتملة';
                  break;
                case 'ongoing':
                  currentTripStatusDisplay = 'حالية';
                  break;
                case 'upcoming':
                  currentTripStatusDisplay = 'قادمة';
                  break;
                case 'cancelled':
                  currentTripStatusDisplay = 'ملغاة';
                  break;
                default:
                  currentTripStatusDisplay = 'مؤرشفة (غير معروفة)';
              }
            } else {
              // Original trip not found, decide status based on stored date
              const tripDate = new Date(storedTrip.tripDateTime);
              if (tripDate < new Date()) {
                currentTripStatusDisplay = 'مكتملة'; // Assuming past trips are completed if original is gone
              } else {
                currentTripStatusDisplay = 'ملغاة'; // Assuming future trips are cancelled if original is gone
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

          const resolvedTrips = (await Promise.all(tripsPromises)) as DisplayableHistoryTrip[];
          // Sort by tripDateTime descending (most recent first)
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
    };

    fetchHistoryTrips();
  }, [currentUserAuth]);

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
            <Button onClick={() => window.location.reload()} className="mt-4">
                حاول مرة أخرى
            </Button>
        </div>
      )}

      {!isLoading && !error && historyTrips.length === 0 && (
        <div className="text-center py-10">
          <Frown className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-xl">ليس لديك أي رحلات سابقة أو حالية.</p>
          <Button onClick={() => router.push('/')} className="mt-6">
            ابحث عن رحلة جديدة
          </Button>
        </div>
      )}

      {!isLoading && !error && historyTrips.length > 0 && (
        <div className="space-y-6">
          {historyTrips.map((trip) => (
            <HistoryTripCard key={trip.bookingId} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
