import React from 'react';
import { Calendar, MapPin, Trophy, ArrowRight } from 'lucide-react';

export const CustomerTournamentsPage: React.FC = () => {
  const tournaments = [
    {
      title: 'Apex Open Tennis Tournament 2026',
      sport: 'Tennis',
      date: '18 – 20 Dec 2026',
      venue: 'Center Court Arena, Bangalore',
      prize: '₹1,50,000 Prize Pool',
      entry: '₹1,500',
      participants: '32 Singles / 16 Doubles',
      badge: 'Open for Registration',
      image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bangalore Padel Premier Cup',
      sport: 'Padel',
      date: '08 – 10 Jan 2027',
      venue: 'Panorama Padel Courts, Apex Club',
      prize: '₹1,00,000 Prize Pool',
      entry: '₹1,200',
      participants: '24 Teams',
      badge: 'Fast Filling',
      image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Apex Monsoon Badminton Masters',
      sport: 'Badminton',
      date: '24 – 25 Jan 2027',
      venue: 'Teak Indoor Hall, Apex Club',
      prize: '₹75,000 Prize Pool',
      entry: '₹800',
      participants: '48 Players',
      badge: 'Upcoming',
      image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12">
      <div className="rounded-3xl p-6 sm:p-8 bg-[#0A3022] text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-[#CCFF00]">
            CLUB CHAMPIONSHIPS
          </span>
          <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight font-sport mt-1">
            TOURNAMENTS & <span className="text-[#CCFF00]">COMPETITIONS</span>
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 max-w-lg">
            Compete against top athletes, earn Apex Ranking points, and bring glory to your club.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {tournaments.map((t) => (
          <div key={t.title} className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8E2D5] shadow-sm hover:shadow-md transition flex flex-col md:flex-row items-center gap-6">
            <div className="h-44 md:h-36 w-full md:w-56 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
              <img src={t.image} alt={t.title} className="h-full w-full object-cover" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#CCFF00]/20 text-[#678800] text-[10px] font-black uppercase">
                  {t.sport}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {t.badge}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-950">{t.title}</h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {t.date}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {t.venue}
                </span>
                <span className="flex items-center gap-1 font-bold text-amber-600">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  {t.prize}
                </span>
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2 w-full md:w-auto">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Entry Fee</span>
                <p className="text-base font-black text-slate-950">{t.entry}</p>
              </div>
              <button className="w-full md:w-auto px-5 py-2.5 rounded-full bg-[#CCFF00] hover:bg-[#bbf000] text-slate-950 text-xs font-black transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5">
                <span>Register Team</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
