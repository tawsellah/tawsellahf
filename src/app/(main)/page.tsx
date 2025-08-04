
"use client";

import { Search, MapPin, Flag, Clock, Loader2, ListTodo, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input as ShadInput } from '@/components/ui/input'; // Renamed to avoid conflict
import DropdownSearch from '@/components/DropdownSearch'; // Import the new component
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Trip, FirebaseTrip, FirebaseUser } from '@/types';
import { TripCard } from '@/components/trip/TripCard';
import { useState, useMemo } from 'react';
import { dbPrimary } from '@/lib/firebase'; 
import { ref, get } from 'firebase/database';
import { jordanianGovernorates as governorateDataForConstants } from '@/lib/constants'; // Keep for getGovernorateDisplayNameAr
import { formatTimeToArabicAMPM, formatDateToArabic, generateSeatsFromTripData, getGovernorateDisplayNameAr } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const searchSchema = z.object({
  startPoint: z.string().min(1, "نقطة الانطلاق مطلوبة"),
  endPoint: z.string().min(1, "نقطة الوصول مطلوبة"),
  departureTime: z.string().optional(), // Make optional as it's not always needed
});

type SearchFormData = z.infer<typeof searchSchema>;
type SortOption = 'time-asc' | 'time-desc' | 'price-asc' | 'price-desc';

