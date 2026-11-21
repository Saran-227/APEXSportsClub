import React, { useState } from 'react';
import {
  Plus,
  UtensilsCrossed,
  DollarSign,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { PlaceholderNoticeBanner } from '../../components/common/PlaceholderNoticeBanner';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { CafeTable, CafeOrder } from '../../types';

export const CafeteriaPage: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const demoTables: CafeTable[] = [
    { tableId: 'tbl_01', tableNumber: 1, section: 'Pavilion Terrace', seats: 4, status: 'OCCUPIED', currentOrderId: 'ord_c1', currentTotal: 48.50 },
    { tableId: 'tbl_02', tableNumber: 2, section: 'Pavilion Terrace', seats: 4, status: 'AVAILABLE', currentTotal: 0 },
    { tableId: 'tbl_03', tableNumber: 3, section: 'Cricket Pavilion Bar', seats: 2, status: 'OCCUPIED', currentOrderId: 'ord_c2', currentTotal: 22.00 },
    { tableId: 'tbl_04', tableNumber: 4, section: 'Cricket Pavilion Bar', seats: 2, status: 'AVAILABLE', currentTotal: 0 },
    { tableId: 'tbl_05', tableNumber: 5, section: 'Center Court Balcony', seats: 6, status: 'RESERVED', currentTotal: 0 },
    { tableId: 'tbl_06', tableNumber: 6, section: 'Center Court Balcony', seats: 6, status: 'OCCUPIED', currentOrderId: 'ord_c3', currentTotal: 84.00 },
  ];

  const demoActiveOrders: CafeOrder[] = [
    { orderId: 'ord_c1', tableNumber: 1, status: 'IN_PREPARATION', itemCount: 3, elapsedMinutes: 14, totalAmount: 48.50 },
    { orderId: 'ord_c2', tableNumber: 3, status: 'READY', itemCount: 2, elapsedMinutes: 8, totalAmount: 22.00 },
    { orderId: 'ord_c3', tableNumber: 6, status: 'OPEN', itemCount: 5, elapsedMinutes: 22, totalAmount: 84.00 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pavilion Cafeteria & Bar POS"
        description="Floor seating layout, active kitchen tickets, beverage bar tabs, and payment settlement for Champions Club members and guests."
        actions={
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => alert('Opening new cafeteria tab connects to POST /api/v1/cafe/orders.')}
          >
            Open Tab
          </Button>
        }
      />

      <PlaceholderNoticeBanner moduleName="Bar & Cafeteria POS Module" />

      {/* Tables Grid */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Floor Plan & Table Occupancy</CardTitle>
            <p className="text-xs text-slate-500">Tap table to view active bill or settle tab</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Occupied</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Reserved</span>
          </div>
        </CardHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {demoTables.map((tbl) => (
            <div
              key={tbl.tableId}
              onClick={() => setSelectedTable(`Table #${tbl.tableNumber} (${tbl.section}) - Tab: $${tbl.currentTotal.toFixed(2)}`)}
              className={`rounded-xl border p-4 text-center cursor-pointer transition hover:scale-102 ${
                tbl.status === 'AVAILABLE'
                  ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50'
                  : tbl.status === 'OCCUPIED'
                  ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'
                  : 'border-sky-200 bg-sky-50/40 hover:bg-sky-50'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase">{tbl.section}</span>
              <p className="text-lg font-extrabold text-slate-900 mt-1">Table {tbl.tableNumber}</p>
              <p className="text-[11px] text-slate-500">{tbl.seats} seats</p>

              <div className="mt-3 pt-2 border-t border-slate-200/60">
                {tbl.status === 'OCCUPIED' ? (
                  <span className="font-bold text-slate-900 text-xs">${tbl.currentTotal.toFixed(2)}</span>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-600 uppercase">Free</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Selected Table details */}
      {selectedTable && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-amber-700" />
            <span className="font-semibold">{selectedTable}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert('Settle action connects to POST /api/v1/cafe/orders/{id}/settle')}
            >
              <DollarSign className="h-3 w-3 mr-1" /> Settle Bill
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTable(null)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Kitchen Order Stream */}
      <Card>
        <CardHeader>
          <CardTitle>Kitchen & Bar Order Tickets</CardTitle>
          <Badge variant="emerald" size="sm">3 Tickets Active</Badge>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {demoActiveOrders.map((ord) => (
            <div key={ord.orderId} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Table {ord.tableNumber}</span>
                {ord.status === 'IN_PREPARATION' && <Badge variant="warning" size="sm">Prepping</Badge>}
                {ord.status === 'READY' && <Badge variant="success" size="sm">Ready to Serve</Badge>}
                {ord.status === 'OPEN' && <Badge variant="neutral" size="sm">Open Tab</Badge>}
              </div>
              <p className="text-xs text-slate-600">{ord.itemCount} items ordered</p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                <span>Elapsed: {ord.elapsedMinutes} mins</span>
                <span className="font-bold text-slate-900">${ord.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="text-center text-xs text-slate-400 pt-2">
        Contract Endpoint Reference: <code className="text-slate-600 font-mono">GET /api/v1/cafe/tables</code> • <code className="text-slate-600 font-mono">POST /api/v1/cafe/orders</code>
      </div>
    </div>
  );
};
