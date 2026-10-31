import React, { useState, useMemo } from 'react';
import { LinkRecord, BatchRecord, MockupCategory } from '../types';
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
  Folder,
  FolderOpen,
  List,
  Tag,
  ChevronDown,
  ChevronRight,
  Lock,
  Layers,
  X,
} from 'lucide-react';
import { getLast4Letters } from '../utils/a4QrHelper';
import { BulkPrintShopModal } from './BulkPrintShopModal';
import { MOCKUP_LABELS } from '../utils/bulkExportHelper';
import { firestoreDb } from '../services/firestoreDb';
import { localDb } from '../services/localDb';

interface LinksTableProps {
  links: LinkRecord[];
  onOpenQR: (link: LinkRecord) => void;
  onOpenEdit: (link: LinkRecord) => void;
  onOpenPrint: (link: LinkRecord) => void;
  onDeleteLink: (id: string) => void;
  onToggleStatus: (link: LinkRecord) => void;
  onOpenCreate: () => void;
  onUpdateLinkTags?: (id: string, tags: string[]) => void;
  onBulkUpdateLinks?: (updated: LinkRecord[]) => Promise<void>;
  batches?: BatchRecord[];
}

interface BatchGroup {
  batchId: string;
  batchName: string;
  batchPassword?: string;
  links: LinkRecord[];
  totalScans: number;
  assignedCount: number;
  unassignedCount: number;
}

