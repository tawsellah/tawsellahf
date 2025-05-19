import type { Seat } from '@/types';

export const defaultSeats: Seat[] = [
  { id: 'D1', name: 'السائق', status: 'driver', row: 'front', position: 0 },
  { id: 'F1', name: 'مقعد أمامي بجانب السائق', status: 'available', row: 'front', position: 1 },
  { id: 'R1', name: 'مقعد خلفي يسار', status: 'available', row: 'rear', position: 0 },
  { id: 'R2', name: 'مقعد خلفي وسط', status: 'available', row: 'rear', position: 1 },
  { id: 'R3', name: 'مقعد خلفي يمين', status: 'available', row: 'rear', position: 2 },
];

export const jordanianGovernorates: string[] = [
  'عمان', 'الزرقاء', 'إربد', 'العقبة', 'المفرق', 'جرش', 'مادبا', 'البلقاء', 'الكرك', 'معان', 'عجلون', 'الطفيلة'
];

// Helper function to convert "HH:mm ص/م" along with a date string to a Date object
export function parseArabicAMPMTimeToDate(dateStr: string, timeStr: string): Date | null {
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(ص|م)/);
  if (!timeMatch) {
    console.error("Invalid time format:", timeStr);
    return null;
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3];

  if (period === 'م' && hours < 12) {
    hours += 12;
  } else if (period === 'ص' && hours === 12) { // 12 AM (Midnight) is 00 hours
    hours = 0;
  } else if (period === 'م' && hours === 12) { // 12 PM (Noon) is 12 hours, no change needed
    // hours is already 12
  }


  // Ensure hours are within 0-23 range after adjustments
  hours = hours % 24;

  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Month is 0-indexed in JavaScript Date
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
        console.error("Invalid date parts:", dateStr, timeStr);
        return null;
    }
    return new Date(year, month - 1, day, hours, minutes);
  } catch (e) {
    console.error("Error creating date object:", e);
    return null;
  }
}
