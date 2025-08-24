
"use client";

import type { Seat as SeatType, SeatStatus } from '@/types';
import { cn } from '@/lib/utils';
import { Armchair, UserCircle, CheckCircle2, Ban } from 'lucide-react'; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SeatProps {
  seat: SeatType;
  size?: 'normal' | 'small'; 
  onClick?: (seatId: string) => void;
  playSelectSound?: () => void;
  playDeselectSound?: () => void;
}

const seatStyles: Record<SeatStatus, string> = {
  available: 'bg-seat-available text-seat-available-foreground hover:bg-seat-available/90 cursor-pointer',
  selected: 'bg-seat-selected text-seat-selected-foreground scale-105 shadow-lg',
  taken: 'bg-seat-taken text-seat-taken-foreground cursor-not-allowed opacity-70',
  driver: 'bg-seat-driver text-seat-driver-foreground cursor-not-allowed border-2 border-card',
};

const SeatContent = ({ seat }: { seat: SeatType }) => {
  const iconProps = { className: "w-1/2 h-1/2" };
  switch (seat.status) {
    case 'available':
      return <>
        <Armchair {...iconProps} />
        <span className="mt-1 text-xs font-medium truncate px-1">{seat.name.split(" ")[0]}</span> 
      </>;
    case 'selected':
      return <>
        <CheckCircle2 {...iconProps} />
        <span className="mt-1 text-xs font-medium truncate px-1">{seat.name.split(" ")[0]}</span>
      </>;
    case 'taken':
      if (seat.bookedBy?.gender === 'male') return <span className="font-bold text-lg">ذكر</span>;
      if (seat.bookedBy?.gender === 'female') return <span className="font-bold text-lg">أنثى</span>;
      return <>
        <Ban {...iconProps} />
        <span className="mt-1 text-xs font-medium truncate px-1">محجوز</span>
      </>;
    case 'driver':
      return <>
        <UserCircle {...iconProps} />
        <span className="mt-1 text-xs font-medium truncate px-1">{seat.name.split(" ")[0]}</span>
      </>;
    default:
      return <>
        <Armchair {...iconProps} />
        <span className="mt-1 text-xs font-medium truncate px-1">{seat.name.split(" ")[0]}</span>
      </>;
  }
};


export function Seat({ seat, size = 'normal', onClick, playSelectSound, playDeselectSound }: SeatProps) {
  const isClickable = seat.status === 'available' || seat.status === 'selected';

  const handleClick = () => {
    if (onClick && isClickable) {
      onClick(seat.id);
      if (seat.status === 'available' && playSelectSound) playSelectSound();
      if (seat.status === 'selected' && playDeselectSound) playDeselectSound();
    }
  };

  const seatSizeClass = size === 'normal' ? 'w-24 h-24 md:w-[100px] md:h-[100px]' : 'w-20 h-20 md:w-[90px] md:h-[90px]';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'rounded-lg flex flex-col items-center justify-center transition-all duration-300 ease-in-out transform',
              seatSizeClass,
              seatStyles[seat.status],
              isClickable && 'hover:scale-110 active:scale-100',
              !isClickable && 'select-none'
            )}
            onClick={handleClick}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && isClickable && handleClick()}
            tabIndex={isClickable ? 0 : -1}
            role="button"
            aria-pressed={seat.status === 'selected'}
            aria-label={`${seat.name} - ${seat.status === 'available' ? 'متاح' : seat.status === 'selected' ? 'مختار' : seat.status === 'taken' ? 'محجوز' : 'السائق'}`}
          >
            <SeatContent seat={seat} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-foreground text-background p-2 rounded-md shadow-lg" side="top">
           <p>{seat.name} - {
            seat.status === 'available' ? 'متاح' : 
            seat.status === 'selected' ? 'مختار' : 
            seat.status === 'taken' ? `محجوز (${seat.bookedBy?.fullName || 'غير معروف'})` : 'السائق'
          }</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
