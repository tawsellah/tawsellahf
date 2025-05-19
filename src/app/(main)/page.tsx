
"use client";

import { Search, MapPin, Flag, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Trip } from '@/types';
import { TripCard } from '@/components/trip/TripCard';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { jordanianGovernorates, parseArabicAMPMTimeToDate } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

const searchSchema = z.object({
  startPoint: z.string().min(1, "نقطة الانطلاق مطلوبة"),
  endPoint: z.string().min(1, "نقطة الوصول مطلوبة"),
  departureTime: z.string().min(1, "وقت الانطلاق مطلوب"),
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
    setSearchResults([]); // Clear previous results

    try {
      const tripsRef = ref(db, 'currentTrips');
      // Querying by startPoint first, then filtering client-side
      // For more complex queries (e.g., startPoint AND endPoint directly in DB query),
      // you might need to structure your Firebase data with composite keys or use Firestore.
      const dbQuery = query(tripsRef, orderByChild('startPoint'), equalTo(data.startPoint));
      const snapshot = await get(dbQuery);

      if (snapshot.exists()) {
        const tripsData = snapshot.val();
        const allFetchedTrips: Trip[] = Object.values(tripsData || {});
        
        const formDepartureDateTime = new Date(data.departureTime); // From YYYY-MM-DDTHH:mm

        const filteredTrips = allFetchedTrips.filter(trip => {
          if (trip.endPoint !== data.endPoint) {
            return false;
          }

          const tripDepartureDateTime = parseArabicAMPMTimeToDate(trip.date, trip.departureTime);
          if (!tripDepartureDateTime) {
            return false; 
          }
          
          // Exact match for date and time
          return tripDepartureDateTime.getFullYear() === formDepartureDateTime.getFullYear() &&
                 tripDepartureDateTime.getMonth() === formDepartureDateTime.getMonth() &&
                 tripDepartureDateTime.getDate() === formDepartureDateTime.getDate() &&
                 tripDepartureDateTime.getHours() === formDepartureDateTime.getHours() &&
                 tripDepartureDateTime.getMinutes() === formDepartureDateTime.getMinutes();
        });

        if (filteredTrips.length > 0) {
          setSearchResults(filteredTrips);
          toast({ title: "تم العثور على رحلات", description: `تم العثور على ${filteredTrips.length} رحلة مطابقة.` });
        } else {
          toast({ title: "لا توجد رحلات", description: "لم يتم العثور على رحلات تطابق معايير البحث.", variant: "default" });
        }
      } else {
        toast({ title: "لا توجد رحلات", description: "لم يتم العثور على رحلات لنقطة الانطلاق المحددة.", variant: "default" });
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نقطة الانطلاق" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {jordanianGovernorates.map(gov => (
                      <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نقطة الوصول" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {jordanianGovernorates.map(gov => (
                      <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Input type="datetime-local" {...field} />
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
