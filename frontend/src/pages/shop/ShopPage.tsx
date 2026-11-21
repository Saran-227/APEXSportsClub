import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  CreditCard,
  Receipt,
  CheckCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { PlaceholderNoticeBanner } from '../../components/common/PlaceholderNoticeBanner';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { ShopOrder } from '../../types';

export const ShopPage: React.FC = () => {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const demoOrders: ShopOrder[] = [
    {
      orderId: 'ord_501',
      orderNumber: 'ORD-SHP-00501',
      customerName: 'Alexander Vance',
      memberId: 'mem_01',
      items: [
        { productId: 'p1', name: 'Wilson US Open Tennis Balls (4-can)', quantity: 2, unitPrice: 8.99, total: 17.98 },
        { productId: 'p2', name: 'Tourna Grip 3-Pack', quantity: 1, unitPrice: 6.50, total: 6.50 },
      ],
      subtotal: 24.48,
      tax: 1.96,
      total: 26.44,
      paymentStatus: 'PAID',
      paymentMethod: 'CARD',
      createdAt: '2026-11-21 10:20 AM',
    },
    {
      orderId: 'ord_502',
      orderNumber: 'ORD-SHP-00502',
      customerName: 'Elena Rostova',
      memberId: 'mem_02',
      items: [
        { productId: 'p3', name: 'Champions Club Dri-Fit Cap', quantity: 1, unitPrice: 28.00, total: 28.00 },
      ],
      subtotal: 28.00,
      tax: 2.24,
      total: 30.24,
      paymentStatus: 'PAID',
      paymentMethod: 'MEMBER_ACCOUNT',
      createdAt: '2026-11-21 09:45 AM',
    },
    {
      orderId: 'ord_503',
      orderNumber: 'ORD-SHP-00503',
      customerName: 'Guest Customer (Walk-in)',
      items: [
        { productId: 'p4', name: 'Gatorade Electrolyte 32oz', quantity: 2, unitPrice: 3.50, total: 7.00 },
      ],
      subtotal: 7.00,
      tax: 0.56,
      total: 7.56,
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      createdAt: '2026-11-21 08:30 AM',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pro Shop & Retail POS"
        description="Process merchandise sales, tournament merchandise, equipment purchases, and receipt reconciliation."
        actions={
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => alert('New POS checkout will connect to POST /api/v1/orders.')}
          >
            New Sale
          </Button>
        }
      />

      <PlaceholderNoticeBanner moduleName="Pro Shop POS Module" />

      {/* POS Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400">Today's Retail Volume</span>
              <p className="text-xl font-bold text-slate-900">$1,180.40</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400">Transactions Completed</span>
              <p className="text-xl font-bold text-slate-900">28 Orders</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400">Avg Basket Size</span>
              <p className="text-xl font-bold text-slate-900">$42.15</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Orders List */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent Pro Shop Transactions</CardTitle>
            <p className="text-xs text-slate-500">Live POS sales ledger</p>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items Purchased</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demoOrders.map((ord) => (
                <tr key={ord.orderId} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                    {ord.orderNumber}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900">{ord.customerName}</td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                    {ord.paymentMethod}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">${ord.total.toFixed(2)}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant="success" size="sm">
                      <CheckCircle className="mr-1 h-3 w-3" /> Paid
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(ord.orderNumber)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      Print Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedOrder && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-800 flex items-center justify-between">
          <span>Digital receipt ready for {selectedOrder} (GET /api/v1/orders/id).</span>
          <button
            onClick={() => setSelectedOrder(null)}
            className="font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="text-center text-xs text-slate-400 pt-2">
        Contract Endpoint Reference: <code className="text-slate-600 font-mono">POST /api/v1/orders</code> • <code className="text-slate-600 font-mono">GET /api/v1/orders</code>
      </div>
    </div>
  );
};
