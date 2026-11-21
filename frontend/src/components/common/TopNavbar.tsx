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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      {/* Left section: Mobile menu & breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          type="button"
          aria-label="Toggle navigation menu"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden cursor-pointer"
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
        <div className="hidden md:flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200/70">
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          <span>Champions Club - Main Arena</span>
        </div>

        {/* Search quick button */}
        <div className="hidden lg:flex items-center relative">
          <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            readOnly
            placeholder="Quick search (Cmd+K)"
            className="w-48 rounded-lg bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            onClick={() => alert('Global search will index members, bookings and products once connected to FastAPI.')}
          />
        </div>

        {/* Notifications Dropdown Placeholder */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            type="button"
            aria-label="View notifications"
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Club Notifications
                </span>
                <span className="rounded bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 font-semibold">
                  3 New
                </span>
              </div>
              <div className="mt-3 space-y-2.5 text-xs">
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <p className="font-semibold text-slate-800">Court 2 Booked</p>
                  <p className="text-[11px] text-slate-500">Member #CC-1021 reserved Tennis Clay 14:00</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <p className="font-semibold text-slate-800">Pro Shop Low Stock Alert</p>
                  <p className="text-[11px] text-slate-500">Wilson Tour Balls below reorder threshold (2 cans)</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <p className="font-semibold text-slate-800">New Prospect Enquiry</p>
                  <p className="text-[11px] text-slate-500">Sarah Jenkins requested a court tour</p>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-center">
                <span className="text-[11px] text-emerald-600 font-medium cursor-pointer hover:underline">
                  View all operational alerts
                </span>
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
            className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-100 cursor-pointer transition text-left"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-semibold text-xs border border-slate-700">
              {user ? user.fullName.slice(0, 2).toUpperCase() : 'CC'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-800">
                {user ? user.fullName : 'Club Personnel'}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500 font-medium">
                  {user ? user.role : 'ADMIN'}
                </span>
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900">
                  {user ? user.fullName : 'Club Administrator'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {user ? user.email : 'admin@championsclub.com'}
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <UserIcon className="h-4 w-4 text-slate-400" />
                  <span>Profile Settings</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>API Status (Phase 1)</span>
                </div>
              </div>

              <div className="mt-1 pt-1 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer transition font-medium"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
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
