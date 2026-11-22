import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
} from 'lucide-react';
import { shopApi } from '../../services/api';

export const VendorRentalsPage: React.FC = () => {
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRentals = async () => {
    try {
      const data = await shopApi.getRentals();
      setRentals(data);
    } catch (err) {
      console.error('Failed to load rentals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRentals();
  }, []);

  const handleReturn = async (rentalId: string) => {
    setProcessingId(rentalId);
    try {
      await shopApi.returnRental(rentalId);
      await loadRentals();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to process equipment return');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRentals = rentals
    .filter((r) => {
      const matchesSearch =
        r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.user_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort(
      (a, b) =>
        new Date(b.rental_start || b.created_at || 0).getTime() -
        new Date(a.rental_start || a.created_at || 0).getTime()
    );

  const activeRentals = rentals.filter((r) => r.status === 'ACTIVE');
  const returnedRentals = rentals.filter((r) => r.status === 'RETURNED');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <PackageCheck className="h-6 w-6 text-amber-400" />
            Equipment Rental Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track checked-out tournament rackets, demo gear, return schedules, and restocking.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active Checkouts</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{activeRentals.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Currently in member possession</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Completed Returns</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{returnedRentals.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Inspected and back in stock</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Rental Income</span>
            <RotateCcw className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ₹{rentals.reduce((acc, r) => acc + (Number(r.rental_fee) || 0), 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">Accrued rental fees</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by gear name or member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#171A1D] border border-[#25292D] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        <div className="flex gap-1.5">
          {['ALL', 'ACTIVE', 'RETURNED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-[#171A1D] border border-[#25292D] text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Rentals Table */}
      <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] overflow-hidden">
        <div className="p-4 border-b border-[#25292D] flex items-center justify-between">
          <h2 className="font-bold text-white text-base">Equipment Checkout Ledger</h2>
          <span className="text-xs text-slate-400">{filteredRentals.length} Rentals</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading rentals ledger...</div>
        ) : filteredRentals.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No equipment rentals recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#202428] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3">Rental ID</th>
                  <th className="px-6 py-3">Equipment</th>
                  <th className="px-6 py-3">Member</th>
                  <th className="px-6 py-3">Period</th>
                  <th className="px-6 py-3">Fee</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#25292D]">
                {filteredRentals.map((r) => {
                  const isOverdue =
                    r.status === 'ACTIVE' && new Date(r.rental_end).getTime() < Date.now();
                  return (
                    <tr key={r.id} className="hover:bg-[#202428]/50 transition">
                      <td className="px-6 py-4 font-mono font-medium text-white">
                        #{r.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-white">{r.product_name}</span>
                        {r.notes && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5">Note: {r.notes}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        <span className="flex items-center gap-1.5 font-medium">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {r.user_name || 'Member'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        <div>
                          From: {new Date(r.rental_start).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                        <div>
                          To: {new Date(r.rental_end).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        ₹{r.rental_fee}
                      </td>
                      <td className="px-6 py-4">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/20">
                            <AlertTriangle className="h-3 w-3" /> OVERDUE
                          </span>
                        ) : (
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded ${
                              r.status === 'ACTIVE'
                                ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                                : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                            }`}
                          >
                            {r.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {r.status === 'ACTIVE' ? (
                          <button
                            disabled={processingId === r.id}
                            onClick={() => handleReturn(r.id)}
                            className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition shadow-sm"
                          >
                            {processingId === r.id ? 'Processing...' : 'Mark Returned'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">Checked In</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
