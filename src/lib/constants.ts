
import type { Seat, SeatStatus, FirebaseTrip } from '@/types';

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
  { value: 'tafilah', displayNameAr: 'الطفيلة', displayNameEn: 'Tafilah' },
  { value: "north_ghor", displayNameAr: "الأغوار الشمالية", displayNameEn: "Northern Valleys" },
  { value: "south_ghor", displayNameAr: "الأغوار الجنوبية", displayNameEn: "Southern Valleys" },
];

export function getGovernorateDisplayNameAr(value: string): string {
  const governorate = jordanianGovernorates.find(g => g.value.toLowerCase() === value.toLowerCase());
  return governorate ? governorate.displayNameAr : value; // Fallback to value if not found
}

export function formatTimeToArabicAMPM(isoDateTimeString: string): string {
  try {
    const date = new Date(isoDateTimeString);
    return date.toLocaleTimeString('ar-JO', { hour: 'numeric', minute: '2-digit', hour12: true, numberingSystem: 'latn' });
  } catch (e) {
    console.error("Error formatting time:", e);
    return "N/A";
  }
}

export function formatDateToArabic(isoDateTimeString: string): string {
  try {
    const date = new Date(isoDateTimeString);
    return date.toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric', numberingSystem: 'latn' });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "N/A";
  }
}

export function getDayOfWeekArabic(isoDateTimeString: string): string {
  try {
    const date = new Date(isoDateTimeString);
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[date.getDay()];
  } catch (e) {
    console.error("Error getting day of week:", e);
    return "N/A";
  }
}


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
      let currentStatus: SeatStatus = 'taken'; // Default to taken if not explicitly available
      let bookedByDetails: Seat['bookedBy'] | undefined;

      if (seatBookingInfo === true) { // Seat is explicitly available
        currentStatus = 'available';
      } else if (typeof seatBookingInfo === 'object' && seatBookingInfo !== null && 'userId' in seatBookingInfo) { // Seat is booked
        currentStatus = 'taken';
        bookedByDetails = {
            userId: seatBookingInfo.userId,
            phone: seatBookingInfo.phone,
            fullName: seatBookingInfo.fullName,
            bookedAt: seatBookingInfo.bookedAt
        };
      }
      // If seatBookingInfo is false or any other value, it's considered taken without specific user details for this function's scope.

      seats.push({
        ...layoutSeat,
        status: currentStatus,
        bookedBy: bookedByDetails,
      });
    });
  } else if (tripData.offeredSeatIds) { // Fallback to offeredSeatIds if offeredSeatsConfig is not present
    passengerSeatLayouts.forEach(layoutSeat => {
      const isAvailable = tripData.offeredSeatIds!.includes(layoutSeat.id);
      let bookedByDetails: Seat['bookedBy'] | undefined;
      if (!isAvailable && tripData.passengerDetails && tripData.passengerDetails[layoutSeat.id]) {
          const details = tripData.passengerDetails[layoutSeat.id];
          bookedByDetails = {
            userId: details.userId,
            phone: details.phone,
            fullName: details.fullName,
            bookedAt: details.bookedAt
          };
      }
      seats.push({
        ...layoutSeat,
        status: isAvailable ? 'available' : 'taken',
        bookedBy: bookedByDetails,
      });
    });
  } else {
    // Fallback if neither offeredSeatsConfig nor offeredSeatIds is present
    // Consider all passenger seats as 'taken' or 'unavailable' by default
    passengerSeatLayouts.forEach(layoutSeat => {
      seats.push({ ...layoutSeat, status: 'taken' });
    });
  }

  // Sort seats: driver first, then front, then rear, then by position
  return seats.sort((a, b) => {
    const rowOrder = { driver: 0, front: 1, rear: 2 };
    if (rowOrder[a.row] !== rowOrder[b.row]) {
      return rowOrder[a.row] - rowOrder[b.row];
    }
    return a.position - b.position;
  });
}

export function capitalizeFirstLetter(string: string): string {
  if (!string) return string;
  return string.charAt(0).toUpperCase() + string.slice(1);
}
