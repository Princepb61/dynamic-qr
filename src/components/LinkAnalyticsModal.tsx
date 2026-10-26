import React, { useState, useEffect } from 'react';
import { LinkRecord, LinkAnalytics } from '../types';
import { api } from '../services/api';
import {
  X,
  Smartphone,
  Globe,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Zap,
  Clock,
  Laptop,
  Compass,
} from 'lucide-react';

interface LinkAnalyticsModalProps {
  link: LinkRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LinkAnalyticsModal: React.FC<LinkAnalyticsModalProps> = ({
  link,
  isOpen,
  onClose,
}) => {
  const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    if (!link) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getLinkAnalytics(link.id);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && link) {
      loadAnalytics();
    }
  }, [isOpen, link]);

  if (!isOpen || !link) return null;

  const totalClicks = analytics?.totalClicks ?? link.totalClicks;
  const devices = analytics?.devices || [];
  const browsers = analytics?.browsers || [];
  const osList = analytics?.os || [];
  const countries = analytics?.countries || [];
  const timeline = analytics?.timeline || [];
  const recentLogs = analytics?.recentLogs || [];

  const maxTimelineCount = Math.max(...timeline.map((t) => t.count), 1);
  const chartHeight = 70;
  const chartWidth = 320;

  const points = timeline.map((item, index) => {
    const x = (index / Math.max(timeline.length - 1, 1)) * chartWidth;
    const y = chartHeight - (item.count / maxTimelineCount) * (chartHeight - 10) - 5;
    return `${x},${y}`;
  });

  const pathD = points.length > 0 ? `M ${points.join(' L ')}` : '';
  const areaD =
    points.length > 0
      ? `M ${points.join(' L ')} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`
      : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-4xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">{link.title}</h3>
              <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded font-medium">
                /r/{link.slug}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-lg font-mono">
              Redirects to: {link.destinationUrl}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAnalytics}
              disabled={loading}
              title="Refresh data"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Scans</span>
              <div className="text-xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white mt-1">
                {totalClicks.toLocaleString()}
              </div>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">All-time scans</span>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Top Device Form</span>
              <div className="text-xl font-bold text-neutral-900 dark:text-white mt-1 capitalize">
                {devices[0]?.name || 'Mobile'}
              </div>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono tabular-nums">
                {devices[0]?.count || 0} scans
              </span>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Primary Browser</span>
              <div className="text-xl font-bold text-neutral-900 dark:text-white mt-1 truncate">
                {browsers[0]?.name || 'Safari'}
              </div>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono tabular-nums">
                {browsers[0]?.count || 0} scans
              </span>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">Dynamic Short Link</span>
                <div className="text-sm font-bold text-neutral-900 dark:text-white mt-1 truncate">/r/{link.slug}</div>
              </div>
              <a
                href={`${typeof window !== 'undefined' ? window.location.origin : ''}/r/${link.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold bg-neutral-950 dark:bg-indigo-600 hover:bg-neutral-800 dark:hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Live Link</span>
              </a>
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="p-5 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-800 shadow-2xs">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
                Daily Scan Trends (Past 7 Days)
              </h4>
              <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                Peak: {maxTimelineCount} scans
              </span>
            </div>

            <div className="h-28 w-full flex items-end">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <linearGradient id="linkChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaD} fill="url(#linkChartGrad)" />
                <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
                {points.map((pt, i) => {
                  const [cx, cy] = pt.split(',');
                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r="3.5"
                      className="fill-white dark:fill-neutral-900 stroke-indigo-600 stroke-2"
                    />
                  );
                })}
              </svg>
            </div>

            <div className="flex justify-between text-[11px] text-neutral-400 dark:text-neutral-500 font-mono pt-3 border-t border-neutral-100 dark:border-neutral-700 mt-2">
              {timeline.map((t, idx) => (
                <span key={idx}>
                  {new Date(t.date).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })}
                </span>
              ))}
            </div>
          </div>

          {/* Breakdown Grid: Devices, Operating Systems & Browsers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Devices */}
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-800/60">
              <h5 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-3">
                Devices
              </h5>
              <div className="space-y-2.5">
                {devices.length === 0 ? (
                  <p className="text-xs text-neutral-400">No device data yet</p>
                ) : (
                  devices.map((d) => (
                    <div key={d.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="capitalize text-neutral-700 dark:text-neutral-300 font-medium">{d.name}</span>
                        <span className="font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                          {d.count} ({Math.round((d.count / (totalClicks || 1)) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full"
                          style={{ width: `${(d.count / (totalClicks || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Operating Systems */}
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-800/60">
              <h5 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-3">
                Operating Systems
              </h5>
              <div className="space-y-2">
                {osList.length === 0 ? (
                  <p className="text-xs text-neutral-400">No OS data yet</p>
                ) : (
                  osList.slice(0, 5).map((o) => (
                    <div key={o.name} className="flex justify-between text-xs py-1 border-b border-neutral-200/60 dark:border-neutral-700/60 last:border-0">
                      <span className="text-neutral-700 dark:text-neutral-300 truncate">{o.name}</span>
                      <span className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-white">
                        {o.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Browsers */}
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-800/60">
              <h5 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-3">
                Browsers & Scanners
              </h5>
              <div className="space-y-2">
                {browsers.length === 0 ? (
                  <p className="text-xs text-neutral-400">No browser data yet</p>
                ) : (
                  browsers.slice(0, 5).map((b) => (
                    <div key={b.name} className="flex justify-between text-xs py-1 border-b border-neutral-200/60 dark:border-neutral-700/60 last:border-0">
                      <span className="text-neutral-700 dark:text-neutral-300 truncate">{b.name}</span>
                      <span className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-white">
                        {b.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Live Scan Stream */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
                Live Scan Activity Stream (Last 30 Events)
              </h4>
              <span className="text-xs text-neutral-400 font-mono">
                Real-time HTTP 307 telemetry
              </span>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-850 shadow-2xs">
              <table className="w-full text-left text-xs divide-y divide-neutral-200 dark:divide-neutral-800">
                <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Device & OS</th>
                    <th className="px-4 py-2.5">Browser</th>
                    <th className="px-4 py-2.5">Origin / Channel</th>
                    <th className="px-4 py-2.5">Region</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                  {recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-neutral-400 dark:text-neutral-500">
                        No scans recorded yet. Use the scan simulator or test redirect!
                      </td>
                    </tr>
                  ) : (
                    recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors">
                        <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400 tabular-nums">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                          <span className="text-neutral-400 dark:text-neutral-500 text-[10px] block">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-neutral-800 dark:text-neutral-200">
                          <span className="capitalize">{log.deviceType}</span>
                          <span className="text-neutral-400 dark:text-neutral-500 block text-[10px]">{log.os}</span>
                        </td>
                        <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300">{log.browser}</td>
                        <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400 truncate max-w-[150px]">
                          {log.referrer}
                        </td>
                        <td className="px-4 py-2 text-neutral-800 dark:text-neutral-200 font-sans">
                          {log.city ? `${log.city}, ${log.country}` : log.country}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
