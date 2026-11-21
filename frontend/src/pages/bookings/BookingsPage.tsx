import React, { useState } from 'react';
import {
  Plus,
  Clock,
  User,
  MapPin,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { PlaceholderNoticeBanner } from '../../components/common/PlaceholderNoticeBanner';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Booking } from '../../types';

export const BookingsPage: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState<string>('ALL');

  const demoBookings: Booking[] = [
    {
      id: 'bk_101',
      bookingRef: 'BK-20261121-101',
      courtId: 'court_t1',
      courtName: 'Tennis Court 1 (Clay)',
      sport: 'TENNIS',
      memberId: 'mem_01',
      memberName: 'Alexander Vance',
      date: '2026-11-21',
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      status: 'CONFIRMED',
      fee: 35.0,
    },
    {
      id: 'bk_102',
      bookingRef: 'BK-20261121-102',
      courtId: 'court_cr1',
      courtName: 'Cricket Pitch 1 (Main Turf)',
      sport: 'CRICKET',
      memberId: 'mem_02',
      memberName: 'Elena Rostova',
      date: '2026-11-21',
      startTime: '11:30 AM',
      endTime: '01:30 PM',
      status: 'CONFIRMED',
      fee: 60.0,
    },
    {
      id: 'bk_103',
      bookingRef: 'BK-20261121-103',
      courtId: 'court_t2',
      courtName: 'Tennis Court 2 (Hard Court)',
      sport: 'TENNIS',
      memberId: 'mem_03',
      memberName: 'Marcus Sterling',
      date: '2026-11-21',
      startTime: '02:00 PM',
      endTime: '03:00 PM',
      status: 'PENDING',
      fee: 30.0,
    },
    {
      id: 'bk_104',
      bookingRef: 'BK-20261121-104',
      courtId: 'court_cr_net1',
      courtName: 'Cricket Practice Net A',
      sport: 'CRICKET',
      memberId: 'mem_04',
      memberName: 'Sophia Chen',
      date: '2026-11-21',
      startTime: '04:00 PM',
      endTime: '05:00 PM',
      status: 'CONFIRMED',
      fee: 25.0,
    },
  ];

  const sports = ['ALL', 'TENNIS', 'CRICKET'];

  const filtered = demoBookings.filter(
    (b) => selectedSport === 'ALL' || b.sport === selectedSport
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Court & Pitch Reservations"
        description="View availability and book slots across Champions Club tennis courts and cricket grounds."
        actions={
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => alert('New booking modal will connect to POST /api/v1/bookings.')}
          >
            New Reservation
          </Button>
        }
      />

      <PlaceholderNoticeBanner moduleName="Court & Pitch Bookings Module" />

      {/* Sport Selector Pills (Tennis and Cricket only) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {sports.map((sport) => (
          <button
            key={sport}
            onClick={() => setSelectedSport(sport)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition cursor-pointer ${
              selectedSport === sport
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {sport === 'ALL' ? 'All Facilities (Tennis & Cricket)' : sport}
          </button>
        ))}
      </div>

      {/* Bookings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((booking) => (
          <Card key={booking.id} className="relative hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {booking.bookingRef}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{booking.courtName}</h3>
                <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50">
                  {booking.sport}
                </span>
              </div>
              <div>
                {booking.status === 'CONFIRMED' && (
                  <Badge variant="success" size="sm">Confirmed</Badge>
                )}
                {booking.status === 'PENDING' && (
                  <Badge variant="warning" size="sm">Pending</Badge>
                )}
                {booking.status === 'CANCELLED' && (
                  <Badge variant="danger" size="sm">Cancelled</Badge>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">
                  {booking.startTime} - {booking.endTime}
                </span>
                <span className="text-slate-400">({booking.date})</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Reserved by: <strong className="text-slate-800">{booking.memberName}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Facility fee: <strong>${booking.fee.toFixed(2)}</strong></span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => alert(`Cancelling ${booking.bookingRef} will call POST /api/v1/bookings/${booking.id}/cancel.`)}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
              >
                Cancel Slot
              </button>
              <button
                type="button"
                onClick={() => alert(`Checking in member for ${booking.courtName}.`)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
              >
                Check In &rarr;
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center text-xs text-slate-400 pt-2">
        Contract Endpoint Reference: <code className="text-slate-600 font-mono">GET /api/v1/bookings/availability</code> • <code className="text-slate-600 font-mono">POST /api/v1/bookings</code>
      </div>
    </div>
  );
};
