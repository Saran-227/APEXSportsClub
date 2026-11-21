import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Search,
  MapPin,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  CheckCircle2,
} from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '../../hooks/useAuth';

interface TopNavbarProps {
  onToggleSidebar: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#25292D] bg-[#171A1D]/90 px-4 sm:px-6 backdrop-blur-md text-white">
      {/* Left section: Mobile menu & breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          type="button"
          aria-label="Toggle navigation menu"
          className="rounded-lg p-2 text-slate-400 hover:bg-[#25292D] hover:text-white lg:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
      </div>

      {/* Center/Right section */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Facility Location Badge */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full bg-[#101316] px-3.5 py-1 text-xs font-semibold text-slate-300 border border-[#25292D]">
          <MapPin className="h-3.5 w-3.5 text-[#C7FF36]" />
          <span>ApexSportsClub - Olympic Main Arena</span>
        </div>

        {/* Quick search button */}
        <div className="hidden lg:flex items-center relative">
          <Search className="absolute left-3 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            readOnly
            placeholder="Quick search (Cmd+K)"
            className="w-48 rounded-lg bg-[#101316] border border-[#25292D] pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#C7FF36] cursor-pointer"
          />
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            type="button"
            aria-label="View notifications"
            className="relative rounded-lg p-2 text-slate-400 hover:bg-[#25292D] hover:text-white cursor-pointer transition"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C7FF36] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C7FF36]" />
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[#25292D] bg-[#171A1D] p-4 shadow-2xl z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#25292D]">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Operational Alerts
                </span>
                <span className="rounded bg-[#C7FF36]/20 text-[#C7FF36] text-[10px] px-1.5 py-0.5 font-bold border border-[#C7FF36]/30">
                  Real-time
                </span>
              </div>
              <div className="mt-3 space-y-2.5 text-xs">
                <div className="rounded-lg bg-[#101316] p-2.5 border border-[#25292D]">
                  <p className="font-semibold text-white">Padel Court 1 Reserved</p>
                  <p className="text-[11px] text-slate-400">Evening slot 18:00 confirmed by Member</p>
                </div>
                <div className="rounded-lg bg-[#101316] p-2.5 border border-[#25292D]">
                  <p className="font-semibold text-white">Kitchen Order Active</p>
                  <p className="text-[11px] text-slate-400">Order #ORD-CAF-8801 in PREPARING status</p>
                </div>
                <div className="rounded-lg bg-[#101316] p-2.5 border border-[#25292D]">
                  <p className="font-semibold text-white">Database Status</p>
                  <p className="text-[11px] text-[#C7FF36]">PostgreSQL Engine Operational</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Area */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            type="button"
            className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-[#25292D] cursor-pointer transition text-left"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C7FF36] text-slate-950 font-bold text-xs shadow">
              {user ? user.fullName.slice(0, 2).toUpperCase() : 'AP'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-white">
                {user ? user.fullName : 'Vikram Malhotra'}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#C7FF36] font-bold">
                  {user ? user.role : 'ADMIN'}
                </span>
                <ShieldCheck className="h-3 w-3 text-[#C7FF36]" />
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#25292D] bg-[#171A1D] p-2 shadow-2xl z-50">
              <div className="px-3 py-2 border-b border-[#25292D] mb-1">
                <p className="text-xs font-bold text-white">
                  {user ? user.fullName : 'Vikram Malhotra'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user ? user.email : 'admin@apexsports.com'}
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-[#25292D] cursor-pointer">
                  <UserIcon className="h-4 w-4 text-slate-400" />
                  <span>Admin Profile</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-[#25292D] cursor-pointer">
                  <CheckCircle2 className="h-4 w-4 text-[#C7FF36]" />
                  <span>PostgreSQL Active</span>
                </div>
              </div>

              <div className="mt-1 pt-1 border-t border-[#25292D]">
                <button
                  onClick={handleLogout}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer transition font-medium"
                >
                  <LogOut className="h-4 w-4 text-red-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
