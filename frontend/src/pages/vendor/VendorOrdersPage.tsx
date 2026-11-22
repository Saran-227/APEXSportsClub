import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
} from 'lucide-react';
import { shopApi } from '../../services/api';

export const VendorOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadOrders = () => {
    setIsLoading(true);
    shopApi
      .getOrders()
      .then((data) => {
        const sorted = [...(data || [])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setOrders(sorted);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    setMessage(null);
    try {
      await shopApi.updateOrderStatus(orderId, newStatus);
      setMessage(`Order status updated to ${newStatus}`);
      loadOrders();
    } catch (err: any) {
      alert('Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Customer Shop Orders</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Fulfill pickup orders placed by members and track completion lifecycle.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#101316] border-b border-[#25292D] text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Order ID & Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items Ordered</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Fulfilment Status</th>
                <th className="py-3.5 px-4 text-right">Advance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#25292D] text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    Loading shop orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No customer orders received yet.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  return (
                    <tr key={ord.id} className="hover:bg-[#1D2126]/60 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white font-mono">{ord.order_number}</p>
                        <p className="text-[10px] text-slate-500">{new Date(ord.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-white">{ord.customer_name}</p>
                        <p className="text-[10px] text-slate-500">{ord.customer_email}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          {ord.items?.map((it: any) => (
                            <p key={it.id} className="text-[11px] text-slate-300">
                              {it.quantity}x {it.product_name}
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">₹{ord.total_amount}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : ord.status === 'READY_FOR_PICKUP'
                              ? 'bg-[#C7FF36]/20 text-[#C7FF36] border border-[#C7FF36]/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {ord.status === 'PENDING' && (
                          <button
                            disabled={updatingId === ord.id}
                            onClick={() => handleStatusChange(ord.id, 'ACCEPTED')}
                            className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 cursor-pointer disabled:opacity-50"
                          >
                            {updatingId === ord.id ? 'Updating...' : 'Accept'}
                          </button>
                        )}
                        {ord.status === 'ACCEPTED' && (
                          <button
                            disabled={updatingId === ord.id}
                            onClick={() => handleStatusChange(ord.id, 'READY_FOR_PICKUP')}
                            className="px-3 py-1.5 rounded-lg bg-[#C7FF36] text-slate-950 font-bold text-xs hover:bg-[#b0e600] cursor-pointer disabled:opacity-50"
                          >
                            {updatingId === ord.id ? 'Updating...' : 'Ready for Pickup'}
                          </button>
                        )}
                        {ord.status === 'READY_FOR_PICKUP' && (
                          <button
                            disabled={updatingId === ord.id}
                            onClick={() => handleStatusChange(ord.id, 'COMPLETED')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 cursor-pointer disabled:opacity-50"
                          >
                            {updatingId === ord.id ? 'Updating...' : 'Mark Picked Up'}
                          </button>
                        )}
                        {ord.status === 'COMPLETED' && (
                          <span className="text-[11px] text-slate-500 font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
