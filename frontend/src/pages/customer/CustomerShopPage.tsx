import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
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
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { shopApi, paymentsApi, normalizeApiError } from '../../services/api';
import { openRazorpayModal } from '../../utils/razorpay';
import { useAuth } from '../../hooks/useAuth';
import { MOCK_ALL_PRODUCTS } from '../../data/mockSportsData';

interface ProductItem {
  id: string;
  name: string;
  tagline: string;
  category: string;
  price: number;
  stock_quantity?: number;
  inStock: boolean;
  image: string;
  isFeatured?: boolean;
  colors?: string[];
  rating?: number;
}

const getCategoryFallbackImage = (category: string) => {
  const cat = (category || '').toUpperCase();
  if (cat.includes('RACKET')) return 'https://images.unsplash.com/photo-1617083934555-ac7d4fed8824?auto=format&fit=crop&w=800&q=80';
  if (cat.includes('BALL')) return 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80';
  if (cat.includes('SHOE')) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80';
  if (cat.includes('APPAREL') || cat.includes('CLOTH')) return 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80';
  if (cat.includes('SHUTTLE')) return 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80';
  return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80';
};

export const CustomerShopPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetProductId = searchParams.get('product') || '';
  const initialSearch = searchParams.get('search') || '';

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('Popular');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Real backend catalog state
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [, setIsLoadingCatalog] = useState<boolean>(false);

  // Sync search query and category from URL parameters
  useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null) {
      setSearchQuery(s);
    }
    const cat = searchParams.get('category');
    if (cat) {
      setSelectedCategory(cat.toUpperCase());
    }
  }, [searchParams]);

  // Global persistent cart context (defaults to [] and persists on reload)
  const {
    cartItems,
    addToCart,
    updateQuantity,
    clearCart,
    totalCartCount,
    totalAmount,
    cartDrawerOpen,
    setCartDrawerOpen,
  } = useCart();

  // Checkout submission state
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: string;
    invoiceNumber?: string;
  } | null>(null);

  // Fetch real catalog from PostgreSQL backend
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        setIsLoadingCatalog(true);
        const products = await shopApi.getCatalog();
        if (isMounted && products && products.length > 0) {
          setCatalogProducts(products);
        }
      } catch (err) {
        console.error('Failed to load shop catalog from backend:', err);
      } finally {
        if (isMounted) setIsLoadingCatalog(false);
      }
    };
    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = [
    'ALL',
    'RACKETS',
    'SHUTTLECOCKS',
    'BALLS',
    'APPAREL',
    'BAGS',
    'ACCESSORIES',
    'SHOES',
    'EQUIPMENT',
  ];

  const toggleWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Map backend products if available; fallback to mock data
  const allAvailableProducts: ProductItem[] = useMemo(() => {
    if (catalogProducts.length > 0) {
      return catalogProducts.map((p) => ({
        id: p.id,
        name: p.name,
        tagline: p.description || `${p.category} • SKU ${p.sku}`,
        category: p.category,
        price: Number(p.price),
        stock_quantity: p.stock_quantity,
        inStock: p.stock_quantity > 0,
        image: p.image_url || getCategoryFallbackImage(p.category),
        isFeatured: p.stock_quantity > 5,
        rating: 4.9,
      }));
    }
    return MOCK_ALL_PRODUCTS.map((p) => ({
      ...p,
      stock_quantity: 10,
    }));
  }, [catalogProducts]);

  // Featured Products slice
  const featuredProducts: ProductItem[] = useMemo(() => {
    const inStock = allAvailableProducts.filter((p) => p.inStock);
    return inStock.slice(0, 3);
  }, [allAvailableProducts]);

  // Filter products by selected category and search
  const filteredProducts = useMemo(() => {
    return allAvailableProducts
      .filter((product) => {
        // If product is specifically targeted via URL, preserve it even if search query differs slightly
        if (targetProductId && product.id === targetProductId) return true;

        const matchesCategory =
          selectedCategory === 'ALL' ||
          product.category.toUpperCase() === selectedCategory;
        const matchesSearch =
          !searchQuery ||
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.tagline.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        // Always place targeted product first
        if (targetProductId) {
          if (a.id === targetProductId) return -1;
          if (b.id === targetProductId) return 1;
        }
        if (sortBy === 'PriceLow') return a.price - b.price;
        if (sortBy === 'PriceHigh') return b.price - a.price;
        return 0;
      });
  }, [allAvailableProducts, selectedCategory, searchQuery, sortBy, targetProductId]);

  // Auto-scroll to target product when selected via search or link
  useEffect(() => {
    if (targetProductId) {
      const matchingProduct = allAvailableProducts.find((p) => p.id === targetProductId);
      if (
        matchingProduct &&
        selectedCategory !== 'ALL' &&
        matchingProduct.category.toUpperCase() !== selectedCategory
      ) {
        setSelectedCategory('ALL');
      }

      const timer = setTimeout(() => {
        const el = document.getElementById(`product-card-${targetProductId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [targetProductId, allAvailableProducts, selectedCategory]);

  // Checkout order submission: initiates Razorpay Standard Checkout SDK
  const handleProceedToCheckout = async () => {
    if (cartItems.length === 0) return;
    try {
      setIsCheckingOut(true);
      setCheckoutError(null);

      // 1. Create Razorpay order on backend
      const order = await paymentsApi.createOrder({
        amount: totalAmount,
        purpose: 'SHOP',
        notes: {
          items_count: String(cartItems.length),
        },
      });

      // 2. Launch Razorpay Checkout Modal
      await openRazorpayModal({
        keyId: order.key_id,
        orderId: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Apex Pro Sports Shop',
        description: `Pro Shop Order (${cartItems.length} items)`,
        prefill: {
          name: user?.fullName || '',
          email: user?.email || '',
          contact: user?.phoneNumber || '',
        },
        themeColor: '#083222',
        onSuccess: async (rzpResult) => {
          try {
            // 3. Fulfill shop order with verified Razorpay tokens
            const res = await shopApi.createOrder({
              items: cartItems.map((item) => ({
                product_id: item.product.id,
                quantity: item.quantity,
              })),
              fulfilment_type: 'PICKUP',
              razorpay_order_id: rzpResult.razorpay_order_id,
              razorpay_payment_id: rzpResult.razorpay_payment_id,
              razorpay_signature: rzpResult.razorpay_signature,
            });

            setOrderSuccess({
              orderNumber: res.order_number,
              invoiceNumber: res.invoice_number,
            });
            clearCart();
          } catch (fulfillErr) {
            const errObj = normalizeApiError(fulfillErr);
            setCheckoutError(errObj.message || 'Failed to complete order verification.');
          } finally {
            setIsCheckingOut(false);
          }
        },
        onDismiss: () => {
          setIsCheckingOut(false);
        },
        onError: (err) => {
          setIsCheckingOut(false);
          setCheckoutError(err?.message || 'Razorpay checkout encountered an issue.');
        },
      });
    } catch (err) {
      const errObj = normalizeApiError(err);
      setCheckoutError(errObj.message || 'Failed to initialize payment gateway.');
      setIsCheckingOut(false);
    }
  };

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
            <button
              type="button"
              className="bg-[#CCFF00] text-slate-950 p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-md shadow-[#CCFF00]/20 font-bold transition hover:bg-[#bbf000] cursor-pointer"
            >
              <ShoppingBag className="h-5 w-5 text-slate-950" />
              <span className="text-[11px] font-black tracking-wide uppercase">SHOP GEAR</span>
            </button>

            <button
              type="button"
              className="bg-[#143B2D] border border-emerald-600/30 text-white p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold transition hover:bg-[#1a4a39] cursor-pointer"
            >
              <Percent className="h-5 w-5 text-[#CCFF00]" />
              <span className="text-[11px] font-black tracking-wide uppercase">DEALS & OFFERS</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className="bg-white text-slate-900 p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold transition hover:bg-slate-50 cursor-pointer shadow-sm border border-[#E8E2D5]"
            >
              <Heart className="h-5 w-5 text-rose-500" />
              <span className="text-[11px] font-black tracking-wide uppercase">MY WISHLIST</span>
            </button>

            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="bg-white text-slate-900 p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold transition hover:bg-slate-50 cursor-pointer shadow-sm border border-[#E8E2D5]"
            >
              <Package className="h-5 w-5 text-slate-800" />
              <span className="text-[11px] font-black tracking-wide uppercase">
                MY CART ({totalCartCount})
              </span>
            </button>
          </div>
        </div>

        {/* ================= RIGHT MAIN AREA ================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Hero Banner with Slanted Tennis Court & Ball */}
          <div className="relative rounded-3xl overflow-hidden bg-[#FAF7F2] border border-[#E8E2D5] min-h-[160px] sm:min-h-[180px] flex items-center p-6 sm:p-8 shadow-sm">
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

          {/* Search Query Filter Notification */}
          {searchQuery && (
            <div className="flex items-center justify-between rounded-2xl bg-[#0A3022] text-white px-4 py-2.5 text-xs shadow-md border border-emerald-800">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[#CCFF00] shrink-0" />
                <span>
                  Showing shop results for <strong className="text-[#CCFF00]">"{searchQuery}"</strong> ({filteredProducts.length} items found)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchParams({});
                }}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition flex items-center gap-1 cursor-pointer"
              >
                <span>Clear Filter</span>
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Category Filter Pills & Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

            <div className="relative min-w-[200px] sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter shop products..."
                className="w-full pl-8 pr-8 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#CCFF00]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchParams({});
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
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

            {/* Featured Products Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {featuredProducts.map((prod) => {
                const isTarget = targetProductId === prod.id;
                return (
                  <div
                    key={prod.id}
                    id={`product-card-${prod.id}`}
                    className={`bg-white rounded-3xl p-4 border transition flex flex-col justify-between group relative ${
                      isTarget
                        ? 'border-[#CCFF00] ring-4 ring-[#CCFF00] shadow-xl shadow-[#CCFF00]/25 scale-[1.02]'
                        : 'border-[#E8E2D5] shadow-sm hover:shadow-md'
                    }`}
                  >
                    {isTarget && (
                      <div className="absolute -top-2.5 left-4 z-20 px-2.5 py-0.5 rounded-full bg-[#CCFF00] text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md animate-pulse">
                        Selected Product
                      </div>
                    )}
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
                        onClick={() =>
                          addToCart({
                            id: prod.id,
                            name: prod.name,
                            price: prod.price,
                            category: prod.category,
                            image: prod.image,
                            stock_quantity: prod.stock_quantity,
                          })
                        }
                        className="h-9 w-9 rounded-xl bg-[#CCFF00] hover:bg-[#bbf000] text-slate-950 flex items-center justify-center transition shadow-sm cursor-pointer"
                        title="Add to cart"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
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

            {/* Grid of All Products */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredProducts.map((prod) => {
                const isWished = wishlist.includes(prod.id);
                const isTarget = targetProductId === prod.id;
                return (
                  <div
                    key={prod.id}
                    id={`product-card-${prod.id}`}
                    className={`bg-white rounded-2xl p-3 border transition flex flex-col justify-between group relative ${
                      isTarget
                        ? 'border-[#CCFF00] ring-4 ring-[#CCFF00] shadow-xl shadow-[#CCFF00]/25 scale-[1.02]'
                        : 'border-[#E8E2D5] shadow-sm hover:shadow-md'
                    }`}
                  >
                    {isTarget && (
                      <div className="absolute -top-2 left-3 z-20 px-2 py-0.5 rounded-full bg-[#CCFF00] text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-md animate-pulse">
                        Selected Product
                      </div>
                    )}
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
                    </div>

                    {/* Price + Lime Cart Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                      <span className="text-xs sm:text-sm font-black text-slate-950">
                        ₹{prod.price.toLocaleString('en-IN')}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          addToCart({
                            id: prod.id,
                            name: prod.name,
                            price: prod.price,
                            category: prod.category,
                            image: prod.image,
                            stock_quantity: prod.stock_quantity,
                          })
                        }
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
                onClick={() => {
                  setCartDrawerOpen(false);
                  setCheckoutError(null);
                  setOrderSuccess(null);
                }}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Success Banner if order completed */}
              {orderSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-slate-900 space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 text-emerald-800 font-black">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>ORDER CONFIRMED & INVOICED!</span>
                  </div>
                  <p className="text-xs text-slate-700">
                    Order Ref: <span className="font-bold">{orderSuccess.orderNumber}</span>
                  </p>
                  {orderSuccess.invoiceNumber && (
                    <p className="text-xs text-slate-700">
                      Invoice: <span className="font-bold">{orderSuccess.invoiceNumber}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                    ✓ Transaction saved to PostgreSQL in real-time.
                    <br />
                    ✓ PDF invoice dispatched to your registered email!
                  </p>
                </div>
              )}

              {/* Error banner if checkout failed */}
              {checkoutError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {cartItems.length === 0 ? (
                <div className="py-20 text-center text-slate-400 space-y-2">
                  <ShoppingBag className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">Your cart is empty.</p>
                  <p className="text-[11px] text-slate-400">
                    Select gear from the shop to start your order.
                  </p>
                </div>
              ) : (
                cartItems.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={product.image || getCategoryFallbackImage(product.category)}
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
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold px-1">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, 1)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
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
                  <span className="font-bold text-slate-900">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm font-extrabold text-slate-950">
                  <span>Total Payable</span>
                  <span className="text-base text-emerald-700 font-black">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isCheckingOut}
                  onClick={handleProceedToCheckout}
                  className="w-full py-3.5 rounded-full bg-[#CCFF00] hover:bg-[#bbf000] disabled:bg-slate-200 disabled:text-slate-500 text-slate-950 text-xs font-extrabold transition shadow-md shadow-[#CCFF00]/25 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <span>Pay via Razorpay</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};