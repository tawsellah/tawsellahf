
"use client";

import { Search, MapPin, Flag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Trip } from '@/types';
import { sampleTrips } from '@/lib/constants';
import { TripCard } from '@/components/trip/TripCard';
import { useState } from 'react';

const searchSchema = z.object({
  startPoint: z.string().min(1, "نقطة الانطلاق مطلوبة"),
  endPoint: z.string().min(1, "نقطة الوصول مطلوبة"),
  departureTime: z.string().min(1, "وقت الانطلاق مطلوب"),
});

type SearchFormData = z.infer<typeof searchSchema>;

export default function TripSearchPage() {
  const [searchResults, setSearchResults] = useState<Trip[]>([]);
  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      startPoint: "",
      endPoint: "",
      departureTime: "",
    },
  });

  const onSubmit = (data: SearchFormData) => {
    console.log("Search data:", data);
    // Simulate API call
    setSearchResults(sampleTrips); 
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
                  <Input placeholder="مثال: عمان" {...field} />
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
                  <Input placeholder="مثال: الزرقاء" {...field} />
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
                  وقت الانطلاق
                </FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full p-3 rounded-lg text-base font-semibold transition-all duration-300 ease-in-out hover:bg-primary/90 hover:shadow-md active:scale-95" disabled={form.formState.isSubmitting}>
            <Search className="ms-2 h-5 w-5" />
            بحث
            {form.formState.isSubmitting && "..."}
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
