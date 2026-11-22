import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Coffee,
  CheckCircle,
} from 'lucide-react';
import { cafeteriaApi } from '../../services/api';

export const CafeteriaSalesPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [aData, oData] = await Promise.all([
          cafeteriaApi.getOwnerAnalytics(),
          cafeteriaApi.getOrders(),
        ]);
        setAnalytics(aData);
        const sortedOrders = [...(oData || [])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setOrders(sortedOrders);
      } catch (err) {
        console.error('Failed to load cafeteria analytics', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const totalSales = orders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
  const completedOrders = orders.filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status));
  const avgOrderValue = orders.length > 0 ? (totalSales / orders.length).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
            Cafeteria Financials & Order History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Revenue tracking, kitchen throughput, and diner settlement records.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Revenue Today</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ₹{analytics?.revenue_today?.toLocaleString() ?? '0'}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">Live daily till</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Cumulative Revenue</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">
            ₹{totalSales.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Across all orders</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Orders</span>
            <Coffee className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{orders.length}</p>
          <p className="text-[11px] text-blue-400 mt-1">{completedOrders.length} completed</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Avg. Ticket Size</span>
            <CheckCircle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">₹{avgOrderValue}</p>
          <p className="text-[11px] text-slate-500 mt-1">Per transaction</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] overflow-hidden">
        <div className="p-4 border-b border-[#25292D] flex items-center justify-between">
          <h2 className="font-bold text-white text-base">Settled & In-Flight Transactions</h2>
          <span className="text-xs text-slate-400">{orders.length} Records</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading ledger...</div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No orders recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#202428] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Placed At</th>
                  <th className="px-6 py-3">Items</th>
                  <th className="px-6 py-3">Payment</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#25292D]">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#202428]/50 transition">
                    <td className="px-6 py-4 font-mono font-medium text-white">
                      #{o.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(o.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {o.items?.map((it: any) => `${it.quantity}x ${it.menu_item?.name || 'Item'}`).join(', ') || 'Item'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {o.payment_status || 'PAID'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          o.status === 'COMPLETED'
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : o.status === 'PREPARING'
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-blue-400 bg-blue-500/10'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-white">
                      ₹{o.total_amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
