export interface Trip {
  id: string;
  driver: {
    name: string;
    rating: number;
    photoUrl: string;
    carNumber: string;
    carModel: string;
    carColor: string; // hex code or color name
    carColorName?: string; // e.g. "أحمر"
  };
  car: {
    name: string;
    color: string; // hex code or color name
    colorName?: string; // e.g. "أزرق"
  };
  date: string; // ISO string or formatted
  duration: string; // e.g., "3 ساعات"
  departureTime: string; // e.g., "10:00 ص"
  arrivalTime: string; // e.g., "01:00 م"
  price: number;
  startPoint: string;
  endPoint: string;
  seats: Seat[];
}

export type SeatStatus = 'available' | 'selected' | 'taken' | 'driver';

export interface Seat {
  id: string; // e.g., "F1", "R1", "D1"
  name: string; // e.g., "مقعد أمامي", "مقعد خلفي ١", "السائق"
  status: SeatStatus;
  row: 'front' | 'rear';
  position: number; // 0, 1, 2 ... in the row
  price?: number; // Optional: if seats have different prices
}
