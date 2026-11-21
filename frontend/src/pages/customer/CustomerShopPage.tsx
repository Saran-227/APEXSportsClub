import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';
import { shopApi } from '../../services/api';

export const CustomerShopPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cart, setCart] = useState<Array<{ product: any; quantity: number }>>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categories = ['All', 'Rackets', 'Balls', 'Shoes', 'Apparel', 'Accessories'];

  useEffect(() => {
    setIsLoading(true);
    shopApi
      .getCatalog({
        category: categoryFilter === 'All' ? undefined : categoryFilter,
        search: searchQuery || undefined,
        is_rental: false,
      })
      .then(setProducts)
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setIsLoading(false));
  }, [categoryFilter, searchQuery]);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: any; quantity: number }>
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce((acc, item) => acc + Number(item.product.price) * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    setErrorMessage(null);
    try {
      const payload = {
        items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        fulfilment_type: 'PICKUP',
      };
      const res = await shopApi.createOrder(payload);
      setOrderSuccess(res);
      setCart([]);
      setIsCartOpen(false);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || err.message || 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C7FF36]/10 border border-[#C7FF36]/30 text-[#C7FF36] text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Apex Pro Sports Shop</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Official Club Equipment & Apparel
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Top tier padel rackets, championship balls, turf court footwear, and activewear.
          </p>
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171A1D] border border-[#25292D] text-white hover:border-[#C7FF36]/50 transition cursor-pointer self-start sm:self-auto"
        >
          <ShoppingCart className="h-4 w-4 text-[#C7FF36]" />
          <span className="text-xs font-bold">Cart ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#C7FF36] text-slate-950 font-bold text-[10px] flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Success Dialog */}
      {orderSuccess && (
        <div className="rounded-2xl bg-[#171A1D] border-2 border-[#C7FF36] p-6 shadow-2xl animate-in fade-in">
          <div className="flex items-center gap-3 text-[#C7FF36] mb-2">
            <CheckCircle2 className="h-6 w-6" />
            <h3 className="text-lg font-bold text-white">Order Placed Successfully!</h3>
          </div>
          <p className="text-xs text-slate-300">
            Order Reference: <strong className="text-white font-mono">{orderSuccess.order_number}</strong>. Total Paid: <strong className="text-[#C7FF36]">₹{orderSuccess.total_amount}</strong>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Pick up your equipment at the Apex Pro Shop front counter anytime during club operating hours.
          </p>
          <button
            onClick={() => setOrderSuccess(null)}
            className="mt-4 px-4 py-2 rounded-xl bg-[#C7FF36] text-slate-950 font-bold text-xs hover:bg-[#b0e600] transition cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search & Categories */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                categoryFilter === cat
                  ? 'bg-[#C7FF36] text-slate-950 border-[#C7FF36] font-bold shadow-md shadow-[#C7FF36]/20'
                  : 'bg-[#171A1D] text-slate-300 border-[#25292D] hover:bg-[#25292D]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#171A1D] border border-[#25292D] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C7FF36]"
          />
        </div>
      </div>

      {/* Product Catalog Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs">Loading sports catalog...</div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-xs rounded-2xl bg-[#171A1D] border border-[#25292D]">
          No products found matching your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl bg-[#171A1D] border border-[#25292D] hover:border-slate-700 transition flex flex-col justify-between overflow-hidden shadow-xl group"
            >
              <div>
                <div className="h-44 bg-[#101316] relative overflow-hidden">
                  <img
                    src={p.image_url || 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?auto=format&fit=crop&w=800&q=80'}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#101316]/80 text-[#C7FF36] border border-[#25292D] backdrop-blur-xs">
                    {p.category}
                  </span>
                </div>

                <div className="p-4 space-y-1.5">
                  <h4 className="text-sm font-bold text-white group-hover:text-[#C7FF36] transition">{p.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{p.description}</p>
                  <p className="text-[10px] text-slate-500 pt-1">
                    Stock available: <strong className="text-slate-300">{p.stock_quantity} units</strong>
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0">
                <div className="flex items-center justify-between pt-3 border-t border-[#25292D]">
                  <span className="text-base font-extrabold text-white">₹{p.price}</span>
                  <button
                    onClick={() => addToCart(p)}
                    disabled={p.stock_quantity <= 0}
                    className="px-3.5 py-1.5 rounded-xl bg-[#C7FF36] text-slate-950 font-bold text-xs hover:bg-[#b0e600] transition shadow-md shadow-[#C7FF36]/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {p.stock_quantity > 0 ? '+ Add' : 'Sold Out'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Drawer / Slide-over */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-[#171A1D] border-l border-[#25292D] h-full shadow-2xl flex flex-col justify-between p-6 z-10 animate-in slide-in-from-right">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#25292D]">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-[#C7FF36]" />
                  <span>Your Shopping Cart</span>
                </h3>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">Your cart is currently empty.</div>
              ) : (
                <div className="mt-4 space-y-3 overflow-y-auto max-h-[60vh] pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-3 rounded-xl bg-[#101316] border border-[#25292D] flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white">{item.product.name}</p>
                        <p className="text-[11px] text-[#C7FF36] font-semibold">₹{item.product.price}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg bg-[#171A1D] border border-[#25292D]">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 hover:text-[#C7FF36] text-slate-400 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 hover:text-[#C7FF36] text-slate-400 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-[#25292D] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Order Subtotal</span>
                  <span className="text-base font-extrabold text-[#C7FF36]">₹{subtotal.toFixed(0)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full py-3 rounded-xl bg-[#C7FF36] text-slate-950 font-bold text-xs hover:bg-[#b0e600] transition shadow-lg shadow-[#C7FF36]/20 cursor-pointer disabled:opacity-50"
                >
                  {isCheckingOut ? 'Placing Order...' : 'Confirm Order & Pickup'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
