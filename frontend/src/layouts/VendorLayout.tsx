import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Store,
  Boxes,
  ClipboardList,
  PackageCheck,
  TrendingUp,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const VendorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Vendor Dashboard', to: '/vendor/dashboard', icon: TrendingUp },
    { name: 'Products & Inventory', to: '/vendor/products', icon: Boxes },
    { name: 'Shop Orders', to: '/vendor/orders', icon: ClipboardList },
    { name: 'Equipment Rentals', to: '/vendor/rentals', icon: PackageCheck },
  ];

  return (
    <div className="min-h-screen bg-[#101316] text-slate-100 font-sans flex flex-col">
      {/* Top Header: Transparent all the time */}
      <header className="sticky top-0 z-50 bg-transparent backdrop-blur-md border-b border-white/5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink to="/vendor/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black shadow-lg shadow-amber-950/40">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tracking-tight text-white text-base">Apex</span>
                  <span className="text-amber-400 font-bold text-base">ProShop</span>
                  <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                    VENDOR
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Sports Shop Operations Portal</p>
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
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
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
              <span className="text-[10px] font-medium text-amber-400">Registered Vendor</span>
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
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
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
