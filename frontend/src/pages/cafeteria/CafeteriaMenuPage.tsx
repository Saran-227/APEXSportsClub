import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  X,
  Clock,
  Flame,
  Search,
} from 'lucide-react';
import { cafeteriaApi } from '../../services/api';

export const CafeteriaMenuPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'SHAKES',
    price: 150,
    description: '',
    calories: 250,
    preparation_time_minutes: 10,
    is_available: true,
  });

  const loadMenu = async () => {
    try {
      const data = await cafeteriaApi.getOwnerMenu();
      setItems(data);
    } catch (err) {
      console.error('Failed to load owner menu', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const handleToggleAvailability = async (item: any) => {
    try {
      await cafeteriaApi.updateMenuItem(item.id, {
        is_available: !item.is_available,
      });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update item availability');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await cafeteriaApi.addMenuItem({
        ...formData,
        price: Number(formData.price),
        calories: Number(formData.calories),
        preparation_time_minutes: Number(formData.preparation_time_minutes),
      });
      setShowAddModal(false);
      setFormData({
        name: '',
        category: 'SHAKES',
        price: 150,
        description: '',
        calories: 250,
        preparation_time_minutes: 10,
        is_available: true,
      });
      await loadMenu();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create menu item');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['ALL', 'SHAKES', 'BOWLS', 'SNACKS', 'BEVERAGES', 'MAINS'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <UtensilsCrossed className="h-6 w-6 text-emerald-400" />
            Menu & Inventory Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure dishes, nutrition, prep duration, and live sold-out status.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="h-4 w-4" />
          Add Menu Item
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#171A1D] border border-[#25292D] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-[#171A1D] border border-[#25292D] text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Table / Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading cafeteria menu...</div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-[#171A1D] border border-[#25292D] rounded-2xl">
          No menu items found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition ${
                item.is_available
                  ? 'bg-[#171A1D] border-[#25292D]'
                  : 'bg-[#171A1D]/50 border-red-500/20 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded bg-[#202428] px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase">
                    {item.category}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{item.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {item.description || 'Nutrient-rich performance food for athletes.'}
                  </p>
                </div>
                <span className="text-base font-black text-emerald-400 whitespace-nowrap">
                  ₹{item.price}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-4 border-t border-[#25292D] pt-3">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  {item.preparation_time_minutes} min prep
                </span>
                {item.calories && (
                  <span className="flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-amber-500" />
                    {item.calories} kcal
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-2 border-t border-[#25292D]">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    item.is_available
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}
                >
                  {item.is_available ? 'Available' : 'Sold Out'}
                </span>

                <button
                  onClick={() => handleToggleAvailability(item)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                    item.is_available
                      ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {item.is_available ? 'Mark Sold Out' : 'Restore Available'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#171A1D] border border-[#25292D] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#25292D] pb-3">
              <h2 className="text-lg font-bold text-white">Add New Menu Item</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avocado Toast with Poached Egg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#202428] border border-[#2e3338] text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#202428] border border-[#2e3338] text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="SHAKES">SHAKES</option>
                    <option value="BOWLS">BOWLS</option>
                    <option value="SNACKS">SNACKS</option>
                    <option value="BEVERAGES">BEVERAGES</option>
                    <option value="MAINS">MAINS</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#202428] border border-[#2e3338] text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Calories (kcal)</label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#202428] border border-[#2e3338] text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">Prep Time (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.preparation_time_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, preparation_time_minutes: Number(e.target.value) })
                    }
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#202428] border border-[#2e3338] text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingredients and culinary notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#202428] border border-[#2e3338] text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#25292D]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#25292D] text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 transition"
                >
                  {submitting ? 'Saving...' : 'Add to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
