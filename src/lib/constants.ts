
import type { Seat, SeatStatus, FirebaseTrip } from '@/types';

// Standard seat configuration based on common car layouts and IDs from JSON
export const defaultSeatLayout: { id: string, name: string, row: 'front' | 'rear' | 'driver', position: number }[] = [
  { id: 'driver_seat', name: 'السائق', row: 'driver', position: 0 },
  { id: 'front_passenger', name: 'مقعد أمامي', row: 'front', position: 1 },
  { id: 'back_left', name: 'خلفي يسار', row: 'rear', position: 0 },
  { id: 'back_middle', name: 'خلفي وسط', row: 'rear', position: 1 },
  { id: 'back_right', name: 'خلفي يمين', row: 'rear', position: 2 },
];


export const jordanianGovernorates: { value: string; displayNameAr: string; displayNameEn: string }[] = [
  { value: 'amman', displayNameAr: 'عمان', displayNameEn: 'Amman' },
  { value: 'zarqa', displayNameAr: 'الزرقاء', displayNameEn: 'Zarqa' },
  { value: 'irbid', displayNameAr: 'إربد', displayNameEn: 'Irbid' },
  { value: 'aqaba', displayNameAr: 'العقبة', displayNameEn: 'Aqaba' },
  { value: 'mafraq', displayNameAr: 'المفرق', displayNameEn: 'Mafraq' },
  { value: 'jerash', displayNameAr: 'جرش', displayNameEn: 'Jerash' },
  { value: 'madaba', displayNameAr: 'مأدبا', displayNameEn: 'Madaba' },
  { value: 'balqa', displayNameAr: 'البلقاء', displayNameEn: 'Balqa' },
  { value: 'karak', displayNameAr: 'الكرك', displayNameEn: 'Karak' },
  { value: 'maan', displayNameAr: 'معان', displayNameEn: 'Maan' },
  { value: 'ajloun', displayNameAr: 'عجلون', displayNameEn: 'Ajloun' },
  { value: 'tafilah', displayNameAr: 'الطفيلة', displayNameEn: 'Tafilah' }
];

// Helper function to convert ISO dateTime string to a displayable time format (e.g., 10:00 ص)
export function formatTimeToArabicAMPM(isoDateTimeString: string): string {
  try {
    const date = new Date(isoDateTimeString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes.toString();
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

// Function to generate Seat[] array from FirebaseTrip data
export function generateSeatsFromTripData(tripData: FirebaseTrip): Seat[] {
  const seats: Seat[] = [];
  const driverLayoutSeat = defaultSeatLayout.find(s => s.id === 'driver_seat');
  if (driverLayoutSeat) {
    seats.push({
      ...driverLayoutSeat,
      status: 'driver',
    });
  }

  const passengerSeatLayouts = defaultSeatLayout.filter(s => s.id !== 'driver_seat');

  if (tripData.offeredSeatsConfig) {
    passengerSeatLayouts.forEach(layoutSeat => {
      const seatBookingInfo = tripData.offeredSeatsConfig![layoutSeat.id];
      let currentStatus: SeatStatus = 'taken'; // Default if seatId not in config or value is not true
      let bookedByDetails;

      if (seatBookingInfo === true) {
        currentStatus = 'available';
      } else if (typeof seatBookingInfo === 'object' && seatBookingInfo !== null) {
        // It's an object, meaning it's booked.
        currentStatus = 'taken';
        bookedByDetails = { userId: seatBookingInfo.userId, phone: seatBookingInfo.phone };
      }
      // If seatBookingInfo is `false` (legacy or explicitly not offered), it's also 'taken' by default.
      
      seats.push({
        ...layoutSeat,
        status: currentStatus,
        bookedBy: bookedByDetails,
      });
    });
  } else if (tripData.offeredSeatIds) {
    // If using offeredSeatIds, status is 'available' if ID is in the array, otherwise 'taken'.
    passengerSeatLayouts.forEach(layoutSeat => {
      const isAvailable = tripData.offeredSeatIds!.includes(layoutSeat.id);
      let bookedByDetails;
      if (!isAvailable && tripData.passengerDetails && tripData.passengerDetails[layoutSeat.id]) {
          const details = tripData.passengerDetails[layoutSeat.id];
          bookedByDetails = { userId: details.userId, phone: details.phone };
      }
      seats.push({
        ...layoutSeat,
        status: isAvailable ? 'available' : 'taken',
        bookedBy: bookedByDetails,
      });
    });
  } else {
    // Fallback: if neither seat availability structure is defined, mark all non-driver seats as taken
    passengerSeatLayouts.forEach(layoutSeat => {
      seats.push({ ...layoutSeat, status: 'taken' });
    });
  }

  return seats.sort((a, b) => {
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
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(ص|م)/);
  if (!timeMatch) {
    console.warn("Invalid Arabic AM/PM time format:", timeStr, "- Trying to parse as datetime-local direct value");
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
