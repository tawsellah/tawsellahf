
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
    [seatId: string]: boolean | { userId: string; phone: string; bookedAt: number };
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
      bookedAt: number;
    };
  };
}

export interface FirebaseUser {
  createdAt: number;
  email: string;
  fullName: string;
  id: string; // This is the UID from Firebase Auth
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
  phone?: string; // User's phone number (used in tawsellah3 users node)
  phoneNumber?: string; // User's phone number (used in tawsellah-rider users node)
  rating?: number;
  tripsCount?: number;
  vehicleColor?: string;
  vehicleMakeModel?: string;
  vehiclePhotosUrl?: string;
  vehiclePlateNumber?: string;
  vehicleType?: string;
  vehicleYear?: string;
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
}

export type SeatStatus = 'available' | 'selected' | 'taken' | 'driver';

export interface Seat {
  id: string;
  name: string;
  status: SeatStatus;
  row: 'front' | 'rear' | 'driver';
  position: number;
  price?: number;
  bookedBy?: { userId: string; phone: string };
}

// New type for storing trip history in "tawsellah-rider" database
export interface StoredHistoryTrip {
  bookingId: string;        // Unique ID for this booking
  tripId: string;           // ID of the original trip from currentTrips (tawsellah3)
  seatId: string;
  seatName: string;
  tripPrice: number;
  tripDateTime: string;     // ISO string from original trip's dateTime
  departureCityValue: string;
  arrivalCityValue: string;
  driverId: string;         // Snapshot from original trip
  driverNameSnapshot: string; // Snapshot of driver's name at booking
  bookedAt: number;         // Timestamp of booking
  userId: string;           // UID of the user who booked
}

// Type for displaying trips in "My Trips" page, combining StoredHistoryTrip and live original trip data
export interface DisplayableHistoryTrip extends StoredHistoryTrip {
  tripDateDisplay: string;
  tripTimeDisplay: string;
  dayOfWeekDisplay: string;
  departureCityDisplay: string;
  arrivalCityDisplay: string;
  currentTripStatusDisplay: 'مكتملة' | 'حالية' | 'قادمة' | 'ملغاة' | 'مؤرشفة (غير معروفة)';
  // Add any other fields needed for display, e.g., original driver's current details if fetched
  originalTripExists: boolean;
}
