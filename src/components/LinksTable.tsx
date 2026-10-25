import React, { useState } from 'react';
import { LinkRecord } from '../types';
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  QrCode,
  Trash2,
  Printer,
  Sparkles,
  Plus,
} from 'lucide-react';
import { getLast4Letters } from '../utils/a4QrHelper';

interface LinksTableProps {
  links: LinkRecord[];
  onOpenQR: (link: LinkRecord) => void;
  onOpenEdit: (link: LinkRecord) => void;
  onOpenPrint: (link: LinkRecord) => void;
  onDeleteLink: (id: string) => void;
  onToggleStatus: (link: LinkRecord) => void;
  onOpenCreate: () => void;
}

export const LinksTable: React.FC<LinksTableProps> = ({
  links,
  onOpenQR,
  onOpenEdit,
  onOpenPrint,
  onDeleteLink,
  onToggleStatus,
  onOpenCreate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'unassigned'>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const copyShortUrl = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const fullUrl = `${baseUrl}/r/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const unassignedCount = links.filter((l) => l.isAssigned === false).length;

  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.destinationUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (link.tags && link.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return link.isActive && link.isAssigned !== false;
    if (statusFilter === 'paused') return !link.isActive && link.isAssigned !== false;
    if (statusFilter === 'unassigned') return link.isAssigned === false;
    return true;
  });

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
      {/* Table & Filter Toolbar (Mobile-Optimized) */}
      <div className="p-3 sm:p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 w-full max-w-full lg:max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search links, slugs, destinations..."
            className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-neutral-200 dark:border-neutral-700 rounded-xl bg-neutral-50/70 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:bg-white dark:focus:bg-neutral-800 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400 transition-colors font-medium"
          />
        </div>

        {/* Right side: Filter Tabs & Dedicated Create Dynamic Link Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Filter Tabs (Horizontal scrollable on mobile) */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              All ({links.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'active'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              Active ({links.filter((l) => l.isActive && l.isAssigned !== false).length})
            </button>
            <button
              onClick={() => setStatusFilter('paused')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'paused'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              Paused ({links.filter((l) => !l.isActive && l.isAssigned !== false).length})
            </button>
            {unassignedCount > 0 && (
              <button
                onClick={() => setStatusFilter('unassigned')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  statusFilter === 'unassigned'
                    ? 'bg-amber-500 text-white shadow-xs font-black'
                    : 'text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Stock ({unassignedCount})</span>
              </button>
            )}
          </div>

          {/* Create Dynamic Link Button */}
          <button
            onClick={onOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-neutral-950 dark:bg-indigo-600 hover:bg-neutral-800 dark:hover:bg-indigo-500 rounded-xl transition-colors shadow-xs whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Create Dynamic Link</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 1. MOBILE PHONE FRIENDLY VIEW (Card layout for screens < 768px)  */}
      {/* ----------------------------------------------------------------- */}
      <div className="block md:hidden divide-y divide-neutral-200 dark:divide-neutral-800">
        {filteredLinks.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
            <p className="text-sm font-semibold">No dynamic links found</p>
            <p className="text-xs text-neutral-400 mt-1">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          filteredLinks.map((link) => {
            const isUnassigned = link.isAssigned === false || !link.destinationUrl || link.destinationUrl.trim() === '';
            const batchCode = getLast4Letters(link.slug);

            return (
              <div key={link.id} className="p-4 space-y-3 bg-white dark:bg-neutral-900">
                {/* Mobile Card Row 1: Title & Scans Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-neutral-950 dark:text-white truncate">
                      {link.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        /r/{link.slug}
                      </span>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold">
                        {batchCode}
                      </span>
                    </div>
                  </div>

                  {/* Scans pill */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-black text-neutral-950 dark:text-white">
                      {link.totalClicks.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold">scans</span>
                  </div>
                </div>

                {/* Mobile: Prominent Permanent Link Copy Button */}
                <button
                  type="button"
                  onClick={(e) => copyShortUrl(link.slug, e)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors shadow-2xs"
                >
                  {copiedSlug === link.slug ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-300 font-black">Copied Permanent Link to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="truncate">Copy Permanent Link ({baseUrl}/r/{link.slug})</span>
                    </>
                  )}
                </button>

                {/* Mobile Card Row 2: Target Destination */}
                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  {isUnassigned ? (
                    <button
                      onClick={() => onOpenEdit(link)}
                      className="w-full flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Tap to assign destination URL</span>
                      </span>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-mono text-neutral-700 dark:text-neutral-300 truncate" title={link.destinationUrl}>
                        {link.destinationUrl}
                      </div>
                      <button
                        onClick={() => onOpenEdit(link)}
                        className="p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 shrink-0"
                        title="Edit target URL"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile Card Row 3: Action Buttons (Thumb-friendly touch bar) */}
                <div className="flex items-center gap-2 pt-1">
                  {/* Status Toggle */}
                  {link.isAssigned !== false && (
                    <button
                      onClick={() => onToggleStatus(link)}
                      className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl transition-colors border text-center ${
                        link.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {link.isActive ? 'Active' : 'Paused'}
                    </button>
                  )}

                  {/* QR Studio */}
                  <button
                    onClick={() => onOpenQR(link)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl active:bg-neutral-200"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>QR Studio</span>
                  </button>

                  {/* Print A4 */}
                  <button
                    onClick={() => onOpenPrint(link)}
                    className="p-2 text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl active:bg-neutral-200 shrink-0"
                    title="Print A4 Display Sheet"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {/* Direct Delete QR Button */}
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete QR code /r/${link.slug}?`)) {
                        onDeleteLink(link.id);
                      }
                    }}
                    className="flex items-center justify-center gap-1 py-2 px-3 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl active:bg-red-100"
                    title="Delete QR"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. DESKTOP VIEW (Table for screens >= 768px)                      */}
      {/* ----------------------------------------------------------------- */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/75 dark:bg-neutral-850 text-neutral-500 dark:text-neutral-400 font-semibold tracking-wider uppercase text-[11px]">
              <th className="px-5 py-3.5">Dynamic Identifier & Title</th>
              <th className="px-5 py-3.5">Live Target Destination</th>
              <th className="px-5 py-3.5 text-center">Total Scans</th>
              <th className="px-5 py-3.5 text-center">Routing Status</th>
              <th className="px-5 py-3.5 text-center">QR Code & Actions</th>
              <th className="px-5 py-3.5 text-right">Print / Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredLinks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
                  <div className="max-w-xs mx-auto space-y-1">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">No dynamic links found</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">Try adjusting your search query or filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLinks.map((link) => {
                const isUnassigned = link.isAssigned === false || !link.destinationUrl || link.destinationUrl.trim() === '';
                const fullRedirectUrl = `${baseUrl}/r/${link.slug}`;
                const batchCode = getLast4Letters(link.slug);

                return (
                  <tr
                    key={link.id}
                    className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors group"
                  >
                    {/* Column 1: Link Title & Short URL */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-neutral-900 dark:text-white text-xs">
                        {link.title}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">/r/{link.slug}</span>
                        <button
                          type="button"
                          onClick={(e) => copyShortUrl(link.slug, e)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded transition-colors"
                          title={`Copy permanent redirect URL: ${fullRedirectUrl}`}
                        >
                          {copiedSlug === link.slug ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-700 dark:text-emerald-300">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                        <span className="text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">
                          {batchCode}
                        </span>
                      </div>
                    </td>

                    {/* Column 2: Live Destination URL */}
                    <td className="px-5 py-4 max-w-xs">
                      {isUnassigned ? (
                        <div>
                          <button
                            onClick={() => onOpenEdit(link)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/80 rounded-lg transition-colors border border-amber-300 dark:border-amber-800"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Assign Destination URL</span>
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="truncate text-xs font-mono text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 flex-1 font-medium" title={link.destinationUrl}>
                              {link.destinationUrl}
                            </div>
                            <button
                              onClick={() => onOpenEdit(link)}
                              className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors shrink-0"
                              title="Change destination URL"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Column 3: Total Scans */}
                    <td className="px-5 py-4 text-center">
                      <div className="font-mono tabular-nums font-black text-neutral-950 dark:text-white text-sm">
                        {link.totalClicks.toLocaleString()}
                      </div>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">scans</span>
                    </td>

                    {/* Column 4: Status Toggle */}
                    <td className="px-5 py-4 text-center">
                      {isUnassigned ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 inline-block border border-amber-200 dark:border-amber-800">
                          Unassigned
                        </span>
                      ) : (
                        <button
                          onClick={() => onToggleStatus(link)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors ${
                            link.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {link.isActive ? 'Active' : 'Paused'}
                        </button>
                      )}
                    </td>

                    {/* Column 5: QR Asset & Direct Delete Button */}
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenQR(link)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-2xs whitespace-nowrap"
                          title="Open QR Studio to customize & export"
                        >
                          <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>QR Studio</span>
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Delete QR code /r/${link.slug}?`)) {
                              onDeleteLink(link.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/80 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
                          title="Delete this QR code"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" />
                          <span>Delete QR</span>
                        </button>
                      </div>
                    </td>

                    {/* Column 6: Print & Direct Action */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onOpenPrint(link)}
                        title="Printable A4 Sheet"
                        className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
