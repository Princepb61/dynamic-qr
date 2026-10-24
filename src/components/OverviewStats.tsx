import React from 'react';
import { GlobalOverview } from '../types';
import { TrendingUp, Globe, ExternalLink, ShieldCheck, Layers } from 'lucide-react';

interface OverviewStatsProps {
  overview: GlobalOverview | null;
  onSelectLink?: (linkId: string) => void;
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  overview,
  onSelectLink,
}) => {
  if (!overview) return null;

  const totalClicks = overview.totalClicks;
  const unassignedCount = overview.totalLinks - overview.activeLinksCount;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Dynamic Architecture Callout Banner (Mobile-Optimized) */}
      <div className="bg-neutral-950 dark:bg-neutral-900 text-white rounded-xl p-4 sm:p-5 border border-neutral-800 dark:border-neutral-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-neutral-400 uppercase tracking-wider">
            <span>Dynamic Redirection Active</span>
            <span aria-hidden="true">·</span>
            <span>Zero Re-print Guarantee</span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-200 dark:text-neutral-300 font-normal leading-relaxed">
            Physical QR codes remain permanently fixed while destination targets update instantly in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 px-3 py-1.5 sm:py-2 bg-neutral-900/90 dark:bg-neutral-800 rounded-lg border border-neutral-800 dark:border-neutral-700 text-xs text-neutral-300 font-bold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Real-time Dynamic Sync</span>
        </div>
      </div>

      {/* KPI Cards Strip (Mobile-Optimized 2-Column Grid on Phones) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Metric 1: Total Scans */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 sm:p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-bold mb-1.5 sm:mb-2">
            <span className="truncate">Total Scans</span>
            <TrendingUp className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950 dark:text-white font-mono tabular-nums">
            {totalClicks.toLocaleString()}
          </div>
          <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 font-medium">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">HTTP 307</span>
            <span className="hidden sm:inline">· verified queries</span>
          </div>
        </div>

        {/* Metric 2: Active Dynamic Links */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 sm:p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-bold mb-1.5 sm:mb-2">
            <span className="truncate">Active Links</span>
            <Globe className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950 dark:text-white font-mono tabular-nums">
            {overview.activeLinksCount} <span className="text-xs sm:text-sm font-normal text-neutral-500 dark:text-neutral-400">/ {overview.totalLinks}</span>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium truncate">
            <span>{overview.totalLinks} total registered</span>
          </div>
        </div>

        {/* Metric 3: Top Dynamic Link */}
        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 sm:p-5 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-bold mb-1.5 sm:mb-2">
              <span>Top Dynamic Link</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
            </div>
            {overview.topLink ? (
              <div>
                <button
                  onClick={() => onSelectLink && onSelectLink(overview.topLink!.id)}
                  className="text-left font-bold text-neutral-950 dark:text-white text-xs sm:text-sm hover:underline truncate block w-full"
                >
                  {overview.topLink.title}
                </button>
                <div className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate font-medium">
                  /r/{overview.topLink.slug}
                </div>
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-neutral-400 dark:text-neutral-500 font-medium">No links active</div>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            <span>Highest scan volume</span>
            <span className="font-mono tabular-nums font-black text-neutral-950 dark:text-white">
              {overview.topLink ? `${overview.topLink.totalClicks.toLocaleString()} scans` : '0'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
