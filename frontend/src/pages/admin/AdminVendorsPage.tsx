import React, { useState, useEffect } from 'react';
import {
  Store,
  ChefHat,
  ShoppingBag,
  AlertCircle,
  Search,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../../services/api';

export const AdminVendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadVendors = async () => {
    try {
      const data = await adminApi.getVendors();
      setVendors(data);
    } catch (err) {
      console.error('Failed to load vendors', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleUpdateStatus = async (vendorId: string, nextStatus: string) => {
    setUpdatingId(vendorId);
    try {
      await adminApi.updateVendorStatus(vendorId, nextStatus);
      await loadVendors();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update vendor status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.owner_email?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || v.vendor_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const shopVendors = vendors.filter((v) => v.vendor_type === 'SPORTS_SHOP');
  const cafeVendors = vendors.filter((v) => v.vendor_type === 'CAFETERIA');
  const pendingVendors = vendors.filter((v) => v.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Store className="h-6 w-6 text-[#C7FF36]" />
            Vendor & Concessionaire Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authorised club partners, independent pro-shops, cafeteria operators, and revenue governance.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            loadVendors();
          }}
          className="flex items-center gap-2 rounded-xl border border-[#25292D] bg-[#171A1D] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Concessions</span>
            <Store className="h-4 w-4 text-[#C7FF36]" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{vendors.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Active business units</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Pro Shop Vendors</span>
            <ShoppingBag className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{shopVendors.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Retail gear & apparel</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Cafeteria / Lounge</span>
            <ChefHat className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{cafeVendors.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Food & beverage partners</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171A1D] border border-[#25292D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Pending Review</span>
            <AlertCircle className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{pendingVendors.length}</p>
          <p className="text-[11px] text-blue-400 mt-1">Awaiting approval</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by business name or operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#171A1D] border border-[#25292D] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#C7FF36]"
          />
        </div>
        <div className="flex gap-1.5">
          {['ALL', 'SPORTS_SHOP', 'CAFETERIA'].map((vt) => (
            <button
              key={vt}
              onClick={() => setTypeFilter(vt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                typeFilter === vt
                  ? 'bg-[#C7FF36] text-slate-950 shadow-sm'
                  : 'bg-[#171A1D] border border-[#25292D] text-slate-400 hover:text-white'
              }`}
            >
              {vt === 'ALL' ? 'All Vendors' : vt === 'SPORTS_SHOP' ? 'Sports Shop' : 'Cafeteria'}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Table */}
      <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] overflow-hidden">
        <div className="p-4 border-b border-[#25292D] flex items-center justify-between">
          <h2 className="font-bold text-white text-base">Club Concessionaires</h2>
          <span className="text-xs text-slate-400">{filteredVendors.length} Registered</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading vendors...</div>
        ) : filteredVendors.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No vendors found matching filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#202428] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3">Business Entity</th>
                  <th className="px-6 py-3">Concession Type</th>
                  <th className="px-6 py-3">Designated Operator</th>
                  <th className="px-6 py-3">Catalog Size</th>
                  <th className="px-6 py-3">Fulfillment</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#25292D]">
                {filteredVendors.map((v) => (
                  <tr key={v.id} className="hover:bg-[#202428]/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{v.business_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">ID: {v.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded border ${
                          v.vendor_type === 'SPORTS_SHOP'
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        }`}
                      >
                        {v.vendor_type === 'SPORTS_SHOP' ? (
                          <ShoppingBag className="h-3 w-3" />
                        ) : (
                          <ChefHat className="h-3 w-3" />
                        )}
                        {v.vendor_type === 'SPORTS_SHOP' ? 'Pro Shop' : 'Cafeteria'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-medium text-slate-200">{v.owner_name}</div>
                      <div className="text-slate-400">{v.owner_email}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-200">
                      {v.products_count} active items
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div>{v.orders_count} orders</div>
                      <div className="text-emerald-400 font-bold">₹{v.total_revenue?.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${
                          v.status === 'ACTIVE'
                            ? 'text-[#C7FF36] bg-[#C7FF36]/10 border-[#C7FF36]/20'
                            : v.status === 'PENDING'
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            : 'text-red-400 bg-red-500/10 border-red-500/20'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {v.status === 'ACTIVE' ? (
                        <button
                          disabled={updatingId === v.id}
                          onClick={() => handleUpdateStatus(v.id, 'SUSPENDED')}
                          className="rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 px-3 py-1.5 text-xs font-bold transition shadow-sm"
                        >
                          {updatingId === v.id ? 'Updating...' : 'Suspend Access'}
                        </button>
                      ) : (
                        <button
                          disabled={updatingId === v.id}
                          onClick={() => handleUpdateStatus(v.id, 'ACTIVE')}
                          className="rounded-lg bg-[#C7FF36] hover:bg-[#b2e82e] px-3 py-1.5 text-xs font-bold text-slate-950 transition shadow-sm"
                        >
                          {updatingId === v.id ? 'Updating...' : 'Approve & Activate'}
                        </button>
                      )}
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
