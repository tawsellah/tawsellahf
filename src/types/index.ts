

export interface FirebaseTrip {
  createdAt: number;
  dateTime: string; // ISO string e.g., "2025-05-22T06:50:00.000Z"
  destination: string;
  driverId: string;
  expectedArrivalTime: string; // e.g., "12:53"
  id: string;
  meetingPoint?: string;
  notes?: string;
  offeredSeatIds?: string[]; // For trips where seats are just a list of available IDs
  offeredSeatsConfig?: { // For trips with detailed seat configuration
    [seatId: string]: boolean | { userId: string; phone: string; bookedAt: number }; // true if available, object if booked
  };
  pricePerPassenger: number;
  startPoint: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  stops?: string[];
  updatedAt?: number;
  passengerDetails?: { // Used if offeredSeatIds is present, maps seatId to booking details
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
  firebaseTripData: FirebaseTrip; // Original Firebase trip data
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
  car: { // Simplified car details, often derived from driver
    name: string; // vehicleMakeModel
    color: string; // vehicleColor
    colorName?: string;
  };
  date: string; // Formatted date for display
  departureTime: string; // Formatted time for display
  arrivalTime: string; // Formatted or direct from firebaseTripData.expectedArrivalTime
  price: number; // pricePerPassenger
  startPoint: string; // Formatted start point for display (Arabic name)
  endPoint: string; // Formatted end point for display (Arabic name)
  meetingPoint?: string;
  notes?: string;
  status: FirebaseTrip['status']; // Original status
  seats: Seat[]; // Processed seat list for UI interaction
}

export type SeatStatus = 'available' | 'selected' | 'taken' | 'driver';

export interface Seat {
  id: string;
  name: string;
  status: SeatStatus;
  row: 'front' | 'rear' | 'driver';
  position: number;
  price?: number; // Usually trip.price is used per seat
  bookedBy?: { userId: string; phone: string; bookedAt?: number }; // Include bookedAt if available
}

// For storing trip history in "tawsellah-rider" database for a specific user
export interface StoredHistoryTrip {
  bookingId: string;        // Unique ID for this specific seat booking
  tripId: string;           // ID of the original trip from currentTrips (tawsellah3)
  seatId: string;
  seatName: string;
  tripPrice: number;
  tripDateTime: string;     // ISO string from original trip's dateTime
  departureCityValue: string; // e.g. 'amman'
  arrivalCityValue: string;   // e.g. 'irbid'
  driverId: string;         // Snapshot from original trip
  driverNameSnapshot: string; // Snapshot of driver's name at booking
  bookedAt: number;         // Timestamp of booking
  userId: string;           // UID of the user who booked
  status?: 'booked' | 'user-cancelled' | 'system-cancelled'; // Status of this specific booking
}

// Type for displaying trips in "My Trips" page, combining StoredHistoryTrip and live original trip data
export interface DisplayableHistoryTrip extends StoredHistoryTrip {
  tripDateDisplay: string;
  tripTimeDisplay: string;
  dayOfWeekDisplay: string;
  departureCityDisplay: string; // Arabic name
  arrivalCityDisplay: string;   // Arabic name
  currentTripStatusDisplay: 
    | 'مكتملة' 
    | 'حالية' 
    | 'قادمة' 
    | 'ملغاة' 
    | 'ملغاة (بواسطتك)'
    | 'ملغاة (النظام)'
    | 'مؤرشفة (غير معروفة)';
  originalTripExists: boolean;
}
