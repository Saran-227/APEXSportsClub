import React, { useState } from 'react';
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
} from 'lucide-react';
import { MOCK_COURTS, type MockCourt } from '../../data/mockSportsData';

export const CustomerBookingPage: React.FC = () => {
  const [selectedSidebarSport, setSelectedSidebarSport] = useState<string>('Tennis');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('ALL');
  const [searchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('Popular');

  const [bookingDate, setBookingDate] = useState<string>('Mon, 17 Nov 2026');
  const [timeSlot, setTimeSlot] = useState<string>('6:00 PM – 7:00 PM');
  const [locationName, setLocationName] = useState<string>('Apex Sports Club, Bangalore');

  // Booking modal state
  const [activeBookingCourt, setActiveBookingCourt] = useState<MockCourt | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState<boolean>(false);

  // Exact 4 courts from the uploaded screenshot
  const displayCourts = [
    {
      id: 'court-1',
      name: 'Court 1 (Tennis)',
      sport: 'Tennis',
      type: 'Premium Hard Court',
      surface: 'Outdoor',
      capacity: 4,
      rating: 4.9,
      reviewsCount: 124,
      hourlyRateDisplay: '₹15.00',
      hourlyRateNum: 15,
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
      hourlyRateDisplay: '₹20.00',
      hourlyRateNum: 20,
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
      hourlyRateDisplay: '₹25.00',
      hourlyRateNum: 25,
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
      hourlyRateDisplay: '₹18.00',
      hourlyRateNum: 18,
      isAvailable: true,
      image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
    },
    // Additional courts when user selects other sports or views all
    ...MOCK_COURTS.slice(4).map((c) => ({
      ...c,
      hourlyRateDisplay: `₹${(c.hourlyRate / 100).toFixed(2)}`,
      hourlyRateNum: c.hourlyRate / 100,
    })),
  ];

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

  // Filtered court cards
  const filteredCourts = displayCourts.filter((court) => {
    const matchesFilter =
      selectedFilterCategory === 'ALL' ||
      court.sport.toLowerCase() === selectedFilterCategory.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      court.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
      court.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleBookNow = (court: any) => {
    setActiveBookingCourt(court);
    setBookingConfirmed(false);
  };

  const confirmReservation = () => {
    setBookingConfirmed(true);
    setTimeout(() => {
      setActiveBookingCourt(null);
      setBookingConfirmed(false);
    }, 2200);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7 items-start">
        {/* ================= LEFT SIDEBAR ================= */}
        <div className="lg:col-span-4 bg-[#083222] rounded-[32px] p-5 sm:p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          {/* Isometric Tennis Court Outline Graphics on top right */}
          <div className="absolute top-2 right-2 w-48 h-48 opacity-30 pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-full h-full stroke-white fill-none" strokeWidth="1.8">
              {/* Axonometric / Isometric court boundary */}
              <polygon points="100,10 190,65 100,120 10,65" stroke="#CCFF00" strokeWidth="2" />
              <polygon points="100,45 155,77 100,110 45,77" stroke="white" strokeWidth="1.2" />
              <line x1="100" y1="10" x2="100" y2="120" stroke="white" strokeWidth="1.5" />
              <line x1="55" y1="38" x2="145" y2="92" stroke="#CCFF00" strokeWidth="1.5" />
              {/* Net posts & mesh */}
              <line x1="90" y1="58" x2="110" y2="70" stroke="white" strokeWidth="3" />
              <line x1="10" y1="65" x2="10" y2="85" stroke="#CCFF00" strokeWidth="2" />
              <line x1="190" y1="65" x2="190" y2="85" stroke="#CCFF00" strokeWidth="2" />
              <polygon points="100,30 190,85 100,140 10,85" stroke="white" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            </svg>
          </div>

          <div className="relative z-10 space-y-5">
            {/* Header */}
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
                    <option value="Mon, 17 Nov 2026">Mon, 17 Nov 2026</option>
                    <option value="Tue, 18 Nov 2026">Tue, 18 Nov 2026</option>
                    <option value="Wed, 19 Nov 2026">Wed, 19 Nov 2026</option>
                    <option value="Thu, 20 Nov 2026">Thu, 20 Nov 2026</option>
                    <option value="Fri, 21 Nov 2026">Fri, 21 Nov 2026</option>
                    <option value="Sat, 22 Nov 2026">Sat, 22 Nov 2026</option>
                    <option value="Sun, 23 Nov 2026">Sun, 23 Nov 2026</option>
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Time Slot Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Time Slot</span>
                </label>
                <div className="relative">
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-emerald-600 cursor-pointer pr-8"
                  >
                    <option value="6:00 AM – 7:00 AM">6:00 AM – 7:00 AM</option>
                    <option value="7:00 AM – 8:00 AM">7:00 AM – 8:00 AM</option>
                    <option value="5:00 PM – 6:00 PM">5:00 PM – 6:00 PM</option>
                    <option value="6:00 PM – 7:00 PM">6:00 PM – 7:00 PM</option>
                    <option value="7:00 PM – 8:00 PM">7:00 PM – 8:00 PM</option>
                    <option value="8:00 PM – 9:00 PM">8:00 PM – 9:00 PM</option>
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
            {/* Right Slanted Realistic Floodlit Court Photo */}
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
                Reserve your favourite court and get ready for the game.
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
              AVAILABLE COURTS
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
                <option value="Rating">Rating</option>
              </select>
            </div>
          </div>

          {/* 2x2 Grid of Detailed Court Cards (Horizontal Split Layout as in Screenshot!) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {filteredCourts.slice(0, 4).map((court) => (
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
                      <span className="text-xs text-slate-500 font-medium"> / hour</span>
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
              {/* Feature 1 */}
              <div className="space-y-0.5">
                <Trophy className="h-6 w-6 text-[#8EB800] mb-1.5" />
                <h4 className="text-xs font-bold text-slate-950">Premium Courts</h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  World-class playing surfaces
                </p>
              </div>

              {/* Feature 2 */}
              <div className="space-y-0.5">
                <Zap className="h-6 w-6 text-[#8EB800] mb-1.5" />
                <h4 className="text-xs font-bold text-slate-950">Instant Booking</h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Check availability & book in seconds
                </p>
              </div>

              {/* Feature 3 */}
              <div className="space-y-0.5">
                <ShieldCheck className="h-6 w-6 text-[#8EB800] mb-1.5" />
                <h4 className="text-xs font-bold text-slate-950">Safe & Secure</h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Verified bookings & payments
                </p>
              </div>

              {/* Feature 4 */}
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
              onClick={() => setActiveBookingCourt(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {bookingConfirmed ? (
              <div className="py-8 text-center space-y-3">
                <div className="h-16 w-16 mx-auto rounded-full bg-[#CCFF00]/25 flex items-center justify-center text-emerald-800">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-950 font-display-sport">
                  BOOKING CONFIRMED!
                </h3>
                <p className="text-xs text-slate-600">
                  Your court slot for <span className="font-bold">{activeBookingCourt.name}</span> on{' '}
                  <span className="font-bold">{bookingDate}</span> ({timeSlot}) has been reserved.
                </p>
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

                <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span className="font-bold text-slate-900">{bookingDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time Slot:</span>
                    <span className="font-bold text-slate-900">{timeSlot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rate:</span>
                    <span className="font-bold text-slate-900">{activeBookingCourt.hourlyRateDisplay || `₹${activeBookingCourt.hourlyRate}`} / hr</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-sm text-slate-950">
                    <span>Total Payable:</span>
                    <span className="text-emerald-700 font-black">{activeBookingCourt.hourlyRateDisplay || `₹${activeBookingCourt.hourlyRate}`}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveBookingCourt(null)}
                    className="flex-1 py-2.5 rounded-full border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmReservation}
                    className="flex-1 py-2.5 rounded-full bg-[#CCFF00] hover:bg-[#bbf000] text-slate-950 text-xs font-black transition shadow-md shadow-[#CCFF00]/25 cursor-pointer uppercase tracking-wider"
                  >
                    Confirm Booking
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
