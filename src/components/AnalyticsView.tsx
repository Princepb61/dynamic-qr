import React, { useState } from 'react';
import { GlobalOverview, LinkRecord } from '../types';
import { ArrowUpRight } from 'lucide-react';

interface AnalyticsViewProps {
  overview: GlobalOverview | null;
  links: LinkRecord[];
  onSelectLinkForAnalytics: (link: LinkRecord) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  overview,
  links,
  onSelectLinkForAnalytics,
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
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">Scan & Traffic Telemetry</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Real-time audit log of scans, device hardware, geolocation, and dynamic redirects.
          </p>
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono font-bold">
          Auto-syncing incoming traffic
        </div>
      </div>

      {/* Traffic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs transition-colors">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-bold mb-1">Total Redirect Events</div>
          <div className="text-2xl font-black font-mono tabular-nums text-neutral-950 dark:text-white">
            {totalClicks.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 font-medium">Captured with HTTP 307 temporary headers</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs transition-colors">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-bold mb-1">Active Endpoints</div>
          <div className="text-2xl font-black font-mono tabular-nums text-neutral-950 dark:text-white">
            {overview.activeLinksCount} of {overview.totalLinks}
          </div>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 font-medium">100% editable destination targets</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs transition-colors">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-bold mb-1">Mobile Scan Ratio</div>
          <div className="text-2xl font-black font-mono tabular-nums text-neutral-950 dark:text-white">
            {Math.round(((overview.deviceBreakdown.mobile || 0) / (totalClicks || 1)) * 100)}%
          </div>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 font-medium">Direct camera scanner sessions</p>
        </div>
      </div>

      {/* Performance by Link Leaderboard */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden transition-colors">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Performance by Dynamic Link</h3>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono font-medium">Ranked by total scans</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-neutral-200 dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-300 font-bold uppercase">
              <tr>
                <th className="px-5 py-3">Link Title & Endpoint</th>
                <th className="px-5 py-3">Current Destination Target</th>
                <th className="px-5 py-3 text-center">Total Scans</th>
                <th className="px-5 py-3 text-center">Traffic Share</th>
                <th className="px-5 py-3 text-right">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 font-mono">
              {[...links]
                .sort((a, b) => b.totalClicks - a.totalClicks)
                .map((link) => {
                  const share = totalClicks > 0 ? Math.round((link.totalClicks / totalClicks) * 100) : 0;
                  return (
                    <tr key={link.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/60 transition-colors">
                      <td className="px-5 py-3 font-sans">
                        <div className="font-bold text-neutral-900 dark:text-white">{link.title}</div>
                        <div className="text-neutral-500 dark:text-neutral-400 text-[11px] font-mono font-medium">/r/{link.slug}</div>
                      </td>
                      <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300 max-w-xs truncate" title={link.destinationUrl}>
                        {link.destinationUrl}
                      </td>
                      <td className="px-5 py-3 text-center tabular-nums font-black text-neutral-900 dark:text-white">
                        {link.totalClicks.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-neutral-500 dark:text-neutral-400 font-medium">{share}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-sans">
                        <button
                          onClick={() => onSelectLinkForAnalytics(link)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white underline"
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
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden transition-colors">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Live Traffic Stream</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Every scan processed across all dynamic QR codes</p>
          </div>
          {/* Device filter buttons */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            {['all', 'mobile', 'desktop', 'tablet'].map((dev) => (
              <button
                key={dev}
                onClick={() => setFilterDevice(dev)}
                className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition-colors ${
                  filterDevice === dev
                    ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-2xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {dev}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-neutral-200 dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-300 font-bold uppercase">
              <tr>
                <th className="px-5 py-2.5">Time</th>
                <th className="px-5 py-2.5">Target Link</th>
                <th className="px-5 py-2.5">Hardware / Form</th>
                <th className="px-5 py-2.5">Browser & OS</th>
                <th className="px-5 py-2.5">Origin Channel</th>
                <th className="px-5 py-2.5">Region</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-neutral-400 dark:text-neutral-500 font-sans font-medium">
                    No scans found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const matchingLink = links.find((l) => l.id === log.linkId);
                  return (
                    <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors">
                      <td className="px-5 py-2.5 text-neutral-600 dark:text-neutral-300 tabular-nums">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-2.5 font-sans">
                        <span className="font-bold text-neutral-900 dark:text-white block truncate max-w-[140px]">
                          {matchingLink?.title || log.slug}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500">/r/{log.slug}</span>
                      </td>
                      <td className="px-5 py-2.5 capitalize text-neutral-700 dark:text-neutral-300 font-medium">{log.deviceType}</td>
                      <td className="px-5 py-2.5 text-neutral-700 dark:text-neutral-300">
                        <span>{log.browser}</span>
                        <span className="text-neutral-400 dark:text-neutral-500 text-[10px] block">{log.os}</span>
                      </td>
                      <td className="px-5 py-2.5 text-neutral-500 dark:text-neutral-400 truncate max-w-[150px]">{log.referrer}</td>
                      <td className="px-5 py-2.5 text-neutral-800 dark:text-neutral-200 font-sans font-medium">
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
