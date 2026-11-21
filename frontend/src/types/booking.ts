export type SportType = 'TENNIS' | 'CRICKET';
export type BookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface CourtSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  price?: number;
  bookingId?: string;
}

export interface CourtFacility {
  id: string;
  name: string;
  sport: SportType;
  indoor: boolean;
  slots: CourtSlot[];
}

export interface Booking {
  id: string;
  bookingRef: string;
  courtId: string;
  courtName: string;
  sport: SportType;
  memberId: string;
  memberName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  fee: number;
}
