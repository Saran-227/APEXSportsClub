import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { bookingsApi, membersApi } from '../../services/api';

const SPORTS_LIST = [
  { id: 'padel', name: 'Padel' },
  { id: 'tennis', name: 'Tennis' },
  { id: 'badminton', name: 'Badminton' },
  { id: 'cricket', name: 'Cricket' },
  { id: 'football', name: 'Football Turf' },
  { id: 'table_tennis', name: 'Table Tennis' },
  { id: 'golf', name: 'Golf Simulator' },
  { id: 'swimming', name: 'Swimming Pool' },
];

export const CustomerBookingPage: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState<string>('padel');
  const [courts, setCourts] = useState<any[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [participants, setParticipants] = useState<number>(2);
  const [notes, setNotes] = useState<string>('');
  const [memberProfile, setMemberProfile] = useState<any>(null);

  const [isLoadingCourts, setIsLoadingCourts] = useState<boolean>(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  // 1. Load member profile for benefits
  useEffect(() => {
    membersApi.getMyMembership().then(setMemberProfile).catch(() => null);
  }, []);

  // 2. Fetch courts when sport changes
  useEffect(() => {
    setIsLoadingCourts(true);
    setSelectedCourt(null);
    setSelectedSlot(null);
    setErrorMessage(null);
    bookingsApi
      .getCourts(selectedSport)
      .then((data) => {
        setCourts(data);
        if (data.length > 0) {
          setSelectedCourt(data[0]);
        }
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Failed to load courts.');
      })
      .finally(() => {
        setIsLoadingCourts(false);
      });
  }, [selectedSport]);

  // 3. Fetch slots when court or date changes
  useEffect(() => {
    if (!selectedCourt) return;
    setIsLoadingSlots(true);
    setSelectedSlot(null);
    setErrorMessage(null);
    bookingsApi
      .getAvailability(selectedCourt.id, selectedDate)
      .then((res) => {
        setAvailableSlots(res.slots || []);
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Failed to fetch court availability.');
      })
      .finally(() => {
        setIsLoadingSlots(false);
      });
  }, [selectedCourt, selectedDate]);

  // Pricing calculations
  const baseRate = selectedCourt ? Number(selectedCourt.hourly_rate) : 0;
  const discountPercent = memberProfile?.tier?.includes('GOLD') ? 0.2 : memberProfile?.tier?.includes('SILVER') ? 0.1 : 0;
  const discountAmount = baseRate * discountPercent;
  const finalPrice = Math.max(0, baseRate - discountAmount);

  const handleConfirmBooking = async () => {
    if (!selectedCourt || !selectedSlot) {
      setErrorMessage('Please select a court and an available time slot.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await bookingsApi.createBooking({
        court_id: selectedCourt.id,
        booking_date: selectedDate,
        start_time: selectedSlot,
        participant_count: participants,
        notes: notes || undefined,
      });
      setSuccessBooking(res);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Booking reservation failed.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C7FF36]/10 border border-[#C7FF36]/30 text-[#C7FF36] text-xs font-semibold mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Automated Concurrency & Schedule Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Reserve a Championship Facility
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Select sport, court, and 60-minute session slot. Slots open on 30-minute intervals with automatic membership pricing discounts.
        </p>
      </div>

      {/* Confirmation Modal */}
      {successBooking && (
        <div className="rounded-2xl bg-[#171A1D] border-2 border-[#C7FF36] p-6 shadow-2xl relative animate-in fade-in">
          <div className="flex items-center gap-3 text-[#C7FF36] mb-3">
            <CheckCircle2 className="h-6 w-6" />
            <h3 className="text-lg font-bold text-white">Booking Confirmed Successfully!</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#101316] border border-[#25292D] my-4 text-xs">
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Court</span>
              <p className="font-bold text-white mt-0.5">{successBooking.court_name}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Date & Time</span>
              <p className="font-bold text-white mt-0.5">
                {successBooking.booking_date} @ {new Date(successBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Session Duration</span>
              <p className="font-bold text-white mt-0.5">{successBooking.duration_minutes} Minutes</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Settled Amount</span>
              <p className="font-bold text-[#C7FF36] mt-0.5">₹{successBooking.total_amount}</p>
            </div>
          </div>
          <button
            onClick={() => setSuccessBooking(null)}
            className="px-5 py-2 rounded-xl bg-[#C7FF36] text-slate-950 font-bold text-xs hover:bg-[#b0e600] transition cursor-pointer"
          >
            Make Another Booking
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* STEP 1: Sport Category Tabs */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          1. Select Sport Category
        </label>
        <div className="flex flex-wrap gap-2">
          {SPORTS_LIST.map((sport) => (
            <button
              key={sport.id}
              onClick={() => setSelectedSport(sport.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                selectedSport === sport.id
                  ? 'bg-[#C7FF36] text-slate-950 border-[#C7FF36] shadow-md shadow-[#C7FF36]/20 font-bold'
                  : 'bg-[#171A1D] text-slate-300 border-[#25292D] hover:bg-[#25292D]'
              }`}
            >
              {sport.name}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 2: Courts Carousel / Grid */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          2. Select Court / Facility
        </label>
        {isLoadingCourts ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading facilities...</div>
        ) : courts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-[#171A1D] border border-[#25292D]">
            No courts currently available for {selectedSport}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courts.map((court) => (
              <div
                key={court.id}
                onClick={() => setSelectedCourt(court)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  selectedCourt?.id === court.id
                    ? 'bg-[#171A1D] border-[#C7FF36] shadow-lg shadow-[#C7FF36]/10'
                    : 'bg-[#171A1D]/70 border-[#25292D] hover:border-slate-700'
                }`}
              >
                <div>
                  {court.image_url && (
                    <img
                      src={court.image_url}
                      alt={court.name}
                      className="h-32 w-full object-cover rounded-xl mb-3"
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{court.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {court.is_indoor ? 'Indoor Pro' : 'Outdoor'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{court.surface_type || 'Professional Turf'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#25292D] flex items-center justify-between">
                  <span className="text-xs text-slate-400">Hourly Rate</span>
                  <span className="text-xs font-bold text-[#C7FF36]">₹{court.hourly_rate} / hr</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STEP 3 & 4: Date & Available 30-min Slots */}
      {selectedCourt && (
        <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#25292D]">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                3. Choose Date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#101316] border border-[#25292D] rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#C7FF36]"
              />
            </div>

            <div className="text-xs text-slate-400">
              Operating hours: <span className="text-white font-semibold">{selectedCourt.opening_time} - {selectedCourt.closing_time}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                4. Select 60-Minute Session Slot
              </label>
              <span className="text-[11px] text-slate-500">Intervals every 30 mins</span>
            </div>

            {isLoadingSlots ? (
              <div className="py-8 text-center text-slate-500 text-xs">Checking real-time slot conflicts...</div>
            ) : availableSlots.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">No available slots found for this date.</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot === slot.time_str;
                  return (
                    <button
                      key={slot.time_str}
                      type="button"
                      disabled={!slot.is_available}
                      onClick={() => setSelectedSlot(slot.time_str)}
                      className={`p-2.5 rounded-xl text-center text-xs font-semibold transition border ${
                        !slot.is_available
                          ? 'bg-[#101316] border-[#25292D] text-slate-600 line-through cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-[#C7FF36] border-[#C7FF36] text-slate-950 font-bold shadow-md shadow-[#C7FF36]/20 cursor-pointer'
                          : 'bg-[#101316] border-[#25292D] text-slate-200 hover:border-[#C7FF36]/50 cursor-pointer'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5 mx-auto mb-1 opacity-70" />
                      <span>{slot.time_str}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 5: Booking Details & Pricing Summary */}
          {selectedSlot && (
            <div className="pt-6 border-t border-[#25292D] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Number of Players</label>
                  <select
                    value={participants}
                    onChange={(e) => setParticipants(Number(e.target.value))}
                    className="w-full bg-[#101316] border border-[#25292D] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C7FF36]"
                  >
                    <option value={1}>1 Player (Solo Training)</option>
                    <option value={2}>2 Players (Singles Match)</option>
                    <option value={4}>4 Players (Doubles Match)</option>
                    <option value={6}>6+ Players (Group Session)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Session Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Bring racket demo, tournament practice"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#101316] border border-[#25292D] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C7FF36]"
                  />
                </div>
              </div>

              {/* Price Calculation Card */}
              <div className="p-4 rounded-xl bg-[#101316] border border-[#25292D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{selectedCourt.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#C7FF36]/15 text-[#C7FF36]">
                      {selectedSlot} (60 mins)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Standard Rate: ₹{baseRate} • Member Discount: -₹{discountAmount.toFixed(0)} ({discountPercent * 100}%)
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Total Payable</span>
                    <p className="text-xl font-mono font-bold text-[#C7FF36]">₹{finalPrice.toFixed(0)}</p>
                  </div>
                  <button
                    onClick={handleConfirmBooking}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#C7FF36] text-slate-950 font-bold text-xs hover:bg-[#b0e600] transition shadow-lg shadow-[#C7FF36]/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Confirming...' : 'Confirm & Reserve'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
