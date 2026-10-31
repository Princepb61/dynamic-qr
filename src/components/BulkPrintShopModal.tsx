import React, { useState, useMemo } from 'react';
import { LinkRecord, BatchRecord, MockupCategory } from '../types';
import { exportBulkPrintShopZip, MOCKUP_LABELS, ExportProgress } from '../utils/bulkExportHelper';

interface BulkPrintShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  links: LinkRecord[];
  batches: BatchRecord[];
  onUpdateLinks: (updated: LinkRecord[]) => Promise<void>;
}

export const BulkPrintShopModal: React.FC<BulkPrintShopModalProps> = ({
  isOpen,
  onClose,
  links,
  batches,
  onUpdateLinks,
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [selectedMockupFilter, setSelectedMockupFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Editable local copies of links for pre-print edits
  const [editableLinks, setEditableLinks] = useState<LinkRecord[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());

  // Export settings
  const [includePng, setIncludePng] = useState<boolean>(true);
  const [includeSvg, setIncludeSvg] = useState<boolean>(true);
  const [includeCsv, setIncludeCsv] = useState<boolean>(true);
  const [includeProofSheet, setIncludeProofSheet] = useState<boolean>(true);
  const [transparentBg, setTransparentBg] = useState<boolean>(true);

  // Export progress
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  // Initialize editable links when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const cloned = links.map((l, idx) => ({
        ...l,
        targetMockup: l.targetMockup || (l.presentationMode === 'review_gate' || l.reviewGate?.enabled ? 'google_review' : 'custom'),
        standNumber: l.standNumber || (l.batchIndex !== undefined ? `Stand-${String(l.batchIndex + 1).padStart(2, '0')}` : `Stand-${String(idx + 1).padStart(2, '0')}`),
      }));
      setEditableLinks(cloned);
      setSelectedSlugs(new Set(cloned.map((l) => l.slug)));
    }
  }, [isOpen, links]);

  // Filtered links
  const filteredLinks = useMemo(() => {
    return editableLinks.filter((l) => {
      if (selectedBatchId !== 'all' && l.batchId !== selectedBatchId) return false;
      if (selectedMockupFilter !== 'all' && l.targetMockup !== selectedMockupFilter) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesTitle = (l.title || '').toLowerCase().includes(q);
        const matchesSlug = l.slug.toLowerCase().includes(q);
        const matchesStand = (l.standNumber || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesSlug && !matchesStand) return false;
      }
      return true;
    });
  }, [editableLinks, selectedBatchId, selectedMockupFilter, searchFilter]);

  // Breakdown by mockup type
  const mockupStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLinks.forEach((l) => {
      const cat = l.targetMockup || 'custom';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [filteredLinks]);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedSlugs.size === filteredLinks.length) {
      setSelectedSlugs(new Set());
    } else {
      setSelectedSlugs(new Set(filteredLinks.map((l) => l.slug)));
    }
  };

  const handleToggleSelect = (slug: string) => {
    const next = new Set(selectedSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelectedSlugs(next);
  };

  const handleMockupChange = (slug: string, newMockup: MockupCategory) => {
    setEditableLinks((prev) =>
      prev.map((l) => (l.slug === slug ? { ...l, targetMockup: newMockup } : l))
    );
  };

  const handleStandChange = (slug: string, newStand: string) => {
    setEditableLinks((prev) =>
      prev.map((l) => (l.slug === slug ? { ...l, standNumber: newStand } : l))
    );
  };

  // Bulk assign mockup category to checked items
  const handleBulkSetMockup = (newMockup: MockupCategory) => {
    setEditableLinks((prev) =>
      prev.map((l) => (selectedSlugs.has(l.slug) ? { ...l, targetMockup: newMockup } : l))
    );
  };

  // Auto-sequence stand numbers (e.g. Table 01, Table 02...)
  const handleAutoSequenceStands = (prefix: string = 'Table') => {
    let count = 1;
    setEditableLinks((prev) =>
      prev.map((l) => {
        if (selectedSlugs.has(l.slug)) {
          const num = String(count++).padStart(2, '0');
          return { ...l, standNumber: `${prefix} ${num}` };
        }
        return l;
      })
    );
  };

  // Run Export
  const handleExportZip = async () => {
    const targets = editableLinks.filter((l) => selectedSlugs.has(l.slug));
    if (targets.length === 0) {
      alert('Please select at least one QR code to export.');
      return;
    }

    setIsExporting(true);
    try {
      // 1. Save updated mockup and stand number assignments back to database
      await onUpdateLinks(editableLinks);

      // 2. Generate ZIP archive
      const blob = await exportBulkPrintShopZip(targets, {
        baseUrl: window.location.origin,
        includePng,
        includeSvg,
        includeCsv,
        includeProofSheet,
        transparentBackground: transparentBg,
        onProgress: (p) => setProgress(p),
      });

      // 3. Trigger direct browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `taplocal_print_shop_mockups_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Print shop export error:', err);
      alert('Export failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 bg-neutral-950/60 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect width="12" height="8" x="6" y="14" />
                </svg>
              </span>
              <h2 className="text-xl font-black text-white tracking-tight">Bulk Print Shop Mockup Exporter</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                Multi-Mockup Ready
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Prepare, edit, and organize individual QR codes into categorized mockup folders (Google Reviews, Digital Menu, WhatsApp, Social) with high-res transparent PNGs, SVGs, and print manifest CSV.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content Workspace */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Top Controls: Filter & Mockup Overview Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Batch Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Filter by Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="all">All Batches & Single Links ({editableLinks.length})</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📁 {b.name} ({b.count} QRs)
                  </option>
                ))}
              </select>
            </div>

            {/* Mockup Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Filter by Target Mockup
              </label>
              <select
                value={selectedMockupFilter}
                onChange={(e) => setSelectedMockupFilter(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="all">All Mockup Types</option>
                {Object.entries(MOCKUP_LABELS).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.icon} {meta.label} ({mockupStats[key] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Search Stand or Slug
              </label>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search table, title, or /r/slug..."
                className="w-full bg-neutral-950 border border-neutral-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Quick Mockup Folder Summary Badges */}
          <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-2xl flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mr-1">
              ZIP Folder Plan:
            </span>
            {Object.entries(MOCKUP_LABELS).map(([key, meta]) => {
              const count = mockupStats[key] || 0;
              if (count === 0 && selectedMockupFilter !== 'all') return null;
              return (
                <div
                  key={key}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                    count > 0
                      ? 'bg-neutral-900 border-neutral-700 text-neutral-200'
                      : 'bg-neutral-900/30 border-neutral-800/40 text-neutral-500'
                  }`}
                >
                  <span>{meta.icon}</span>
                  <span>/{meta.folder}/</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-neutral-800 text-[10px] font-mono font-bold text-amber-300">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bulk Action Toolbar */}
          <div className="p-3.5 bg-neutral-950/50 border border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors"
              >
                {selectedSlugs.size === filteredLinks.length ? 'Deselect All' : 'Select All'} ({selectedSlugs.size}/{filteredLinks.length})
              </button>
            </div>

            {/* Quick Bulk Assigners */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-neutral-400 text-[11px] font-medium">Batch Set Mockup:</span>
              <button
                type="button"
                onClick={() => handleBulkSetMockup('google_review')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium transition-colors"
              >
                ⭐ Google Review
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetMockup('digital_menu')}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium transition-colors"
              >
                🍽️ Menu
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetMockup('whatsapp_order')}
                className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-medium transition-colors"
              >
                💬 WhatsApp
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetMockup('instagram_follow')}
                className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 font-medium transition-colors"
              >
                📸 Instagram
              </button>

              <div className="h-4 w-px bg-neutral-700 mx-1" />

              <button
                type="button"
                onClick={() => handleAutoSequenceStands('Table')}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold transition-colors"
                title="Number selected items Table 01, Table 02, etc."
              >
                🔢 Auto-Number Tables
              </button>
            </div>
          </div>

          {/* Links Editable Table */}
          <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-950/60">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900/90 text-neutral-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedSlugs.size === filteredLinks.length && filteredLinks.length > 0}
                        onChange={handleToggleSelectAll}
                        className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                      />
                    </th>
                    <th className="py-2.5 px-3">Stand / Table Label</th>
                    <th className="py-2.5 px-3">Target Graphic Mockup</th>
                    <th className="py-2.5 px-3">QR Link / Slug</th>
                    <th className="py-2.5 px-3">Export File Path</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {filteredLinks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-500">
                        No QR codes match your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLinks.map((item) => {
                      const isChecked = selectedSlugs.has(item.slug);
                      const cat = item.targetMockup || 'google_review';
                      const meta = MOCKUP_LABELS[cat] || MOCKUP_LABELS.google_review;
                      const cleanStand = (item.standNumber || 'Stand').replace(/[^a-zA-Z0-9_-]/g, '_');
                      const projectedFile = `${meta.folder}/${cleanStand}_[${meta.folder}]_${item.slug}.png`;

                      return (
                        <tr
                          key={item.slug}
                          className={`hover:bg-neutral-900/60 transition-colors ${
                            isChecked ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelect(item.slug)}
                              className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                            />
                          </td>

                          {/* Stand / Table Number Input */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.standNumber || ''}
                              onChange={(e) => handleStandChange(item.slug, e.target.value)}
                              placeholder="e.g. Table 01"
                              className="w-28 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                            />
                          </td>

                          {/* Target Mockup Dropdown */}
                          <td className="py-2 px-3">
                            <select
                              value={item.targetMockup || 'google_review'}
                              onChange={(e) => handleMockupChange(item.slug, e.target.value as MockupCategory)}
                              className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                            >
                              {Object.entries(MOCKUP_LABELS).map(([k, m]) => (
                                <option key={k} value={k}>
                                  {m.icon} {m.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Link Title & Slug */}
                          <td className="py-2 px-3">
                            <div className="font-semibold text-white truncate max-w-xs">
                              {item.title}
                            </div>
                            <div className="text-[11px] font-mono text-neutral-400">
                              /r/{item.slug}
                            </div>
                          </td>

                          {/* Target Zip File Path */}
                          <td className="py-2 px-3 font-mono text-[11px] text-amber-300/80 truncate max-w-xs">
                            {projectedFile}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Format Settings */}
          <div className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-2xl space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              Print Shop Export Package Options
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includePng}
                  onChange={(e) => setIncludePng(e.target.checked)}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                />
                <span className="text-white font-medium">1024px PNGs</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSvg}
                  onChange={(e) => setIncludeSvg(e.target.checked)}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                />
                <span className="text-white font-medium">Scalable SVGs</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCsv}
                  onChange={(e) => setIncludeCsv(e.target.checked)}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                />
                <span className="text-white font-medium">Print Shop CSV</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={transparentBg}
                  onChange={(e) => setTransparentBg(e.target.checked)}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                />
                <span className="text-white font-medium">Transparent Background</span>
              </label>
            </div>
          </div>

          {/* Progress Indicator */}
          {isExporting && progress && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span>{progress.stage}</span>
                <span className="font-mono">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-2 transition-all duration-150"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-800 bg-neutral-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-neutral-400">
            Selected <strong className="text-white">{selectedSlugs.size}</strong> of {filteredLinks.length} QRs
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExportZip}
              disabled={isExporting || selectedSlugs.size === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Building Production ZIP...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download Print Shop ZIP ({selectedSlugs.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
