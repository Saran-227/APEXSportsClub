import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
  CheckCircle2,
  RefreshCw,
  ChefHat,
  DollarSign,
  Coffee,
} from 'lucide-react';
import { cafeteriaApi } from '../../services/api';

export const CafeteriaDashboard: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchBoardData = async () => {
    try {
      const [ordersData, analyticsData] = await Promise.all([
        cafeteriaApi.getOrders(),
        cafeteriaApi.getOwnerAnalytics(),
      ]);
      setOrders(ordersData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load kitchen data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
    const interval = setInterval(fetchBoardData, 10000); // 10s auto-refresh for live kitchen
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (orderId: string, nextStatus: string) => {
    setUpdatingId(orderId);
    try {
      await cafeteriaApi.updateOrderStatus(orderId, nextStatus);
      await fetchBoardData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingOrders = orders.filter((o) => ['PENDING', 'PAID', 'NEW'].includes(o.status));
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const completedOrders = orders.filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status));

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Flame className="h-6 w-6 text-emerald-400" />
            Kitchen Order Display System (KDS)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time live kitchen tickets, order prep pipeline, and diner pickup fulfillment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              fetchBoardData();
            }}
            className="flex items-center gap-2 rounded-xl border border-[#25292D] bg-[#171A1D] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Orders Today</span>
            <Coffee className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">
            {analytics?.orders_today_count ?? pendingOrders.length + preparingOrders.length + readyOrders.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Live active queue</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Kitchen In Prep</span>
            <ChefHat className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{preparingOrders.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">On grill & preparation</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Ready For Pickup</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{readyOrders.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting diner claim</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Today's Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ₹{analytics?.revenue_today?.toLocaleString() ?? '0'}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">Gross sales today</p>
        </div>
      </div>

      {/* Live Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {/* Column 1: New / Received */}
        <div className="bg-[#171A1D]/70 border border-[#25292D] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#25292D] pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse" />
              <h3 className="font-bold text-white text-sm">New Orders</h3>
            </div>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/20">
              {pendingOrders.length}
            </span>
          </div>

          {pendingOrders.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No new incoming orders</p>
          ) : (
            pendingOrders.map((order) => (
              <div
                key={order.id}
                className="bg-[#202428] rounded-xl p-3.5 border border-[#2e3338] shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="space-y-1.5 border-y border-[#2b3036] py-2">
                  {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-slate-200">
                        <strong className="text-emerald-400">{item.quantity}x</strong> {item.menu_item?.name || 'Item'}
                      </span>
                      <span className="text-slate-400 text-[11px]">₹{item.total_price}</span>
                    </div>
                  ))}
                  {order.customer_notes && (
                    <p className="text-[10px] text-amber-300 bg-amber-500/10 rounded px-2 py-1 italic">
                      Note: {order.customer_notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-white">₹{order.total_amount}</span>
                  <button
                    disabled={updatingId === order.id}
                    onClick={() => handleStatusChange(order.id, 'PREPARING')}
                    className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm"
                  >
                    {updatingId === order.id ? 'Starting...' : 'Start Cooking'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Column 2: In Preparation */}
        <div className="bg-[#171A1D]/70 border border-[#25292D] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#25292D] pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <h3 className="font-bold text-white text-sm">Preparing</h3>
            </div>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
              {preparingOrders.length}
            </span>
          </div>

          {preparingOrders.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Kitchen station idle</p>
          ) : (
            preparingOrders.map((order) => (
              <div
                key={order.id}
                className="bg-[#202428] rounded-xl p-3.5 border border-amber-500/30 shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-amber-300 flex items-center gap-1">
                    <Clock className="h-3 w-3 animate-spin" /> Cooking
                  </span>
                </div>

                <div className="space-y-1.5 border-y border-[#2b3036] py-2">
                  {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-slate-200">
                        <strong className="text-amber-400">{item.quantity}x</strong> {item.menu_item?.name || 'Item'}
                      </span>
                    </div>
                  ))}
                  {order.customer_notes && (
                    <p className="text-[10px] text-amber-300 bg-amber-500/10 rounded px-2 py-1 italic">
                      Note: {order.customer_notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-white">₹{order.total_amount}</span>
                  <button
                    disabled={updatingId === order.id}
                    onClick={() => handleStatusChange(order.id, 'READY')}
                    className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition shadow-sm"
                  >
                    {updatingId === order.id ? 'Updating...' : 'Mark Ready'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Column 3: Ready for Pickup */}
        <div className="bg-[#171A1D]/70 border border-[#25292D] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#25292D] pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-bounce" />
              <h3 className="font-bold text-white text-sm">Ready for Counter</h3>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
              {readyOrders.length}
            </span>
          </div>

          {readyOrders.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No orders awaiting pickup</p>
          ) : (
            readyOrders.map((order) => (
              <div
                key={order.id}
                className="bg-[#202428] rounded-xl p-3.5 border border-emerald-500/30 shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                    CALL DINER
                  </span>
                </div>

                <div className="space-y-1.5 border-y border-[#2b3036] py-2">
                  {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-slate-200">
                        <strong className="text-emerald-400">{item.quantity}x</strong> {item.menu_item?.name || 'Item'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-white">₹{order.total_amount}</span>
                  <button
                    disabled={updatingId === order.id}
                    onClick={() => handleStatusChange(order.id, 'COMPLETED')}
                    className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition shadow-sm"
                  >
                    {updatingId === order.id ? 'Fulfilling...' : 'Handed Over'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Column 4: Completed / Closed */}
        <div className="bg-[#171A1D]/70 border border-[#25292D] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#25292D] pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
              <h3 className="font-bold text-slate-300 text-sm">Completed</h3>
            </div>
            <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-bold text-slate-400 border border-slate-500/20">
              {completedOrders.length}
            </span>
          </div>

          {completedOrders.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No completed orders yet</p>
          ) : (
            completedOrders.slice(0, 10).map((order) => (
              <div
                key={order.id}
                className="bg-[#202428]/60 rounded-xl p-3 border border-[#25292D] space-y-2 opacity-85"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  {order.items?.length || 1} items • ₹{order.total_amount}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
