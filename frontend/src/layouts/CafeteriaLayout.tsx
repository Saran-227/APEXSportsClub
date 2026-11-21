import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  ChefHat,
  Flame,
  TrendingUp,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const CafeteriaLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Live Kitchen Orders', to: '/cafeteria/dashboard', icon: Flame },
    { name: 'Menu & Ingredients', to: '/cafeteria/menu', icon: UtensilsCrossed },
    { name: 'Sales & Revenue', to: '/cafeteria/sales', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#101316] text-slate-100 font-sans flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#171A1D]/90 backdrop-blur-md border-b border-[#25292D] px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink to="/cafeteria/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-950/40">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tracking-tight text-white text-base">Apex</span>
                  <span className="text-emerald-400 font-bold text-base">Fuel & Lounge</span>
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    KITCHEN
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Cafeteria & Live Orders Portal</p>
              </div>
            </NavLink>

            <nav className="hidden lg:flex items-center gap-1 ml-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-[#25292D]'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-white">{user?.fullName || user?.email}</span>
              <span className="text-[10px] font-medium text-emerald-400">Cafeteria Partner</span>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25292D] border border-slate-700 text-slate-300">
              <User className="h-4 w-4" />
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-[#25292D] space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-[#25292D]'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};
