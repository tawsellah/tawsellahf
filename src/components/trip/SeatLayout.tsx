
"use client";

import type { Seat as SeatType } from '@/types';
import { Seat } from './Seat';
import { useToneSynth } from '@/hooks/use-sound';

interface SeatLayoutProps {
  seats: SeatType[];
  onSeatClick: (seatId: string) => void;
}

export function SeatLayout({ seats, onSeatClick }: SeatLayoutProps) {
  // Seats should already be sorted by row and position from generateSeatsFromTripData
  const driverSeat = seats.find(s => s.row === 'driver');
  const frontSeats = seats.filter(s => s.row === 'front').sort((a,b) => a.position - b.position);
  const rearSeats = seats.filter(s => s.row === 'rear').sort((a,b) => a.position - b.position);


  const playSelectSound = useToneSynth("E5", -12);
  const playDeselectSound = useToneSynth("C5", -15);

  const frontPassengerSeat = frontSeats.length > 0 ? frontSeats[0] : null; // Assuming single front passenger seat after driver

  return (
    <div className="flex flex-col items-center gap-y-6 p-4 bg-card rounded-lg shadow-inner">
      {/* Front Row: Driver, Gap, Passenger */}
      <div className="grid grid-cols-[100px_minmax(20px,_30px)_100px] md:grid-cols-[100px_minmax(30px,_40px)_100px] gap-x-0 justify-center items-center w-full">
        {driverSeat ? (
          <Seat
            seat={driverSeat}
            onClick={onSeatClick} // Driver seat is usually not clickable for booking
            size="normal"
          />
        ) : <div className="w-[100px] h-[100px]"></div>}
        
        <div aria-hidden="true"></div> {/* Gap element */}

        {frontPassengerSeat ? (
           <Seat
            seat={frontPassengerSeat}
            onClick={onSeatClick}
            size="normal"
            playSelectSound={playSelectSound}
            playDeselectSound={playDeselectSound}
          />
        ) : <div className="w-[100px] h-[100px]"></div>}
      </div>

      {/* Rear Row */}
      {rearSeats.length > 0 && (
        <div className="flex justify-center gap-x-2 md:gap-x-3 w-full">
          {rearSeats.map(seat => (
            <Seat 
              key={seat.id} 
              seat={seat} 
              onClick={onSeatClick} 
              size="small"
              playSelectSound={playSelectSound}
              playDeselectSound={playDeselectSound}
            />
          ))}
        </div>
      )}
    </div>
  );
}
