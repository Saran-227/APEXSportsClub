import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Boxes,
  ShoppingBag,
  Coffee,
  DollarSign,
  Briefcase,
  MessageSquareText,
  X,
  Store,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Club Operations',
    items: [
      { name: 'Members & Plans', to: '/members', icon: Users },
      { name: 'Court Bookings', to: '/bookings', icon: CalendarCheck, badge: 'Live' },
    ],
  },
  {
    label: 'Commerce & Facilities',
    items: [
      { name: 'Vendors & Partners', to: '/admin/vendors', icon: Store },
      { name: 'Equipment Inventory', to: '/inventory', icon: Boxes },
      { name: 'Pro Shop (POS)', to: '/shop', icon: ShoppingBag },
      { name: 'Bar & Cafeteria', to: '/cafeteria', icon: Coffee },
    ],
  },
  {
    label: 'Management',
    items: [
      { name: 'Finance & Ledger', to: '/finance', icon: DollarSign },
      { name: 'Staff & HR', to: '/employees', icon: Briefcase },
      { name: 'CRM & Enquiries', to: '/crm', icon: MessageSquareText },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#101316] border-r border-[#25292D] text-slate-300 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with Landing Page Dot-Matrix Logo */}
        <div className="flex h-16 items-center justify-between border-b border-[#25292D] px-6">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black border border-white/10 shadow-lg shadow-[#C6FF00]/10">
              <svg width="22" height="15" viewBox="0 0 22 15" fill="none">
                <circle cx="2.5" cy="2.5" r="2.2" fill="#C6FF00" />
                <circle cx="11" cy="2.5" r="2.2" fill="#C6FF00" />
                <circle cx="19.5" cy="2.5" r="2.2" fill="#C6FF00" />
                <circle cx="2.5" cy="12.5" r="2.2" fill="#C6FF00" />
                <circle cx="11" cy="12.5" r="2.2" fill="#C6FF00" />
                <circle cx="19.5" cy="12.5" r="2.2" fill="#C6FF00" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-wider text-white text-sm">APEX SPORTS</span>
                <span className="rounded bg-[#C6FF00]/15 px-1.5 py-0.2 text-[10px] font-bold text-[#C6FF00] border border-[#C6FF00]/30">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Club Management System</p>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close sidebar"
            className="rounded-lg p-1 text-slate-400 hover:bg-[#25292D] hover:text-white lg:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {group.label}
              </h3>
              <div className="mt-2 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-[#C7FF36]/15 text-white font-semibold border-l-2 border-[#C7FF36]'
                            : 'text-slate-400 hover:bg-[#171A1D] hover:text-slate-100'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3">
                            <Icon
                              className={`h-4 w-4 transition-colors ${
                                isActive
                                  ? 'text-[#C7FF36]'
                                  : 'text-slate-400 group-hover:text-slate-200'
                              }`}
                            />
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isActive
                                  ? 'bg-[#C7FF36] text-slate-950'
                                  : 'bg-[#25292D] text-slate-300'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-[#25292D] p-4 bg-[#171A1D]/60">
          <div className="flex items-center justify-between rounded-lg bg-[#171A1D] p-3 border border-[#25292D]">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-[#C7FF36]/20 flex items-center justify-center font-bold text-xs text-[#C7FF36] border border-[#C7FF36]/40">
                  {user?.firstName?.slice(0, 1) || 'A'}
                </div>
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-[#C7FF36] ring-2 ring-[#101316]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.fullName || user?.email}</p>
                <p className="text-[10px] text-[#C7FF36] font-medium">Club Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
