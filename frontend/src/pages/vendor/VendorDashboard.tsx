import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ClipboardList,
  PackageCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  DollarSign,
  Plus,
} from 'lucide-react';
import { shopApi } from '../../services/api';

export const VendorDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [stats, ords] = await Promise.all([
          shopApi.getVendorAnalytics().catch(() => null),
          shopApi.getOrders().catch(() => []),
        ]);
        setAnalytics(stats);
        setOrders(ords.slice(0, 5));
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent mb-3" />
        <p className="text-xs">Loading pro-shop vendor dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#171A1D] via-[#22282e] to-[#171A1D] border border-[#25292D] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{analytics?.business_name || 'Apex Pro Sports Shop'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Vendor Operations Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Real-time sales tracking, stock adjustments, and customer pickup orders.
          </p>
        </div>

        <div className="flex gap-3">
          <NavLink
            to="/vendor/products"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Manage Inventory</span>
          </NavLink>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Sales</span>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">
            ₹{analytics?.total_revenue?.toLocaleString() || '0'}
          </p>
          <span className="text-[11px] text-emerald-400 font-medium">All fulfilled & active orders</span>
        </div>

        <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Orders</span>
            <ClipboardList className="h-4 w-4 text-[#C7FF36]" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">
            {analytics?.pending_orders || 0}
          </p>
          <span className="text-[11px] text-amber-400 font-medium">Awaiting preparation/pickup</span>
        </div>

        <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock Items</span>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">
            {analytics?.low_stock_products || 0}
          </p>
          <span className="text-[11px] text-red-400 font-medium">Under reorder threshold</span>
        </div>

        <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Rentals</span>
            <PackageCheck className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">
            {analytics?.active_rentals || 0}
          </p>
          <span className="text-[11px] text-blue-400 font-medium">Demo gear in court use</span>
        </div>
      </div>

      {/* Recent Orders Overview */}
      <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#25292D]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-amber-400" />
            <span>Recent Customer Shop Orders</span>
          </h3>
          <NavLink to="/vendor/orders" className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </NavLink>
        </div>

        {orders.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No customer orders placed yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 rounded-xl bg-[#101316] border border-[#25292D] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">{ord.order_number}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {ord.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Customer: <strong className="text-slate-300">{ord.customer_name}</strong> • Items: {ord.items?.length || 1}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">₹{ord.total_amount}</p>
                  <p className="text-[10px] text-slate-500">{new Date(ord.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
