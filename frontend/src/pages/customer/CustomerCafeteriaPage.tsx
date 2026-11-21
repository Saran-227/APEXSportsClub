import React, { useState, useEffect } from 'react';
import {
  Coffee,
  ShoppingCart,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  X,
  Clock,
} from 'lucide-react';
import { cafeteriaApi } from '../../services/api';

export const CustomerCafeteriaPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<Array<{ item: any; quantity: number; notes: string }>>([]);
  const [orderType, setOrderType] = useState<string>('DINE_IN');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOrdering, setIsOrdering] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);

  const categories = ['All', 'Post-Workout', 'Healthy Bowls', 'Snacks', 'Beverages', 'Mains'];

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      cafeteriaApi.getMenu(selectedCategory === 'All' ? undefined : selectedCategory),
      cafeteriaApi.getOrders().catch(() => []),
    ])
      .then(([m, ords]) => {
        setMenuItems(m);
        setMyOrders(ords);
      })
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setIsLoading(false));
  }, [selectedCategory]);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => (c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { item, quantity: 1, notes: '' }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id === itemId) {
            const nextQty = c.quantity + delta;
            return nextQty > 0 ? { ...c, quantity: nextQty } : null;
          }
          return c;
        })
        .filter(Boolean) as Array<{ item: any; quantity: number; notes: string }>
    );
  };

  const subtotal = cart.reduce((acc, c) => acc + Number(c.item.price) * c.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsOrdering(true);
    setErrorMessage(null);
    try {
      const payload = {
        items: cart.map((c) => ({
          menu_item_id: c.item.id,
          quantity: c.quantity,
          special_instructions: c.notes || undefined,
        })),
        order_type: orderType,
        customer_notes: customerNotes || undefined,
      };
      const res = await cafeteriaApi.createOrder(payload);
      setOrderSuccess(res);
      setCart([]);
      setIsCartOpen(false);
      const updatedOrders = await cafeteriaApi.getOrders();
      setMyOrders(updatedOrders);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || err.message || 'Order failed');
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C7FF36]/10 border border-[#C7FF36]/30 text-[#C7FF36] text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Apex Fuel & Nutrition Lounge</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Kitchen & Fuel Bar
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cold-pressed detox elixirs, whey protein isolate shakes, artisanal toasts, and healthy grain bowls.
          </p>
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171A1D] border border-[#25292D] text-white hover:border-[#C7FF36]/50 transition cursor-pointer self-start sm:self-auto"
        >
          <ShoppingCart className="h-4 w-4 text-[#C7FF36]" />
          <span className="text-xs font-bold">Meal Tray ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#C7FF36] text-slate-950 font-bold text-[10px] flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {orderSuccess && (
        <div className="rounded-2xl bg-[#171A1D] border-2 border-[#C7FF36] p-6 shadow-2xl animate-in fade-in">
          <div className="flex items-center gap-3 text-[#C7FF36] mb-2">
            <CheckCircle2 className="h-6 w-6" />
            <h3 className="text-lg font-bold text-white">Order Sent to Kitchen!</h3>
          </div>
          <p className="text-xs text-slate-300">
            Ticket ID: <strong className="text-white font-mono">{orderSuccess.order_number}</strong> • Status: <strong className="text-[#C7FF36]">{orderSuccess.status}</strong>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Our culinary team is preparing your nutrition. You can pick it up at the lounge bar once ready.
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              selectedCategory === cat
                ? 'bg-[#C7FF36] text-slate-950 border-[#C7FF36] font-bold shadow-md shadow-[#C7FF36]/20'
                : 'bg-[#171A1D] text-slate-300 border-[#25292D] hover:bg-[#25292D]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Items Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs">Loading healthy menu...</div>
      ) : menuItems.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-xs rounded-2xl bg-[#171A1D] border border-[#25292D]">
          No menu items found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-[#171A1D] border border-[#25292D] hover:border-slate-700 transition flex flex-col justify-between overflow-hidden shadow-xl group"
            >
              <div>
                <div className="h-40 bg-[#101316] relative overflow-hidden">
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#101316]/80 text-[#C7FF36] border border-[#25292D] backdrop-blur-xs">
                    {item.category}
                  </span>
                </div>

                <div className="p-5 space-y-2">
                  <h4 className="text-sm font-bold text-white group-hover:text-[#C7FF36] transition">{item.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                  <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {item.preparation_time_minutes} mins prep
                    </span>
                    {item.calories && (
                      <span className="flex items-center gap-1">
                        <Flame className="h-3 w-3 text-amber-400" />
                        {item.calories} kcal
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <div className="flex items-center justify-between pt-3 border-t border-[#25292D]">
                  <span className="text-base font-extrabold text-white">₹{item.price}</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="px-4 py-1.5 rounded-xl bg-[#C7FF36] text-slate-950 font-bold text-xs hover:bg-[#b0e600] transition shadow-md shadow-[#C7FF36]/20 cursor-pointer"
                  >
                    + Add to Order
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-[#171A1D] border-l border-[#25292D] h-full shadow-2xl flex flex-col justify-between p-6 z-10 animate-in slide-in-from-right">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#25292D]">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Coffee className="h-5 w-5 text-[#C7FF36]" />
                  <span>Your Food & Drink Tray</span>
                </h3>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">No food items added yet.</div>
              ) : (
                <div className="mt-4 space-y-3 overflow-y-auto max-h-[50vh] pr-1">
                  {cart.map((c) => (
                    <div
                      key={c.item.id}
                      className="p-3 rounded-xl bg-[#101316] border border-[#25292D] flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{c.item.name}</p>
                        <p className="text-[11px] text-[#C7FF36] font-semibold">₹{c.item.price}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg bg-[#171A1D] border border-[#25292D]">
                          <button
                            onClick={() => updateQuantity(c.item.id, -1)}
                            className="p-1 hover:text-[#C7FF36] text-slate-400 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-white">{c.quantity}</span>
                          <button
                            onClick={() => updateQuantity(c.item.id, 1)}
                            className="p-1 hover:text-[#C7FF36] text-slate-400 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-[#25292D] space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOrderType('DINE_IN')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                      orderType === 'DINE_IN'
                        ? 'bg-[#C7FF36] text-slate-950 border-[#C7FF36]'
                        : 'bg-[#101316] text-slate-300 border-[#25292D]'
                    }`}
                  >
                    Dine-In Lounge
                  </button>
                  <button
                    onClick={() => setOrderType('PICKUP')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                      orderType === 'PICKUP'
                        ? 'bg-[#C7FF36] text-slate-950 border-[#C7FF36]'
                        : 'bg-[#101316] text-slate-300 border-[#25292D]'
                    }`}
                  >
                    Takeaway Pickup
                  </button>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400">Dietary / Preparation Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Extra ice, no sugar, allergies"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#101316] border border-[#25292D] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C7FF36]"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Price</span>
                  <span className="text-base font-extrabold text-[#C7FF36]">₹{subtotal.toFixed(0)}</span>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={isOrdering}
                  className="w-full py-3 rounded-xl bg-[#C7FF36] text-slate-950 font-bold text-xs hover:bg-[#b0e600] transition shadow-lg shadow-[#C7FF36]/20 cursor-pointer disabled:opacity-50"
                >
                  {isOrdering ? 'Sending Order...' : 'Send Order to Kitchen'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active & Past Kitchen Orders */}
      <div className="rounded-2xl bg-[#171A1D] border border-[#25292D] p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#C7FF36]" />
          <span>Live Order Tracking</span>
        </h3>

        {myOrders.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No recent food or beverage orders.</p>
        ) : (
          <div className="space-y-3">
            {myOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 rounded-xl bg-[#101316] border border-[#25292D] flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">{ord.order_number}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#C7FF36]/20 text-[#C7FF36] border border-[#C7FF36]/30">
                      {ord.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {ord.items?.length || 1} item(s) • {ord.order_type}
                  </p>
                </div>
                <p className="text-xs font-bold text-white">₹{ord.total_amount}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
