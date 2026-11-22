import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CLUB_EVENTS_DATA, type ClubEvent } from '../../data/clubEventsData';

const ITEMS_PER_PAGE = 12;

export const CustomerEventsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeModalEvent, setActiveModalEvent] = useState<ClubEvent | null>(null);
  const [registered, setRegistered] = useState<boolean>(false);

  const categories = [
    'ALL',
    'TOURNAMENTS',
    'QUIZ & GAMES',
    'COMMUNITY MIXERS',
    'WORKSHOPS',
  ];

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: CLUB_EVENTS_DATA.length,
      TOURNAMENTS: 0,
      'QUIZ & GAMES': 0,
      'COMMUNITY MIXERS': 0,
      WORKSHOPS: 0,
    };
    CLUB_EVENTS_DATA.forEach((ev) => {
      const cat = ev.category.toUpperCase();
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
    return counts;
  }, []);

  // Filter events based on selected category and search query
  const filteredEvents = useMemo(() => {
    return CLUB_EVENTS_DATA.filter((ev) => {
      const matchesCategory =
        selectedCategory === 'ALL' ||
        (selectedCategory === 'TOURNAMENTS' && ev.category === 'Tournaments') ||
        (selectedCategory === 'QUIZ & GAMES' && ev.category === 'Quiz & Games') ||
        (selectedCategory === 'COMMUNITY MIXERS' && ev.category === 'Community Mixers') ||
        (selectedCategory === 'WORKSHOPS' && ev.category === 'Workshops');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        ev.subtitle.toLowerCase().includes(q) ||
        ev.location.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Reset to page 1 whenever category or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      const el = document.getElementById('events-grid-header');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleRegister = (ev: ClubEvent) => {
    setActiveModalEvent(ev);
    setRegistered(false);
  };

  const confirmRegistration = () => {
    setRegistered(true);
    setTimeout(() => {
      setActiveModalEvent(null);
      setRegistered(false);
    }, 2200);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* Top Hero Banner */}
      <div className="relative rounded-[32px] overflow-hidden bg-[#FAF8F5] border border-[#E8E2D5] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#083222] text-[#CCFF00] text-[11px] font-black tracking-wider uppercase">
            <Sparkles className="h-3 w-3" />
            <span>APEX CLUB EVENTS & FESTIVALS ({CLUB_EVENTS_DATA.length} TOTAL)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black italic tracking-tight font-display-sport leading-none">
            <span className="text-[#083222]">EXPLORE OUR </span>
            <span className="text-[#8EB800]">EVENTS</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium pt-1 leading-relaxed">
            Tournaments, competitive quizzes, community rallies, game nights, and athlete workshops across all facilities.
          </p>
        </div>

        {/* Search Input in Hero */}
        <div className="w-full md:w-80">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 200 events, venues, quizzes..."
              className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#083222] shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills Filter & Results Count */}
      <div id="events-grid-header" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            const count = categoryCounts[cat] ?? 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs transition cursor-pointer ${
                  isActive
                    ? 'bg-[#CCFF00] text-slate-950 shadow-sm border border-[#bbf000] font-black'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 font-bold'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-slate-950 text-[#CCFF00]' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing <span className="text-slate-950 font-bold">{filteredEvents.length}</span> matching events
          {filteredEvents.length > ITEMS_PER_PAGE && (
            <span> • Page {currentPage} of {totalPages}</span>
          )}
        </div>
      </div>

      {/* Grid of Events */}
      {paginatedEvents.length === 0 ? (
        <div className="rounded-3xl bg-white border border-[#E8E2D5] p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-[#FAF8F5] border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-900">No events found matching your criteria</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or selecting a different category filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-full bg-[#CCFF00] text-slate-950 text-xs font-bold shadow-sm"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedEvents.map((ev) => (
            <div
              key={ev.id}
              className="bg-white rounded-[28px] overflow-hidden border border-[#E8E2D5] shadow-sm hover:shadow-lg transition duration-300 flex flex-col justify-between group"
            >
              {/* Poster Image Container */}
              <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-900">
                <img
                  src={ev.image}
                  alt={ev.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500 ease-out"
                />

                {/* Top Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />

                {/* Date Badge Pill (Top-Left) */}
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-md text-slate-950 font-black text-xs font-sport tracking-wider border border-white/40">
                  {ev.dateBadge}
                </div>

                {/* Category / Feature Badge (Top-Right) */}
                <div
                  className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md ${ev.badgeColor}`}
                >
                  {ev.badge}
                </div>

                {/* Title Overlay in Image Footer */}
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#CCFF00]">
                    {ev.category}
                  </span>
                  <h3 className="text-xl font-black italic tracking-tight font-display-sport leading-tight drop-shadow-md">
                    {ev.title}
                  </h3>
                </div>
              </div>

              {/* Event Details Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-800 leading-snug">
                    {ev.subtitle}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {ev.description}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{ev.fullDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{ev.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </div>
                </div>

                {/* Price & Action Button */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Entry</span>
                    <span className="text-base font-black text-slate-950 font-sport">
                      {ev.price}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRegister(ev)}
                    className="px-5 py-2.5 rounded-full bg-[#CCFF00] hover:bg-[#bbf000] text-slate-950 text-xs font-black flex items-center gap-1.5 transition shadow-sm cursor-pointer uppercase tracking-wider"
                  >
                    <span>REGISTER</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <span className="text-xs font-medium text-slate-500">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length} events
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Smart page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .map((p, index, array) => {
                const prev = array[index - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && (
                      <span className="px-1 text-xs text-slate-400 font-mono">...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handlePageChange(p)}
                      className={`h-8 min-w-[32px] px-2 rounded-xl text-xs font-bold transition ${
                        currentPage === p
                          ? 'bg-[#CCFF00] text-slate-950 shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {activeModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl relative animate-scaleUp">
            <button
              type="button"
              onClick={() => setActiveModalEvent(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {registered ? (
              <div className="py-8 text-center space-y-3">
                <div className="h-16 w-16 mx-auto rounded-full bg-[#CCFF00]/25 flex items-center justify-center text-emerald-800">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-950 font-display-sport">
                  PASS RESERVED!
                </h3>
                <p className="text-xs text-slate-600">
                  You are registered for <span className="font-bold">{activeModalEvent.title}</span> on{' '}
                  <span className="font-bold">{activeModalEvent.fullDate}</span>. An entry pass has been added to your profile.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3.5">
                  <img
                    src={activeModalEvent.image}
                    alt={activeModalEvent.title}
                    className="h-16 w-16 rounded-2xl object-cover shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-950 leading-tight">
                      {activeModalEvent.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{activeModalEvent.subtitle}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span className="font-bold text-slate-900">{activeModalEvent.fullDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time:</span>
                    <span className="font-bold text-slate-900">{activeModalEvent.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[200px]">
                      {activeModalEvent.location}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-sm text-slate-950">
                    <span>Registration Fee:</span>
                    <span className="text-emerald-700 font-black">{activeModalEvent.price}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveModalEvent(null)}
                    className="flex-1 py-2.5 rounded-full border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmRegistration}
                    className="flex-1 py-2.5 rounded-full bg-[#CCFF00] hover:bg-[#bbf000] text-slate-950 text-xs font-black transition shadow-md shadow-[#CCFF00]/25 cursor-pointer uppercase tracking-wider"
                  >
                    Confirm Registration
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
