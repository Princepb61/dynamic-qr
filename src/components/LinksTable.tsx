import React, { useState } from 'react';
import { LinkRecord } from '../types';
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  BarChart3,
  QrCode,
  Trash2,
  Printer,
  ArrowRight,
  Filter,
  Sparkles,
} from 'lucide-react';

interface LinksTableProps {
  links: LinkRecord[];
  onOpenQR: (link: LinkRecord) => void;
  onOpenAnalytics: (link: LinkRecord) => void;
  onOpenEdit: (link: LinkRecord) => void;
  onOpenPrint: (link: LinkRecord) => void;
  onDeleteLink: (id: string) => void;
  onToggleStatus: (link: LinkRecord) => void;
  onOpenCreate: () => void;
}

export const LinksTable: React.FC<LinksTableProps> = ({
  links,
  onOpenQR,
  onOpenAnalytics,
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
    <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search links by title, slug, destination, or tags..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg shrink-0 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'all'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All ({links.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'active'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Active ({links.filter((l) => l.isActive && l.isAssigned !== false).length})
          </button>
          <button
            onClick={() => setStatusFilter('paused')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'paused'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Paused ({links.filter((l) => !l.isActive && l.isAssigned !== false).length})
          </button>
          {unassignedCount > 0 && (
            <button
              onClick={() => setStatusFilter('unassigned')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'unassigned'
                  ? 'bg-amber-500 text-white shadow-xs font-semibold'
                  : 'text-amber-800 bg-amber-100 hover:bg-amber-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Unassigned Stock ({unassignedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Link Notification Pill-Free Banner */}
      <div className="px-5 py-2.5 bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-900">Dynamic Routing:</span>
          <span>Changing the Destination URL below updates live redirects instantly without altering QR codes.</span>
        </div>
        <span className="hidden lg:inline text-neutral-400 font-mono">
          Showing {filteredLinks.length} dynamic endpoints
        </span>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm divide-y divide-neutral-200">
          <thead className="bg-neutral-50 text-neutral-600 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3">Link & Identifier</th>
              <th className="px-5 py-3">Destination URL (Editable)</th>
              <th className="px-5 py-3 text-center">Scans</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">QR Asset</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredLinks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-neutral-500">
                  <div className="max-w-sm mx-auto space-y-3">
                    <p className="text-sm">No dynamic redirect links match your criteria.</p>
                    <button
                      onClick={onOpenCreate}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
                    >
                      Create First Dynamic Link
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLinks.map((link) => {
                const fullRedirectUrl = `${baseUrl}/r/${link.slug}`;
                return (
                  <tr key={link.id} className="hover:bg-neutral-50/70 transition-colors">
                    {/* Column 1: Title and Slug */}
                    <td className="px-5 py-4 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-900 text-sm">{link.title}</span>
                        {link.isAssigned === false && (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                            Pre-Printed Stock
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-neutral-500">/r/{link.slug}</span>
                        <button
                          onClick={(e) => copyShortUrl(link.slug, e)}
                          title="Copy short link"
                          className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                        >
                          {copiedSlug === link.slug ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={fullRedirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Test live redirect"
                          className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      {link.description && (
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-1">{link.description}</p>
                      )}
                      {link.ownerName && (
                        <div className="text-[10px] text-neutral-400 mt-1">
                          Owner: <span className="text-neutral-600 font-medium">{link.ownerName}</span>
                        </div>
                      )}
                    </td>

                    {/* Column 2: Destination URL with One-Click Edit */}
                    <td className="px-5 py-4 max-w-sm">
                      {link.isAssigned === false || !link.destinationUrl ? (
                        <div>
                          <button
                            onClick={() => onOpenEdit(link)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors shadow-2xs"
                            title="Click to assign destination URL"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Assign Destination URL</span>
                          </button>
                          <div className="text-[11px] text-amber-700/80 mt-1">
                            Awaiting scan or target link
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="truncate text-xs font-mono text-neutral-700 bg-neutral-100 px-2.5 py-1.5 rounded-md border border-neutral-200 flex-1" title={link.destinationUrl}>
                              {link.destinationUrl}
                            </div>
                            <button
                              onClick={() => onOpenEdit(link)}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded-md transition-colors shrink-0"
                              title="Change destination URL"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-1">
                            Updated {new Date(link.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Column 3: Total Scans */}
                    <td className="px-5 py-4 text-center">
                      <div className="font-mono tabular-nums font-bold text-neutral-900 text-sm">
                        {link.totalClicks.toLocaleString()}
                      </div>
                      <span className="text-[11px] text-neutral-400">scans</span>
                    </td>

                    {/* Column 4: Status Toggle */}
                    <td className="px-5 py-4 text-center">
                      {link.isAssigned === false ? (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 inline-block border border-amber-200">
                          Unassigned
                        </span>
                      ) : (
                        <button
                          onClick={() => onToggleStatus(link)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                            link.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          {link.isActive ? 'Active' : 'Paused'}
                        </button>
                      )}
                    </td>

                    {/* Column 5: QR Asset Preview */}
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => onOpenQR(link)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-2xs whitespace-nowrap shrink-0"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Studio</span>
                      </button>
                    </td>

                    {/* Column 6: Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onOpenAnalytics(link)}
                          title="View Scan Analytics"
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenPrint(link)}
                          title="Printable QR Sheet"
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteLink(link.id)}
                          title="Delete Link"
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
