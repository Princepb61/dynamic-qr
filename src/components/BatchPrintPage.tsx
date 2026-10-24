import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { LinkRecord } from '../types';
import { api } from '../services/api';
import {
  Printer,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Plus,
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldCheck,
  Tag,
  SlidersHorizontal,
  Trash2,
  Download,
} from 'lucide-react';
import { getLast4Letters } from '../utils/a4QrHelper';

interface BatchPrintPageProps {
  links: LinkRecord[];
  onRefreshLinks: () => Promise<void>;
  onOpenSimulatorForLink?: (linkId: string) => void;
  onDeleteLink?: (id: string) => Promise<void> | void;
}

export const BatchPrintPage: React.FC<BatchPrintPageProps> = ({
  links,
  onRefreshLinks,
  onOpenSimulatorForLink,
  onDeleteLink,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'print' | 'inventory'>('print');

  // Generator State
  const [batchName, setBatchName] = useState('Table Standee Stock');
  const [prefix, setPrefix] = useState('table');
  const [batchCount, setBatchCount] = useState<number>(12);
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);
  const [brandTitle, setBrandTitle] = useState('taplocalin Stock');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBatchLinks, setGeneratedBatchLinks] = useState<LinkRecord[]>([]);

  // Inventory & Assignment State
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
  const [assigningLink, setAssigningLink] = useState<LinkRecord | null>(null);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // Quick Code Lookup / Scan
  const [lookupSlug, setLookupSlug] = useState('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Filter batch / stock links (pre-printed or unassigned)
  const stockLinks = links.filter((l) => l.isAssigned === false || l.tags?.includes('Pre-Printed') || l.tags?.includes('Batch Stock'));
  const unassignedCount = stockLinks.filter((l) => l.isAssigned === false || !l.destinationUrl).length;
  const assignedCount = stockLinks.length - unassignedCount;

  // Initial setup: use stock links if available for print preview
  useEffect(() => {
    if (generatedBatchLinks.length === 0 && stockLinks.length > 0) {
      setGeneratedBatchLinks(stockLinks.slice(0, 12));
    }
  }, [stockLinks]);

  // Handle generating a new batch of pre-printed QR codes
  const handleGenerateBatch = async () => {
    try {
      setIsGenerating(true);
      const res = await api.generateBatch({
        batchName: batchName.trim() || 'Pre-Printed Batch',
        prefix: prefix.trim() || 'qr',
        count: batchCount,
      });
      setGeneratedBatchLinks(res.links);
      await onRefreshLinks();
    } catch (err) {
      console.error('Batch generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle assigning a destination URL to a pre-printed QR code
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningLink) return;

    let target = destinationUrl.trim();
    if (!target) {
      setAssignError('Destination URL is required.');
      return;
    }

    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    try {
      new URL(target);
    } catch {
      setAssignError('Please enter a valid web URL (e.g. https://yourbusiness.com).');
      return;
    }

    try {
      setIsSavingAssignment(true);
      setAssignError(null);
      await api.assignBatchLink(assigningLink.id, {
        destinationUrl: target,
        title: assignTitle.trim() || assigningLink.title,
      });

      setAssignSuccess(`QR code /r/${assigningLink.slug} is now linked! Next scan will route to: ${target}`);
      await onRefreshLinks();
      setTimeout(() => {
        setAssigningLink(null);
        setAssignSuccess(null);
        setDestinationUrl('');
        setAssignTitle('');
      }, 1800);
    } catch (err: any) {
      setAssignError(err.message || 'Failed to assign destination');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleLookup = () => {
    if (!lookupSlug.trim()) return;
    const clean = lookupSlug.trim().toLowerCase().replace('/r/', '').replace('/', '');
    const found = links.find((l) => l.slug.toLowerCase() === clean);
    if (found) {
      setAssigningLink(found);
      setDestinationUrl(found.destinationUrl || '');
      setAssignTitle(found.title || '');
      setAssignError(null);
      setAssignSuccess(null);
    } else {
      alert(`No QR code found with slug: /r/${clean}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered inventory list
  const filteredInventory = links.filter((link) => {
    const isUnassigned = link.isAssigned === false || !link.destinationUrl || link.destinationUrl.trim() === '';
    if (inventoryFilter === 'unassigned' && !isUnassigned) return false;
    if (inventoryFilter === 'assigned' && isUnassigned) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        link.title.toLowerCase().includes(q) ||
        link.slug.toLowerCase().includes(q) ||
        link.destinationUrl.toLowerCase().includes(q) ||
        (link.batchName && link.batchName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner (Hidden in print) */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">Multi-QR Print & Dynamic Link Assignment</h2>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md">
              Pre-Printed Stock Engine
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
            Print sheets of blank QR codes in bulk. After printing, scan any code or assign destination URLs from this admin console anytime!
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-full sm:w-auto shrink-0">
          <button
            onClick={() => setActiveSubTab('print')}
            className={`px-3 py-2 text-xs font-bold rounded-md transition-colors text-center ${
              activeSubTab === 'print'
                ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Printer className="w-3.5 h-3.5" />
              <span>Multi-QR Print</span>
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`px-3 py-2 text-xs font-bold rounded-md transition-colors text-center ${
              activeSubTab === 'inventory'
                ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Stock ({unassignedCount})</span>
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GENERATE & PRINT MULTI-QR CODES */}
      {/* ========================================================================= */}
      {activeSubTab === 'print' && (
        <div className="space-y-6">
          {/* Controls Bar (Hidden in print) */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Batch Name / Purpose
                </label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g. Table Standee Stock"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Slug Prefix
                </label>
                <div className="flex items-center">
                  <span className="text-xs text-neutral-400 font-mono pl-3 py-2 bg-neutral-100 border border-r-0 border-neutral-300 rounded-l-lg">
                    /r/
                  </span>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="table"
                    className="w-full px-2.5 py-2 text-xs font-mono border border-neutral-300 rounded-r-lg focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Quantity per Sheet
                </label>
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-neutral-900 font-medium"
                >
                  <option value={6}>6 Codes (2×3 Sheet - Table Cards)</option>
                  <option value={12}>12 Codes (3×4 Sheet - Square Stickers)</option>
                  <option value={18}>18 Codes (3×6 Sheet - Product Tags)</option>
                  <option value={24}>24 Codes (4×6 Sheet - Small Labels)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Grid Columns Layout
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[2, 3, 4].map((cols) => (
                    <button
                      key={cols}
                      onClick={() => setGridCols(cols as any)}
                      className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                        gridCols === cols
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {cols} Cols
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-neutral-500 flex items-center gap-2">
                <span className="font-semibold text-neutral-800">Workflow:</span>
                <span>Click Generate to create batch stock links, then click Print Sheet to print physical copies.</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleGenerateBatch}
                  disabled={isGenerating}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isGenerating ? 'Generating...' : `Generate ${batchCount} New Blank Codes`}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print A4 QR Code Sheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Printable Sheet Canvas - A4 Print Layout */}
          <div id="printable-sheet" className="printable-a4-container bg-white border border-neutral-200 rounded-xl p-8 shadow-xs print:border-0 print:p-0 print:shadow-none">
            {/* Sheet Header (Included in print) */}
            <div className="mb-6 pb-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
                  {batchName}
                </h1>
                <p className="text-xs text-neutral-500 font-mono">
                  A4 Multi-QR Stock · Showing {generatedBatchLinks.length} endpoints · Simple QR
                </p>
              </div>
              <div className="text-right text-xs text-neutral-500 font-mono">
                <span>Scan code to assign URL</span>
                <span className="block text-[11px] text-neutral-400">HTTP 307 Dynamic Routing</span>
              </div>
            </div>

            {/* QR Codes Grid */}
            <div
              className={`grid gap-4 print:gap-3 ${
                gridCols === 2
                  ? 'grid-cols-2'
                  : gridCols === 3
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
              }`}
            >
              {generatedBatchLinks.map((link, idx) => {
                const fullRedirectUrl = `${baseUrl}/r/${link.slug}`;
                const isLinked = link.isAssigned !== false && Boolean(link.destinationUrl);

                return (
                  <div
                    key={link.id}
                    className="border-2 border-dashed border-neutral-300 rounded-xl p-4 flex flex-col items-center justify-between text-center bg-white relative hover:border-neutral-400 transition-colors"
                  >
                    {/* Top Serial & Watermark */}
                    <div className="w-full flex items-center justify-between text-[11px] text-neutral-400 font-mono mb-2">
                      <span className="font-bold text-neutral-700">#{String(idx + 1).padStart(2, '0')}</span>
                      <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-neutral-500">
                        {isLinked ? 'Linked & Active' : 'Scan to Link'}
                      </span>
                    </div>

                    {/* Borderless QR Code Canvas */}
                    <div className="p-1 bg-white my-1 flex items-center justify-center">
                      <QRCodeCanvas url={fullRedirectUrl} size={gridCols === 2 ? 160 : gridCols === 3 ? 130 : 100} />
                    </div>

                    {/* Under the QR: Mention ONLY the batch code (No outline border, no "last 4" label) */}
                    <div className="my-0.5 text-center">
                      <span className="text-sm font-mono font-black text-neutral-950 tracking-widest">
                        {getLast4Letters(link.slug)}
                      </span>
                    </div>

                    {/* Bottom Slug & Cut Indicator */}
                    <div className="w-full mt-1.5 pt-1.5 border-t border-neutral-100">
                      <div className="text-xs font-bold text-neutral-900 truncate">
                        {link.title}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500 truncate mt-0.5">
                        /r/{link.slug}
                      </div>

                      {/* Interactive Actions for screen view (hidden in print) */}
                      <div className="mt-2 flex items-center justify-center gap-1.5 print:hidden">
                        {isLinked ? (
                          <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded truncate max-w-[160px]" title={link.destinationUrl}>
                            {link.destinationUrl}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAssigningLink(link);
                              setDestinationUrl('');
                              setAssignTitle(link.title);
                              setAssignError(null);
                              setAssignSuccess(null);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-2xs"
                          >
                            Assign URL
                          </button>
                        )}
                        <a
                          href={fullRedirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-neutral-400 hover:text-neutral-700"
                          title="Simulate scan / Open in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cut line instructions (Included in print) */}
            <div className="mt-6 pt-4 border-t border-neutral-200 text-center text-xs text-neutral-400 font-mono">
              <span>✂ Cut along dashed borders · Pre-printed stock ready for physical deployment · Assign destinations anytime</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INVENTORY & QUICK ACTIVATION */}
      {/* ========================================================================= */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6">
          {/* Lookup & Quick Scanner Bar */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Scan or Enter QR Code Slug to Assign
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={lookupSlug}
                  onChange={(e) => setLookupSlug(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder="e.g. stock-table-01 or /r/qr-02-a8f"
                  className="flex-1 px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  Find Code
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span className="font-bold text-amber-950 block">{unassignedCount} Pre-Printed Codes Unassigned</span>
                <span>Ready to be linked to menus, websites, or campaigns.</span>
              </div>
            </div>
          </div>

          {/* Filter & Inventory Table */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by code slug, title, or destination..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 rounded-lg w-full sm:w-auto shrink-0 text-center">
                <button
                  onClick={() => setInventoryFilter('unassigned')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors truncate ${
                    inventoryFilter === 'unassigned'
                      ? 'bg-white text-amber-700 font-semibold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Unassigned ({unassignedCount})
                </button>
                <button
                  onClick={() => setInventoryFilter('assigned')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors truncate ${
                    inventoryFilter === 'assigned'
                      ? 'bg-white text-emerald-700 font-semibold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Assigned ({assignedCount})
                </button>
                <button
                  onClick={() => setInventoryFilter('all')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors truncate ${
                    inventoryFilter === 'all'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  All ({links.length})
                </button>
              </div>
            </div>

            {/* Mobile Card View (Phone screen friendly) */}
            <div className="block md:hidden divide-y divide-neutral-100 font-sans">
              {filteredInventory.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 text-xs">
                  No QR codes matching the current filter.
                </div>
              ) : (
                filteredInventory.map((link) => {
                  const isUnassigned = link.isAssigned === false || !link.destinationUrl || link.destinationUrl.trim() === '';
                  const fullRedirectUrl = `${baseUrl}/r/${link.slug}`;

                  return (
                    <div key={link.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-neutral-900 leading-tight">{link.title}</h4>
                          <span className="text-xs font-mono text-neutral-500 block mt-0.5">/r/{link.slug}</span>
                          {link.batchName && (
                            <span className="text-[10px] text-neutral-400 block mt-0.5">
                              Batch: {link.batchName}
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isUnassigned ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        }`}>
                          {isUnassigned ? 'Unassigned' : 'Live Redirect'}
                        </span>
                      </div>

                      <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 text-xs space-y-1">
                        <div className="text-[11px] font-semibold text-neutral-500">Destination:</div>
                        {isUnassigned ? (
                          <div className="text-amber-700 font-mono text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Waiting for destination URL</span>
                          </div>
                        ) : (
                          <div className="font-mono text-neutral-800 text-[11px] truncate">
                            {link.destinationUrl}
                          </div>
                        )}
                        <div className="text-[11px] text-neutral-500 pt-1 flex items-center justify-between">
                          <span>Total Scans:</span>
                          <span className="font-bold text-neutral-900 font-mono">{link.totalClicks}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setAssigningLink(link);
                            setDestinationUrl(link.destinationUrl || '');
                            setAssignTitle(link.title);
                            setAssignError(null);
                            setAssignSuccess(null);
                          }}
                          className="flex-1 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg text-center shadow-xs"
                        >
                          {isUnassigned ? 'Assign Destination' : 'Edit Target'}
                        </button>
                        <a
                          href={fullRedirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200"
                          title="Test Link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {onDeleteLink && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete QR code "/r/${link.slug}"?`)) {
                                onDeleteLink(link.id);
                              }
                            }}
                            className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-neutral-200">
                <thead className="bg-neutral-50 text-neutral-600 font-semibold uppercase">
                  <tr>
                    <th className="px-5 py-3">Identifier / Slug</th>
                    <th className="px-5 py-3">Linked Destination Target</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center">Scans</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-neutral-400 font-sans">
                        No QR codes matching the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((link) => {
                      const isUnassigned = link.isAssigned === false || !link.destinationUrl || link.destinationUrl.trim() === '';
                      const fullRedirectUrl = `${baseUrl}/r/${link.slug}`;

                      return (
                        <tr key={link.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-sans">
                            <div className="font-semibold text-neutral-900 text-sm">{link.title}</div>
                            <div className="text-neutral-500 font-mono text-xs mt-0.5">/r/{link.slug}</div>
                            {link.batchName && (
                              <span className="text-[10px] text-neutral-400 block mt-0.5 font-sans">
                                Batch: {link.batchName}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 max-w-sm truncate font-sans">
                            {isUnassigned ? (
                              <div className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 text-xs inline-flex items-center gap-1.5 font-mono">
                                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>Unassigned (Waiting for Link)</span>
                              </div>
                            ) : (
                              <div className="text-neutral-700 font-mono text-xs truncate bg-neutral-100 px-2 py-1 rounded" title={link.destinationUrl}>
                                {link.destinationUrl}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-center font-sans">
                            {isUnassigned ? (
                              <span className="text-amber-700 font-semibold text-xs">Ready to Bind</span>
                            ) : (
                              <span className="text-emerald-700 font-semibold text-xs">Live Redirect</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-center font-bold text-neutral-900 tabular-nums">
                            {link.totalClicks}
                          </td>

                          <td className="px-5 py-3.5 text-right font-sans">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setAssigningLink(link);
                                  setDestinationUrl(link.destinationUrl || '');
                                  setAssignTitle(link.title);
                                  setAssignError(null);
                                  setAssignSuccess(null);
                                }}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-2xs"
                              >
                                {isUnassigned ? 'Assign Destination' : 'Edit Target'}
                              </button>
                              <a
                                href={fullRedirectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors"
                                title="Test scan endpoint"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              {onDeleteLink && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete QR code "/r/${link.slug}"?`)) {
                                      onDeleteLink(link.id);
                                    }
                                  }}
                                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title="Delete QR Code"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN DESTINATION URL TO PRE-PRINTED QR CODE */}
      {/* ========================================================================= */}
      {assigningLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-neutral-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Link Destination to QR Code</h3>
                <p className="text-xs text-neutral-500 font-mono">Pre-printed endpoint: /r/{assigningLink.slug}</p>
              </div>
              <button
                onClick={() => setAssigningLink(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAssignment} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-blue-950">Printed QR code is already in circulation.</span>
                  <p className="text-blue-800">
                    Entering the destination URL below immediately activates the QR code. Anyone scanning it with their camera will now land on this website!
                  </p>
                </div>
              </div>

              {assignError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                  {assignError}
                </div>
              )}

              {assignSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{assignSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Destination URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://example.com/daily-menu"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Campaign Title / Location Identifier
                </label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="e.g. Table 04 Acrylic Menu Stand"
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-neutral-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setAssigningLink(null)}
                  disabled={isSavingAssignment}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAssignment}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isSavingAssignment ? 'Linking...' : 'Bind Destination URL Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Canvas Helper component for multi-QR rendering
const QRCodeCanvas: React.FC<{ url: string; size: number }> = ({ url, size }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(
      canvasRef.current,
      url,
      {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      () => {}
    );
  }, [url, size]);

  return <canvas ref={canvasRef} className="rounded" />;
};
