import React from 'react';
import { GlobalOverview } from '../types';
import { TrendingUp, Smartphone, Globe, ExternalLink, Zap } from 'lucide-react';

interface OverviewStatsProps {
  overview: GlobalOverview | null;
  onOpenSimulator: () => void;
  onSelectLink: (linkId: string) => void;
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  overview,
  onOpenSimulator,
  onSelectLink,
}) => {
  if (!overview) return null;

  const totalClicks = overview.totalClicks;
  const mobileCount = overview.deviceBreakdown.mobile || 0;
  const desktopCount = overview.deviceBreakdown.desktop || 0;
  const tabletCount = overview.deviceBreakdown.tablet || 0;
  const knownDevicesTotal = mobileCount + desktopCount + tabletCount || 1;
  const mobileShare = Math.round((mobileCount / knownDevicesTotal) * 100);

  // SVG Chart Calculation for 7-day timeline
  const timeline = overview.timeline || [];
  const maxCount = Math.max(...timeline.map((t) => t.count), 1);
  const chartHeight = 60;
  const chartWidth = 260;

  const points = timeline.map((item, index) => {
    const x = (index / Math.max(timeline.length - 1, 1)) * chartWidth;
    const y = chartHeight - (item.count / maxCount) * (chartHeight - 8) - 4;
    return `${x},${y}`;
  });

  const pathD = points.length > 0 ? `M ${points.join(' L ')}` : '';
  const areaD =
    points.length > 0
      ? `M ${points.join(' L ')} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`
      : '';

  return (
    <div className="space-y-6">
      {/* Dynamic Architecture Callout Banner */}
      <div className="bg-neutral-900 text-white rounded-xl p-5 border border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            <span>Dynamic Redirection Active</span>
            <span aria-hidden="true">·</span>
            <span>Zero Re-print Guarantee</span>
          </div>
          <p className="text-sm text-neutral-200 max-w-2xl">
            Physical QR codes and short URLs remain permanently fixed while you update destination URLs in real-time. Incoming scans trigger an instant HTTP 307 temporary redirect.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Real Scan</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium mb-2">
            <span>Total Redirect Scans</span>
            <TrendingUp className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
            {totalClicks.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-neutral-500 flex items-center gap-1.5">
            <span>All time verified queries</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-medium">HTTP 307</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium mb-2">
            <span>Active Dynamic Links</span>
            <Globe className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
            {overview.activeLinksCount} <span className="text-sm font-normal text-neutral-500">/ {overview.totalLinks}</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 flex items-center gap-1.5">
            <span>{overview.totalLinks - overview.activeLinksCount} paused links</span>
            <span aria-hidden="true">·</span>
            <span>Live routing</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium mb-2">
            <span>Mobile Device Share</span>
            <Smartphone className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
            {mobileShare}%
          </div>
          <div className="mt-2 text-xs text-neutral-500 flex items-center gap-1.5">
            <span>{mobileCount} smartphone scans</span>
            <span aria-hidden="true">·</span>
            <span>{desktopCount} desktop</span>
          </div>
        </div>

        {/* Metric 4: Top Performing Link */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-500 font-medium mb-2">
              <span>Top Dynamic Link</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            {overview.topLink ? (
              <div>
                <button
                  onClick={() => onSelectLink(overview.topLink!.id)}
                  className="text-left font-semibold text-neutral-900 text-sm hover:underline truncate block w-full"
                >
                  {overview.topLink.title}
                </button>
                <div className="mt-1 text-xs text-neutral-500 font-mono truncate">
                  /r/{overview.topLink.slug}
                </div>
              </div>
            ) : (
              <div className="text-sm text-neutral-400">No links active</div>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>Highest scan volume</span>
            <span className="font-mono tabular-nums font-semibold text-neutral-900">
              {overview.topLink ? `${overview.topLink.totalClicks} scans` : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* 7-Day Velocity Chart & Device Distribution Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Scan Activity Trend</h3>
              <p className="text-xs text-neutral-500">Total scan velocity across all dynamic QR codes over the past 7 days</p>
            </div>
            <div className="text-xs text-neutral-500 font-mono tabular-nums">
              Peak: {maxCount} scans/day
            </div>
          </div>

          <div className="h-28 w-full flex items-end">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={areaD} fill="url(#chartGradient)" />
              <path d={pathD} fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
              {points.map((pt, i) => {
                const [cx, cy] = pt.split(',');
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="3.5"
                    className="fill-white stroke-neutral-900 stroke-2 hover:r-5 transition-all"
                  />
                );
              })}
            </svg>
          </div>

          <div className="flex justify-between text-[11px] text-neutral-400 font-mono pt-3 border-t border-neutral-100 mt-2">
            {timeline.map((t, idx) => (
              <span key={idx}>
                {new Date(t.date).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })}
              </span>
            ))}
          </div>
        </div>

        {/* Device Distribution Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-1">Device Breakdown</h3>
            <p className="text-xs text-neutral-500 mb-4">Proportion of scans by hardware form-factor</p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-700 font-medium">Smartphones</span>
                  <span className="font-mono tabular-nums text-neutral-500">
                    {mobileCount} ({Math.round((mobileCount / knownDevicesTotal) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-neutral-900 h-2 rounded-full"
                    style={{ width: `${(mobileCount / knownDevicesTotal) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-700 font-medium">Desktops & Laptops</span>
                  <span className="font-mono tabular-nums text-neutral-500">
                    {desktopCount} ({Math.round((desktopCount / knownDevicesTotal) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-neutral-500 h-2 rounded-full"
                    style={{ width: `${(desktopCount / knownDevicesTotal) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-700 font-medium">Tablets & Others</span>
                  <span className="font-mono tabular-nums text-neutral-500">
                    {tabletCount} ({Math.round((tabletCount / knownDevicesTotal) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-neutral-300 h-2 rounded-full"
                    style={{ width: `${(tabletCount / knownDevicesTotal) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100 text-xs text-neutral-500 flex items-center justify-between">
            <span>Primary scanner</span>
            <span className="font-medium text-neutral-900">Native Camera App</span>
          </div>
        </div>
      </div>
    </div>
  );
};