export default function TripSearchPage() {
  const [unfilteredResults, setUnfilteredResults] = useState<Trip[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('time-asc');
  const { toast } = useToast();
  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      startPoint: "",
      endPoint: "",
      departureTime: "",
    },
  });

  const sortedSearchResults = useMemo(() => {
    if (unfilteredResults.length === 0) return [];
    
    const sorted = [...unfilteredResults];

    switch (sortOption) {
      case 'time-asc':
        sorted.sort((a, b) => new Date(a.firebaseTripData.dateTime).getTime() - new Date(b.firebaseTripData.dateTime).getTime());
        break;
      case 'time-desc':
        sorted.sort((a, b) => new Date(b.firebaseTripData.dateTime).getTime() - new Date(a.firebaseTripData.dateTime).getTime());
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }
    return sorted;
  }, [unfilteredResults, sortOption]);

  // Refactored search logic
  const executeSearch = async (startPoint: string, endPoint: string, departureTime?: string) => {
    setIsSearching(true);
    setUnfilteredResults([]);
    setSortOption('time-asc'); // Reset sort on new search

    try {
      const tripsRef = ref(dbPrimary, 'currentTrips'); 
      const snapshot = await get(tripsRef);

      if (snapshot.exists()) {
        const allTripsData = snapshot.val() as Record<string, FirebaseTrip>;
        const matchedFirebaseTrips: FirebaseTrip[] = [];

        for (const tripId in allTripsData) {
          const fbTrip = allTripsData[tripId];
          
          const tripStartPoint = fbTrip.startPoint || "";
          const tripDestination = fbTrip.destination || "";

          const isLocationMatch = tripStartPoint.toLowerCase() === startPoint.toLowerCase() &&
                                  tripDestination.toLowerCase() === endPoint.toLowerCase();

          if (isLocationMatch && fbTrip.status === 'upcoming') {
            // If departureTime is provided, match it
            if (departureTime) {
              const formDepartureDateTime = new Date(departureTime);
              const tripDepartureDateTime = new Date(fbTrip.dateTime);
              
              const isTimeMatch = tripDepartureDateTime.getFullYear() === formDepartureDateTime.getFullYear() &&
                                  tripDepartureDateTime.getMonth() === formDepartureDateTime.getMonth() &&
                                  tripDepartureDateTime.getDate() === formDepartureDateTime.getDate() &&
                                  tripDepartureDateTime.getHours() === formDepartureDateTime.getHours() &&
                                  tripDepartureDateTime.getMinutes() === formDepartureDateTime.getMinutes();
              
              if (isTimeMatch) {
                matchedFirebaseTrips.push(fbTrip);
              }
            } else {
              // If no departureTime, it's a "Search All" request, so add all location matches
              matchedFirebaseTrips.push(fbTrip);
            }
          }
        }

        if (matchedFirebaseTrips.length > 0) {
          const enrichedTrips: Trip[] = [];
          for (const fbTrip of matchedFirebaseTrips) {
            const driverSnapshot = await get(ref(dbPrimary, `users/${fbTrip.driverId}`)); 
            if (driverSnapshot.exists()) {
              const driverData = driverSnapshot.val() as FirebaseUser;
              enrichedTrips.push({
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
                  clickCode: driverData.paymentMethods?.clickCode,
                  phoneNumber: driverData.phoneNumber || driverData.phone
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
                startPoint: getGovernorateDisplayNameAr(fbTrip.startPoint || ""), 
                endPoint: getGovernorateDisplayNameAr(fbTrip.destination || ""), 
                meetingPoint: fbTrip.meetingPoint,
                notes: fbTrip.notes,
                status: fbTrip.status,
                seats: generateSeatsFromTripData(fbTrip), 
                stops: []
              });
            } else {
              console.warn(`Driver data not found for driverId: ${fbTrip.driverId}. User might be in tawsellah-rider or data is missing.`);
            }
          }
           
          setUnfilteredResults(enrichedTrips);

          if (enrichedTrips.length > 0) {
            toast({ title: "تم العثور على رحلات", description: `تم العثور على ${enrichedTrips.length} رحلة مطابقة.` });
          } else {
             toast({ title: "لا توجد رحلات", description: "لم يتم العثور على رحلات تطابق معايير البحث (مع مراعاة السائقين).", variant: "default" });
          }
        } else {
          toast({ title: "لا توجد رحلات", description: "لم يتم العثور على رحلات تطابق معايير البحث.", variant: "default" });
        }
      } else {
        toast({ title: "لا توجد رحلات", description: "لم يتم العثور على أي رحلات في قاعدة البيانات.", variant: "default" });
      }
    } catch (error) {
      console.error("Error searching trips:", error);
      toast({ title: "خطأ في البحث", description: "حدث خطأ أثناء البحث عن الرحلات. الرجاء المحاولة مرة أخرى.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // Handler for the original search button (with time)
  const onSubmitWithTime = async (data: SearchFormData) => {
    if (!data.departureTime) {
      form.setError("departureTime", { type: "manual", message: "وقت وتاريخ الانطلاق مطلوب" });
      return;
    }
    await executeSearch(data.startPoint, data.endPoint, data.departureTime);
  };

  // Handler for the new "Search All" button
  const handleSearchAll = async () => {
    // Manually trigger validation for start and end points
    const isValid = await form.trigger(["startPoint", "endPoint"]);
    if (!isValid) {
      toast({
        title: "معلومات ناقصة",
        description: "الرجاء اختيار نقطة الانطلاق والوصول أولاً.",
        variant: "destructive"
      });
      return;
    }
    const { startPoint, endPoint } = form.getValues();
    await executeSearch(startPoint, endPoint); // No departureTime is passed
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-3">
        <Search className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-center">ابحث عن رحلة</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitWithTime)} className="space-y-6">
          <FormField
            control={form.control}
            name="startPoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  نقطة الانطلاق
                </FormLabel>
                <FormControl>
                  <DropdownSearch
                    label=""
                    icon={<MapPin className="h-5 w-5 text-primary opacity-0" />}
                    placeholder="اختر محافظة الانطلاق"
                    onSelect={field.onChange}
                    selectedValue={field.value}
                    dir="rtl"
                    formItemId={field.name}
                    error={!!form.formState.errors.startPoint}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endPoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-primary" />
                  نقطة الوصول
                </FormLabel>
                <FormControl>
                  <DropdownSearch
                    label=""
                    icon={<Flag className="h-5 w-5 text-primary opacity-0" />}
                    placeholder="اختر محافظة الوصول"
                    onSelect={field.onChange}
                    selectedValue={field.value}
                    dir="rtl"
                    formItemId={field.name}
                    error={!!form.formState.errors.endPoint}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="departureTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  وقت وتاريخ الانطلاق (للبحث الدقيق)
                </FormLabel>
                <FormControl>
                  <ShadInput type="datetime-local" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:bg-primary/90 hover:shadow-md active:scale-95" disabled={isSearching}>
            {isSearching ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <Search className="ms-2 h-5 w-5" />}
            {isSearching ? "جارِ البحث..." : "بحث (حسب الوقت)"}
          </Button>

           <Button 
            type="button" 
            variant="secondary"
            onClick={handleSearchAll}
            className="w-full p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:shadow-md active:scale-95" 
            disabled={isSearching}
          >
            {isSearching ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <ListTodo className="ms-2 h-5 w-5" />}
            {isSearching ? "جارِ البحث..." : "بحث عن كل الرحلات المتاحة"}
          </Button>
        </form>
      </Form>

      {unfilteredResults.length > 0 && (
        <div className="space-y-4 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-center sm:text-start">نتائج البحث ({sortedSearchResults.length})</h2>
            <div className="w-full sm:w-auto">
              <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[240px]">
                      <ArrowUpDown className="ms-2 h-4 w-4" />
                      <SelectValue placeholder="ترتيب حسب..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="time-asc">الأقرب وقتًا</SelectItem>
                      <SelectItem value="time-desc">الأبعد وقتًا</SelectItem>
                      <SelectItem value="price-asc">الأقل سعرًا</SelectItem>
                      <SelectItem value="price-desc">الأعلى سعرًا</SelectItem>
                  </SelectContent>
              </Select>
            </div>
          </div>
          <div className="max-h-[50vh] space-y-4 overflow-y-auto rounded-lg p-2 -m-2">
            {sortedSearchResults.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