export const LinksTable: React.FC<LinksTableProps> = ({
  links,
  onOpenQR,
  onOpenEdit,
  onOpenPrint,
  onDeleteLink,
  onToggleStatus,
  onOpenCreate,
  onUpdateLinkTags,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'unassigned'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'folders' | 'flat'>('folders');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Collapsible batch folders state
  const [collapsedBatches, setCollapsedBatches] = useState<Record<string, boolean>>({});

  // Quick Tag Modal state
  const [tagModalLink, setTagModalLink] = useState<LinkRecord | null>(null);
  const [tagInputText, setTagInputText] = useState('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const copyShortUrl = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const fullUrl = `${baseUrl}/r/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const toggleBatchCollapse = (batchId: string) => {
    setCollapsedBatches((prev) => ({
      ...prev,
      [batchId]: !prev[batchId],
    }));
  };

  // Extract all unique tags across links for filter dropdown
  const uniqueTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    links.forEach((l) => {
      if (Array.isArray(l.tags)) {
        l.tags.forEach((t) => {
          const clean = t.trim();
          if (clean) {
            tagMap.set(clean, (tagMap.get(clean) || 0) + 1);
          }
        });
      }
    });
    return Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [links]);

  const unassignedCount = links.filter((l) => l.isAssigned === false).length;

  // Filter links by search query, status, and tag
  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        link.title.toLowerCase().includes(q) ||
        link.slug.toLowerCase().includes(q) ||
        link.destinationUrl.toLowerCase().includes(q) ||
        (link.batchName && link.batchName.toLowerCase().includes(q)) ||
        (link.tags && link.tags.some((t) => t.toLowerCase().includes(q)));

      if (!matchesSearch) return false;

      // Tag filter
      if (selectedTag !== 'all') {
        if (!link.tags || !link.tags.includes(selectedTag)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'active') return link.isActive && link.isAssigned !== false;
      if (statusFilter === 'paused') return !link.isActive && link.isAssigned !== false;
      if (statusFilter === 'unassigned') return link.isAssigned === false;

      return true;
    });
  }, [links, searchQuery, selectedTag, statusFilter]);

  // Group filtered links into Batch Folders
  const batchGroups = useMemo(() => {
    const groups: Record<string, BatchGroup> = {};

    filteredLinks.forEach((link) => {
      const bId = link.batchId || 'standalone';
      const bName = link.batchName || (bId === 'standalone' ? '⚡ Standalone Dynamic Links' : `Batch ${bId}`);

      if (!groups[bId]) {
        groups[bId] = {
          batchId: bId,
          batchName: bName,
          batchPassword: link.batchPassword,
          links: [],
          totalScans: 0,
          assignedCount: 0,
          unassignedCount: 0,
        };
      }

      groups[bId].links.push(link);
      groups[bId].totalScans += link.totalClicks || 0;
      if (link.isAssigned === false || !link.destinationUrl) {
        groups[bId].unassignedCount += 1;
      } else {
        groups[bId].assignedCount += 1;
      }
    });

    // Ensure standalone is displayed last if present
    const groupList = Object.values(groups);
    groupList.sort((a, b) => {
      if (a.batchId === 'standalone') return 1;
      if (b.batchId === 'standalone') return -1;
      return a.batchName.localeCompare(b.batchName);
    });

    return groupList;
  }, [filteredLinks]);

  // Handle adding tag
  const handleSaveTags = (linkId: string, newTags: string[]) => {
    if (onUpdateLinkTags) {
      onUpdateLinkTags(linkId, newTags);
    }
    setTagModalLink(null);
  };

  const openTagEditor = (link: LinkRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setTagModalLink(link);
    setTagInputText('');
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden transition-colors space-y-0">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP TOOLBAR: Search, View Mode, Tag Filter, Status Filters */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 sm:p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
        {/* Left: Search Bar & Tag Filter Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-full xl:max-w-2xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search links, batches, tags, destinations..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-indigo-500 font-medium shadow-2xs"
            />
          </div>

          {/* Tag & Category Filter Dropdown */}
          <div className="relative shrink-0 sm:w-56">
            <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-indigo-500 appearance-none shadow-2xs cursor-pointer truncate"
            >
              <option value="all">🏷️ All Tags &amp; Locations ({links.length})</option>
              {uniqueTags.map(([tag, count]) => (
                <option key={tag} value={tag}>
                  🏷️ {tag} ({count})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right: View Mode Toggle (Batch Folders vs Flat List) & Status Filters & Create Button */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700/80">
            <button
              type="button"
              onClick={() => setViewMode('folders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'folders'
                  ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
              title="Group links into Batch Folders"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Batch Folders</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'flat'
                  ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
              title="Show flat table of all links"
            >
              <List className="w-3.5 h-3.5" />
              <span>Flat List</span>
            </button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              All ({links.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === 'active'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              Active ({links.filter((l) => l.isActive && l.isAssigned !== false).length})
            </button>
            <button
              onClick={() => setStatusFilter('paused')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
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
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'unassigned'
                    ? 'bg-amber-500 text-white shadow-xs font-black'
                    : 'text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200'
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
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-neutral-950 dark:bg-indigo-600 hover:bg-neutral-800 dark:hover:bg-indigo-500 rounded-xl transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Link</span>
          </button>
        </div>
      </div>

      {/* Active Tag Filter Indicator */}
      {selectedTag !== 'all' && (
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-neutral-700 dark:text-neutral-300">Filtering by tag:</span>
            <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-md">
              {selectedTag}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedTag('all')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Clear Filter</span>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN CONTENT AREA: BATCH FOLDERS VIEW OR FLAT LIST VIEW   */}
      {/* ------------------------------------------------------------- */}
      {filteredLinks.length === 0 ? (
        <div className="p-12 text-center text-neutral-500 dark:text-neutral-400 space-y-2">
          <Layers className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto" />
          <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">No dynamic links found</p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Try adjusting your search query, clearing tag filters, or generate a new batch of pre-printed QR stickers.
          </p>
        </div>
      ) : viewMode === 'folders' ? (
        /* ------------------ BATCH FOLDERS VIEW ------------------ */
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {batchGroups.map((group) => {
            const isCollapsed = Boolean(collapsedBatches[group.batchId]);
            const isStandalone = group.batchId === 'standalone';

            return (
              <div key={group.batchId} className="transition-colors">
                {/* Folder Header */}
                <div
                  onClick={() => toggleBatchCollapse(group.batchId)}
                  className="p-3 sm:p-4 bg-neutral-100/70 dark:bg-neutral-850 hover:bg-neutral-150 dark:hover:bg-neutral-800 transition-colors flex items-center justify-between cursor-pointer select-none border-b border-neutral-200/80 dark:border-neutral-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      aria-label="Toggle batch folder"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                      {isCollapsed ? <Folder className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white truncate">
                          {group.batchName}
                        </h3>
                        {group.batchPassword && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            title="Protected by batch security password"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>Password Protected</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold">{group.links.length} QR Codes</span>
                        <span>&bull;</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {group.assignedCount} Active
                        </span>
                        {group.unassignedCount > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {group.unassignedCount} Stock
                            </span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                          {group.totalScans.toLocaleString()} scans
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Batch Actions on Folder Header */}
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isStandalone && group.links.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpenPrint(group.links[0])}
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors shadow-2xs"
                        title="Print batch sheet or label stickers"
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Print Batch</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Batch Links List (Collapsible) */}
                {!isCollapsed && (
                  <div>
                    {/* Mobile View inside Batch */}
                    <div className="block md:hidden divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                      {group.links.map((link) => renderMobileLinkCard(link))}
                    </div>

                    {/* Desktop Table inside Batch */}
                    <div className="hidden md:block overflow-x-auto bg-white dark:bg-neutral-900">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 font-semibold tracking-wider uppercase text-[10px]">
                            <th className="px-5 py-2.5">Dynamic Identifier &amp; Title</th>
                            <th className="px-5 py-2.5">Tags &amp; Location</th>
                            <th className="px-5 py-2.5">Destination URL</th>
                            <th className="px-5 py-2.5 text-center">Scans</th>
                            <th className="px-5 py-2.5 text-center">Status</th>
                            <th className="px-5 py-2.5 text-center">QR Studio</th>
                            <th className="px-5 py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                          {group.links.map((link) => renderDesktopTableRow(link))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ------------------ FLAT LIST VIEW ------------------ */
        <div>
          {/* Mobile Phone Cards for Flat List */}
          <div className="block md:hidden divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredLinks.map((link) => renderMobileLinkCard(link))}
          </div>

          {/* Desktop Table for Flat List */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/75 dark:bg-neutral-850 text-neutral-500 dark:text-neutral-400 font-semibold tracking-wider uppercase text-[11px]">
                  <th className="px-5 py-3.5">Dynamic Identifier &amp; Title</th>
                  <th className="px-5 py-3.5">Tags &amp; Location</th>
                  <th className="px-5 py-3.5">Destination URL</th>
                  <th className="px-5 py-3.5 text-center">Scans</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">QR Studio</th>
                  <th className="px-5 py-3.5 text-right">Print / Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredLinks.map((link) => renderDesktopTableRow(link))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. LIGHTWEIGHT TAG & CATEGORY EDITOR MODAL                    */}
      {/* ------------------------------------------------------------- */}
      {tagModalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Manage Tags for /r/{tagModalLink.slug}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTagModalLink(null)}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Add tags like location (e.g. <code>Floor 1</code>, <code>Downtown Branch</code>) or campaign (e.g. <code>Summer Sale</code>) to organize and filter codes easily.
            </p>

            {/* Existing Tags Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Current Tags</label>
              <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                {(tagModalLink.tags || []).length === 0 ? (
                  <span className="text-xs text-neutral-400 italic">No tags assigned yet.</span>
                ) : (
                  (tagModalLink.tags || []).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (tagModalLink.tags || []).filter((item) => item !== t);
                          setTagModalLink({ ...tagModalLink, tags: updated });
                        }}
                        className="hover:text-red-500 p-0.5"
                      >
                        &times;
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Add New Tag Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Add New Tag</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInputText}
                  onChange={(e) => setTagInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const clean = tagInputText.trim();
                      if (clean && !tagModalLink.tags?.includes(clean)) {
                        setTagModalLink({
                          ...tagModalLink,
                          tags: [...(tagModalLink.tags || []), clean],
                        });
                        setTagInputText('');
                      }
                    }
                  }}
                  placeholder="e.g. Table 12, Campaign A..."
                  className="flex-1 px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => {
                    const clean = tagInputText.trim();
                    if (clean && !tagModalLink.tags?.includes(clean)) {
                      setTagModalLink({
                        ...tagModalLink,
                        tags: [...(tagModalLink.tags || []), clean],
                      });
                      setTagInputText('');
                    }
                  }}
                  className="px-3 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-2xs"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-1">
              <span className="text-[10px] text-neutral-400">Quick suggestions:</span>
              <div className="flex flex-wrap gap-1">
                {['Floor 1', 'Floor 2', 'Counter Stand', 'VIP Lounge', 'Diwali Promo', 'Store Entrance'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      if (!tagModalLink.tags?.includes(sug)) {
                        setTagModalLink({
                          ...tagModalLink,
                          tags: [...(tagModalLink.tags || []), sug],
                        });
                      }
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTagModalLink(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveTags(tagModalLink.id, tagModalLink.tags || [])}
                className="px-4 py-2 text-xs font-bold bg-neutral-950 dark:bg-indigo-600 hover:bg-neutral-800 dark:hover:bg-indigo-500 text-white rounded-xl transition-all shadow-xs"
              >
                Save Tags
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // -------------------------------------------------------------
  // HELPER: RENDER MOBILE CARD
  // -------------------------------------------------------------
  function renderMobileLinkCard(link: LinkRecord) {
    const isUnassigned = link.isAssigned === false || !link.destinationUrl || link.destinationUrl.trim() === '';
    const batchCode = getLast4Letters(link.slug);

    return (
      <div key={link.id} className="p-4 space-y-3 bg-white dark:bg-neutral-900">
        {/* Title & Scans */}
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

          <div className="text-right shrink-0">
            <div className="text-sm font-mono font-black text-neutral-950 dark:text-white">
              {link.totalClicks.toLocaleString()}
            </div>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold">scans</span>
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {(link.tags || []).map((t) => (
            <span
              key={t}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
            >
              {t}
            </span>
          ))}
          <button
            type="button"
            onClick={(e) => openTagEditor(link, e)}
            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 transition-colors flex items-center gap-1"
          >
            <Tag className="w-2.5 h-2.5" />
            <span>+ Tag</span>
          </button>
        </div>

        {/* Permanent Link Copy Button */}
        <button
          type="button"
          onClick={(e) => copyShortUrl(link.slug, e)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors shadow-2xs"
        >
          {copiedSlug === link.slug ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300 font-black">Copied Permanent Link!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="truncate">Copy Permanent Link ({baseUrl}/r/{link.slug})</span>
            </>
          )}
        </button>

        {/* Target Destination */}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
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

          <button
            onClick={() => onOpenQR(link)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl active:bg-neutral-200"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>QR Studio</span>
          </button>

          <button
            onClick={() => onOpenPrint(link)}
            className="p-2 text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl active:bg-neutral-200 shrink-0"
            title="Print A4 Display Sheet"
          >
            <Printer className="w-4 h-4" />
          </button>

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
  }

  // -------------------------------------------------------------
  // HELPER: RENDER DESKTOP TABLE ROW
  // -------------------------------------------------------------
  function renderDesktopTableRow(link: LinkRecord) {
    const isUnassigned = link.isAssigned === false || !link.destinationUrl || link.destinationUrl.trim() === '';
    const fullRedirectUrl = `${baseUrl}/r/${link.slug}`;
    const batchCode = getLast4Letters(link.slug);

    return (
      <tr
        key={link.id}
        className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors group"
      >
        {/* Column 1: Link Title & Short URL */}
        <td className="px-5 py-3.5">
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

        {/* Column 2: Tags & Category */}
        <td className="px-5 py-3.5 max-w-[200px]">
          <div className="flex flex-wrap items-center gap-1">
            {(link.tags || []).map((t) => (
              <span
                key={t}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 truncate"
              >
                {t}
              </span>
            ))}
            <button
              type="button"
              onClick={(e) => openTagEditor(link, e)}
              className="text-[10px] font-semibold text-neutral-400 hover:text-indigo-600 p-0.5 rounded"
              title="Edit tags"
            >
              + Tag
            </button>
          </div>
        </td>

        {/* Column 3: Live Destination URL */}
        <td className="px-5 py-3.5 max-w-xs">
          {isUnassigned ? (
            <div>
              <button
                onClick={() => onOpenEdit(link)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/80 rounded-lg transition-colors border border-amber-300 dark:border-amber-800"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Assign Destination</span>
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="truncate text-xs font-mono text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 flex-1 font-medium"
                  title={link.destinationUrl}
                >
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

        {/* Column 4: Total Scans */}
        <td className="px-5 py-3.5 text-center">
          <div className="font-mono tabular-nums font-black text-neutral-950 dark:text-white text-xs">
            {link.totalClicks.toLocaleString()}
          </div>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">scans</span>
        </td>

        {/* Column 5: Status Toggle */}
        <td className="px-5 py-3.5 text-center">
          {isUnassigned ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 inline-block border border-amber-200 dark:border-amber-800">
              Stock
            </span>
          ) : (
            <button
              onClick={() => onToggleStatus(link)}
              className={`text-xs font-bold px-2 py-0.5 rounded-md transition-colors ${
                link.isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800'
              }`}
            >
              {link.isActive ? 'Active' : 'Paused'}
            </button>
          )}
        </td>

        {/* Column 6: QR Studio & Delete */}
        <td className="px-5 py-3.5 text-center">
          <div className="inline-flex items-center gap-1.5">
            <button
              onClick={() => onOpenQR(link)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-2xs whitespace-nowrap"
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
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 border border-red-200 dark:border-red-900 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
              title="Delete this QR code"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Delete QR</span>
            </button>
          </div>
        </td>

        {/* Column 7: Print Sheet */}
        <td className="px-5 py-3.5 text-right">
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
  }
};
