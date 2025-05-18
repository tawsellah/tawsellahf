import type { Trip, Seat } from '@/types';

const defaultSeats: Seat[] = [
  { id: 'D1', name: 'السائق', status: 'driver', row: 'front', position: 0 },
  { id: 'F1', name: 'مقعد أمامي بجانب السائق', status: 'available', row: 'front', position: 1 },
  { id: 'R1', name: 'مقعد خلفي يسار', status: 'available', row: 'rear', position: 0 },
  { id: 'R2', name: 'مقعد خلفي وسط', status: 'available', row: 'rear', position: 1 }, // Changed from 'taken' to 'available'
  { id: 'R3', name: 'مقعد خلفي يمين', status: 'available', row: 'rear', position: 2 },
];

export const sampleTrips: Trip[] = [
  {
    id: 'trip1',
    driver: {
      name: 'أحمد محمود',
      rating: 4.5,
      photoUrl: 'https://placehold.co/80x80.png',
      carNumber: 'س ط ح ١٢٣',
      carModel: 'تويوتا كامري ٢٠٢٢',
      carColor: '#3498db',
      carColorName: 'أزرق',
    },
    car: {
      name: 'تويوتا كامري',
      color: '#3498db',
      colorName: 'أزرق',
    },
    date: '2024-08-15',
    duration: 'ساعتان و ٣٠ دقيقة',
    departureTime: '٠٩:٠٠ ص',
    arrivalTime: '١١:٣٠ ص',
    price: 75,
    startPoint: 'الرياض',
    endPoint: 'الدمام',
    seats: JSON.parse(JSON.stringify(defaultSeats)), // Deep copy, will now have all available seats
  },
  {
    id: 'trip2',
    driver: {
      name: 'فاطمة علي',
      rating: 4.8,
      photoUrl: 'https://placehold.co/80x80.png',
      carNumber: 'ا ب ت ٤٥٦',
      carModel: 'هيونداي إلنترا ٢٠٢١',
      carColor: '#e74c3c',
      carColorName: 'أحمر',
    },
    car: {
      name: 'هيونداي إلنترا',
      color: '#e74c3c',
      colorName: 'أحمر',
    },
    date: '2024-08-16',
    duration: '٥ ساعات',
    departureTime: '٠٢:٠٠ م',
    arrivalTime: '٠٧:٠٠ م',
    price: 120,
    startPoint: 'جدة',
    endPoint: 'المدينة المنورة',
    seats: JSON.parse(JSON.stringify(defaultSeats)), // Deep copy, removed custom map to ensure all available
  },
];

export const getTripById = (id: string): Trip | undefined => {
  const trip = sampleTrips.find(t => t.id === id);
  if (trip) {
    // Ensure fresh copy of seats for detail page
    return { ...trip, seats: JSON.parse(JSON.stringify(trip.seats)) };
  }
  return undefined;
};
