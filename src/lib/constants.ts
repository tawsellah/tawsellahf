import type { Seat } from '@/types';

// Standard seat configuration based on common car layouts and IDs from JSON
export const defaultSeatLayout: { id: string, name: string, row: 'front' | 'rear' | 'driver', position: number }[] = [
  { id: 'driver_seat', name: 'السائق', row: 'driver', position: 0 }, // Special ID for the driver
  { id: 'front_passenger', name: 'مقعد أمامي', row: 'front', position: 1 },
  { id: 'back_left', name: 'مقعد خلفي يسار', row: 'rear', position: 0 },
  { id: 'back_middle', name: 'مقعد خلفي وسط', row: 'rear', position: 1 },
  { id: 'back_right', name: 'مقعد خلفي يمين', row: 'rear', position: 2 },
];


export const jordanianGovernorates: string[] = [
  'amman', 'zarqa', 'irbid', 'aqaba', 'mafraq', 'jerash', 'madaba', 'balqa', 'karak', 'maan', 'ajloun', 'tafilah'
].map(name => name.charAt(0).toUpperCase() + name.slice(1)); // Capitalize first letter for display if needed

// Helper function to convert ISO dateTime string to a displayable time format (e.g., 10:00 ص)
export function formatTimeToArabicAMPM(isoDateTimeString: string): string {
  try {
    const date = new Date(isoDateTimeString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  } catch (e) {
    console.error("Error formatting time:", e);
    return "N/A";
  }
}

// Helper function to convert ISO dateTime string to a displayable date format (e.g., ٢٢ مايو ٢٠٢٥)
export function formatDateToArabic(isoDateTimeString: string): string {
  try {
    const date = new Date(isoDateTimeString);
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', numberingSystem: 'latn' });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "N/A";
  }
}

// Helper function to parse "HH:mm" string to hours and minutes
export function parseTimeString(timeStr: string): { hours: number, minutes: number } | null {
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
        console.error("Invalid time string format:", timeStr);
        return null;
    }
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error("Invalid hours or minutes in time string:", timeStr);
        return null;
    }
    return { hours, minutes };
}

// Function to generate Seat[] array from FirebaseTrip data (offeredSeatsConfig or offeredSeatIds)
export function generateSeatsFromTripData(tripData: import('@/types').FirebaseTrip): Seat[] {
  const seats: Seat[] = [];

  // Always add driver seat
  const driverLayoutSeat = defaultSeatLayout.find(s => s.id === 'driver_seat');
  if (driverLayoutSeat) {
    seats.push({
      ...driverLayoutSeat,
      status: 'driver',
    });
  }

  if (tripData.offeredSeatsConfig) {
    for (const seatId in tripData.offeredSeatsConfig) {
      const layoutSeat = defaultSeatLayout.find(s => s.id === seatId);
      if (layoutSeat) {
        seats.push({
          ...layoutSeat,
          status: tripData.offeredSeatsConfig[seatId] ? 'available' : 'taken',
        });
      }
    }
  } else if (tripData.offeredSeatIds) {
    // If only offeredSeatIds is present, assume these are available, others are not applicable or taken
    // This requires knowing all possible seats in a vehicle layout. We use defaultSeatLayout.
    defaultSeatLayout.forEach(layoutSeat => {
      if (layoutSeat.id !== 'driver_seat') { // Skip driver seat as it's handled
        seats.push({
          ...layoutSeat,
          status: tripData.offeredSeatIds!.includes(layoutSeat.id) ? 'available' : 'taken',
        });
      }
    });
  } else {
    // Fallback: if neither is defined, mark all non-driver seats from default layout as taken (or available, based on desired default)
    defaultSeatLayout.forEach(layoutSeat => {
      if (layoutSeat.id !== 'driver_seat') {
        seats.push({ ...layoutSeat, status: 'taken' }); // Or 'available'
      }
    });
  }
  return seats.sort((a,b) => {
    if (a.row === b.row) return a.position - b.position;
    if (a.row === 'driver') return -1;
    if (b.row === 'driver') return 1;
    if (a.row === 'front') return -1;
    if (b.row === 'front') return 1;
    return 0; // rear vs rear
  });
}

// Helper function to convert "HH:mm ص/م" along with a date string to a Date object
export function parseArabicAMPMTimeToDate(dateStr: string, timeStr: string): Date | null {
  // This function might be less relevant if dateTime from form is directly comparable to ISO dateTime from DB
  // But keeping it if still used for some specific time parsing.
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(ص|م)/);
  if (!timeMatch) {
    console.warn("Invalid Arabic AM/PM time format:", timeStr, "- Trying to parse as datetime-local direct value");
    // Attempt to parse directly if it's from datetime-local and somehow passed here
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d;
    console.error("Could not parse time:", timeStr);
    return null;
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3];

  if (period === 'م' && hours < 12) {
    hours += 12;
  } else if (period === 'ص' && hours === 12) { // 12 AM (Midnight) is 00 hours
    hours = 0;
  }

  hours = hours % 24;

  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
        console.error("Invalid date parts for Arabic AM/PM:", dateStr, timeStr);
        return null;
    }
    return new Date(year, month - 1, day, hours, minutes);
  } catch (e) {
    console.error("Error creating date object from Arabic AM/PM:", e);
    return null;
  }
}
