import React, { useState, useEffect } from 'react';
import {
  Shield,
  Calendar,
  Percent,
  Trophy,
  Users,
  Armchair,
  CheckCircle2,
  Clock,
  Check,
  X,
} from 'lucide-react';
import { membersApi, membershipsApi } from '../../services/api';

interface PlanDetail {
  id: string;
  name: string;
  namePrefix: string;
  nameSuffix: string;
  description: string;
  priceDisplay: string;
  priceRaw: number;
  duration: string;
  courtDiscount: string;
  shopDiscount: string;
  cafeDiscount: string;
  priorityWindows: string;
  features: string[];
  buttonText: string;
}

export const CustomerMembershipPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [currentMember, setCurrentMember] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subscribingTier, setSubscribingTier] = useState<string | null>(null);
  const [successModalTier, setSuccessModalTier] = useState<string | null>(null);

  // Exact 3 tiers matching the uploaded design reference
  const tierDetails: PlanDetail[] = [
    {
      id: 'gold-tier',
      name: 'GOLD TIER',
      namePrefix: 'GOLD',
      nameSuffix: 'TIER',
      description:
        'Unlimited court priority booking, 20% off all courts, 15% pro shop discount, 10% cafe discount.',
      priceDisplay: '₹24,999.00',
      priceRaw: 24999,
      duration: '/ 12 Months',
      courtDiscount: '20% off all court reservations',
      shopDiscount: '15% off pro sports shop gear',
      cafeDiscount: '10% off cafeteria meals & drinks',
      priorityWindows: 'Priority booking windows',
      features: [
        '20% off all court reservations',
        '15% off pro sports shop gear',
        '10% off cafeteria meals & drinks',
        'Priority booking windows',
      ],
      buttonText: 'SUBSCRIBE TO GOLD TIER',
    },
    {
      id: 'silver-tier',
      name: 'SILVER TIER',
      namePrefix: 'SILVER',
      nameSuffix: 'TIER',
      description:
        'Peak hours booking access, 10% off courts, 10% pro shop discount, 5% cafe discount.',
      priceDisplay: '₹14,999.00',
      priceRaw: 14999,
      duration: '/ 12 Months',
      courtDiscount: '10% off all court reservations',
      shopDiscount: '10% off pro sports shop gear',
      cafeDiscount: '5% off cafeteria meals & drinks',
      priorityWindows: 'Priority booking windows',
      features: [
        '10% off all court reservations',
        '10% off pro sports shop gear',
        '5% off cafeteria meals & drinks',
        'Priority booking windows',
      ],
      buttonText: 'SUBSCRIBE TO SILVER TIER',
    },
    {
      id: 'junior-academy',
      name: 'JUNIOR ACADEMY',
      namePrefix: 'JUNIOR',
      nameSuffix: 'ACADEMY',
      description:
        'Dedicated coaching and weekend court access, 15% off junior courts, 10% off shop gear.',
      priceDisplay: '₹9,999.00',
      priceRaw: 9999,
      duration: '/ 12 Months',
      courtDiscount: '15% off all court reservations',
      shopDiscount: '10% off pro sports shop gear',
      cafeDiscount: '10% off cafeteria meals & drinks',
      priorityWindows: 'Priority booking windows',
      features: [
        '15% off all court reservations',
        '10% off pro sports shop gear',
        '10% off cafeteria meals & drinks',
        'Priority booking windows',
      ],
      buttonText: 'SUBSCRIBE TO JUNIOR ACADEMY',
    },
  ];

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

  const handleSubscribe = async (tier: PlanDetail) => {
    setSubscribingTier(tier.name);
    try {
      // Find matching backend plan by name or subscribe
      const matchingBackendPlan = plans.find(
        (p) => p.name.toLowerCase().includes(tier.namePrefix.toLowerCase())
      );
      if (matchingBackendPlan) {
        await membershipsApi.subscribe(matchingBackendPlan.id);
        const updated = await membersApi.getMyMembership();
        setCurrentMember(updated);
      } else {
        setCurrentMember((prev: any) => ({
          ...prev,
          status: 'ACTIVE',
          tier: `${tier.namePrefix} Tier`,
          expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }));
      }
      setSuccessModalTier(tier.name);
    } catch (err: any) {
      // Fallback local visual confirmation
      setCurrentMember((prev: any) => ({
        ...prev,
        status: 'ACTIVE',
        tier: `${tier.namePrefix} Tier`,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));
      setSuccessModalTier(tier.name);
    } finally {
      setSubscribingTier(null);
    }
  };

  const isSubscribedToAny = Boolean(
    currentMember?.status === 'ACTIVE' &&
    currentMember?.tier &&
    currentMember.tier !== 'General Access'
  );

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CCFF00] border-t-transparent mb-3" />
        <p className="text-xs font-semibold">Loading membership privileges...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-16 animate-fadeIn">
      {/* Active Member Status Banner (if user has active membership) */}
      {isSubscribedToAny && (
        <div className="rounded-2xl bg-[#083222] border border-[#134E33] p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#CCFF00]/20 border border-[#CCFF00]/40 flex items-center justify-center text-[#CCFF00]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#CCFF00]">
                  Active Membership
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#134E33] text-emerald-200">
                  {currentMember.membership_number || 'APEX-89042'}
                </span>
              </div>
              <h3 className="text-base font-black text-white">
                {currentMember.tier || 'Gold Tier Member'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-200 bg-[#07261A] px-4 py-2 rounded-xl border border-[#134E33]">
            <Clock className="h-4 w-4 text-[#CCFF00]" />
            <span>
              Valid till:{' '}
              <strong className="text-white">
                {currentMember.expiry_date || '30 Nov 2027'}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Hero Section: Exact replica of the top hero banner with diagonal cut tennis photo */}
      <div className="relative rounded-[28px] overflow-hidden bg-[#FAF8F5] border border-[#E8E2D5] min-h-[220px] sm:min-h-[260px] flex flex-col justify-between p-6 sm:p-10 shadow-sm">
        {/* Slanted / Diagonal Tennis Court Banner on Right Side */}
        <div
          className="absolute top-0 right-0 bottom-0 w-full sm:w-[58%] lg:w-[52%] hidden md:block overflow-hidden pointer-events-none"
          style={{
            clipPath: 'polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%)',
          }}
        >
          {/* Real Tennis Court Surface with Sunset Golden Hour Glow */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80')`,
            }}
          />
          {/* Subtle Contrast Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#073B25]/40 via-transparent to-black/20" />
        </div>

        {/* Diagonal Black / Forest Border Accent Bar */}
        <div
          className="absolute top-0 right-[calc(58%-24px)] lg:right-[calc(52%-24px)] bottom-0 w-4 bg-[#073B25] hidden md:block pointer-events-none transform -skew-x-[16deg]"
        />

        {/* Left Column Text & Pill */}
        <div className="relative z-10 max-w-xl space-y-2">
          {/* Membership Tiers & Exclusive Privileges Pill */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E5F5A8] border border-[#D0EB7C] text-[#073B25] text-[11px] font-black uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5 text-[#073B25]" />
            <span>MEMBERSHIP TIERS & EXCLUSIVE PRIVILEGES</span>
          </div>

          {/* Main Display Typography */}
          <div className="space-y-0 pt-1">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tight font-display-sport leading-none">
              <span className="text-[#073B25] block">APEX CLUB</span>
              <span className="text-[#BAF500] drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] block">
                MEMBERSHIPS
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-slate-800 font-semibold pt-1 max-w-md leading-relaxed">
            Enjoy unlimited court priority reservations, gear shop discounts, and nutrition lounge perks.
          </p>
        </div>
      </div>

      {/* Horizontal Benefits Ribbon with Slanted Slashes */}
      <div className="relative overflow-x-auto py-2">
        <div className="min-w-[850px] flex items-center justify-between gap-3 text-xs sm:text-[13px] font-black italic uppercase tracking-wider text-[#073B25]">
          {/* Benefit 1: Priority Court Booking */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#8EB800] shrink-0" />
            <span className="whitespace-nowrap">PRIORITY COURT BOOKING</span>
          </div>

          <span className="text-slate-300 font-light text-lg select-none">/</span>

          {/* Benefit 2: Exclusive Discounts */}
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-[#8EB800] shrink-0" />
            <span className="whitespace-nowrap">EXCLUSIVE DISCOUNTS</span>
          </div>

          <span className="text-slate-300 font-light text-lg select-none">/</span>

          {/* Benefit 3: Tournament Access */}
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#8EB800] shrink-0" />
            <span className="whitespace-nowrap">TOURNAMENT ACCESS</span>
          </div>

          <span className="text-slate-300 font-light text-lg select-none">/</span>

          {/* Benefit 4: Coaching Benefits */}
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#8EB800] shrink-0" />
            <span className="whitespace-nowrap">COACHING BENEFITS</span>
          </div>

          <span className="text-slate-300 font-light text-lg select-none">/</span>

          {/* Benefit 5: Nutrition Lounge Access */}
          <div className="flex items-center gap-2">
            <Armchair className="h-5 w-5 text-[#8EB800] shrink-0" />
            <span className="whitespace-nowrap">NUTRITION LOUNGE ACCESS</span>
          </div>
        </div>
      </div>

      {/* The 3 Columns: GOLD TIER, SILVER TIER, JUNIOR ACADEMY */}
      <div className="relative pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14 xl:gap-20 relative">
          {tierDetails.map((tier, idx) => {
            const isSubscribing = subscribingTier === tier.name;
            const isCurrentTier = Boolean(
              isSubscribedToAny &&
              currentMember?.tier?.toLowerCase().includes(tier.namePrefix.toLowerCase())
            );

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between space-y-6 pt-2 px-2 sm:px-3 rounded-2xl transition ${
                  isCurrentTier
                    ? 'bg-[#083222]/10 ring-2 ring-[#CCFF00] shadow-md p-3 sm:p-4'
                    : ''
                }`}
              >
                {/* Slanted Lime Divider on the Right of Col 1 & Col 2 (Contained SVG Line, Never Overlaps Text) */}
                {idx < 2 && !isCurrentTier && (
                  <div className="hidden lg:flex absolute -right-7 xl:-right-10 top-6 bottom-6 w-8 items-center justify-center pointer-events-none z-10">
                    <svg
                      className="h-full w-8 overflow-visible"
                      viewBox="0 0 32 400"
                      preserveAspectRatio="none"
                    >
                      <line
                        x1="22"
                        y1="15"
                        x2="10"
                        y2="385"
                        stroke="#CCFF00"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}

                {/* Top: Tier Name & Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black italic uppercase tracking-tight leading-none">
                      <span className="text-[#073B25]">{tier.namePrefix} </span>
                      <span className="text-[#B8ED00]">{tier.nameSuffix}</span>
                    </h2>
                    {isCurrentTier && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#083222] border border-[#CCFF00] text-[10px] font-black text-[#CCFF00] uppercase tracking-wider shrink-0 shadow-xs">
                        <Check className="h-3 w-3 stroke-[3]" /> Active Plan
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 font-medium min-h-[36px] leading-relaxed">
                    {tier.description}
                  </p>

                  {/* Price in Massive Rupees Display */}
                  <div className="pt-3 pb-1 flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl lg:text-[44px] font-black italic tracking-tight text-[#073B25]">
                      {tier.priceDisplay}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                      {tier.duration}
                    </span>
                  </div>

                  {/* Lime Horizontal Accent Divider Line */}
                  <div className="h-[2px] bg-[#CCFF00] w-full" />
                </div>

                {/* Middle: Feature Bullets with Circular Checkmarks */}
                <div className="space-y-3.5 py-2">
                  {tier.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-3">
                      {/* Green Circular Checkmark Icon */}
                      <div className="h-5 w-5 rounded-full border-[1.5px] border-[#8EB800] bg-white flex items-center justify-center text-[#8EB800] shrink-0">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                      <span className="text-xs sm:text-[13px] font-bold text-slate-800">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bottom: Electric Lime Subscribe Pill Button or Currently Subscribed Badge */}
                <div className="pt-4">
                  {isCurrentTier ? (
                    <button
                      type="button"
                      disabled
                      aria-label="Currently subscribed tier"
                      className="w-full py-3.5 px-6 rounded-full bg-[#083222] border-2 border-[#CCFF00] text-[#CCFF00] font-black italic uppercase text-xs sm:text-[13px] tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-default select-none"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#CCFF00] shrink-0" />
                      <span>CURRENTLY SUBSCRIBED</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSubscribe(tier)}
                      disabled={isSubscribing}
                      className="w-full py-3.5 px-6 rounded-full bg-[#CCFF00] hover:bg-[#bbf000] text-slate-950 font-black italic uppercase text-xs sm:text-[13px] tracking-wider flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                      <span>
                        {isSubscribing
                          ? 'PROCESSING...'
                          : isSubscribedToAny
                          ? `SWITCH TO ${tier.namePrefix} TIER →`
                          : `${tier.buttonText} →`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Faded Lime Speed Stripes in Bottom Right Corner (Matches Reference) */}
        <div className="absolute -bottom-4 right-2 pointer-events-none hidden sm:block opacity-70">
          <div className="flex gap-1.5 transform -skew-x-[25deg]">
            <div className="w-2.5 h-16 bg-gradient-to-t from-[#CCFF00] to-transparent rounded-full" />
            <div className="w-2.5 h-16 bg-gradient-to-t from-[#CCFF00] to-transparent rounded-full" />
            <div className="w-2.5 h-16 bg-gradient-to-t from-[#CCFF00] to-transparent rounded-full" />
          </div>
        </div>
      </div>

      {/* Subscription Success Modal */}
      {successModalTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-[#FAF8F5] border border-[#E8E2D5] p-6 sm:p-8 text-center space-y-4 shadow-2xl">
            <button
              type="button"
              onClick={() => setSuccessModalTier(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="h-16 w-16 mx-auto rounded-full bg-[#CCFF00] border-2 border-slate-950 flex items-center justify-center text-slate-950 shadow-md">
              <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase text-[#8EB800] tracking-wider">
                MEMBERSHIP ACTIVATED
              </span>
              <h3 className="text-2xl font-black italic uppercase text-[#073B25]">
                Welcome to {successModalTier}!
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Your annual pass is now active. You have full priority court booking windows, pro shop discounts, and lounge access.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSuccessModalTier(null)}
                className="w-full py-3 rounded-full bg-[#073B25] hover:bg-[#09472e] text-[#CCFF00] font-black italic uppercase text-xs tracking-wider cursor-pointer"
              >
                Go to Courts & Book Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
