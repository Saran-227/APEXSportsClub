import React from 'react';
import { Outlet } from 'react-router-dom';
import { Activity, ShieldCheck, Dumbbell, Trophy } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-900 text-white selection:bg-emerald-500 selection:text-white">
      {/* Left visual column on large screens */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-gradient-to-br from-[#070d1e] via-[#0b132b] to-[#1c2a4a] border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-950/60">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-white text-xl">Champions Club</span>
            <span className="ml-1.5 rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
              SCMS
            </span>
            <p className="text-xs text-slate-400">Sports Club Management Platform</p>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-4 w-4" />
            <span>Enterprise Security • Phase 1</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Unified operations for Champions Sports Club.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Manage tennis court and cricket ground reservations, pro shop sales, cafeteria tabs, membership tiers (Gold, Silver, Junior), and staff rosters in a unified system.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Trophy className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Tennis & Cricket Bookings</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Dumbbell className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Inventory & Point-of-Sale</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Champions Club SCMS v1.0.0 &copy; 2026. Architecture by Saran & Asim.
        </div>
      </div>

      {/* Right / Centered Form Container */}
      <div className="flex flex-1 flex-col justify-center items-center p-6 sm:p-12 bg-slate-900/95">
        <div className="w-full max-w-md">
          {/* Mobile brand header */}
          <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-extrabold tracking-tight text-white text-xl">Champions Club</span>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
};
