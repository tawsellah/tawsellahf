export interface FirebaseTrip {
  createdAt: number;
  dateTime: string; // ISO string e.g., "2025-05-22T06:50:00.000Z"
  destination: string;
  driverId: string;
  expectedArrivalTime: string; // e.g., "12:53"
  id: string;
  meetingPoint?: string;
  notes?: string;
  offeredSeatIds?: string[]; // e.g., ["front_passenger"]
  offeredSeatsConfig?: { // e.g., { "back_left": false, "back_middle": true, ... }
    [seatId: string]: boolean;
  };
  pricePerPassenger: number;
  startPoint: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  stops?: string[];
  updatedAt?: number;
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
  phone: string;
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

  // Driver and Car details, populated from FirebaseUser
  driver: {
    id: string; // from FirebaseTrip.driverId
    name: string; // from FirebaseUser.fullName
    rating: number; // from FirebaseUser.rating
    photoUrl: string; // from FirebaseUser.idPhotoUrl or vehiclePhotosUrl or default
    carNumber: string; // from FirebaseUser.vehiclePlateNumber
    carModel: string; // from FirebaseUser.vehicleMakeModel
    carColor: string; // from FirebaseUser.vehicleColor (could be name or hex)
    carColorName?: string; // Descriptive color name if available/needed
    clickCode?: string; // from FirebaseUser.paymentMethods.clickCode
  };
  // Car details are part of driver in the new structure,
  // but keeping a separate car object in UI type for consistency if preferred
  // If not, these can be merged into driver object above.
  car: {
    name: string; // from FirebaseUser.vehicleMakeModel
    color: string; // from FirebaseUser.vehicleColor
    colorName?: string;
  };

  // Trip specific details from FirebaseTrip
  date: string; // Derived from FirebaseTrip.dateTime (for display)
  duration?: string; // This might need to be calculated or removed if not in new JSON
  departureTime: string; // Derived from FirebaseTrip.dateTime (for display)
  arrivalTime: string; // from FirebaseTrip.expectedArrivalTime
  price: number; // from FirebaseTrip.pricePerPassenger
  startPoint: string; // from FirebaseTrip.startPoint
  endPoint: string; // from FirebaseTrip.destination
  meetingPoint?: string; // from FirebaseTrip.meetingPoint
  notes?: string; // from FirebaseTrip.notes
  status: FirebaseTrip['status'];

  seats: Seat[]; // This will be constructed based on offeredSeatIds or offeredSeatsConfig
}

export type SeatStatus = 'available' | 'selected' | 'taken' | 'driver';

export interface Seat {
  id: string; // e.g., "front_passenger", "back_left", "driver_seat"
  name: string; // e.g., "مقعد أمامي", "مقعد خلفي يسار", "السائق"
  status: SeatStatus;
  row: 'front' | 'rear' | 'driver'; // 'driver' row for the driver's seat
  position: number; // 0, 1, 2 ... in the row
  price?: number; // Optional: if seats have different prices
}
