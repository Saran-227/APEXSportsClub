import React, { useEffect, useState } from 'react';
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
  Command,
} from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '../../hooks/useAuth';
import { GlobalSearchModal } from './GlobalSearchModal';

interface TopNavbarProps {
  onToggleSidebar: () => void;
  isLightMode?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onToggleSidebar, isLightMode = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Cmd+K / Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b px-4 sm:px-6 backdrop-blur-md transition-colors ${
        isLightMode
          ? 'border-slate-200 bg-white/95 text-slate-800 shadow-2xs'
          : 'border-white/5 bg-transparent text-white'
      }`}
    >
      {/* Left section: Mobile menu & breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          type="button"
          aria-label="Toggle navigation menu"
          className={`rounded-lg p-2 lg:hidden cursor-pointer transition ${
            isLightMode
              ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              : 'text-slate-400 hover:bg-[#25292D] hover:text-white'
          }`}
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
        <div
          className={`hidden md:flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold border ${
            isLightMode
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-[#101316] text-slate-300 border-[#25292D]'
          }`}
        >
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          <span>ApexSportsClub - Olympic Main Arena</span>
        </div>

        {/* Quick search button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
            isLightMode
              ? 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              : 'bg-[#101316] border-[#25292D] text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
          aria-label="Open global search (Cmd+K)"
        >
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden sm:inline">Search APEX...</span>
          <span className="inline sm:hidden">Search</span>
          <kbd
            className={`hidden sm:inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono border ${
              isLightMode
                ? 'bg-white text-slate-500 border-slate-200'
                : 'bg-[#171A1D] text-slate-400 border-[#25292D]'
            }`}
          >
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            type="button"
            aria-label="View notifications"
            className={`relative rounded-lg p-2 cursor-pointer transition ${
              isLightMode
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-[#25292D] hover:text-white'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </button>

          {showNotifications && (
            <div
              className={`absolute right-0 mt-2 w-80 rounded-xl border p-4 shadow-2xl z-50 ${
                isLightMode
                  ? 'border-slate-200 bg-white text-slate-800'
                  : 'border-[#25292D] bg-[#171A1D] text-white'
              }`}
            >
              <div
                className={`flex items-center justify-between pb-2 border-b ${
                  isLightMode ? 'border-slate-200' : 'border-[#25292D]'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Operational Alerts
                </span>
                <span className="rounded bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 font-bold border border-emerald-200">
                  Real-time
                </span>
              </div>
              <div className="mt-3 space-y-2.5 text-xs">
                <div
                  className={`rounded-lg p-2.5 border ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#101316] border-[#25292D]'
                  }`}
                >
                  <p className="font-semibold text-slate-900">Padel Court 1 Reserved</p>
                  <p className="text-[11px] text-slate-500">Evening slot 18:00 confirmed by Member</p>
                </div>
                <div
                  className={`rounded-lg p-2.5 border ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#101316] border-[#25292D]'
                  }`}
                >
                  <p className="font-semibold text-slate-900">Kitchen Order Active</p>
                  <p className="text-[11px] text-slate-500">Order #ORD-CAF-8801 in PREPARING status</p>
                </div>
                <div
                  className={`rounded-lg p-2.5 border ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#101316] border-[#25292D]'
                  }`}
                >
                  <p className="font-semibold text-slate-900">Database Status</p>
                  <p className="text-[11px] text-emerald-600 font-medium">PostgreSQL Engine Operational</p>
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
            className={`flex items-center gap-2.5 rounded-lg p-1.5 cursor-pointer transition text-left ${
              isLightMode ? 'hover:bg-slate-100' : 'hover:bg-[#25292D]'
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
              {user ? (
                user.fullName
                  ? user.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : user.email.slice(0, 2).toUpperCase()
              ) : (
                'AP'
              )}
            </div>
            <div className="hidden sm:block">
              <p
                className={`text-xs font-semibold ${
                  isLightMode ? 'text-slate-900' : 'text-white'
                }`}
              >
                {user ? user.fullName || user.email : 'User'}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-emerald-600 font-bold">
                  {user ? user.role : 'MEMBER'}
                </span>
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div
              className={`absolute right-0 mt-2 w-56 rounded-xl border p-2 shadow-2xl z-50 ${
                isLightMode
                  ? 'border-slate-200 bg-white text-slate-800'
                  : 'border-[#25292D] bg-[#171A1D] text-white'
              }`}
            >
              <div
                className={`px-3 py-2 border-b mb-1 ${
                  isLightMode ? 'border-slate-200' : 'border-[#25292D]'
                }`}
              >
                <p className="text-xs font-bold text-slate-900">
                  {user ? user.fullName || 'User' : 'User'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user ? user.email : ''}
                </p>
              </div>

              <div className="space-y-0.5">
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs cursor-pointer transition ${
                    isLightMode ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-[#25292D]'
                  }`}
                >
                  <UserIcon className="h-4 w-4 text-slate-400" />
                  <span>{user?.role ? `${user.role} Profile` : 'User Profile'}</span>
                </div>
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs cursor-pointer transition ${
                    isLightMode ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-[#25292D]'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Database Connected</span>
                </div>
              </div>

              <div
                className={`mt-1 pt-1 border-t ${
                  isLightMode ? 'border-slate-200' : 'border-[#25292D]'
                }`}
              >
                <button
                  onClick={handleLogout}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer transition font-medium"
                >
                  <LogOut className="h-4 w-4 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </header>
  );
};
