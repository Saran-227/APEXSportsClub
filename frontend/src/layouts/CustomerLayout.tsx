import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  ShoppingCart,
  ChevronDown,
  LogOut,
  Search,
  Menu,
  X,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const CustomerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDark = location.pathname === '/customer/dashboard';
  const showSearch =
    location.pathname.includes('shop') ||
    location.pathname.includes('book-court') ||
    location.pathname.includes('courts') ||
    location.pathname.includes('events');

  const searchPlaceholder = location.pathname.includes('shop')
    ? 'Search for gear, apparel...'
    : location.pathname.includes('events')
    ? 'Search events, mixers, games...'
    : 'Search courts, sports or location...';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Nav links: Coaching is removed, Tournaments is renamed to Events
  const navLinks = [
    { name: 'Home', to: '/customer/dashboard' },
    { name: 'Courts', to: '/customer/book-court' },
    { name: 'Events', to: '/customer/events' },
    { name: 'Membership', to: '/customer/membership' },
    { name: 'Shop', to: '/customer/shop' },
  ];

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ? user.lastName[0] + '.' : 'S.'}`
    : 'Saranjeet S.';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-[#0B0E14] text-slate-100' : 'bg-[#FAF8F5] text-[#111827]'
      }`}
    >
      {/* Top Navbar: Rock-solid 3-section fixed grid so center nav NEVER shifts */}
      <header
        className={`sticky top-0 z-50 px-4 sm:px-8 border-b transition-colors duration-200 ${
          isDark
            ? 'bg-[#0B0E14]/95 backdrop-blur-md border-[#1E242E]'
            : 'bg-[#FAF8F5]/95 backdrop-blur-md border-[#E8E2D5]'
        }`}
      >
        <div className="max-w-[1440px] mx-auto grid grid-cols-12 h-16 items-center">
          {/* Left Column: Brand Logo (Col 1-3) */}
          <div className="col-span-4 md:col-span-3 flex items-center">
            <NavLink to="/customer/dashboard" className="flex items-center gap-2.5 shrink-0">
              {/* 8 Dots Grid: 2 rows of 4 dots */}
              <div className="grid grid-cols-4 gap-1 w-6 h-3.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"></span>
              </div>
              <div className="flex flex-col leading-none">
                <span
                  className={`text-[13px] font-black tracking-[0.18em] ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}
                >
                  APEX
                </span>
                <span
                  className={`text-[11px] font-extrabold tracking-[0.18em] ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}
                >
                  SPORTS CLUB
                </span>
              </div>
            </NavLink>
          </div>

          {/* Center Column: Navigation Links (Col 4-9: Dead-Center Pinned, Never Shifts!) */}
          <nav className="hidden md:flex col-span-6 justify-center items-center gap-7 lg:gap-9">
            {navLinks.map((item) => {
              const isActive =
                item.to === '/customer/dashboard'
                  ? location.pathname === '/customer/dashboard'
                  : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  className={`relative py-1.5 text-xs sm:text-[13px] font-semibold tracking-wide transition ${
                    isActive
                      ? isDark
                        ? 'text-white font-bold'
                        : 'text-slate-950 font-bold'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-[2.5px] rounded-full bg-[#CCFF00]" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Column: Search + Cart + Bell + Profile (Col 10-12) */}
          <div className="col-span-8 md:col-span-3 flex items-center justify-end gap-2.5 sm:gap-3.5 shrink-0">
            {/* Search Pill */}
            {showSearch ? (
              <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFEAE0] border border-[#E2DAD0] text-xs w-60 text-slate-700">
                <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  className="bg-transparent border-none outline-none text-xs w-full placeholder:text-slate-500 text-slate-900"
                />
              </div>
            ) : null}

            {/* Shopping Cart */}
            <NavLink
              to="/customer/shop"
              className={`relative p-2 rounded-full transition cursor-pointer ${
                isDark ? 'text-slate-300 hover:bg-[#1E242E]' : 'text-slate-800 hover:bg-slate-200/50'
              }`}
              title="Cart"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#CCFF00] text-[10px] font-black text-slate-950">
                3
              </span>
            </NavLink>

            {/* Bell */}
            <button
              type="button"
              className={`relative p-2 rounded-full transition cursor-pointer ${
                isDark ? 'text-slate-300 hover:bg-[#1E242E]' : 'text-slate-700 hover:bg-slate-200/50'
              }`}
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#CCFF00]"></span>
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-full transition cursor-pointer ${
                  isDark ? 'hover:bg-[#1E242E]' : 'hover:bg-slate-200/50'
                }`}
              >
                <div className="h-7 w-7 rounded-full overflow-hidden border border-[#CCFF00]/60 bg-emerald-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                    alt="User"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span>S</span>
                </div>
                <span
                  className={`text-xs font-semibold hidden sm:inline-block ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {displayName}
                </span>
                <ChevronDown
                  className={`h-3 w-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div
                  className={`absolute right-0 mt-2 w-52 rounded-2xl shadow-2xl border p-2 z-50 ${
                    isDark
                      ? 'bg-[#14181F] border-[#252D3A] text-slate-200'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="px-3 py-2 border-b border-slate-700/20 mb-1">
                    <p className="text-xs font-bold">{displayName}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {user?.email || 'saranjeet@apexclub.com'}
                    </p>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#CCFF00]/15 text-[#88B000] text-[10px] font-bold">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Premium Active Member</span>
                    </div>
                  </div>
                  <NavLink
                    to="/customer/membership"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-[#CCFF00]/10 hover:text-[#88B000] transition"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>My Membership</span>
                  </NavLink>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {mobileMenuOpen && (
          <div
            className={`md:hidden py-4 border-t ${
              isDark ? 'border-[#1E242E]' : 'border-[#E8E2D5]'
            }`}
          >
            <nav className="flex flex-col gap-2">
              {navLinks.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg ${
                    location.pathname.startsWith(item.to)
                      ? 'bg-[#CCFF00] text-slate-950 font-bold'
                      : isDark
                      ? 'text-slate-300 hover:bg-[#1E242E]'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main
        className={`flex-1 w-full ${
          isDark ? 'max-w-none p-0' : 'max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
};
