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
  Copy,
  Check,
  Smartphone,
  Share2,
} from 'lucide-react';
import {
  getLast4Letters,
  downloadMultiQRA4Image,
  generateMultiQRA4Blob,
  shareOrSaveMultiQRA4,
  isMobileDevice,
} from '../utils/a4QrHelper';

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
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyPermanentLink = (slug: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = `${baseUrl}/r/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Filter batch / stock links (pre-printed or unassigned)
  const stockLinks = links.filter((l) => l.isAssigned === false || !l.destinationUrl || l.tags?.includes('Pre-Printed') || l.tags?.includes('Batch Stock'));
  const unassignedCount = links.filter((l) => l.isAssigned === false || !l.destinationUrl || l.destinationUrl.trim() === '').length;
  const assignedCount = links.length - unassignedCount;

  // Sync batch links whenever links updates
  useEffect(() => {
    if (stockLinks.length > 0) {
      setGeneratedBatchLinks((prev) => {
        if (prev.length === 0) return stockLinks.slice(0, 12);
        return prev.map((item) => {
          const fresh = links.find((l) => l.id === item.id || l.slug.toLowerCase() === item.slug.toLowerCase());
          return fresh ? { ...item, ...fresh } : item;
        });
      });
    }
  }, [links]);

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
      await api.assignBatchLink(assigningLink.slug, {
        destinationUrl: target,
        title: assignTitle.trim() || assigningLink.title,
      });

      const updatedLink: LinkRecord = {
        ...assigningLink,
        destinationUrl: target,
        title: assignTitle.trim() || assigningLink.title,
        isAssigned: true,
      };

      setAssigningLink(updatedLink);
      setGeneratedBatchLinks((prev) =>
        prev.map((l) => (l.id === assigningLink.id || l.slug === assigningLink.slug ? updatedLink : l))
      );

      setAssignSuccess(`QR code /r/${assigningLink.slug} is now linked! Next scan will route to: ${target}`);
      await onRefreshLinks();
      setTimeout(() => {
        setAssigningLink(null);
        setAssignSuccess(null);
        setDestinationUrl('');
        setAssignTitle('');
      }, 1500);
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

  const [isDownloadingSheet, setIsDownloadingSheet] = useState(false);
  const [isPrintingSheet, setIsPrintingSheet] = useState(false);
  const [isSharingMulti, setIsSharingMulti] = useState(false);
  const [multiShareFeedback, setMultiShareFeedback] = useState<string | null>(null);

  const handleDownloadMultiQRA4 = async () => {
    if (generatedBatchLinks.length === 0) return;
    try {
      setIsDownloadingSheet(true);
      await downloadMultiQRA4Image(generatedBatchLinks, gridCols, batchName || 'Multi-QR-Sheet');
    } catch (err) {
      console.error('Download multi QR sheet error:', err);
    } finally {
      setIsDownloadingSheet(false);
    }
  };

  const handleShareMultiQRA4 = async () => {
    if (generatedBatchLinks.length === 0) return;
    try {
      setIsSharingMulti(true);
      const res = await shareOrSaveMultiQRA4(generatedBatchLinks, gridCols, batchName || 'Multi-QR-Sheet');
      if (res === 'shared') {
        setMultiShareFeedback('Ready on Phone!');
      } else {
        setMultiShareFeedback('Saved!');
      }
      setTimeout(() => setMultiShareFeedback(null), 3000);
    } catch (err) {
      console.error('Share multi QR error:', err);
    } finally {
      setIsSharingMulti(false);
    }
  };

  const handlePrint = async () => {
    if (generatedBatchLinks.length === 0) return;
    const isMobile = isMobileDevice();

    if (isMobile) {
      try {
        setIsPrintingSheet(true);
        const blob = await generateMultiQRA4Blob(generatedBatchLinks, gridCols);
        const url = URL.createObjectURL(blob);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${batchName || 'Multi-QR Print Sheet'}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <img src="${url}" alt="Print Sheet" />
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`);
          printWindow.document.close();
          return;
        }

        // If popup was blocked by mobile browser, invoke native share/AirPrint fallback!
        await shareOrSaveMultiQRA4(generatedBatchLinks, gridCols, batchName || 'Multi-QR-Sheet');
        return;
      } catch (err) {
        console.error('Mobile print error:', err);
      } finally {
        setIsPrintingSheet(false);
      }
    }

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
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4 print:hidden transition-colors">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Batch Name / Purpose
                </label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g. Table Standee Stock"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:border-neutral-900 dark:focus:border-white font-medium transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Slug Prefix
                </label>
                <div className="flex items-center">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono pl-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-r-0 border-neutral-300 dark:border-neutral-700 rounded-l-lg">
                    /r/
                  </span>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="table"
                    className="w-full px-2.5 py-2 text-xs font-mono border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-r-lg focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Quantity per Sheet
                </label>
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:border-neutral-900 dark:focus:border-white font-medium transition-colors"
                >
                  <option value={6}>6 Codes (2×3 Sheet - Table Cards)</option>
                  <option value={12}>12 Codes (3×4 Sheet - Square Stickers)</option>
                  <option value={18}>18 Codes (3×6 Sheet - Product Tags)</option>
                  <option value={24}>24 Codes (4×6 Sheet - Small Labels)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Grid Columns Layout
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[2, 3, 4].map((cols) => (
                    <button
                      key={cols}
                      onClick={() => setGridCols(cols as any)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                        gridCols === cols
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {cols} Cols
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                <span className="font-bold text-neutral-800 dark:text-neutral-200">Workflow:</span>
                <span>Click Generate to create batch stock links, then click Print Sheet to print physical copies.</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleGenerateBatch}
                  disabled={isGenerating}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isGenerating ? 'Generating...' : `Generate ${batchCount} New Blank Codes`}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareMultiQRA4}
                  disabled={isSharingMulti || generatedBatchLinks.length === 0}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  title="AirPrint, Save to Photos, or Share to WhatsApp/Files"
                >
                  {multiShareFeedback ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Smartphone className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>
                    {isSharingMulti
                      ? 'Preparing...'
                      : multiShareFeedback || 'AirPrint / Save on Phone'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMultiQRA4}
                  disabled={isDownloadingSheet || generatedBatchLinks.length === 0}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  title="Download full multi-QR A4 sheet image for printing"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloadingSheet ? 'Generating Sheet...' : 'Download A4 Sheet (Image)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isPrintingSheet || generatedBatchLinks.length === 0}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold text-neutral-800 dark:text-white bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isPrintingSheet ? 'Preparing Print...' : 'Print Sheet'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Printable Sheet Canvas - A4 Print Layout */}
          <div id="printable-sheet" className="printable-a4-container bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 shadow-xs print:border-0 print:p-0 print:shadow-none transition-colors">
            {/* Sheet Header (Hidden in print) */}
            <div className="mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between print:hidden">
              <div>
                <h1 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                  {batchName}
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                  A4 Multi-QR Stock · Showing {generatedBatchLinks.length} endpoints · Simple QR
                </p>
              </div>
              <div className="text-right text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                <span>Scan code to assign URL</span>
                <span className="block text-[11px] text-neutral-400 dark:text-neutral-500">HTTP 307 Dynamic Routing</span>
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
                    className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 print:border-none rounded-xl p-4 print:p-2 flex flex-col items-center justify-center text-center bg-white dark:bg-neutral-850 relative hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                  >
                    {/* Top Serial & Watermark (Hidden in print) */}
                    <div className="w-full flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 font-mono mb-2 print:hidden">
                      <span className="font-bold text-neutral-700 dark:text-neutral-300">#{String(idx + 1).padStart(2, '0')}</span>
                      <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
                        {isLinked ? 'Linked & Active' : 'Scan to Link'}
                      </span>
                    </div>

                    {/* Borderless QR Code Canvas */}
                    <div className="p-1 bg-white my-1 flex items-center justify-center rounded-lg shadow-2xs">
                      <QRCodeCanvas url={fullRedirectUrl} size={gridCols === 2 ? 160 : gridCols === 3 ? 130 : 100} />
                    </div>

                    {/* Under the QR: Mention ONLY the batch code (No outline border, no "last 4" label) */}
                    <div className="my-0.5 text-center">
                      <span className="text-sm font-mono font-black text-neutral-950 dark:text-white tracking-widest">
                        {getLast4Letters(link.slug)}
                      </span>
                    </div>

                    {/* Copy Permanent Link button under QR */}
                    <div className="my-1 w-full print:hidden">
                      <button
                        type="button"
                        onClick={(e) => handleCopyPermanentLink(link.slug, e)}
                        className="w-full flex items-center justify-center gap-1.5 py-1 px-2 text-[10px] font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors"
                      >
                        {copiedSlug === link.slug ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            <span>Copy Permanent Link</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Bottom Slug & Cut Indicator (Hidden in print) */}
                    <div className="w-full mt-1.5 pt-1.5 border-t border-neutral-100 dark:border-neutral-800 print:hidden">
                      <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {link.title}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        /r/{link.slug}
                      </div>

                      {/* Interactive Actions for screen view (hidden in print) */}
                      <div className="mt-2 flex items-center justify-center gap-1.5 print:hidden">
                        {isLinked ? (
                          <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded truncate max-w-[160px]" title={link.destinationUrl}>
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
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors shadow-2xs"
                          >
                            Assign URL
                          </button>
                        )}
                        <a
                          href={fullRedirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
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

            {/* Cut line instructions (Hidden in print) */}
            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-400 dark:text-neutral-500 font-mono print:hidden">
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
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-colors">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Scan or Enter QR Code Slug to Assign
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={lookupSlug}
                  onChange={(e) => setLookupSlug(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder="e.g. stock-table-01 or /r/qr-02-a8f"
                  className="flex-1 px-3 py-2 text-xs font-mono border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 dark:bg-indigo-600 hover:bg-neutral-800 dark:hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shadow-xs"
                >
                  Find Code
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-300 transition-colors">
                <span className="font-bold text-amber-950 dark:text-amber-200 block">{unassignedCount} Pre-Printed Codes Unassigned</span>
                <span>Ready to be linked to menus, websites, or campaigns.</span>
              </div>
            </div>
          </div>

          {/* Filter & Inventory Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden transition-colors">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by code slug, title, or destination..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:bg-white dark:focus:bg-neutral-800 focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-full sm:w-auto shrink-0 text-center">
                <button
                  onClick={() => setInventoryFilter('unassigned')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-colors truncate ${
                    inventoryFilter === 'unassigned'
                      ? 'bg-white dark:bg-neutral-900 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Unassigned ({unassignedCount})
                </button>
                <button
                  onClick={() => setInventoryFilter('assigned')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-colors truncate ${
                    inventoryFilter === 'assigned'
                      ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Assigned ({assignedCount})
                </button>
                <button
                  onClick={() => setInventoryFilter('all')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-colors truncate ${
                    inventoryFilter === 'all'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  All ({links.length})
                </button>
              </div>
            </div>

            {/* Mobile Card View (Phone screen friendly) */}
            <div className="block md:hidden divide-y divide-neutral-100 dark:divide-neutral-800 font-sans">
              {filteredInventory.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 dark:text-neutral-500 text-xs">
                  No QR codes matching the current filter.
                </div>
              ) : (
                filteredInventory.map((link) => {
                  const isUnassigned = link.isAssigned === false || !link.destinationUrl || link.destinationUrl.trim() === '';
                  const fullRedirectUrl = `${baseUrl}/r/${link.slug}`;

                  return (
                    <div key={link.id} className="p-4 space-y-3 bg-white dark:bg-neutral-900">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white leading-tight">{link.title}</h4>
                            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                              {getLast4Letters(link.slug)}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 block mt-0.5">/r/{link.slug}</span>
                          {link.batchName && (
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block mt-0.5">
                              Batch: {link.batchName}
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isUnassigned ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900' : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900'
                        }`}>
                          {isUnassigned ? 'Unassigned' : 'Live Redirect'}
                        </span>
                      </div>

                      <div className="bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-700 text-xs space-y-1">
                        <div className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">Destination:</div>
                        {isUnassigned ? (
                          <div className="text-amber-700 dark:text-amber-300 font-mono text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Waiting for destination URL</span>
                          </div>
                        ) : (
                          <div className="font-mono text-neutral-800 dark:text-neutral-200 text-[11px] truncate">
                            {link.destinationUrl}
                          </div>
                        )}
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 pt-1 flex items-center justify-between font-medium">
                          <span>Total Scans:</span>
                          <span className="font-bold text-neutral-900 dark:text-white font-mono">{link.totalClicks}</span>
                        </div>
                      </div>

                      {/* Copy Permanent Link button on mobile card */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyPermanentLink(link.slug, e)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors"
                      >
                        {copiedSlug === link.slug ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-700 dark:text-emerald-300 font-bold">Permanent Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Copy Permanent Link (/r/{link.slug})</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setAssigningLink(link);
                            setDestinationUrl(link.destinationUrl || '');
                            setAssignTitle(link.title);
                            setAssignError(null);
                            setAssignSuccess(null);
                          }}
                          className="flex-1 py-2 text-xs font-bold text-white bg-neutral-900 dark:bg-indigo-600 hover:bg-neutral-800 dark:hover:bg-indigo-500 rounded-lg text-center shadow-xs transition-colors"
                        >
                          {isUnassigned ? 'Assign Destination' : 'Edit Target'}
                        </button>
                        <a
                          href={fullRedirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
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
                            className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
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
              <table className="w-full text-left text-xs divide-y divide-neutral-200 dark:divide-neutral-800">
                <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 font-semibold uppercase">
                  <tr>
                    <th className="px-5 py-3">Identifier / Slug</th>
                    <th className="px-5 py-3">Linked Destination Target</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center">Scans</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-neutral-400 dark:text-neutral-500 font-sans">
                        No QR codes matching the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((link) => {
                      const isUnassigned = link.isAssigned === false || !link.destinationUrl || link.destinationUrl.trim() === '';
                      const fullRedirectUrl = `${baseUrl}/r/${link.slug}`;

                      return (
                        <tr key={link.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="px-5 py-3.5 font-sans">
                            <div className="font-bold text-neutral-900 dark:text-white text-sm">{link.title}</div>
                            <div className="text-neutral-500 dark:text-neutral-400 font-mono text-xs mt-0.5">/r/{link.slug}</div>
                            {link.batchName && (
                              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block mt-0.5 font-sans font-medium">
                                Batch: {link.batchName}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 max-w-sm truncate font-sans">
                            {isUnassigned ? (
                              <div className="text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800 text-xs inline-flex items-center gap-1.5 font-mono">
                                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>Unassigned (Waiting for Link)</span>
                              </div>
                            ) : (
                              <div className="text-neutral-700 dark:text-neutral-300 font-mono text-xs truncate bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded" title={link.destinationUrl}>
                                {link.destinationUrl}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-center font-sans">
                            {isUnassigned ? (
                              <span className="text-amber-700 dark:text-amber-300 font-bold text-xs">Ready to Bind</span>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">Live Redirect</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-center font-bold text-neutral-900 dark:text-white tabular-nums">
                            {link.totalClicks}
                          </td>

                          <td className="px-5 py-3.5 text-right font-sans">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => handleCopyPermanentLink(link.slug, e)}
                                className="px-2.5 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                                title="Copy permanent link"
                              >
                                {copiedSlug === link.slug ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-emerald-700 dark:text-emerald-300">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setAssigningLink(link);
                                  setDestinationUrl(link.destinationUrl || '');
                                  setAssignTitle(link.title);
                                  setAssignError(null);
                                  setAssignSuccess(null);
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 dark:bg-indigo-600 hover:bg-neutral-800 dark:hover:bg-indigo-500 rounded-lg transition-colors shadow-2xs"
                              >
                                {isUnassigned ? 'Assign Destination' : 'Edit Target'}
                              </button>
                              <a
                                href={fullRedirectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
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
                                  className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 transition-colors">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Link Destination to QR Code</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">Pre-printed endpoint: /r/{assigningLink.slug}</p>
              </div>
              <button
                onClick={() => setAssigningLink(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAssignment} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div className="p-3.5 bg-blue-50/70 dark:bg-indigo-950/40 border border-blue-200 dark:border-indigo-900/60 rounded-xl text-xs text-blue-900 dark:text-indigo-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-blue-950 dark:text-indigo-200">Printed QR code is already in circulation.</span>
                  <p className="text-blue-800 dark:text-indigo-300">
                    Entering the destination URL below immediately activates the QR code. Anyone scanning it with their camera will now land on this website!
                  </p>
                </div>
              </div>

              {assignError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium">
                  {assignError}
                </div>
              )}

              {assignSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{assignSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Destination URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://example.com/daily-menu"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Campaign Title / Location Identifier
                </label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="e.g. Table 04 Acrylic Menu Stand"
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setAssigningLink(null)}
                  disabled={isSavingAssignment}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAssignment}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold text-white bg-neutral-900 dark:bg-indigo-600 hover:bg-neutral-800 dark:hover:bg-indigo-500 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
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
