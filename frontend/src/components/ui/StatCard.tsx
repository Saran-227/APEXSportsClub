import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
  isPlaceholder?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon,
  subtitle,
  isPlaceholder = true,
}) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {title}
            </span>
            {isPlaceholder && (
              <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                Demo
              </span>
            )}
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50 text-slate-700 border border-slate-200/60">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        {change && (
          <span
            className={`inline-flex items-center font-medium ${
              isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="mr-1 h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="mr-1 h-3.5 w-3.5" />
            )}
            {change}
          </span>
        )}
        <span className="text-slate-400">
          {subtitle || (isPlaceholder ? 'Placeholder metric' : 'vs last period')}
        </span>
      </div>
    </div>
  );
};
