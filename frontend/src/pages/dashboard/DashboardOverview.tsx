import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  CalendarCheck,
  DollarSign,
  PlusCircle,
  ShoppingBag,
  Coffee,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { PlaceholderNoticeBanner } from '../../components/common/PlaceholderNoticeBanner';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();

  // Demonstration activities feed (clearly declared as prototype telemetry)
  const recentActivities = [
    {
      id: 'act_1',
      time: '10 mins ago',
      type: 'BOOKING',
      title: 'Tennis Court 1 Reserved',
      description: 'Alexander Vance reserved 60m slot (Clay 1)',
      status: 'CONFIRMED',
    },
    {
      id: 'act_2',
      time: '24 mins ago',
      type: 'SHOP',
      title: 'Pro Shop Sale #ORD-501',
      description: '2x Wilson US Open Tennis Balls & Cricket Grip ($32.40)',
      status: 'PAID',
    },
    {
      id: 'act_3',
      time: '45 mins ago',
      type: 'MEMBER',
      title: 'Annual Plan Renewed',
      description: 'Elena Rostova renewed Gold Annual Tier',
      status: 'SUCCESS',
    },
    {
      id: 'act_4',
      time: '1 hr ago',
      type: 'CAFE',
      title: 'Pavilion Cafe Tab Settled',
      description: 'Table 4 order closed ($34.50)',
      status: 'SETTLED',
    },
    {
      id: 'act_5',
      time: '2 hrs ago',
      type: 'INVENTORY',
      title: 'Restock Movement Logged',
      description: '10x SG Cricket Bats & Kookaburra Balls received',
      status: 'UPDATED',
    },
  ];

  // Demonstration court & pitch schedule today (Tennis and Cricket only)
  const courtStatus = [
    { court: 'Tennis Court 1 (Clay)', sport: 'TENNIS', current: 'Alexander Vance (10:00 - 11:00)', status: 'IN_USE' },
    { court: 'Tennis Court 2 (Hard)', sport: 'TENNIS', current: 'Available until 13:00', status: 'AVAILABLE' },
    { court: 'Cricket Pitch 1 (Main Turf)', sport: 'CRICKET', current: 'Club XI Match Practice', status: 'IN_USE' },
    { court: 'Cricket Practice Net A', sport: 'CRICKET', current: 'Junior Coaching Clinic', status: 'IN_USE' },
    { court: 'Center Court (Grass Tennis)', sport: 'TENNIS', current: 'Available for reservation', status: 'AVAILABLE' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Status */}
      <PageHeader
        title="Champions Club Operations Dashboard"
        description="Unified real-time overview of club members, tennis court and cricket pitch bookings, pro shop sales, and cafeteria POS."
        badge={
          <Badge variant="emerald" size="sm">
            Phase 1 Foundation
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Calendar className="h-4 w-4" />}
              onClick={() => navigate('/bookings')}
            >
              View Court Grid
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="h-4 w-4" />}
              onClick={() => navigate('/members')}
            >
              New Member
            </Button>
          </div>
        }
      />

      {/* Mandatory Demonstration Notice Banner */}
      <PlaceholderNoticeBanner moduleName="Dashboard Overview" />

      {/* 4 Core KPI Stat Cards (Marked as Demonstration Placeholders) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Club Members"
          value="1,248"
          change="+4.2%"
          isPositive={true}
          icon={<Users className="h-5 w-5 text-emerald-600" />}
          subtitle="Demo metric"
          isPlaceholder={true}
        />
        <StatCard
          title="Active Memberships"
          value="982"
          change="+2.8%"
          isPositive={true}
          icon={<CreditCard className="h-5 w-5 text-sky-600" />}
          subtitle="Demo metric (Gold/Silver/Junior)"
          isPlaceholder={true}
        />
        <StatCard
          title="Today's Bookings"
          value="38 / 48"
          change="79% capacity"
          isPositive={true}
          icon={<CalendarCheck className="h-5 w-5 text-indigo-600" />}
          subtitle="Tennis & Cricket slots"
          isPlaceholder={true}
        />
        <StatCard
          title="Today's Total Revenue"
          value="$4,850.00"
          change="+18.5%"
          isPositive={true}
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          subtitle="Demo metric"
          isPlaceholder={true}
        />
      </div>

      {/* Quick Actions Panel */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Fast Actions & POS Shortcuts</CardTitle>
            <CardDescription>
              Quickly launch common front-desk workflows across facilities
            </CardDescription>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/bookings')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition cursor-pointer text-center group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 group-hover:scale-105 transition">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <span className="mt-2 text-xs font-semibold text-slate-800">Book Court / Pitch</span>
            <span className="text-[11px] text-slate-500">Tennis & Cricket</span>
          </button>

          <button
            onClick={() => navigate('/members')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition cursor-pointer text-center group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700 group-hover:scale-105 transition">
              <Users className="h-5 w-5" />
            </div>
            <span className="mt-2 text-xs font-semibold text-slate-800">Member Search</span>
            <span className="text-[11px] text-slate-500">Gold, Silver, Junior</span>
          </button>

          <button
            onClick={() => navigate('/shop')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition cursor-pointer text-center group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 group-hover:scale-105 transition">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="mt-2 text-xs font-semibold text-slate-800">Pro Shop POS</span>
            <span className="text-[11px] text-slate-500">Rackets, Bats & Balls</span>
          </button>

          <button
            onClick={() => navigate('/cafeteria')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition cursor-pointer text-center group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 group-hover:scale-105 transition">
              <Coffee className="h-5 w-5" />
            </div>
            <span className="mt-2 text-xs font-semibold text-slate-800">Cafeteria Tab</span>
            <span className="text-[11px] text-slate-500">Pavilion Tables & Bar</span>
          </button>
        </div>
      </Card>

      {/* Main Grid: Court Schedule and Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Court Timetable Snapshot */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Tennis & Cricket Facilities Status</CardTitle>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    Demonstration Schedule
                  </span>
                </div>
                <CardDescription>Live facility occupancy at Champions Club</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/bookings')}
              >
                Full Calendar &rarr;
              </Button>
            </CardHeader>

            <div className="divide-y divide-slate-100">
              {courtStatus.map((item) => (
                <div key={item.court} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                      {item.sport.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{item.court}</p>
                      <p className="text-[11px] text-slate-500">{item.current}</p>
                    </div>
                  </div>
                  <div>
                    {item.status === 'AVAILABLE' && (
                      <Badge variant="success" size="sm">Available</Badge>
                    )}
                    {item.status === 'IN_USE' && (
                      <Badge variant="warning" size="sm">In Match</Badge>
                    )}
                    {item.status === 'MAINTENANCE' && (
                      <Badge variant="danger" size="sm">Maintenance</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Activities Feed */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Recent Activity</CardTitle>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    Demo Feed
                  </span>
                </div>
                <CardDescription>Operations audit trail</CardDescription>
              </div>
            </CardHeader>

            <div className="space-y-4">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    {act.type === 'BOOKING' && <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" />}
                    {act.type === 'SHOP' && <ShoppingBag className="h-3.5 w-3.5 text-amber-600" />}
                    {act.type === 'MEMBER' && <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />}
                    {act.type === 'CAFE' && <Coffee className="h-3.5 w-3.5 text-indigo-600" />}
                    {act.type === 'INVENTORY' && <AlertCircle className="h-3.5 w-3.5 text-slate-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{act.title}</p>
                    <p className="text-[11px] text-slate-500">{act.description}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="flex items-center text-[10px] text-slate-400">
                        <Clock className="mr-1 h-3 w-3" />
                        {act.time}
                      </span>
                      <span className="text-[10px] font-medium text-emerald-600">{act.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
