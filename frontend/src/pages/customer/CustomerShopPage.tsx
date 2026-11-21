import React, { useState } from 'react';
import {
  ShoppingBag,
  Percent,
  Heart,
  Package,
  MapPin,
  ArrowRight,
  ShoppingCart,
  Plus,
  Minus,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  MOCK_FEATURED_PRODUCTS,
  MOCK_ALL_PRODUCTS,
  type MockProduct,
} from '../../data/mockSportsData';

export const CustomerShopPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('Popular');
  const [searchQuery] = useState<string>('');
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Cart State
  const [cartItems, setCartItems] = useState<Array<{ product: MockProduct; quantity: number }>>([
    { product: MOCK_FEATURED_PRODUCTS[0], quantity: 1 },
    { product: MOCK_FEATURED_PRODUCTS[1], quantity: 2 },
  ]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(false);
  const [checkoutComplete, setCheckoutComplete] = useState<boolean>(false);

  const categories = [
    'ALL',
    'RACKETS',
    'SHUTTLECOCKS',
    'BALLS',
    'APPAREL',
    'BAGS',
    'ACCESSORIES',
    'SHOES',
  ];

  const toggleWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const addToCart = (product: MockProduct) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCartDrawerOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: MockProduct; quantity: number }>
    );
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  // Filter products
  const filteredProducts = MOCK_ALL_PRODUCTS.filter((product) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      product.category.toUpperCase() === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* ================= LEFT SIDEBAR ================= */}
        <div className="lg:col-span-4 bg-[#0A3022] rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden space-y-5">
          {/* Top Headline + Racket Graphic */}
          <div className="relative pt-2">
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-tight font-sport leading-none">
              GEAR UP. <br />
              <span className="text-[#CCFF00]">RALLY ON.</span>
            </h2>
            <p className="text-xs text-emerald-200/90 mt-2 font-medium">
              Premium sports gear <br />
              for every player.
            </p>

            {/* Racket and Shuttlecock Visual */}
            <div className="mt-4 h-36 w-full flex items-center justify-center relative">
              <img
                src="https://images.unsplash.com/photo-1617083934555-ac7d4fed8824?auto=format&fit=crop&w=400&q=80"
                alt="Pro Sports Gear"
                className="h-32 w-32 object-contain drop-shadow-2xl rotate-12"
              />
              <div className="absolute -bottom-1 right-8 h-10 w-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl shadow-lg">
                🏸
              </div>
            </div>
          </div>

          {/* Subcard: UPCOMING EVENTS */}
          <div className="bg-[#FAF7F2] rounded-2xl p-4 sm:p-5 text-slate-900 shadow-md border border-[#E8E2D5] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 font-sport">
                UPCOMING EVENTS
              </span>
              <button
                type="button"
                className="text-[11px] font-bold text-[#E11D48] hover:underline flex items-center gap-0.5"
              >
                <span>VIEW ALL</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              SAT, 24 MAY • 4:00 PM
            </p>
            <h4 className="text-sm font-bold text-slate-950 leading-tight">
              Apex Open Tournament
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Smash Arena, Bangalore</span>
            </div>

            {/* Avatars + Level badge */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-2">
              <div className="flex items-center -space-x-2">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
                  alt="Player 1"
                  className="h-6 w-6 rounded-full border-2 border-white object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80"
                  alt="Player 2"
                  className="h-6 w-6 rounded-full border-2 border-white object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80"
                  alt="Player 3"
                  className="h-6 w-6 rounded-full border-2 border-white object-cover"
                />
                <span className="h-6 px-1.5 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-700">
                  +12
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-slate-950">3.5</span>
                <p className="text-[9px] font-bold text-slate-500 uppercase">INTERMEDIATE</p>
              </div>
            </div>
          </div>

          {/* 4 Quick Action Buttons (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Button 1: SHOP GEAR (Lime Filled) */}
            <button
              type="button"
              className="bg-[#CCFF00] text-slate-950 p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-md shadow-[#CCFF00]/20 font-bold transition hover:bg-[#bbf000] cursor-pointer"
            >
              <ShoppingBag className="h-5 w-5 text-slate-950" />
              <span className="text-[11px] font-black tracking-wide uppercase">SHOP GEAR</span>
            </button>

            {/* Button 2: DEALS & OFFERS */}
            <button
              type="button"
              className="bg-[#143B2D] border border-emerald-600/30 text-white p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold transition hover:bg-[#1a4a39] cursor-pointer"
            >
              <Percent className="h-5 w-5 text-[#CCFF00]" />
              <span className="text-[11px] font-black tracking-wide uppercase">DEALS & OFFERS</span>
            </button>

            {/* Button 3: MY WISHLIST */}
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className="bg-white text-slate-900 p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold transition hover:bg-slate-50 cursor-pointer shadow-sm border border-[#E8E2D5]"
            >
              <Heart className="h-5 w-5 text-rose-500" />
              <span className="text-[11px] font-black tracking-wide uppercase">MY WISHLIST</span>
            </button>

            {/* Button 4: MY ORDERS */}
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="bg-white text-slate-900 p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold transition hover:bg-slate-50 cursor-pointer shadow-sm border border-[#E8E2D5]"
            >
              <Package className="h-5 w-5 text-slate-800" />
              <span className="text-[11px] font-black tracking-wide uppercase">MY ORDERS</span>
            </button>
          </div>
        </div>

        {/* ================= RIGHT MAIN AREA ================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Hero Banner with Slanted Tennis Court & Ball */}
          <div className="relative rounded-3xl overflow-hidden bg-[#FAF7F2] border border-[#E8E2D5] min-h-[160px] sm:min-h-[180px] flex items-center p-6 sm:p-8 shadow-sm">
            {/* Slanted Right Image Slice */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-5/12 bg-cover bg-center"
              style={{
                clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)',
                backgroundImage: `url('https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80')`,
              }}
            />

            <div className="relative z-10 max-w-sm sm:max-w-md space-y-1">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#0C3829]">
                SHOP
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black italic tracking-tight font-sport leading-none">
                <span className="text-[#0C3829]">EXPLORE OUR </span>
                <span className="text-[#8CB800]">COLLECTION</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium pt-1">
                Rackets, Shuttlecocks, Balls, Apparel and more — everything you need to play your best.
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition shrink-0 cursor-pointer uppercase ${
                    isActive
                      ? 'bg-[#CCFF00] text-slate-950 shadow-sm border border-[#bbf000]'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Section: FEATURED PRODUCTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black italic uppercase text-slate-950 font-sport tracking-tight">
                FEATURED PRODUCTS
              </h2>
              <button
                type="button"
                className="text-xs font-bold text-[#E11D48] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>VIEW ALL</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* 3 Featured Products in a row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {MOCK_FEATURED_PRODUCTS.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-3xl p-4 border border-[#E8E2D5] shadow-sm hover:shadow-md transition flex flex-col justify-between group"
                >
                  {/* Photo container */}
                  <div className="h-44 rounded-2xl bg-[#F8F5EE] flex items-center justify-center p-3 mb-3.5 overflow-hidden">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="h-full w-full object-contain group-hover:scale-105 transition duration-300"
                    />
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-wide text-slate-950">
                      {prod.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">{prod.tagline}</p>
                  </div>

                  {/* Price + Lime Cart Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3">
                    <span className="text-base font-black text-slate-950">
                      ₹{prod.price.toLocaleString('en-IN')}
                    </span>

                    <button
                      type="button"
                      onClick={() => addToCart(prod)}
                      className="h-9 w-9 rounded-xl bg-[#CCFF00] hover:bg-[#bbf000] text-slate-950 flex items-center justify-center transition shadow-sm cursor-pointer"
                      title="Add to cart"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: ALL PRODUCTS */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black italic uppercase text-slate-950 font-sport tracking-tight">
                ALL PRODUCTS ({filteredProducts.length})
              </h2>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span>Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="Popular">Popular</option>
                    <option value="PriceLow">Price: Low to High</option>
                    <option value="PriceHigh">Price: High to Low</option>
                  </select>
                </div>

                <div className="hidden sm:flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                  <button className="p-1 rounded bg-slate-100 text-slate-800">
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button className="p-1 rounded text-slate-400 hover:text-slate-700">
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid of All Products (25+ products with mock sports photos!) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredProducts.map((prod) => {
                const isWished = wishlist.includes(prod.id);
                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-2xl p-3 border border-[#E8E2D5] shadow-sm hover:shadow-md transition flex flex-col justify-between group relative"
                  >
                    {/* Wishlist Heart Icon */}
                    <button
                      type="button"
                      onClick={() => toggleWishlist(prod.id)}
                      className="absolute top-4 right-4 z-10 p-1 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500 transition shadow-sm"
                      title="Add to wishlist"
                    >
                      <Heart
                        className={`h-3.5 w-3.5 ${
                          isWished ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>

                    {/* Photo container */}
                    <div className="h-32 sm:h-36 rounded-xl bg-[#F8F5EE] flex items-center justify-center p-2 mb-2.5 overflow-hidden">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="h-full w-full object-contain group-hover:scale-105 transition duration-300"
                      />
                    </div>

                    {/* Info */}
                    <div className="space-y-0.5">
                      <h3 className="text-[11px] font-black uppercase tracking-wide text-slate-950 truncate">
                        {prod.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 truncate">{prod.tagline}</p>

                      {/* Color dots if present */}
                      {prod.colors && prod.colors.length > 0 && (
                        <div className="flex items-center gap-1 pt-1">
                          {prod.colors.map((c, idx) => (
                            <span
                              key={idx}
                              className="h-2 w-2 rounded-full border border-slate-300"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price + Lime Cart Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                      <span className="text-xs sm:text-sm font-black text-slate-950">
                        ₹{prod.price.toLocaleString('en-IN')}
                      </span>

                      <button
                        type="button"
                        onClick={() => addToCart(prod)}
                        className="h-7 w-7 rounded-lg bg-[#CCFF00] hover:bg-[#bbf000] text-slate-950 flex items-center justify-center transition shadow-sm cursor-pointer"
                        title="Add to cart"
                      >
                        <ShoppingCart className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Shopping Cart Drawer */}
      {cartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl animate-slideLeft">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-slate-900" />
                <h3 className="text-base font-extrabold text-slate-950">
                  Your Cart ({totalCartCount} items)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCartDrawerOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Items */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {cartItems.length === 0 ? (
                <div className="py-20 text-center text-slate-400 space-y-2">
                  <ShoppingBag className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">Your cart is empty.</p>
                </div>
              ) : (
                cartItems.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-14 w-14 rounded-xl object-contain bg-white p-1"
                    />
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {product.name}
                      </h4>
                      <p className="text-xs font-extrabold text-slate-950 mt-1">
                        ₹{(product.price * quantity).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(product.id, -1)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold px-1">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, 1)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            {cartItems.length > 0 && (
              <div className="p-5 border-t border-slate-200 space-y-3 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Member Club Discount (10%)</span>
                  <span className="font-bold text-emerald-700">-₹{Math.round(totalAmount * 0.1).toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm font-extrabold text-slate-950">
                  <span>Total Amount</span>
                  <span className="text-base text-emerald-700">₹{Math.round(totalAmount * 0.9).toLocaleString('en-IN')}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCheckoutComplete(true);
                    setTimeout(() => {
                      setCartItems([]);
                      setCheckoutComplete(false);
                      setCartDrawerOpen(false);
                    }, 2000);
                  }}
                  className="w-full py-3 rounded-full bg-[#CCFF00] hover:bg-[#bbf000] text-slate-950 text-xs font-extrabold transition shadow-md shadow-[#CCFF00]/25 cursor-pointer uppercase tracking-wider"
                >
                  {checkoutComplete ? 'Order Placed Successfully!' : 'Proceed to Checkout'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
