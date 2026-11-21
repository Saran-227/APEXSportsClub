import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  AlertTriangle,
  ArrowDownUp,
  Package,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { PlaceholderNoticeBanner } from '../../components/common/PlaceholderNoticeBanner';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Product } from '../../types';

export const InventoryPage: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const demoProducts: Product[] = [
    {
      id: 'prod_1',
      sku: 'EQ-TEN-0092',
      name: 'Head Speed Pro 2026 Tennis Racket',
      category: 'RACKETS',
      unitPrice: 249.99,
      rentalPricePerHr: 15.0,
      stockQuantity: 12,
      reorderLevel: 3,
      status: 'IN_STOCK',
    },
    {
      id: 'prod_2',
      sku: 'BALL-WIL-US',
      name: 'Wilson US Open Extra Duty Balls (Can of 4)',
      category: 'BALLS',
      unitPrice: 8.99,
      stockQuantity: 3,
      reorderLevel: 20,
      status: 'LOW_STOCK',
    },
    {
      id: 'prod_3',
      sku: 'EQ-CR-SG01',
      name: 'SG Sunny Gold Pro English Willow Cricket Bat',
      category: 'RACKETS',
      unitPrice: 289.0,
      rentalPricePerHr: 15.0,
      stockQuantity: 8,
      reorderLevel: 2,
      status: 'IN_STOCK',
    },
    {
      id: 'prod_4',
      sku: 'APP-CC-SH',
      name: 'Champions Club Performance Dri-Fit Polo',
      category: 'APPAREL',
      unitPrice: 45.0,
      stockQuantity: 0,
      reorderLevel: 10,
      status: 'OUT_OF_STOCK',
    },
    {
      id: 'prod_5',
      sku: 'NUT-ISO-01',
      name: 'Optimum Whey Isolate Protein (2lb Tub)',
      category: 'NUTRITION',
      unitPrice: 54.99,
      stockQuantity: 18,
      reorderLevel: 5,
      status: 'IN_STOCK',
    },
  ];

  const filtered = demoProducts.filter(
    (p) => categoryFilter === 'ALL' || p.category === categoryFilter
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sports Equipment & Inventory"
        description="Monitor warehouse supplies, rental equipment, pro shop stock levels, and audit movements."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="md"
              leftIcon={<ArrowDownUp className="h-4 w-4" />}
              onClick={() => alert('Stock movement log will connect to POST /api/v1/inventory/stock-movements.')}
            >
              Record Movement
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => alert('Product addition will connect to POST /api/v1/products.')}
            >
              Add Item
            </Button>
          </div>
        }
      />

      <PlaceholderNoticeBanner moduleName="Inventory & Equipment Module" />

      {/* Stock summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-400">Total Catalog Items</span>
            <p className="text-xl font-bold text-slate-900">142 SKUs</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-400">Low Stock Warnings</span>
            <p className="text-xl font-bold text-amber-600">4 Items Need Reorder</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-400">Estimated Valuation</span>
            <p className="text-xl font-bold text-slate-900">$34,800.00</p>
          </div>
        </Card>
      </div>

      {/* Category selector */}
      <div className="flex items-center gap-2">
        {['ALL', 'RACKETS', 'BALLS', 'APPAREL', 'NUTRITION'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition ${
              categoryFilter === cat
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Inventory Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Item Name / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Retail Price</th>
                <th className="py-3 px-4">Stock on Hand</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Quick Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="font-mono text-[11px] text-slate-400">{product.sku}</p>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">{product.category}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">${product.unitPrice.toFixed(2)}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800">{product.stockQuantity}</span>
                    <span className="text-[11px] text-slate-400 ml-1">(min: {product.reorderLevel})</span>
                  </td>
                  <td className="py-3.5 px-4">
                    {product.status === 'IN_STOCK' && (
                      <Badge variant="success" size="sm">In Stock</Badge>
                    )}
                    {product.status === 'LOW_STOCK' && (
                      <Badge variant="warning" size="sm">Low Stock</Badge>
                    )}
                    {product.status === 'OUT_OF_STOCK' && (
                      <Badge variant="danger" size="sm">Out of Stock</Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => alert(`Restocking ${product.name} (POST /api/v1/inventory/stock-movements)`)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      + Order Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 pt-2">
        Contract Endpoint Reference: <code className="text-slate-600 font-mono">GET /api/v1/products</code> • <code className="text-slate-600 font-mono">GET /api/v1/inventory</code>
      </div>
    </div>
  );
};
