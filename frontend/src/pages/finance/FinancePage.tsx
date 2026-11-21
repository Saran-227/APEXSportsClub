import React from 'react';
import {
  TrendingUp,
  FileText,
  Download,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { PlaceholderNoticeBanner } from '../../components/common/PlaceholderNoticeBanner';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Invoice } from '../../types';

export const FinancePage: React.FC = () => {
  const demoInvoices: Invoice[] = [
    { id: 'inv_1', invoiceNumber: 'INV-2026-1049', memberName: 'Alexander Vance', issueDate: 'Nov 15, 2026', dueDate: 'Nov 30, 2026', amount: 850.00, status: 'PAID' },
    { id: 'inv_2', invoiceNumber: 'INV-2026-1050', memberName: 'Elena Rostova', issueDate: 'Nov 16, 2026', dueDate: 'Dec 01, 2026', amount: 850.00, status: 'PAID' },
    { id: 'inv_3', invoiceNumber: 'INV-2026-1051', memberName: 'Marcus Sterling', issueDate: 'Nov 01, 2026', dueDate: 'Nov 15, 2026', amount: 150.00, status: 'OVERDUE' },
    { id: 'inv_4', invoiceNumber: 'INV-2026-1052', memberName: 'Leo Aris (Junior)', issueDate: 'Nov 20, 2026', dueDate: 'Dec 05, 2026', amount: 350.00, status: 'UNPAID' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance & Revenue Ledger"
        description="Consolidated revenue analytics across subscriptions, tennis & cricket booking fees, retail pro shop merchandise, and cafeteria."
        actions={
          <Button
            variant="outline"
            size="md"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => alert('Exporting statement (GET /api/v1/finance/reports)')}
          >
            Export Statement
          </Button>
        }
      />

      <PlaceholderNoticeBanner moduleName="Finance & Invoicing Module" />

      {/* Revenue Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Total Monthly Revenue</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">$48,250.00</p>
          <div className="flex items-center text-emerald-600 text-xs font-semibold mt-2">
            <TrendingUp className="h-3.5 w-3.5 mr-1" /> +14.2% vs last month
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-sky-500">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Memberships (Gold/Silver/Junior)</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">$28,400.00</p>
          <p className="text-[11px] text-slate-400 mt-2">58.8% of total revenue</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-500">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Court & Pitch Bookings</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">$11,200.00</p>
          <p className="text-[11px] text-slate-400 mt-2">23.2% of total revenue</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Retail & Cafeteria</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">$8,650.00</p>
          <p className="text-[11px] text-slate-400 mt-2">18.0% of total revenue</p>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            <CardTitle>Member Invoices & Billing Records</CardTitle>
          </div>
          <span className="text-xs text-slate-400">Auto-generated via FastAPI billing worker</span>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demoInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-700">{inv.invoiceNumber}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-900">{inv.memberName}</td>
                  <td className="py-3.5 px-4 text-slate-600">{inv.issueDate}</td>
                  <td className="py-3.5 px-4 text-slate-600">{inv.dueDate}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">${inv.amount.toFixed(2)}</td>
                  <td className="py-3.5 px-4">
                    {inv.status === 'PAID' && <Badge variant="success" size="sm">Paid</Badge>}
                    {inv.status === 'UNPAID' && <Badge variant="warning" size="sm">Pending</Badge>}
                    {inv.status === 'OVERDUE' && <Badge variant="danger" size="sm">Overdue</Badge>}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => alert(`Viewing PDF for ${inv.invoiceNumber}`)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      View Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-center text-xs text-slate-400 pt-2">
        Contract Endpoint Reference: <code className="text-slate-600 font-mono">GET /api/v1/finance/reports</code> • <code className="text-slate-600 font-mono">GET /api/v1/finance/invoices</code>
      </div>
    </div>
  );
};
