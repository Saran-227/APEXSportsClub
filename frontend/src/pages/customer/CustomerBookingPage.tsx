import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Users,
  Star,
  ArrowRight,
  Trophy,
  Zap,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  X,
  ChevronDown,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { bookingsApi, normalizeApiError } from '../../services/api';

interface CourtItem {
  id: string;
  name: string;
  sport: string;
  type: string;
  surface: string;
  capacity: number;
  rating: number;
  reviewsCount: number;
  hourlyRate: number;
  hourlyRateDisplay: string;
  isAvailable: boolean;
  image: string;
}

const getSportFallbackImage = (sport: string) => {
  const s = (sport || '').toLowerCase();
  if (s.includes('tennis')) return 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80';
  if (s.includes('football')) return 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80';
  if (s.includes('cricket')) return 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80';
  if (s.includes('padel')) return 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80';
  if (s.includes('badminton')) return 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80';
  if (s.includes('golf')) return 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=800&q=80';
  if (s.includes('swim')) return 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80';
  return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80';
};

export const CustomerBookingPage: React.FC = () => {
  const [selectedSidebarSport, setSelectedSidebarSport] = useState<string>('Tennis');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('ALL');
  const [searchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('Popular');
  const [locationName, setLocationName] = useState<string>('Apex Sports Club, Bangalore');

  // Real backend courts
  const [apiCourts, setApiCourts] = useState<any[]>([]);
  const [, setIsLoadingCourts] = useState<boolean>(false);

  // Dynamic upcoming dates (today + next 13 days)
  const upcomingDates = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      list.push({ iso, label });
    }
    return list;
  }, []);

  const [bookingDate, setBookingDate] = useState<string>(
    upcomingDates[0]?.iso || new Date().toISOString().split('T')[0]
  );
  const [timeSlot, setTimeSlot] = useState<string>('18:00');

  // Standard 60-minute session slots
  const timeSlots = [
    { label: '06:00 AM – 07:00 AM', time: '06:00' },
    { label: '07:00 AM – 08:00 AM', time: '07:00' },
    { label: '08:00 AM – 09:00 AM', time: '08:00' },
    { label: '09:00 AM – 10:00 AM', time: '09:00' },
    { label: '10:00 AM – 11:00 AM', time: '10:00' },
    { label: '11:00 AM – 12:00 PM', time: '11:00' },
    { label: '12:00 PM – 01:00 PM', time: '12:00' },
    { label: '01:00 PM – 02:00 PM', time: '13:00' },
    { label: '02:00 PM – 03:00 PM', time: '14:00' },
    { label: '03:00 PM – 04:00 PM', time: '15:00' },
    { label: '04:00 PM – 05:00 PM', time: '16:00' },
    { label: '05:00 PM – 06:00 PM', time: '17:00' },
    { label: '06:00 PM – 07:00 PM', time: '18:00' },
    { label: '07:00 PM – 08:00 PM', time: '19:00' },
    { label: '08:00 PM – 09:00 PM', time: '20:00' },
    { label: '09:00 PM – 10:00 PM', time: '21:00' },
  ];

  // Booking modal & transaction state
  const [activeBookingCourt, setActiveBookingCourt] = useState<CourtItem | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState<boolean>(false);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBookingDetails, setConfirmedBookingDetails] = useState<{
    id: string;
    invoiceNumber?: string;
  } | null>(null);

  // Fetch real courts from PostgreSQL backend
  useEffect(() => {
    let isMounted = true;
    const fetchCourts = async () => {
      try {
        setIsLoadingCourts(true);
        const courts = await bookingsApi.getCourts();
        if (isMounted && courts && courts.length > 0) {
          setApiCourts(courts);
        }
      } catch (err) {
        console.error('Failed to load courts from backend:', err);
      } finally {
        if (isMounted) setIsLoadingCourts(false);
      }
    };
    fetchCourts();
    return () => {
      isMounted = false;
    };
  }, []);

  const sportsList = [
    { name: 'Tennis', icon: '🎾' },
    { name: 'Football', icon: '⚽' },
    { name: 'Cricket', icon: '🏏' },
    { name: 'Padel', icon: '🏓' },
    { name: 'Badminton', icon: '🏸' },
  ];

  const filterTabs = [
    { id: 'ALL', name: 'ALL', icon: '' },
    { id: 'Tennis', name: 'TENNIS', icon: '🎾' },
    { id: 'Football', name: 'FOOTBALL', icon: '⚽' },
    { id: 'Cricket', name: 'CRICKET', icon: '🏏' },
    { id: 'Padel', name: 'PADEL', icon: '🏓' },
    { id: 'Badminton', name: 'BADMINTON', icon: '🏸' },
  ];

  // Map PostgreSQL courts or fallback
  const displayCourts: CourtItem[] = useMemo(() => {
    if (apiCourts.length > 0) {
      return apiCourts.map((c) => {
        const sportCap =
          c.sport.charAt(0).toUpperCase() + c.sport.slice(1).toLowerCase();
        const capacity = c.sport.toLowerCase().includes('cricket')
          ? 12
          : c.sport.toLowerCase().includes('football')
          ? 10
          : 4;
        return {
          id: c.id,
          name: c.name,
          sport: sportCap,
          type:
            c.surface_type ||
            (c.is_indoor ? 'Championship Indoor Arena' : 'Pro Outdoor Arena'),
          surface: c.is_indoor ? 'Indoor' : 'Outdoor',
          capacity,
          rating: 4.9,
          reviewsCount: 96,
          hourlyRate: Number(c.hourly_rate),
          hourlyRateDisplay: `₹${Number(c.hourly_rate).toLocaleString('en-IN')}`,
          isAvailable: c.is_active,
          image: c.image_url || getSportFallbackImage(c.sport),
        };
      });
    }

    // Default screenshot courts with real currency format
    return [
      {
        id: 'court-1',
        name: 'Court 1 (Tennis)',
        sport: 'Tennis',
        type: 'Premium Hard Court',
        surface: 'Outdoor',
        capacity: 4,
        rating: 4.9,
        reviewsCount: 124,
        hourlyRate: 1500,
        hourlyRateDisplay: '₹1,500',
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'court-2',
        name: 'Court 2 (Football)',
        sport: 'Football',
        type: 'Artificial Turf',
        surface: 'Outdoor',
        capacity: 10,
        rating: 4.8,
        reviewsCount: 98,
        hourlyRate: 2000,
        hourlyRateDisplay: '₹2,000',
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'court-3',
        name: 'Court 3 (Cricket)',
        sport: 'Cricket',
        type: 'Turf Pitch',
        surface: 'Outdoor',
        capacity: 12,
        rating: 4.9,
        reviewsCount: 76,
        hourlyRate: 2500,
        hourlyRateDisplay: '₹2,500',
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'court-4',
        name: 'Court 4 (Padel)',
        sport: 'Padel',
        type: 'Professional Grade',
        surface: 'Indoor',
        capacity: 4,
        rating: 4.8,
        reviewsCount: 82,
        hourlyRate: 1800,
        hourlyRateDisplay: '₹1,800',
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
      },
    ];
  }, [apiCourts]);

  // Filtered court cards
  const filteredCourts = useMemo(() => {
    return displayCourts
      .filter((court) => {
        const matchesFilter =
          selectedFilterCategory === 'ALL' ||
          court.sport.toLowerCase() === selectedFilterCategory.toLowerCase();
        const matchesSearch =
          !searchQuery ||
          court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          court.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
          court.type.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'PriceLow') return a.hourlyRate - b.hourlyRate;
        if (sortBy === 'PriceHigh') return b.hourlyRate - a.hourlyRate;
        return 0;
      });
  }, [displayCourts, selectedFilterCategory, searchQuery, sortBy]);

  const handleBookNow = (court: CourtItem) => {
    setActiveBookingCourt(court);
    setBookingConfirmed(false);
    setBookingError(null);
    setConfirmedBookingDetails(null);
  };

  // Real court booking submission: calls backend API, stores in PostgreSQL, sends invoice email via SendGrid
  const confirmReservation = async () => {
    if (!activeBookingCourt) return;
    try {
      setIsBookingSubmitting(true);
      setBookingError(null);

      const res = await bookingsApi.createBooking({
        court_id: activeBookingCourt.id,
        booking_date: bookingDate,
        start_time: timeSlot,
        participant_count: 2,
      });

      setConfirmedBookingDetails({
        id: res.id,
        invoiceNumber: res.invoice_number,
      });
      setBookingConfirmed(true);
    } catch (err) {
      const errObj = normalizeApiError(err);
      setBookingError(errObj.message || 'Failed to complete court reservation.');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const selectedDateLabel =
    upcomingDates.find((d) => d.iso === bookingDate)?.label || bookingDate;
  const selectedSlotLabel =
    timeSlots.find((s) => s.time === timeSlot)?.label || timeSlot;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7 items-start">
        {/* ================= LEFT SIDEBAR ================= */}
        <div className="lg:col-span-4 bg-[#083222] rounded-[32px] p-5 sm:p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-2 right-2 w-48 h-48 opacity-30 pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-full h-full stroke-white fill-none" strokeWidth="1.8">
              <polygon points="100,10 190,65 100,120 10,65" stroke="#CCFF00" strokeWidth="2" />
              <polygon points="100,45 155,77 100,110 45,77" stroke="white" strokeWidth="1.2" />
              <line x1="100" y1="10" x2="100" y2="120" stroke="white" strokeWidth="1.5" />
              <line x1="55" y1="38" x2="145" y2="92" stroke="#CCFF00" strokeWidth="1.5" />
              <line x1="90" y1="58" x2="110" y2="70" stroke="white" strokeWidth="3" />
              <line x1="10" y1="65" x2="10" y2="85" stroke="#CCFF00" strokeWidth="2" />
              <line x1="190" y1="65" x2="190" y2="85" stroke="#CCFF00" strokeWidth="2" />
            </svg>
          </div>

          <div className="relative z-10 space-y-5">
            <div>
              <h2 className="text-4xl sm:text-[46px] font-black italic tracking-tight font-display-sport leading-[0.95]">
                BOOK A <br />
                <span className="text-[#CCFF00]">COURT.</span>
              </h2>
              <p className="text-xs text-white/90 mt-2 font-medium leading-relaxed">
                Play. Train. Compete. <br />
                at Apex Sports Club.
              </p>
            </div>

            {/* Inner White Booking Card */}
            <div className="bg-white rounded-[24px] p-5 text-slate-900 shadow-lg space-y-4 border border-[#E8E2D5]">
              <h3 className="text-[13px] font-black italic uppercase text-slate-950 font-display-sport tracking-wider">
                SELECT YOUR BOOKINGS
              </h3>

              {/* Sport Selection Pills */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>Sport</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {sportsList.map((sport) => {
                    const isSelected = selectedSidebarSport === sport.name;
                    return (
                      <button
                        key={sport.name}
                        type="button"
                        onClick={() => {
                          setSelectedSidebarSport(sport.name);
                          setSelectedFilterCategory(sport.name);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#CCFF00] text-slate-950 shadow-sm border border-[#bbf000]'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs">{sport.icon}</span>
                        <span>{sport.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>Date</span>
                </label>
                <div className="relative">
                  <select
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-emerald-600 cursor-pointer pr-8"
                  >
                    {upcomingDates.map((d) => (
                      <option key={d.iso} value={d.iso}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Time Slot Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Time Slot (1 Hour Session)</span>
                </label>
                <div className="relative">
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-emerald-600 cursor-pointer pr-8"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot.time} value={slot.time}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Location Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  <span>Location</span>
                </label>
                <div className="relative">
                  <select
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-emerald-600 cursor-pointer pr-8"
                  >
                    <option value="Apex Sports Club, Bangalore">Apex Sports Club, Bangalore</option>
                    <option value="Apex Arena West, Bangalore">Apex Arena West, Bangalore</option>
                    <option value="Apex Stadium Center, Bangalore">Apex Stadium Center, Bangalore</option>
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* SEARCH COURTS Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFilterCategory(selectedSidebarSport);
                }}
                className="w-full py-3.5 rounded-full bg-[#CCFF00] hover:bg-[#bbf000] text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition shadow-md shadow-[#CCFF00]/25 cursor-pointer uppercase tracking-wider"
              >
                <Search className="h-4 w-4" />
                <span>SEARCH COURTS</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= RIGHT MAIN AREA ================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Hero Banner with Slanted Court Photo */}
          <div className="relative rounded-[32px] overflow-hidden bg-[#FAF8F5] border border-[#E8E2D5] min-h-[175px] sm:min-h-[195px] flex items-center p-6 sm:p-8 shadow-sm">
            <div
              className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-5/12 bg-cover bg-center"
              style={{
                clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)',
                backgroundImage: `url('https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80')`,
              }}
            />

            <div className="relative z-10 max-w-sm sm:max-w-md space-y-1">
              <span className="text-[12px] font-black uppercase tracking-[0.15em] text-[#083222]">
                COURT BOOKING
              </span>
              <h1 className="text-4xl sm:text-5xl font-black italic tracking-tight font-display-sport leading-none">
                <span className="text-[#083222]">FIND. BOOK. </span>
                <span className="text-[#8EB800]">PLAY.</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium pt-1 leading-relaxed">
                Reserve your favourite court and get ready for the game. Real-time PostgreSQL booking & instant email invoice.
              </p>
            </div>
          </div>

          {/* Sport Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {filterTabs.map((tab) => {
              const isActive = selectedFilterCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFilterCategory(tab.id)}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#CCFF00] text-slate-950 shadow-sm border border-[#bbf000] font-black'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {tab.icon && <span>{tab.icon}</span>}
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* Section Header: AVAILABLE COURTS + Sort Dropdown */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black italic uppercase text-slate-950 font-display-sport tracking-tight">
              AVAILABLE COURTS ({filteredCourts.length})
            </h2>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="Popular">Popular</option>
                <option value="PriceLow">Price: Low to High</option>
                <option value="PriceHigh">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Grid of Detailed Court Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {filteredCourts.map((court) => (
              <div
                key={court.id}
                className="bg-white rounded-[24px] p-3.5 sm:p-4 border border-[#E8E2D5] shadow-sm hover:shadow-md transition flex flex-col sm:flex-row gap-3.5 sm:gap-4 items-stretch group"
              >
                {/* Court Photo on Left */}
                <div className="relative w-full sm:w-[48%] h-44 sm:h-auto min-h-[148px] rounded-[18px] overflow-hidden bg-slate-100 shrink-0">
                  <img
                    src={court.image}
                    alt={court.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>

                {/* Court Info on Right */}
                <div className="w-full sm:w-[52%] flex flex-col justify-between py-0.5 space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="text-base sm:text-[17px] font-bold text-slate-950 leading-tight">
                        {court.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-[#E5F9D8] text-[#15803D] text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        <span>Available</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-normal">
                      {court.type} • {court.surface}
                    </p>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Up to {court.capacity} players</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-700 font-semibold">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                      <span>{court.rating} ({court.reviewsCount})</span>
                    </div>
                  </div>

                  {/* Price & Book Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                    <div>
                      <span className="text-xl sm:text-2xl font-black text-slate-950">
                        {court.hourlyRateDisplay}
                      </span>
                      <span className="text-xs text-slate-500 font-medium"> / hr</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBookNow(court)}
                      className="px-4 py-2 rounded-full bg-[#CCFF00] hover:bg-[#bbf000] text-slate-950 text-[11px] font-black flex items-center gap-1 transition shadow-sm cursor-pointer uppercase tracking-wider"
                    >
                      <span>BOOK NOW</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Section: WHY BOOK WITH APEX? */}
          <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-[#E8E2D5] shadow-sm flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center shrink-0">
              <span className="w-1.5 h-8 bg-[#CCFF00] rounded-full mr-3.5"></span>
              <h3 className="text-lg sm:text-xl font-black italic uppercase text-slate-950 font-display-sport tracking-tight leading-tight">
                WHY BOOK <br />
                WITH APEX?
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 flex-1 w-full">
              <div className="space-y-0.5">
                <Trophy className="h-6 w-6 text-[#8EB800] mb-1.5" />
                <h4 className="text-xs font-bold text-slate-950">Premium Courts</h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  World-class playing surfaces
                </p>
              </div>

              <div className="space-y-0.5">
                <Zap className="h-6 w-6 text-[#8EB800] mb-1.5" />
                <h4 className="text-xs font-bold text-slate-950">Instant Booking</h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Real-time PostgreSQL slots
                </p>
              </div>

              <div className="space-y-0.5">
                <ShieldCheck className="h-6 w-6 text-[#8EB800] mb-1.5" />
                <h4 className="text-xs font-bold text-slate-950">Safe & Secure</h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  PDF invoice sent to your email
                </p>
              </div>

              <div className="space-y-0.5">
                <UserCheck className="h-6 w-6 text-[#8EB800] mb-1.5" />
                <h4 className="text-xs font-bold text-slate-950">For Everyone</h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Play, train or host tournaments
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      {activeBookingCourt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl relative animate-scaleUp">
            <button
              type="button"
              onClick={() => {
                setActiveBookingCourt(null);
                setBookingConfirmed(false);
                setBookingError(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {bookingConfirmed ? (
              <div className="py-6 text-center space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-[#CCFF00]/25 flex items-center justify-center text-emerald-800">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-950 font-display-sport">
                    BOOKING CONFIRMED!
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Slot for <span className="font-bold">{activeBookingCourt.name}</span> on{' '}
                    <span className="font-bold">{selectedDateLabel}</span> ({selectedSlotLabel}) has been reserved.
                  </p>
                </div>

                {confirmedBookingDetails && (
                  <div className="bg-[#FAF8F5] border border-emerald-200 rounded-2xl p-4 text-xs text-slate-800 space-y-1.5 text-left">
                    <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Saved to PostgreSQL in Real-Time</span>
                    </p>
                    <p className="text-slate-600">
                      Booking Ref: <span className="font-mono font-bold text-slate-900">{confirmedBookingDetails.id.slice(0, 8).toUpperCase()}</span>
                    </p>
                    {confirmedBookingDetails.invoiceNumber && (
                      <p className="text-slate-600">
                        Invoice ID: <span className="font-mono font-bold text-slate-900">{confirmedBookingDetails.invoiceNumber}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                      ✓ Official PDF invoice dispatched to your registered email address!
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveBookingCourt(null);
                    setBookingConfirmed(false);
                  }}
                  className="w-full py-3 rounded-full bg-[#CCFF00] hover:bg-[#bbf000] text-slate-950 text-xs font-black transition cursor-pointer uppercase tracking-wider"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3.5">
                  <img
                    src={activeBookingCourt.image}
                    alt={activeBookingCourt.name}
                    className="h-14 w-16 rounded-2xl object-cover shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-950">{activeBookingCourt.name}</h3>
                    <p className="text-xs text-slate-500">{activeBookingCourt.type} • {locationName}</p>
                  </div>
                </div>

                {/* Error Banner */}
                {bookingError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span className="font-bold text-slate-900">{selectedDateLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time Slot:</span>
                    <span className="font-bold text-slate-900">{selectedSlotLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rate:</span>
                    <span className="font-bold text-slate-900">{activeBookingCourt.hourlyRateDisplay} / hr</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-sm text-slate-950">
                    <span>Total Payable:</span>
                    <span className="text-emerald-700 font-black">{activeBookingCourt.hourlyRateDisplay}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isBookingSubmitting}
                    onClick={() => setActiveBookingCourt(null)}
                    className="flex-1 py-2.5 rounded-full border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isBookingSubmitting}
                    onClick={confirmReservation}
                    className="flex-1 py-2.5 rounded-full bg-[#CCFF00] hover:bg-[#bbf000] disabled:bg-slate-200 disabled:text-slate-500 text-slate-950 text-xs font-black transition shadow-md shadow-[#CCFF00]/25 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    {isBookingSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-950" />
                        <span>Reserving...</span>
                      </>
                    ) : (
                      <span>Confirm Booking</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};