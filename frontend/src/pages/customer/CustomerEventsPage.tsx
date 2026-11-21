import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';

interface ClubEvent {
  id: string;
  title: string;
  subtitle: string;
  category: 'Tournaments' | 'Quiz & Games' | 'Community Mixers' | 'Workshops';
  dateBadge: string;
  fullDate: string;
  time: string;
  location: string;
  price: string;
  badge: string;
  badgeColor: string;
  image: string;
  description: string;
  featured?: boolean;
}

export const CustomerEventsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeModalEvent, setActiveModalEvent] = useState<ClubEvent | null>(null);
  const [registered, setRegistered] = useState<boolean>(false);

  const categories = [
    'ALL',
    'TOURNAMENTS',
    'QUIZ & GAMES',
    'COMMUNITY MIXERS',
    'WORKSHOPS',
  ];

  const clubEvents: ClubEvent[] = [
    {
      id: 'event-1',
      title: 'PLAYVERSE+ 2026',
      subtitle: 'A Universe of Play • The Ultimate Playground',
      category: 'Tournaments',
      dateBadge: '03 OCT',
      fullDate: 'Saturday, October 3, 2026',
      time: '9:00 AM – 9:00 PM',
      location: 'Plot 45 Muri International Layout, Bangalore',
      price: '₹499',
      badge: 'FLAGSHIP EVENT',
      badgeColor: 'bg-amber-400 text-slate-950',
      image: '/assets/events/event-playverse.jpg',
      description:
        'All-day multi-sport festival with immersive interactive arenas, court showcases, live music, and championship matches.',
      featured: true,
    },
    {
      id: 'event-2',
      title: 'GAME BRAIN QUIZ',
      subtitle: 'Sports Trivia & Mind Championship',
      category: 'Quiz & Games',
      dateBadge: '04 OCT',
      fullDate: 'Tuesday, October 4, 2026',
      time: '9:30 PM Onwards',
      location: 'Apex Club Arena Hall & Virtual Hub',
      price: '₹299',
      badge: 'PRIZE POOL ₹50,000',
      badgeColor: 'bg-[#CCFF00] text-slate-950',
      image: '/assets/events/event-gamebrain.jpg',
      description:
        'Exciting sports quiz designed to challenge your knowledge, test your memory, and put your sporting trivia to the ultimate test.',
    },
    {
      id: 'event-3',
      title: 'WINTER IS COMING. RALLY ON.',
      subtitle: 'Keep Playing. Keep Moving. Badminton Masters',
      category: 'Tournaments',
      dateBadge: '10 NOV',
      fullDate: 'Nov 10 – 12, 2026',
      time: '4:00 PM – 9:00 PM',
      location: 'Apex Teak Wooden Badminton Arena',
      price: '₹799',
      badge: 'FAST FILLING',
      badgeColor: 'bg-emerald-400 text-slate-950',
      image: '/assets/events/event-badminton-rally.jpg',
      description:
        'Official indoor seasonal tournament for intermediate and advanced badminton athletes with trophies and ranking points.',
      featured: true,
    },
    {
      id: 'event-4',
      title: 'REBOUND CLUB MIXER',
      subtitle: 'Every Rally Builds Connection • Community Night',
      category: 'Community Mixers',
      dateBadge: '22 NOV',
      fullDate: 'Sunday, November 22, 2026',
      time: '5:00 PM – 8:30 PM',
      location: 'Panorama Padel & Tennis Terraces',
      price: 'Free for Members',
      badge: 'SOCIAL MIXER',
      badgeColor: 'bg-[#CCFF00] text-slate-950',
      image: '/assets/events/event-rebound-club.jpg',
      description:
        'Network, play friendly doubles matches, enjoy post-rally craft juices at the cafeteria lounge, and meet fellow sports club members.',
    },
    {
      id: 'event-5',
      title: 'APEX GAME NIGHT',
      subtitle: 'Board Games • Video Games • Card Battles',
      category: 'Quiz & Games',
      dateBadge: '16 NOV',
      fullDate: 'Saturday, November 16, 2026',
      time: '7:00 PM – Midnight',
      location: 'The Pixel Grove Social Club & Event Hall',
      price: '₹399',
      badge: 'MUSIC & FOOD',
      badgeColor: 'bg-purple-500 text-white',
      image: '/assets/events/event-game-night.jpg',
      description:
        'Late night social with console tournaments (FC 26 & Smash), tabletop strategy games, arcade simulators, craft mocktails, and live DJ.',
    },
    {
      id: 'event-6',
      title: 'BRAND IT: CREATOR WORKSHOP',
      subtitle: 'Social Media & Personal Branding for Athletes',
      category: 'Workshops',
      dateBadge: '05 DEC',
      fullDate: 'Saturday, December 5, 2026',
      time: '2:00 PM – 6:00 PM',
      location: 'Apex Executive Conference Suite',
      price: '₹1,299',
      badge: 'CERTIFIED WORKSHOP',
      badgeColor: 'bg-blue-500 text-white',
      image: '/assets/events/event-brandit.jpg',
      description:
        'Hands-on masterclass on building your athletic sponsorship portfolio, content creation, and sports marketing strategy.',
    },
  ];

  const filteredEvents = clubEvents.filter((ev) => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'TOURNAMENTS' && ev.category === 'Tournaments') return true;
    if (selectedCategory === 'QUIZ & GAMES' && ev.category === 'Quiz & Games') return true;
    if (selectedCategory === 'COMMUNITY MIXERS' && ev.category === 'Community Mixers') return true;
    if (selectedCategory === 'WORKSHOPS' && ev.category === 'Workshops') return true;
    return false;
  });

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
            <span>APEX CLUB EVENTS & FESTIVALS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black italic tracking-tight font-display-sport leading-none">
            <span className="text-[#083222]">EXPLORE OUR </span>
            <span className="text-[#8EB800]">EVENTS</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium pt-1 leading-relaxed">
            Tournaments, competitive quizzes, community rallies, game nights, and athlete workshops.
          </p>
        </div>

        {/* Category Pills Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${isActive
                  ? 'bg-[#CCFF00] text-slate-950 shadow-sm border border-[#bbf000] font-black'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bento Grid: Aligned strictly to the reference layout (image 7) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((ev) => (
          <div
            key={ev.id}
            className="bg-white rounded-[28px] overflow-hidden border border-[#E8E2D5] shadow-sm hover:shadow-lg transition duration-300 flex flex-col justify-between group"
          >
            {/* Poster Image Container */}
            <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-900">
              <img
                src={ev.image}
                alt={ev.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500 ease-out"
              />

              {/* Top Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

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
