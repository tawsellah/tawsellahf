





export interface FirebaseTrip {
  createdAt: number;
  dateTime: string; // ISO string e.g., "2025-05-22T06:50:00.000Z"
  destination: string;
  driverId: string;
  expectedArrivalTime: string; // e.g., "12:53"
  id: string;
  meetingPoint?: string;
  notes?: string;
  offeredSeatIds?: string[];
  offeredSeatsConfig?: {
    [seatId: string]: boolean | { userId: string; phone: string; fullName: string; bookedAt: number; paymentType?: 'cash' | 'cliq'; selectedStop?: string; fees?: number };
  };
  pricePerPassenger: number;
  startPoint: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  stops?: string[];
  updatedAt?: number;
  passengerDetails?: {
    [seatId: string]: {
      userId: string;
      phone: string;
      fullName: string;
      bookedAt: number;
      paymentType?: 'cash' | 'cliq';
      selectedStop?: string;
      fees?: number;
    };
  };
}

export interface FirebaseUser {
  createdAt: number;
  email: string;
  fullName: string;
  id: string;
  idNumber?: string;
  idPhotoUrl?: string;
  licenseExpiry?: string;
  licenseNumber?: string;
  licensePhotoUrl?: string;
  paymentMethods?: {
    cash?: boolean;
    click?: boolean;
    clickCode?: string;
  };
  phone?: string;
  phoneNumber?: string;
  rating?: number;
  tripsCount?: number;
  vehicleColor?: string;
  vehicleMakeModel?: string;
  vehiclePhotosUrl?: string;
  vehiclePlateNumber?: string;
  vehicleType?: string;
  vehicleYear?: string;
  walletBalance?: number;
}

export interface Trip {
  id: string;
  firebaseTripData: FirebaseTrip;
  driver: {
    id: string;
    name: string;
    rating: number;
    photoUrl: string;
    carNumber: string;
    carModel: string;
    carColor: string;
    carColorName?: string;
    clickCode?: string;
  };
  car: {
    name: string;
    color: string;
    colorName?: string;
  };
  date: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  startPoint: string;
  endPoint: string;
  meetingPoint?: string;
  notes?: string;
  status: FirebaseTrip['status'];
  seats: Seat[];
  stops?: string[];
}

export type SeatStatus = 'available' | 'selected' | 'taken' | 'driver';

export interface Seat {
  id: string;
  name: string;
  status: SeatStatus;
  row: 'front' | 'rear' | 'driver';
  position: number;
  price?: number;
  bookedBy?: { userId: string; phone: string; fullName?: string; bookedAt?: number; paymentType?: 'cash' | 'cliq', selectedStop?: string; fees?: number; };
}

export interface StoredHistoryTrip {
  bookingId: string;
  tripId: string;
  seatId: string;
  seatName: string;
  tripPrice: number;
  tripDateTime: string;
  departureCityValue: string;
  arrivalCityValue: string;
  driverId: string;
  driverNameSnapshot: string;
  bookedAt: number;
  userId: string;
  status?: 'booked' | 'user-cancelled' | 'system-cancelled';
  paymentType?: 'cash' | 'cliq';
  fullNameSnapshot?: string;
  phoneSnapshot?: string;
  selectedStop?: string;
  fees?: number;
}

export interface DisplayableHistoryTrip extends StoredHistoryTrip {
  tripDateDisplay: string;
  tripTimeDisplay: string;
  dayOfWeekDisplay: string;
  departureCityDisplay: string;
  arrivalCityDisplay: string;
  currentTripStatusDisplay:
    | 'مكتملة'
    | 'حالية'
    | 'قادمة'
    | 'ملغاة'
    | 'ملغاة (بواسطتك)'
    | 'ملغاة (النظام)'
    | 'مؤرشفة (غير معروفة)';
  originalTripExists: boolean;
  originalActualTripStatus?: FirebaseTrip['status'];
  driverPhoneNumberSnapshot?: string;
  driverCarModelSnapshot?: string;
  driverCarNumberSnapshot?: string;
  driverCarColorSnapshot?: string;
  driverCarColorNameSnapshot?: string;
}

export interface GroupedDisplayableTrip {
  originalTripId: string;
  tripDateDisplay: string;
  tripTimeDisplay: string;
  dayOfWeekDisplay: string;
  departureCityDisplay: string;
  arrivalCityDisplay: string;
  driverNameSnapshot: string;
  driverPhoneNumberSnapshot?: string;
  driverCarModelSnapshot?: string;
  driverCarNumberSnapshot?: string;
  driverCarColorSnapshot?: string;
  driverCarColorNameSnapshot?: string;
  overallTripStatusForCancellationLogic: FirebaseTrip['status'] | 'unknown';
  originalTripExists: boolean;
  userBookingsForThisTrip: DisplayableHistoryTrip[];
  cardHeaderStatusDisplay:
    | 'قادمة'
    | 'مكتملة'
    | 'ملغاة'
    | 'ملغاة (بواسطتك)'
    | 'ملغاة (النظام)'
    | 'متعدد الحالات'
    | 'مؤرشفة'
    | 'حالية';
  canCancelAnyBookingInGroup: boolean;
}
