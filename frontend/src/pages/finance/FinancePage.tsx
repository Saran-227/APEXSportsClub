import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  FileText,
  Download,
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { invoiceApi } from '../../services/api';
import type { Invoice, InvoiceSummary } from '../../types';

export const FinancePage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invs, sum] = await Promise.all([
        invoiceApi.getInvoices().catch(() => []),
        invoiceApi.getSummary().catch(() => null),
      ]);
      setInvoices(invs);
      setSummary(sum);
    } catch (e: any) {
      console.error('Failed to load finance data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadPdf = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      await invoiceApi.downloadInvoicePdf(inv.id, inv.invoice_number);
    } catch (err: any) {
      alert(`Failed to download PDF: ${err.message || 'Error occurred'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleResend = async (inv: Invoice) => {
    setResendingId(inv.id);
    setActionMessage(null);
    try {
      const res = await invoiceApi.resendInvoiceEmail(inv.id);
      setActionMessage(`Invoice ${inv.invoice_number}: ${res.message}`);
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === inv.id
            ? { ...i, email_status: res.email_status, email_retry_count: res.email_retry_count }
            : i
        )
      );
    } catch (err: any) {
      setActionMessage(`Error: ${err.message || 'Failed to dispatch email'}`);
    } finally {
      setResendingId(null);
    }
  };

  const filteredInvoices = invoices
    .filter((inv) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.reference_id?.toLowerCase().includes(q) ||
        inv.transaction_type?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance & Revenue Ledger"
        description="Consolidated revenue analytics across subscriptions, court booking fees, pro shop merchandise, rentals, and cafeteria orders."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              leftIcon={<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={loadData}
            >
              Refresh Data
            </Button>
          </div>
        }
      />

      {/* Action feedback banner */}
      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Live Revenue & Delivery Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Total Billed Revenue</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹{summary ? Number(summary.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
          </p>
          <div className="flex items-center text-emerald-600 text-xs font-semibold mt-2">
            <TrendingUp className="h-3.5 w-3.5 mr-1" />
            <span>{summary?.total_invoices || invoices.length} Completed Transactions</span>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-sky-500">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Emails Delivered (SendGrid)</span>
          <p className="text-2xl font-bold text-sky-600 mt-1">
            {summary?.successful_deliveries ?? invoices.filter((i) => i.email_status === 'SENT').length}
          </p>
          <div className="flex items-center text-sky-600 text-xs font-semibold mt-2">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verified SendGrid Dispatches
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Pending Deliveries</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {summary?.pending_deliveries ?? invoices.filter((i) => i.email_status === 'PENDING').length}
          </p>
          <div className="flex items-center text-amber-600 text-xs font-semibold mt-2">
            <Clock className="h-3.5 w-3.5 mr-1" /> In SendGrid Queue
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Failed Deliveries</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            {summary?.failed_deliveries ?? invoices.filter((i) => i.email_status === 'FAILED').length}
          </p>
          <div className="flex items-center text-rose-600 text-xs font-semibold mt-2">
            <AlertCircle className="h-3.5 w-3.5 mr-1" /> Can be resent below
          </div>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            <div>
              <CardTitle>Member Invoices & Billing Records</CardTitle>
              <p className="text-xs text-slate-400">Live automated invoices with PDF generation and SendGrid dispatch tracking</p>
            </div>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by invoice, name, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
            />
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Email Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    {isLoading ? 'Loading records...' : 'No invoices found.'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div>{inv.customer_name}</div>
                      <div className="text-[10px] text-slate-400">{inv.customer_email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {inv.transaction_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(inv.issued_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{Number(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.email_status === 'SENT' ? (
                        <Badge variant="success" size="sm">Sent</Badge>
                      ) : inv.email_status === 'FAILED' ? (
                        <Badge variant="danger" size="sm">Failed</Badge>
                      ) : (
                        <Badge variant="warning" size="sm">Pending</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(inv)}
                          disabled={downloadingId === inv.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer disabled:opacity-50"
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResend(inv)}
                          disabled={resendingId === inv.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-50 ml-2"
                          title="Resend Email"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>Resend</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
