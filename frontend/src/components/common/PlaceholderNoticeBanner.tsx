import React, { useState } from 'react';
import { Database, AlertTriangle, X } from 'lucide-react';

export interface PlaceholderNoticeBannerProps {
  moduleName?: string;
}

export const PlaceholderNoticeBanner: React.FC<PlaceholderNoticeBannerProps> = ({ moduleName }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <aside
      aria-label="Phase 1 Notice"
      className="relative mb-6 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 p-4 shadow-xs"
    >
      <div className="flex items-start gap-3.5 pr-8">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 border border-amber-300/40">
          <Database className="h-4 w-4" />
        </div>
        <div className="flex-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-900 text-sm">
              Phase 1 Preview Mode {moduleName ? `• ${moduleName}` : ''}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/60 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-amber-800">
              <AlertTriangle className="h-3 w-3" /> Proposed Contracts
            </span>
          </div>
          <p className="mt-1 text-amber-800/90 leading-relaxed">
            All numerical metrics, schedules, and mock records displayed here represent design placeholders. Live API endpoints are documented in{' '}
            <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-[11px] text-amber-950 font-semibold">docs/api-contracts.md</code>{' '}
            and will be activated upon integration with Saran’s FastAPI backend.
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        type="button"
        aria-label="Dismiss demo banner"
        className="absolute top-3 right-3 rounded-lg p-1 text-amber-700/60 hover:bg-amber-100 hover:text-amber-900 cursor-pointer transition"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
};
