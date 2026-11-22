import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Loader2,
  Users,
  Briefcase,
  Calendar,
  Package,
  ShoppingBag,
  Coffee,
  Receipt,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  Command,
} from 'lucide-react';
import { searchApi } from '../../services/api';
import type { GlobalSearchResponse, SearchCategory, SearchResultItem } from '../../types/search';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: SearchCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'employees', label: 'Employees', icon: Briefcase },
  { id: 'bookings', label: 'Bookings', icon: Calendar },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'cafeteria', label: 'Cafeteria', icon: Coffee },
  { id: 'finance', label: 'Finance', icon: Receipt },
];

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalBoxRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [fuzzy, setFuzzy] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GlobalSearchResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Dismiss modal when clicking anywhere outside the search dialog
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (modalBoxRef.current && !modalBoxRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
    };
  }, [isOpen, onClose]);

  // Debounce query input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Focus input on modal open and reset state on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setQuery('');
      setDebouncedQuery('');
      setData(null);
      setError(null);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Execute Search whenever debouncedQuery, category, or fuzzy changes
  const executeSearch = useCallback(
    async (searchOffset = 0, isAppend = false) => {
      if (!debouncedQuery) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setData(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      // Cancel any ongoing search request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Track request sequence to drop stale responses from slower/out-of-order calls
      const seq = ++requestSeqRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const response = await searchApi.search({
          q: debouncedQuery,
          category,
          fuzzy,
          limit: 15,
          offset: searchOffset,
        });

        // Drop stale responses if a newer request was dispatched
        if (seq !== requestSeqRef.current) {
          return;
        }

        if (isAppend && data) {
          setData({
            ...response,
            results: [...data.results, ...response.results],
          });
        } else {
          setData(response);
          setSelectedIndex(0);
        }
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          // Request intentionally cancelled by newer query
          return;
        }
        if (seq === requestSeqRef.current) {
          console.error('Unified Global Search error:', err);
          setError('Failed to load search results. Please check your connection and try again.');
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [debouncedQuery, category, fuzzy, data]
  );

  useEffect(() => {
    executeSearch(0, false);
  }, [debouncedQuery, category, fuzzy]);

  // Navigate to result
  const handleSelectResult = (item: SearchResultItem) => {
    onClose();
    navigate(item.navigation_url);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!data?.results?.length) {
      if (e.key === 'Escape') onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < data.results.length ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = data.results[selectedIndex];
      if (current) {
        handleSelectResult(current);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'members':
        return <Users className="h-4 w-4 text-[#C7FF36]" />;
      case 'employees':
        return <Briefcase className="h-4 w-4 text-cyan-400" />;
      case 'bookings':
        return <Calendar className="h-4 w-4 text-amber-400" />;
      case 'inventory':
        return <Package className="h-4 w-4 text-purple-400" />;
      case 'shop':
        return <ShoppingBag className="h-4 w-4 text-emerald-400" />;
      case 'cafeteria':
        return <Coffee className="h-4 w-4 text-orange-400" />;
      case 'finance':
        return <Receipt className="h-4 w-4 text-sky-400" />;
      default:
        return <Search className="h-4 w-4 text-slate-400" />;
    }
  };

  const getRelevanceBadge = (score: number) => {
    if (score >= 0.95) {
      return (
        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
          Exact Match
        </span>
      );
    }
    if (score >= 0.8) {
      return (
        <span className="rounded bg-[#C7FF36]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#C7FF36] border border-[#C7FF36]/30">
          High Match
        </span>
      );
    }
    if (score >= 0.65) {
      return (
        <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30">
          Ranked
        </span>
      );
    }
    return (
      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
        Fuzzy
      </span>
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 md:p-10 cursor-pointer overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={modalBoxRef}
        className="w-full max-w-3xl rounded-2xl border border-[#25292D] bg-[#14171A] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 cursor-default my-auto sm:my-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="relative flex items-center border-b border-[#25292D] px-4 py-3 bg-[#171A1D]">
          <Search className="h-5 w-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members, bookings, courts, shop, inventory, cafe, invoices..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-[#C7FF36] mr-2" />}
          {query && !isLoading && (
            <button
              onClick={() => {
                setQuery('');
                setDebouncedQuery('');
                setData(null);
              }}
              className="p-1 text-slate-400 hover:text-white rounded-md mr-2 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-[#25292D] px-2 py-0.5 text-[10px] font-mono font-medium text-slate-400 border border-slate-700">
            <Command className="h-3 w-3" /> ESC
          </kbd>
        </div>

        {/* Filter Pills and Fuzzy Matching Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#25292D] bg-[#101316] px-4 py-2 text-xs">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1 overflow-x-auto py-0.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count =
                cat.id === 'all'
                  ? data?.total
                  : data?.categories_breakdown?.[cat.id];
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#C7FF36] text-slate-950 shadow-sm'
                      : 'bg-[#171A1D] text-slate-300 hover:bg-[#25292D] hover:text-white border border-[#25292D]'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{cat.label}</span>
                  {typeof count === 'number' && count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        isSelected
                          ? 'bg-slate-950 text-[#C7FF36]'
                          : 'bg-[#25292D] text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Fuzzy Matching Toggle */}
          <button
            onClick={() => setFuzzy(!fuzzy)}
            title="Toggle pg_trgm typo tolerance and fuzzy similarity matching"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium border cursor-pointer transition ${
              fuzzy
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-[#171A1D] text-slate-400 border-[#25292D] hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Fuzzy / Typo Tolerant</span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                fuzzy ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[220px]">
          {isLoading && !data && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#C7FF36]" />
              <span>Querying PostgreSQL indexes across 7 domains...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !debouncedQuery && (
            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171A1D] border border-[#25292D] mb-3 text-[#C7FF36]">
                <Search className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">Unified Club Search</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Search instantly by member number, email, invoice code, court sport, product SKU, or cafeteria items.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px]">
                {['padel', 'badminton', 'APEX-INV', 'protein', 'admin@apexsports.com'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="rounded bg-[#171A1D] border border-[#25292D] px-2 py-0.5 text-slate-400 hover:text-[#C7FF36] hover:border-[#C7FF36]/40 cursor-pointer"
                  >
                    "{tag}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isLoading && debouncedQuery && data?.results?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
              <SlidersHorizontal className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-white">No matching results found</p>
              <p className="text-xs text-slate-500 mt-1">
                No records matched "{debouncedQuery}". Try another keyword or enable fuzzy matching.
              </p>
            </div>
          )}

          {data?.results?.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={`${item.entity_type}-${item.id}`}
                onClick={() => handleSelectResult(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between rounded-xl p-3 cursor-pointer transition border ${
                  isSelected
                    ? 'bg-[#1D2126] border-[#C7FF36]/50 shadow-md'
                    : 'bg-[#171A1D]/60 border-transparent hover:bg-[#1D2126] hover:border-[#25292D]'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#101316] border border-[#25292D]">
                    {getEntityIcon(item.entity_type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      {item.badge && (
                        <span className="rounded bg-[#25292D] px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 uppercase">
                          {item.badge}
                        </span>
                      )}
                      {getRelevanceBadge(item.relevance_score)}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="hidden sm:inline-block text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    {item.entity_type}
                  </span>
                  <ArrowRight
                    className={`h-4 w-4 transition ${
                      isSelected ? 'text-[#C7FF36] translate-x-0.5' : 'text-slate-600'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Statistics & Pagination */}
        <div className="flex items-center justify-between border-t border-[#25292D] bg-[#101316] px-4 py-2.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            {data && (
              <span>
                Found <strong className="text-white">{data.total}</strong> results in{' '}
                <strong className="text-[#C7FF36]">{data.execution_time_ms} ms</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {data?.has_more && (
              <button
                onClick={() => executeSearch(data.results.length, true)}
                className="text-[11px] font-semibold text-[#C7FF36] hover:underline cursor-pointer"
              >
                Load More (+15)
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 text-slate-500 font-mono text-[10px]">
              <span>↑↓ Navigate</span>
              <span>↵ Open</span>
              <span>ESC Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
