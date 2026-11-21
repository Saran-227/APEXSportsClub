import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { shopApi } from '../../services/api';

export const CustomerRentalsPage: React.FC = () => {
  const [rentalsCatalog, setRentalsCatalog] = useState<any[]>([]);
  const [myRentals, setMyRentals] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [cat, mine] = await Promise.all([
          shopApi.getCatalog({ is_rental: true }),
          shopApi.getRentals().catch(() => []),
        ]);
        setRentalsCatalog(cat);
        setMyRentals(mine);
        if (cat.length > 0) setSelectedProduct(cat[0]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleBookRental = async () => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        product_id: selectedProduct.id,
        rental_start: new Date(startDate).toISOString(),
        rental_end: new Date(endDate).toISOString(),
        notes: notes || undefined,
      };
      await shopApi.bookRental(payload);
      setMessage(`Successfully reserved ${selectedProduct.name} for rental!`);
      const updated = await shopApi.getRentals();
      setMyRentals(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Rental reservation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysDiff = Math.max(
    1,
    Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24))
  );
  const dailyFee = selectedProduct ? Number(selectedProduct.rental_price_per_day || 350) : 0;
  const totalFee = daysDiff * dailyFee;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C7FF36]/10 border border-[#C7FF36]/30 text-[#C7FF36] text-xs font-semibold mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Professional Demo & Practice Equipment</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Equipment & Racket Rentals
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Rent high-end demo padel rackets, automated ball feeding machines, and cricket kits for your training sessions.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Available Rental Gear Selection */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          1. Select Equipment to Rent
        </label>
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading rental inventory...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rentalsCatalog.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedProduct(item)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  selectedProduct?.id === item.id
                    ? 'bg-[#171A1D] border-[#C7FF36] shadow-xl shadow-[#C7FF36]/10'
                    : 'bg-[#171A1D]/70 border-[#25292D] hover:border-slate-700'
                }`}
              >
                <div>
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?auto=format&fit=crop&w=800&q=80'}
                    alt={item.name}
                    className="h-32 w-full object-cover rounded-xl mb-3"
                  />
                  <h4 className="text-sm font-bold text-white">{item.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#25292D] flex items-center justify-between text-xs">
                  <span className="text-slate-400">Daily Rental</span>
                  <span className="font-bold text-[#C7FF36]">₹{item.rental_price_per_day || 350} / day</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rental Period & Confirmation Form */}
      {selectedProduct && (
        <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white">2. Select Rental Duration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Start Date</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#101316] border border-[#25292D] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#C7FF36]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Expected Return Date</label>
              <input
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#101316] border border-[#25292D] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#C7FF36]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Special Gear Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Grip size preference or tournament match requirement"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#101316] border border-[#25292D] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C7FF36]"
            />
          </div>

          <div className="p-4 rounded-xl bg-[#101316] border border-[#25292D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-white">{selectedProduct.name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Duration: {daysDiff} day(s) • Pick up at Apex Pro Shop Counter
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500">Total Rental Fee</span>
                <p className="text-xl font-mono font-bold text-[#C7FF36]">₹{totalFee}</p>
              </div>
              <button
                onClick={handleBookRental}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#C7FF36] text-slate-950 font-bold text-xs hover:bg-[#b0e600] transition shadow-lg shadow-[#C7FF36]/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Reserving...' : 'Reserve Equipment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active & Past Rentals */}
      <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#C7FF36]" />
          <span>Your Rented Equipment</span>
        </h3>

        {myRentals.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No active equipment rentals found.</p>
        ) : (
          <div className="space-y-3">
            {myRentals.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl bg-[#101316] border border-[#25292D] flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">{r.product_name}</p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(r.rental_start).toLocaleDateString()} to {new Date(r.rental_end).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C7FF36]/20 text-[#C7FF36] border border-[#C7FF36]/30">
                    {r.status}
                  </span>
                  <p className="text-xs font-bold text-white mt-1">₹{r.rental_fee}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
