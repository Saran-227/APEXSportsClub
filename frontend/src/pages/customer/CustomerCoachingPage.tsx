import React from 'react';
import { Star } from 'lucide-react';

export const CustomerCoachingPage: React.FC = () => {
  const coaches = [
    {
      name: 'Alex Mercer',
      sport: 'Tennis Head Coach',
      exp: '12+ Years Experience • ATP Certified',
      rating: 4.9,
      reviews: 84,
      rate: '₹2,500 / session',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Jordan Blake',
      sport: 'Padel Master Trainer',
      exp: '8+ Years • World Padel Tour Coach',
      rating: 4.95,
      reviews: 92,
      rate: '₹2,200 / session',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Max Davis',
      sport: 'Badminton & Fitness Coach',
      exp: '10+ Years • BWF Elite Coach',
      rating: 4.88,
      reviews: 73,
      rate: '₹1,800 / session',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12">
      <div className="rounded-3xl p-6 sm:p-8 bg-[#0A3022] text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-[#CCFF00]">
            APEX COACHING ACADEMY
          </span>
          <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight font-sport mt-1">
            TRAIN WITH THE <span className="text-[#CCFF00]">ELITE</span>
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 max-w-lg">
            Personalized training programs, stroke analysis, and competitive development for members of all ages.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {coaches.map((coach) => (
          <div key={coach.name} className="bg-white rounded-3xl p-5 border border-[#E8E2D5] shadow-sm hover:shadow-md transition space-y-4">
            <div className="h-56 rounded-2xl overflow-hidden bg-slate-100">
              <img src={coach.image} alt={coach.name} className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-950">{coach.name}</h3>
                <span className="flex items-center gap-1 text-xs font-bold text-slate-800">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {coach.rating} ({coach.reviews})
                </span>
              </div>
              <p className="text-xs font-semibold text-emerald-700">{coach.sport}</p>
              <p className="text-[11px] text-slate-500 mt-1">{coach.exp}</p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-sm font-black text-slate-950">{coach.rate}</span>
              <button className="px-4 py-2 rounded-full bg-[#CCFF00] text-slate-950 text-xs font-black hover:bg-[#bbf000] transition cursor-pointer">
                Book Session
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
