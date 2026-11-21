import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Calendar,
  CreditCard,
  ShoppingBag,
  Coffee,
  Sparkles,
  Clock,
  CheckCircle2,
  ArrowRight,
  Shield,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { membersApi, bookingsApi, shopApi, cafeteriaApi } from '../../services/api';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [memberProfile, setMemberProfile] = useState<any>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [mem, bks, sOrders, cOrders] = await Promise.all([
          membersApi.getMyMembership().catch(() => null),
          bookingsApi.getBookings().catch(() => []),
          shopApi.getOrders().catch(() => []),
          cafeteriaApi.getOrders().catch(() => []),
        ]);
        setMemberProfile(mem);
        setUpcomingBookings(bks.slice(0, 3));
        const combined = [
          ...sOrders.map((o: any) => ({ ...o, type: 'Shop' })),
          ...cOrders.map((o: any) => ({ ...o, type: 'Cafe' })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentOrders(combined.slice(0, 3));
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C7FF36] border-t-transparent mb-3" />
        <p className="text-xs">Loading member portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#171A1D] via-[#1D2126] to-[#171A1D] border border-[#25292D] p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C7FF36]/10 border border-[#C7FF36]/30 text-[#C7FF36] text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Official Apex Club Member</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.firstName || 'Athlete'}!
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Ready for your next session? Reserve championship padel courts, order post-workout nutrition, or gear up at the pro shop.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <NavLink
              to="/customer/book-court"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C7FF36] text-slate-950 font-bold text-xs hover:bg-[#b0e600] transition shadow-lg shadow-[#C7FF36]/20 cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              <span>Reserve Court</span>
            </NavLink>
            <NavLink
              to="/customer/cafeteria"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25292D] hover:bg-[#2e343a] text-white font-semibold text-xs transition border border-slate-700 cursor-pointer"
            >
              <Coffee className="h-4 w-4 text-[#C7FF36]" />
              <span>Order Food</span>
            </NavLink>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#C7FF36]/5 blur-3xl pointer-events-none" />
      </div>

      {/* Grid: Membership Card + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Digital Membership Pass */}
        <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#C7FF36] flex items-center justify-center font-black text-slate-950 text-xs">
                AP
              </div>
              <span className="font-bold text-white text-sm tracking-wide">Apex Pass</span>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-[#C7FF36]/20 text-[#C7FF36] border border-[#C7FF36]/30 text-[10px] font-bold">
              {memberProfile?.tier || 'GOLD TIER'}
            </span>
          </div>

          <div className="my-6 space-y-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Membership Number</p>
            <p className="text-xl font-mono font-bold text-white tracking-widest">
              {memberProfile?.membership_number || 'APX-GOLD-1001'}
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5 text-[#C7FF36]" />
              <span>Valid through: {memberProfile?.expiry_date || 'December 2027'}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#25292D] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Status: Active</span>
            </div>
            <NavLink to="/customer/membership" className="text-[#C7FF36] hover:underline font-semibold flex items-center gap-1">
              <span>View Benefits</span>
              <ArrowRight className="h-3 w-3" />
            </NavLink>
          </div>
        </div>

        {/* Benefits Overview */}
        <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#C7FF36]" />
              <span>Your Active Tier Benefits</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Automatic savings applied on your bookings and orders</p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#101316] border border-[#25292D]">
                <span className="text-xs text-slate-300">Court Booking Discount</span>
                <span className="text-xs font-bold text-[#C7FF36]">20% OFF</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#101316] border border-[#25292D]">
                <span className="text-xs text-slate-300">Pro Shop Gear Discount</span>
                <span className="text-xs font-bold text-[#C7FF36]">15% OFF</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#101316] border border-[#25292D]">
                <span className="text-xs text-slate-300">Cafeteria Lounge Discount</span>
                <span className="text-xs font-bold text-[#C7FF36]">10% OFF</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-4">
            *Max 2 court bookings per calendar day per club policy.
          </p>
        </div>

        {/* Quick Portal Jump */}
        <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#C7FF36]" />
              <span>Club Services</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Everything you need for your sporting lifestyle</p>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <NavLink
                to="/customer/book-court"
                className="p-3 rounded-xl bg-[#101316] hover:border-[#C7FF36]/40 border border-[#25292D] transition group"
              >
                <Calendar className="h-4 w-4 text-[#C7FF36] mb-1.5" />
                <p className="text-xs font-bold text-white group-hover:text-[#C7FF36]">Courts</p>
                <p className="text-[10px] text-slate-500">8 Sports Turf</p>
              </NavLink>
              <NavLink
                to="/customer/shop"
                className="p-3 rounded-xl bg-[#101316] hover:border-[#C7FF36]/40 border border-[#25292D] transition group"
              >
                <ShoppingBag className="h-4 w-4 text-[#C7FF36] mb-1.5" />
                <p className="text-xs font-bold text-white group-hover:text-[#C7FF36]">Pro Shop</p>
                <p className="text-[10px] text-slate-500">Rackets & Gear</p>
              </NavLink>
              <NavLink
                to="/customer/rentals"
                className="p-3 rounded-xl bg-[#101316] hover:border-[#C7FF36]/40 border border-[#25292D] transition group"
              >
                <CreditCard className="h-4 w-4 text-[#C7FF36] mb-1.5" />
                <p className="text-xs font-bold text-white group-hover:text-[#C7FF36]">Rentals</p>
                <p className="text-[10px] text-slate-500">Ball Machines</p>
              </NavLink>
              <NavLink
                to="/customer/cafeteria"
                className="p-3 rounded-xl bg-[#101316] hover:border-[#C7FF36]/40 border border-[#25292D] transition group"
              >
                <Coffee className="h-4 w-4 text-[#C7FF36] mb-1.5" />
                <p className="text-xs font-bold text-white group-hover:text-[#C7FF36]">Cafeteria</p>
                <p className="text-[10px] text-slate-500">Protein & Bowls</p>
              </NavLink>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Bookings & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Court Bookings */}
        <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-[#25292D]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#C7FF36]" />
              <span>Your Booked Court Sessions</span>
            </h3>
            <NavLink to="/customer/book-court" className="text-xs text-[#C7FF36] hover:underline font-semibold">
              + Book New
            </NavLink>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <p>No active reservations found.</p>
              <NavLink to="/customer/book-court" className="text-[#C7FF36] hover:underline mt-2 inline-block font-medium">
                Reserve your favorite court now
              </NavLink>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {upcomingBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-[#101316] border border-[#25292D] flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">{b.court_name}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{b.booking_date}</span>
                      <span>•</span>
                      <span>{new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (60m)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {b.status}
                    </span>
                    <p className="text-xs font-bold text-white mt-1">₹{b.total_amount}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Purchases & Kitchen Orders */}
        <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-[#25292D]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-[#C7FF36]" />
              <span>Recent Orders & Fulfilment</span>
            </h3>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <p>No recent orders found.</p>
              <div className="mt-2 flex justify-center gap-3">
                <NavLink to="/customer/shop" className="text-[#C7FF36] hover:underline">
                  Shop gear
                </NavLink>
                <span>•</span>
                <NavLink to="/customer/cafeteria" className="text-[#C7FF36] hover:underline">
                  Order nutrition
                </NavLink>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-xl bg-[#101316] border border-[#25292D] flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {ord.type}
                      </span>
                      <p className="text-xs font-bold text-white">{ord.order_number}</p>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {ord.items?.length || 1} item(s) • {new Date(ord.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C7FF36]/20 text-[#C7FF36] border border-[#C7FF36]/30">
                      {ord.status}
                    </span>
                    <p className="text-xs font-bold text-white mt-1">₹{ord.total_amount}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
