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
  Activity,
  X,
  ChevronRight,
} from 'lucide-react';

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
      { name: 'Members', to: '/members', icon: Users, badge: '1.2k' },
      { name: 'Court Bookings', to: '/bookings', icon: CalendarCheck, badge: 'Today' },
    ],
  },
  {
    label: 'Commerce & Facilities',
    items: [
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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#0b132b] text-slate-300 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-6">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-lg shadow-emerald-950/50">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-white text-base">Champions</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                  SCMS
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Champions Club Management</p>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close sidebar"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                            ? 'bg-emerald-600/15 text-white font-semibold shadow-xs border-l-2 border-emerald-500'
                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3">
                            <Icon
                              className={`h-4 w-4 transition-colors ${
                                isActive
                                  ? 'text-emerald-400'
                                  : 'text-slate-400 group-hover:text-slate-200'
                              }`}
                            />
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isActive
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-800 text-slate-300'
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
        <div className="border-t border-slate-800/80 p-4">
          <div className="flex items-center justify-between rounded-lg bg-slate-900/80 p-3 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-emerald-600/30 flex items-center justify-center font-bold text-xs text-emerald-400 border border-emerald-500/40">
                  SC
                </div>
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#0b132b]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Saran & Asim</p>
                <p className="text-[10px] text-slate-400">Phase 1 Architecture</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </div>
        </div>
      </aside>
    </>
  );
};
