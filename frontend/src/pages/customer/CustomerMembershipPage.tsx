import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Shield,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { membersApi, membershipsApi } from '../../services/api';

export const CustomerMembershipPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [currentMember, setCurrentMember] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [p, m] = await Promise.all([
          membershipsApi.getPlans().catch(() => []),
          membersApi.getMyMembership().catch(() => null),
        ]);
        setPlans(p);
        setCurrentMember(m);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C7FF36] border-t-transparent mb-3" />
        <p className="text-xs">Loading membership passes...</p>
      </div>
    );
  }

  const handleSubscribe = async (planId: string) => {
    setSubscribingId(planId);
    setMessage(null);
    setError(null);
    try {
      const res = await membershipsApi.subscribe(planId);
      setMessage(res.message);
      const updated = await membersApi.getMyMembership();
      setCurrentMember(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Subscription failed');
    } finally {
      setSubscribingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C7FF36]/10 border border-[#C7FF36]/30 text-[#C7FF36] text-xs font-semibold mb-2">
          <Shield className="h-3.5 w-3.5" />
          <span>Membership Tiers & Exclusive Privileges</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Apex Club Memberships
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Enjoy unlimited court priority reservations, gear shop discounts, and nutrition lounge perks.
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

      {/* Current Active Plan Status */}
      {currentMember && (
        <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Active Pass</span>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{currentMember.tier || 'General Access'}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C7FF36]/20 text-[#C7FF36] border border-[#C7FF36]/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Member ID: <span className="font-mono text-white font-semibold">{currentMember.membership_number}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#101316] px-4 py-2.5 rounded-xl border border-[#25292D]">
            <Clock className="h-4 w-4 text-[#C7FF36]" />
            <span>Valid until: <strong className="text-white">{currentMember.expiry_date || 'Lifetime'}</strong></span>
          </div>
        </div>
      )}

      {/* Plan Cards Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentMember?.tier?.toLowerCase() === plan.name.toLowerCase();
          return (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 flex flex-col justify-between transition border relative ${
                isCurrent
                  ? 'bg-[#171A1D] border-[#C7FF36] shadow-xl shadow-[#C7FF36]/10'
                  : 'bg-[#171A1D]/80 border-[#25292D] hover:border-slate-700'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-[#C7FF36] text-slate-950 font-bold text-[10px] shadow">
                  CURRENT TIER
                </span>
              )}

              <div>
                <h4 className="text-base font-bold text-white">{plan.name}</h4>
                <p className="text-xs text-slate-400 mt-1 min-h-[36px]">{plan.description}</p>

                <div className="my-6">
                  <span className="text-3xl font-extrabold text-white">₹{plan.price}</span>
                  <span className="text-xs text-slate-400"> / {plan.duration_months} Months</span>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-[#25292D] text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-[#C7FF36]" />
                    <span><strong>{plan.court_discount_percent}% off</strong> all court reservations</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-[#C7FF36]" />
                    <span><strong>{plan.shop_discount_percent}% off</strong> pro sports shop gear</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-[#C7FF36]" />
                    <span><strong>{plan.cafe_discount_percent}% off</strong> cafeteria meals & drinks</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-[#C7FF36]" />
                    <span>Priority booking windows</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#25292D]">
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrent || subscribingId === plan.id}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    isCurrent
                      ? 'bg-[#25292D] text-slate-500 cursor-not-allowed'
                      : 'bg-[#C7FF36] text-slate-950 hover:bg-[#b0e600] shadow-md shadow-[#C7FF36]/20'
                  }`}
                >
                  {isCurrent
                    ? 'Current Membership'
                    : subscribingId === plan.id
                    ? 'Processing...'
                    : `Subscribe to ${plan.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
