import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Receipt,
  RefreshCw,
  X,
} from 'lucide-react';
import { invoiceApi } from '../../services/api';
import type { Invoice } from '../../types';

type CategoryFilter = 'ALL' | 'MEMBERSHIP' | 'BOOKING' | 'SHOP' | 'CAFETERIA' | 'RENTAL';

export const CustomerInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Selected invoice for detail modal
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  // Resend email state tracking per invoice ID
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // PDF download loading state per invoice ID
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await invoiceApi.getInvoices();
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Unable to load invoices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownloadPdf = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      await invoiceApi.downloadInvoicePdf(invoice.id, invoice.invoice_number);
    } catch (err: any) {
      alert(`Failed to download PDF invoice: ${err.message || 'Please retry'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleResendEmail = async (invoice: Invoice) => {
    setResendingId(invoice.id);
    setResendStatus(null);
    try {
      const res = await invoiceApi.resendInvoiceEmail(invoice.id);
      setResendStatus({
        id: invoice.id,
        success: res.success,
        message: res.message,
      });
      // Update local invoice state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? {
                ...inv,
                email_status: res.email_status,
                email_sent_at: res.email_sent_at || inv.email_sent_at,
                email_retry_count: res.email_retry_count,
              }
            : inv
        )
      );
    } catch (err: any) {
      setResendStatus({
        id: invoice.id,
        success: false,
        message: err.message || 'Failed to dispatch email.',
      });
    } finally {
      setResendingId(null);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesCategory =
      selectedFilter === 'ALL' ? true : inv.transaction_type?.toUpperCase() === selectedFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      inv.invoice_number?.toLowerCase().includes(query) ||
      inv.reference_id?.toLowerCase().includes(query) ||
      inv.customer_name?.toLowerCase().includes(query) ||
      inv.transaction_type?.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'MEMBERSHIP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
            Membership
          </span>
        );
      case 'BOOKING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-700 border border-sky-500/20">
            Court Booking
          </span>
        );
      case 'SHOP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            Pro Shop
          </span>
        );
      case 'CAFETERIA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-700 border border-purple-500/20">
            Cafeteria
          </span>
        );
      case 'RENTAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-700 border border-teal-500/20">
            Rental
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-700 border border-slate-500/20">
            {type}
          </span>
        );
    }
  };

  const getEmailStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Sent to Email
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="h-3 w-3 text-rose-600" />
            Delivery Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-600" />
            Pending Dispatch
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D5] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-[#CCFF00]/20 border border-[#CCFF00]/40 text-slate-900">
              <Receipt className="h-5 w-5 text-slate-900" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              My Invoices & Receipts
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Instant automated tax invoices and receipts for memberships, court bookings, pro shop merchandise, rentals, and cafeteria orders.
          </p>
        </div>

        <button
          onClick={fetchInvoices}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-[#E2DAD0] text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Invoices' },
            { id: 'MEMBERSHIP', label: 'Memberships' },
            { id: 'BOOKING', label: 'Court Bookings' },
            { id: 'SHOP', label: 'Sports Shop' },
            { id: 'CAFETERIA', label: 'Cafeteria' },
            { id: 'RENTAL', label: 'Rentals' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as CategoryFilter)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-[#E2DAD0] text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number or ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-[#E2DAD0] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Toast Feedback for Resend */}
      {resendStatus && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-semibold ${
            resendStatus.success
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {resendStatus.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{resendStatus.message}</span>
          </div>
          <button
            onClick={() => setResendStatus(null)}
            className="p-1 rounded hover:bg-black/5 text-slate-500 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Invoices List / Table */}
      {isLoading ? (
        <div className="py-20 text-center">
          <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading your verified club invoices...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center">
          <AlertCircle className="h-8 w-8 text-rose-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-rose-900">{error}</p>
          <button
            onClick={fetchInvoices}
            className="mt-3 px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition"
          >
            Retry Loading
          </button>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#E8E2D5] shadow-sm">
          <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No Invoices Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {searchQuery
              ? 'No invoices match your current search filters.'
              : 'You have not completed any purchases in this category yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E2D5] shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E8E2D5] bg-[#FAF8F5] text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Email Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span>{inv.invoice_number}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">{getCategoryBadge(inv.transaction_type)}</td>
                    <td className="py-4 px-4 text-slate-600">
                      {new Date(inv.issued_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px] text-slate-500">
                      {inv.reference_id || '—'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{Number(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-4 px-4">{getEmailStatusBadge(inv.email_status)}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Breakdown */}
                        <button
                          type="button"
                          onClick={() => setActiveInvoice(inv)}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                          title="View Details"
                        >
                          View Details
                        </button>

                        {/* Download PDF */}
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(inv)}
                          disabled={downloadingId === inv.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-[#CCFF00] hover:bg-[#b8e600] text-slate-950 transition cursor-pointer disabled:opacity-50 shadow-sm"
                          title="Download PDF Invoice"
                        >
                          <Download className={`h-3 w-3 ${downloadingId === inv.id ? 'animate-bounce' : ''}`} />
                          PDF
                        </button>

                        {/* Resend Email */}
                        <button
                          type="button"
                          onClick={() => handleResendEmail(inv)}
                          disabled={resendingId === inv.id}
                          className="p-1.5 rounded-lg border border-[#E2DAD0] text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                          title="Resend Invoice to Email"
                        >
                          <Mail className={`h-3.5 w-3.5 ${resendingId === inv.id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredInvoices.map((inv) => (
              <div key={inv.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {inv.invoice_number}
                    </span>
                  </div>
                  {getCategoryBadge(inv.transaction_type)}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {new Date(inv.issued_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    ₹{Number(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>{getEmailStatusBadge(inv.email_status)}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveInvoice(inv)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(inv)}
                      disabled={downloadingId === inv.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-[#CCFF00] text-slate-950"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResendEmail(inv)}
                      disabled={resendingId === inv.id}
                      className="p-1 rounded-lg border border-slate-200 text-slate-600"
                    >
                      <Mail className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Itemized Invoice Modal */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#E8E2D5] shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E8E2D5] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-sm tracking-widest uppercase text-slate-900">
                    APEX SPORTS CLUB
                  </span>
                  {getCategoryBadge(activeInvoice.transaction_type)}
                </div>
                <h2 className="text-xl font-black text-slate-900 font-mono">
                  {activeInvoice.invoice_number}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Issued on {new Date(activeInvoice.issued_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveInvoice(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Customer & Transaction Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D5] text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Billed To</span>
                <p className="font-bold text-slate-900 mt-0.5">{activeInvoice.customer_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{activeInvoice.customer_email}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Reference ID</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {activeInvoice.reference_id || 'N/A'}
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold">Payment Confirmed</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Email Dispatch</span>
                <div className="mt-1">{getEmailStatusBadge(activeInvoice.email_status)}</div>
                {activeInvoice.email_sent_at && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Sent at {new Date(activeInvoice.email_sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>

            {/* Itemized Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Itemized Breakdown
              </h3>
              <div className="border border-[#E8E2D5] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#E8E2D5] text-slate-600 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeInvoice.items && activeInvoice.items.length > 0 ? (
                      activeInvoice.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {item.description}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                            ₹{Number(item.unit_price).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                            ₹{Number(item.total).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400 text-xs">
                          Single-entry transaction record
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Totals */}
            <div className="flex flex-col sm:flex-row justify-end items-end gap-2 border-t border-[#E8E2D5] pt-4">
              <div className="w-full sm:w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{Number(activeInvoice.subtotal).toFixed(2)}</span>
                </div>
                {Number(activeInvoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{Number(activeInvoice.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Tax:</span>
                  <span className="font-mono">₹{Number(activeInvoice.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
                  <span>Total Paid:</span>
                  <span className="font-mono text-base text-slate-900">
                    ₹{Number(activeInvoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E8E2D5]">
              <button
                type="button"
                onClick={() => handleResendEmail(activeInvoice)}
                disabled={resendingId === activeInvoice.id}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#E2DAD0] text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                <Mail className={`h-4 w-4 ${resendingId === activeInvoice.id ? 'animate-spin' : ''}`} />
                <span>Resend Invoice to Email</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveInvoice(null)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(activeInvoice)}
                  disabled={downloadingId === activeInvoice.id}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-slate-950 text-xs font-black transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
