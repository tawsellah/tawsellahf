
"use client";

import { Search, MapPin, Flag, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input as ShadInput } from '@/components/ui/input'; // Renamed to avoid conflict
import DropdownSearch from '@/components/DropdownSearch'; // Import the new component
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Trip, FirebaseTrip, FirebaseUser } from '@/types';
import { TripCard } from '@/components/trip/TripCard';
import { useState, useEffect } from 'react';
import { dbPrimary } from '@/lib/firebase'; 
import { ref, get } from 'firebase/database';
import { jordanianGovernorates as governorateDataForConstants } from '@/lib/constants'; // Keep for getGovernorateDisplayNameAr
import { formatTimeToArabicAMPM, formatDateToArabic, generateSeatsFromTripData, getGovernorateDisplayNameAr } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

const searchSchema = z.object({
  startPoint: z.string().min(1, "نقطة الانطلاق مطلوبة"),
  endPoint: z.string().min(1, "نقطة الوصول مطلوبة"),
  departureTime: z.string().min(1, "وقت وتاريخ الانطلاق مطلوب"),
});

type SearchFormData = z.infer<typeof searchSchema>;

export default function TripSearchPage() {
  const [searchResults, setSearchResults] = useState<Trip[]>([]);
  const { toast } = useToast();
  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      startPoint: "",
      endPoint: "",
      departureTime: "",
    },
  });

  const onSubmit = async (data: SearchFormData) => {
    form.clearErrors();
    setSearchResults([]);
    form.setValue('departureTime', data.departureTime); 

    try {
      const tripsRef = ref(dbPrimary, 'currentTrips'); 
      const snapshot = await get(tripsRef);

      if (snapshot.exists()) {
        const allTripsData = snapshot.val() as Record<string, FirebaseTrip>;
        
        const formDepartureDateTime = new Date(data.departureTime);

        const matchedFirebaseTrips: FirebaseTrip[] = [];

        for (const tripId in allTripsData) {
          const fbTrip = allTripsData[tripId];
          
          const tripStartPoint = fbTrip.startPoint || "";
          const tripDestination = fbTrip.destination || "";

          if (tripStartPoint.toLowerCase() === data.startPoint.toLowerCase() &&
              tripDestination.toLowerCase() === data.endPoint.toLowerCase() &&
              fbTrip.status === 'upcoming') { 
            
            const tripDepartureDateTime = new Date(fbTrip.dateTime); 
            
            if (tripDepartureDateTime.getFullYear() === formDepartureDateTime.getFullYear() &&
                tripDepartureDateTime.getMonth() === formDepartureDateTime.getMonth() &&
                tripDepartureDateTime.getDate() === formDepartureDateTime.getDate() &&
                tripDepartureDateTime.getHours() === formDepartureDateTime.getHours() &&
                tripDepartureDateTime.getMinutes() === formDepartureDateTime.getMinutes()) {
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
                  clickCode: driverData.paymentMethods?.clickCode
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
              });
            } else {
              console.warn(`Driver data not found for driverId: ${fbTrip.driverId}. User might be in tawsellah-rider or data is missing.`);
            }
          }
          setSearchResults(enrichedTrips);
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
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-3">
        <Search className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-center">ابحث عن رحلة</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    label="" // Label is handled by FormLabel
                    icon={<MapPin className="h-5 w-5 text-primary opacity-0" />} // Placeholder for icon positioning, actual icon in FormLabel
                    placeholder="اختر محافظة الانطلاق"
                    onSelect={field.onChange}
                    selectedValue={field.value}
                    dir="rtl"
                    formItemId={field.name} // For associating with FormLabel if needed
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
                    label="" // Label is handled by FormLabel
                    icon={<Flag className="h-5 w-5 text-primary opacity-0" />} // Placeholder for icon positioning
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
                  وقت وتاريخ الانطلاق
                </FormLabel>
                <FormControl>
                  <ShadInput type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:bg-primary/90 hover:shadow-md active:scale-95" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <Search className="ms-2 h-5 w-5" />}
            {form.formState.isSubmitting ? "جارِ البحث..." : "بحث"}
          </Button>
        </form>
      </Form>

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-center">نتائج البحث</h2>
          <div className="max-h-[400px] space-y-4 overflow-y-auto rounded-lg p-1">
            {searchResults.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
