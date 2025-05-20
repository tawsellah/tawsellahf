
export interface FirebaseTrip {
  createdAt: number;
  dateTime: string; // ISO string e.g., "2025-05-22T06:50:00.000Z"
  destination: string;
  driverId: string;
  expectedArrivalTime: string; // e.g., "12:53"
  id: string;
  meetingPoint?: string;
  notes?: string;
  offeredSeatIds?: string[]; // e.g., ["front_passenger"] - if this is used, passengerDetails map will store who booked.
  offeredSeatsConfig?: { 
    // true if available, object with booking details if booked.
    [seatId: string]: boolean | { userId: string; phone: string; bookedAt: number };
  };
  pricePerPassenger: number;
  startPoint: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  stops?: string[];
  updatedAt?: number;
  // New field to store booking details, especially useful if offeredSeatIds is the primary mechanism
  passengerDetails?: {
    [seatId: string]: {
      userId: string;
      phone: string; // Storing phone directly here
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
  phone: string; // User's phone number
  rating?: number;
  tripsCount?: number;
  vehicleColor?: string;
  vehicleMakeModel?: string;
  vehiclePhotosUrl?: string; // Can be a single URL or array, adapt as needed
  vehiclePlateNumber?: string;
  vehicleType?: string;
  vehicleYear?: string;
}

// Combined Trip type for UI, merging FirebaseTrip and relevant FirebaseUser details
export interface Trip {
  id: string; // from FirebaseTrip.id
  firebaseTripData: FirebaseTrip; // Store original trip data if needed for updates

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
  // Optional: if you want to store who booked the seat in the UI Seat object
  bookedBy?: { userId: string; phone: string };
}

