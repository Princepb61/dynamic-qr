import React, { useState } from 'react';
import { GlobalOverview, LinkRecord } from '../types';
import {
  TrendingUp,
  Smartphone,
  Globe,
  Compass,
  ArrowUpRight,
  Filter,
  BarChart2,
  Calendar,
  Layers,
} from 'lucide-react';

interface AnalyticsViewProps {
  overview: GlobalOverview | null;
  links: LinkRecord[];
  onSelectLinkForAnalytics: (link: LinkRecord) => void;
  onOpenSimulator: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  overview,
  links,
  onSelectLinkForAnalytics,
  onOpenSimulator,
}) => {
  const [filterDevice, setFilterDevice] = useState<string>('all');

  if (!overview) return null;

  const totalClicks = overview.totalClicks;
  const recentLogs = overview.recentActivity || [];

  const filteredLogs = recentLogs.filter((log) => {
    if (filterDevice === 'all') return true;
    return log.deviceType === filterDevice;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Scan & Traffic Telemetry</h2>
          <p className="text-xs text-neutral-500">
            Real-time audit log of scans, device hardware, geolocation, and dynamic redirects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            <span>Launch Scan Simulator</span>
          </button>
        </div>
      </div>

      {/* Traffic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs text-neutral-500 font-medium mb-1">Total Redirect Events</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
            {totalClicks.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-neutral-400">Captured with HTTP 307 temporary headers</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs text-neutral-500 font-medium mb-1">Active Endpoints</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
            {overview.activeLinksCount} of {overview.totalLinks}
          </div>
          <p className="mt-1 text-xs text-neutral-400">100% editable destination targets</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs text-neutral-500 font-medium mb-1">Mobile Scan Ratio</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
            {Math.round(((overview.deviceBreakdown.mobile || 0) / (totalClicks || 1)) * 100)}%
          </div>
          <p className="mt-1 text-xs text-neutral-400">Direct camera scanner sessions</p>
        </div>
      </div>

      {/* Performance by Link Leaderboard */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">Performance by Dynamic Link</h3>
          <span className="text-xs text-neutral-400 font-mono">Ranked by total scans</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-neutral-200">
            <thead className="bg-neutral-50 text-neutral-600 font-semibold uppercase">
              <tr>
                <th className="px-5 py-3">Link Title & Endpoint</th>
                <th className="px-5 py-3">Current Destination Target</th>
                <th className="px-5 py-3 text-center">Total Scans</th>
                <th className="px-5 py-3 text-center">Traffic Share</th>
                <th className="px-5 py-3 text-right">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono">
              {[...links]
                .sort((a, b) => b.totalClicks - a.totalClicks)
                .map((link) => {
                  const share = totalClicks > 0 ? Math.round((link.totalClicks / totalClicks) * 100) : 0;
                  return (
                    <tr key={link.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-5 py-3 font-sans">
                        <div className="font-semibold text-neutral-900">{link.title}</div>
                        <div className="text-neutral-500 text-[11px] font-mono">/r/{link.slug}</div>
                      </td>
                      <td className="px-5 py-3 text-neutral-600 max-w-xs truncate" title={link.destinationUrl}>
                        {link.destinationUrl}
                      </td>
                      <td className="px-5 py-3 text-center tabular-nums font-bold text-neutral-900">
                        {link.totalClicks.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-neutral-900 h-1.5 rounded-full"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-neutral-500">{share}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-sans">
                        <button
                          onClick={() => onSelectLinkForAnalytics(link)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-neutral-950 underline"
                        >
                          <span>View Detail</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Real-Time Activity Log */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Live Traffic Stream</h3>
            <p className="text-xs text-neutral-500">Every scan processed across all dynamic QR codes</p>
          </div>
          {/* Device filter buttons */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
            {['all', 'mobile', 'desktop', 'tablet'].map((dev) => (
              <button
                key={dev}
                onClick={() => setFilterDevice(dev)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                  filterDevice === dev
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {dev}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-neutral-200">
            <thead className="bg-neutral-50 text-neutral-600 font-semibold uppercase">
              <tr>
                <th className="px-5 py-2.5">Time</th>
                <th className="px-5 py-2.5">Target Link</th>
                <th className="px-5 py-2.5">Hardware / Form</th>
                <th className="px-5 py-2.5">Browser & OS</th>
                <th className="px-5 py-2.5">Origin Channel</th>
                <th className="px-5 py-2.5">Region</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-neutral-400 font-sans">
                    No scans found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const matchingLink = links.find((l) => l.id === log.linkId);
                  return (
                    <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-2.5 text-neutral-600 tabular-nums">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-2.5 font-sans">
                        <span className="font-medium text-neutral-900 block truncate max-w-[140px]">
                          {matchingLink?.title || log.slug}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">/r/{log.slug}</span>
                      </td>
                      <td className="px-5 py-2.5 capitalize text-neutral-700">{log.deviceType}</td>
                      <td className="px-5 py-2.5 text-neutral-700">
                        <span>{log.browser}</span>
                        <span className="text-neutral-400 text-[10px] block">{log.os}</span>
                      </td>
                      <td className="px-5 py-2.5 text-neutral-500 truncate max-w-[150px]">{log.referrer}</td>
                      <td className="px-5 py-2.5 text-neutral-800 font-sans">
                        {log.city ? `${log.city}, ${log.country}` : log.country}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
