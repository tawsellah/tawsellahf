

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
  bookedBy?: { userId: string; phone: string; bookedAt?: number }; 
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
  // This field represents the status of the *original* trip in currentTrips
  // to help determine if the overall trip is upcoming, cancelled, etc.
  originalActualTripStatus?: FirebaseTrip['status']; 
}

export interface GroupedDisplayableTrip {
  originalTripId: string;
  tripDateDisplay: string;
  tripTimeDisplay: string;
  dayOfWeekDisplay: string;
  departureCityDisplay: string;
  arrivalCityDisplay: string;
  driverNameSnapshot: string;
  overallTripStatusForCancellationLogic: FirebaseTrip['status'] | 'unknown'; // Status of original trip from currentTrips
  originalTripExists: boolean;
  userBookingsForThisTrip: DisplayableHistoryTrip[]; // All user's bookings for this originalTripId
  // Display a consolidated status for the card header badge
  cardHeaderStatusDisplay: 
    | 'قادمة'
    | 'مكتملة'
    | 'ملغاة'
    | 'متعدد الحالات' // If bookings have mixed statuses like some cancelled, some active
    | 'مؤرشفة';
  canCancelAnyBookingInGroup: boolean; // True if original trip is upcoming and user has at least one active booking in this group
}
