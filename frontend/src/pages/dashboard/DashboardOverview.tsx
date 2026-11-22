import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { analyticsApi, employeesApi } from '../../services/api';
import type { AdminRealtimeDashboardData } from '../../types';

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminRealtimeDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MEMBERSHIPS' | 'INVOICING' | 'PAYROLL' | 'LEAVES' | 'TAXES'>('OVERVIEW');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) setIsRefreshing(true);
    try {
      const response = await analyticsApi.getRealtimeDashboard();
      setData(response);
      setError(null);
      setLastSyncTime(new Date());
    } catch (err: unknown) {
      console.error('Failed to load real-time admin analytics:', err);
      setError('Failed to synchronize real-time analytics from PostgreSQL database.');
    } finally {
      setIsLoading(false);
      if (showRefreshingSpinner) setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  // Polling every 15 seconds if auto-refresh is active
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboardData]);

  const handleLeaveAction = async (leaveId: string, action: 'approve' | 'reject') => {
    setActionLoadingId(leaveId);
    try {
      if (action === 'approve') {
        await employeesApi.approveLeave(leaveId, 'Approved by Administrator from Real-time Dashboard');
        setActionSuccessMsg('Leave request approved successfully.');
      } else {
        await employeesApi.rejectLeave(leaveId, 'Declined by Administrator based on staffing capacity');
        setActionSuccessMsg('Leave request declined.');
      }
      await fetchDashboardData(false);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: unknown) {
      console.error(`Failed to ${action} leave request:`, err);
      alert(`Error updating leave request status. Please try again.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatINR = (val: number | string | undefined): string => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const exportTaxCsv = () => {
    if (!data?.taxes_to_report) return;
    const tax = data.taxes_to_report;
    const headers = ['Category', 'Taxable Revenue (INR)', 'Tax Collected (18% GST INR)', 'Tax Rate (%)'];
    const rows = tax.taxes_by_category.map((c) => [
      c.category,
      c.taxable_amount,
      c.tax_collected,
      `${c.tax_rate_percent}%`,
    ]);
    rows.push(['TOTAL', tax.total_taxable_revenue, tax.total_tax_collected, `${tax.effective_tax_rate}%`]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [`APEX SPORTS CLUB - STATUTORY TAX REPORT (GSTIN: ${tax.club_tax_id})`, `Generated At: ${new Date().toISOString()}`, '', headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `apex_sports_tax_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-slate-600">Querying real-time PostgreSQL analytics ledger...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600" />
        <h3 className="mt-2 text-base font-semibold text-rose-900">Database Connection Error</h3>
        <p className="mt-1 text-sm text-rose-700">{error}</p>
        <Button variant="primary" size="sm" className="mt-4" onClick={() => fetchDashboardData(true)}>
          Retry Synchronization
        </Button>
      </div>
    );
  }

  const m = data?.memberships;
  const c = data?.clients_to_invoice;
  const e = data?.employees_to_pay;
  const l = data?.leave_to_approve;
  const t = data?.taxes_to_report;

  return (
    <div className="space-y-6">
      {/* Top Header & Real-time Live Badge */}
      <PageHeader
        title="Executive Club Operations & Analytics"
        description="Unified live data pipeline querying memberships, client invoices, payroll liabilities, leave approvals, and tax reports directly from PostgreSQL."
        badge={
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${autoRefresh ? 'bg-emerald-400 opacity-75' : 'bg-slate-300'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${autoRefresh ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {autoRefresh ? 'Live Sync (15s)' : 'Paused'} • {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-xs"
            >
              {autoRefresh ? 'Pause Polling' : 'Resume Polling'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Action Notification Toast */}
      {actionSuccessMsg && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2.5 border border-emerald-200 text-xs font-medium text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            &times;
          </button>
        </div>
      )}

      {/* 5 Core Executive KPI Stat Cards (Ultra-clean, Minimalist Data Only) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Active Members"
          value={m?.active_members ?? 0}
          change={`+${m?.new_this_month ?? 0} this mo`}
          isPositive={true}
          subtitle={`${m?.total_members ?? 0} registered`}
          isPlaceholder={false}
        />
        <StatCard
          title="Clients to Invoice"
          value={formatINR(c?.total_pending_amount)}
          change={`${c?.pending_invoices_count ?? 0} due / ${c?.overdue_invoices_count ?? 0} overdue`}
          isPositive={(c?.overdue_invoices_count ?? 0) === 0}
          subtitle="Uncollected balance"
          isPlaceholder={false}
        />
        <StatCard
          title="Monthly Payroll"
          value={formatINR(e?.total_monthly_payroll)}
          change={`${e?.total_active_employees ?? 0} active staff`}
          isPositive={true}
          subtitle={`${e?.departments_count ?? 0} departments`}
          isPlaceholder={false}
        />
        <StatCard
          title="Leaves to Approve"
          value={l?.pending_count ?? 0}
          change={l?.pending_count ? 'Urgent action' : 'All clear'}
          isPositive={(l?.pending_count ?? 0) === 0}
          subtitle={`${l?.on_leave_today ?? 0} on leave today`}
          isPlaceholder={false}
        />
        <StatCard
          title="Tax Liability"
          value={formatINR(t?.total_tax_collected)}
          change="18% GST filing"
          isPositive={true}
          subtitle={t?.filing_status || 'On Schedule'}
          isPlaceholder={false}
        />
      </div>

      {/* Minimalist Professional Segmented Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition ${
            activeTab === 'OVERVIEW' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Executive Overview
        </button>
        <button
          onClick={() => setActiveTab('MEMBERSHIPS')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition ${
            activeTab === 'MEMBERSHIPS' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Memberships</span>
          <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] text-slate-700">
            {m?.total_members ?? 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('INVOICING')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition ${
            activeTab === 'INVOICING' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Clients to Invoice</span>
          {(c?.pending_invoices_count ?? 0) > 0 && (
            <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] text-amber-900 font-bold">
              {(c?.pending_invoices_count ?? 0) + (c?.overdue_invoices_count ?? 0)}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('PAYROLL')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition ${
            activeTab === 'PAYROLL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Employees to Pay</span>
          <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] text-slate-700">
            {e?.total_staff ?? 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('LEAVES')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition ${
            activeTab === 'LEAVES' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Leave Approvals</span>
          {(l?.pending_count ?? 0) > 0 && (
            <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[10px] text-white font-bold animate-pulse">
              {l?.pending_count}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('TAXES')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition ${
            activeTab === 'TAXES' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Taxes to Report</span>
          <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-semibold">
            GSTIN
          </span>
        </button>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Urgent Action Alert Cards */}
          {(l?.pending_count ?? 0) > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    {l?.pending_count} Employee Leave Request{l?.pending_count === 1 ? '' : 's'} Pending Approval
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Staff members have submitted time-off requests that need administrative sign-off before shifts are scheduled.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('LEAVES')}
                className="bg-white border-amber-300 text-amber-800 text-xs shrink-0"
              >
                Review Leaves &rarr;
              </Button>
            </div>
          )}

          {(c?.overdue_invoices_count ?? 0) > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-900">
                    {c?.overdue_invoices_count} Client Invoice{c?.overdue_invoices_count === 1 ? '' : 's'} Past Due
                  </p>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Outstanding balance requires invoicing or payment reminder collection from client accounts.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('INVOICING')}
                className="bg-white border-rose-300 text-rose-800 text-xs shrink-0"
              >
                View Invoices &rarr;
              </Button>
            </div>
          )}

          {/* Quick Dual Columns: Recent Members & Pending Invoices */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Members Column */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Recent Member Enrollments</CardTitle>
                  <CardDescription>Live registrations from PostgreSQL</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('MEMBERSHIPS')}>
                  All Members &rarr;
                </Button>
              </CardHeader>
              <div className="divide-y divide-slate-100">
                {m?.recent_members?.slice(0, 5).map((mem) => (
                  <div key={mem.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{mem.name}</p>
                      <p className="text-[11px] text-slate-500">{mem.email} • {mem.membership_number}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        {mem.tier}
                      </span>
                      <span className="text-[10px] text-slate-400">Joined {formatDate(mem.joined_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Pending Clients to Invoice Column */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Clients to Invoice & Outstanding Dues</CardTitle>
                  <CardDescription>Unpaid corporate & member bookings</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('INVOICING')}>
                  Full Ledger &rarr;
                </Button>
              </CardHeader>
              <div className="divide-y divide-slate-100">
                {c?.pending_clients?.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{inv.customer_name}</span>
                        {inv.is_overdue ? (
                          <Badge variant="danger" size="sm">Overdue</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Pending</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{inv.invoice_number} • Due {formatDate(inv.due_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900">{formatINR(inv.amount)}</p>
                      <span className="text-[10px] text-slate-400">{inv.transaction_type}</span>
                    </div>
                  </div>
                ))}
                {(!c?.pending_clients || c.pending_clients.length === 0) && (
                  <p className="text-xs text-slate-500 py-6 text-center">No outstanding client invoices found.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERSHIPS INFORMATION */}
      {activeTab === 'MEMBERSHIPS' && (
        <div className="space-y-6">
          {/* Plan Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {m?.plans_breakdown?.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{p.name}</span>
                  <Badge variant="emerald" size="sm">{formatINR(p.price)}/yr</Badge>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">{p.member_count} <span className="text-xs font-normal text-slate-400">members</span></p>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${p.percent}%` }}></div>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500 text-right">{p.percent}% of active memberships</p>
              </Card>
            ))}
          </div>

          {/* Members Table */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Member Directory & Subscription Ledger</CardTitle>
                <CardDescription>All individual and corporate member profiles recorded in PostgreSQL</CardDescription>
              </div>
              <Button variant="primary" size="sm" onClick={() => navigate('/members')}>
                Add Member
              </Button>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Member Name</th>
                    <th className="py-2.5 px-3">Membership #</th>
                    <th className="py-2.5 px-3">Tier Plan</th>
                    <th className="py-2.5 px-3">Joined Date</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {m?.recent_members?.map((mem) => (
                    <tr key={mem.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {mem.name}
                        <span className="block text-[11px] font-normal text-slate-400">{mem.email}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{mem.membership_number}</td>
                      <td className="py-2.5 px-3 font-medium text-emerald-700">{mem.tier}</td>
                      <td className="py-2.5 px-3 text-slate-600">{formatDate(mem.joined_date)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{formatDate(mem.expiry_date)}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={mem.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                          {mem.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: CLIENTS TO INVOICE */}
      {activeTab === 'INVOICING' && (
        <div className="space-y-6">
          {/* Pending Invoices Table */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Clients & Business Accounts to Invoice</CardTitle>
                <CardDescription>Unsettled reservations, equipment rentals, and partner facility fees</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning" size="md">
                  Total Due: {formatINR(c?.total_pending_amount)}
                </Badge>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Client / Business</th>
                    <th className="py-2.5 px-3">Invoice Number</th>
                    <th className="py-2.5 px-3">Activity Type</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-right">18% GST</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {c?.pending_clients?.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {inv.customer_name}
                        <span className="block text-[11px] font-normal text-slate-400">{inv.customer_email}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{inv.invoice_number}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{inv.transaction_type}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatINR(inv.subtotal)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatINR(inv.tax_amount)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatINR(inv.amount)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{formatDate(inv.due_date)}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={inv.is_overdue ? 'danger' : 'warning'} size="sm">
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(!c?.pending_clients || c.pending_clients.length === 0) && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-xs text-slate-500">
                        All client accounts and corporate invoices are fully settled.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Business Vendors Directory */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Registered Business Partners & Vendors</CardTitle>
                <CardDescription>Third-party facility operators and commercial concessions</CardDescription>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Business Entity</th>
                    <th className="py-2.5 px-3">Owner Contact</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">GSTIN / Tax ID</th>
                    <th className="py-2.5 px-3 text-right">Lifetime Billed</th>
                    <th className="py-2.5 px-3">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {c?.business_vendors?.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{v.business_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {v.owner_name}
                        <span className="block text-[11px] text-slate-400">{v.contact_email}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{v.vendor_type}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{v.tax_id || 'Not Registered'}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatINR(v.total_revenue)}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={v.status === 'APPROVED' ? 'success' : 'neutral'} size="sm">
                          {v.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: EMPLOYEES TO PAY */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Staff Compensation & Monthly Payroll Ledger</CardTitle>
                <CardDescription>Real-time compensation computed from employee hourly rates in PostgreSQL</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="emerald" size="md">
                  Monthly Liability: {formatINR(e?.total_monthly_payroll)}
                </Badge>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Job Title</th>
                    <th className="py-2.5 px-3 text-right">Hourly Rate</th>
                    <th className="py-2.5 px-3 text-right">Est. Monthly Pay</th>
                    <th className="py-2.5 px-3">Hire Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Disbursement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {e?.payroll_roster?.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {emp.full_name}
                        <span className="block text-[11px] font-normal text-slate-400">{emp.email}</span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{emp.department}</td>
                      <td className="py-2.5 px-3 text-slate-600">{emp.job_title}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatINR(emp.hourly_rate)}/hr</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatINR(emp.estimated_monthly_pay)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{formatDate(emp.hire_date)}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'warning'} size="sm">
                          {emp.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Ready
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: LEAVE TO APPROVE */}
      {activeTab === 'LEAVES' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Staff Leave Approvals Queue</CardTitle>
                <CardDescription>Review and approve employee time-off requests with instant database update</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {l?.pending_count ?? 0} Pending • {l?.approved_count ?? 0} Approved
                </span>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Staff Member</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Leave Type</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {l?.requests?.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{req.employee_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{req.department}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {req.leave_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {formatDate(req.start_date)} - {formatDate(req.end_date)}
                        <span className="block text-[11px] font-semibold text-slate-500">({req.days_count} day{req.days_count === 1 ? '' : 's'})</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs">{req.reason}</td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'danger' : 'warning'
                          }
                          size="sm"
                        >
                          {req.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-rose-700 hover:bg-rose-50 border-rose-300"
                              onClick={() => handleLeaveAction(req.id, 'reject')}
                              disabled={actionLoadingId === req.id}
                            >
                              Reject
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleLeaveAction(req.id, 'approve')}
                              isLoading={actionLoadingId === req.id}
                            >
                              Approve
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!l?.requests || l.requests.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-xs text-slate-500">
                        No pending staff leave applications.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: TAXES TO REPORT */}
      {activeTab === 'TAXES' && (
        <div className="space-y-6">
          {/* Statutory Tax Summary Banner */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Statutory Tax Compliance (India GST)</span>
                <Badge variant="emerald" size="sm">Active Registered</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Club GSTIN: <span className="font-mono font-bold text-slate-800">{t?.club_tax_id}</span> • Standard Rate: 18% (9% CGST + 9% SGST)
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Next Filing Deadline: <span className="font-semibold text-slate-700">{formatDate(t?.next_filing_deadline)}</span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={exportTaxCsv}
            >
              Export Tax Summary (CSV)
            </Button>
          </div>

          {/* Tax Breakdown by Revenue Stream Table */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Tax Collection Ledger by Operational Category</CardTitle>
                <CardDescription>Billed taxable amounts and accrued GST components</CardDescription>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Revenue Stream</th>
                    <th className="py-2.5 px-3 text-right">Taxable Turnover</th>
                    <th className="py-2.5 px-3 text-right">Statutory GST (18%)</th>
                    <th className="py-2.5 px-3 text-right">Gross Receipts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {t?.taxes_by_category?.map((c) => (
                    <tr key={c.category} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{c.category}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">{formatINR(c.taxable_amount)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatINR(c.tax_collected)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatINR(Number(c.taxable_amount) + Number(c.tax_collected))}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/80 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3 px-3">TOTAL TAXABLE TURNOVER</td>
                    <td className="py-3 px-3 text-right">{formatINR(t?.total_taxable_revenue)}</td>
                    <td className="py-3 px-3 text-right text-emerald-700">{formatINR(t?.total_tax_collected)}</td>
                    <td className="py-3 px-3 text-right">{formatINR(t?.total_gross_revenue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
