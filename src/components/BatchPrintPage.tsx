import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { LinkRecord, UserRecord, LabelPresetType, BatchRecord } from '../types';
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
  Camera,
  Grid3X3,
} from 'lucide-react';
import {
  getLast4Letters,
  downloadMultiQRA4Image,
  generateMultiQRA4Blob,
  shareOrSaveMultiQRA4,
  isMobileDevice,
  LABEL_PRESETS,
  printLabelPresetBatch,
} from '../utils/a4QrHelper';
import { DESTINATION_TEMPLATES, DestinationTemplate } from '../utils/destinationTemplates';

interface BatchPrintPageProps {
  links: LinkRecord[];
  currentUser?: UserRecord | null;
  onRefreshLinks: () => Promise<void>;
  onOpenSimulatorForLink?: (linkId: string) => void;
  onDeleteLink?: (id: string) => Promise<void> | void;
  onOpenScanner?: () => void;
}

export const BatchPrintPage: React.FC<BatchPrintPageProps> = ({
  links,
  currentUser,
  onRefreshLinks,
  onOpenSimulatorForLink,
  onDeleteLink,
  onOpenScanner,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'print' | 'inventory'>('print');

  // Generator State
  const [batchName, setBatchName] = useState('Table Standee Stock');
  const [prefix, setPrefix] = useState('table');
  const [batchCount, setBatchCount] = useState<number>(12);
  const [selectedLabelPreset, setSelectedLabelPreset] = useState<LabelPresetType>('a4_grid');
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBatchLinks, setGeneratedBatchLinks] = useState<LinkRecord[]>([]);

  // Cloud Synced Batches
  const [savedBatches, setSavedBatches] = useState<BatchRecord[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all_unassigned');
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  // Inventory & Assignment State
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
  const [assigningLink, setAssigningLink] = useState<LinkRecord | null>(null);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // One-Tap Template State
  const [activeTemplate, setActiveTemplate] = useState<DestinationTemplate | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});

  // Quick Code Lookup / Scan
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Print & Mobile Share State
  const [isDownloadingSheet, setIsDownloadingSheet] = useState(false);
  const [isPrintingSheet, setIsPrintingSheet] = useState(false);
  const [isSharingMulti, setIsSharingMulti] = useState(false);
  const [multiShareFeedback, setMultiShareFeedback] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Filter batch / stock links (pre-printed or unassigned)
  const unassignedLinks = links.filter((l) => l.isAssigned === false || !l.destinationUrl || l.destinationUrl.trim() === '');
  const assignedLinks = links.filter((l) => l.isAssigned === true && l.destinationUrl && l.destinationUrl.trim() !== '');

  // Fetch batches from cloud Firestore
  const fetchBatches = async () => {
    try {
      setIsLoadingBatches(true);
      const batches = await api.getBatches(currentUser?.id);
      setSavedBatches(batches);
    } catch (e) {
      console.warn('Failed to fetch batches:', e);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [currentUser]);

  // Sync batch links whenever links updates or active batch changes
  useEffect(() => {
    if (selectedBatchId === 'all_unassigned') {
      if (unassignedLinks.length > 0) {
        setGeneratedBatchLinks(unassignedLinks);
      } else {
        setGeneratedBatchLinks(links.slice(0, 12));
      }
    } else {
      const batchFiltered = links.filter((l) => l.batchId === selectedBatchId);
      if (batchFiltered.length > 0) {
        setGeneratedBatchLinks(batchFiltered);
      } else if (unassignedLinks.length > 0) {
        setGeneratedBatchLinks(unassignedLinks);
      }
    }
  }, [links, selectedBatchId]);

  const handleCopyPermanentLink = (slug: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = `${baseUrl}/r/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Handle generating a new batch of pre-printed QR codes
  const handleGenerateBatch = async () => {
    try {
      setIsGenerating(true);
      const res = await api.generateBatch({
        batchName: batchName.trim() || 'Pre-Printed Batch',
        prefix: prefix.trim() || 'qr',
        count: batchCount,
        labelPreset: selectedLabelPreset,
        ownerId: currentUser?.id || 'usr_admin_1',
        ownerEmail: currentUser?.email || 'p0667500@gmail.com',
        ownerName: currentUser?.name || 'System Administrator',
      });

      setGeneratedBatchLinks(res.links);
      setSelectedBatchId(res.batchId);
      await Promise.all([onRefreshLinks(), fetchBatches()]);
    } catch (err) {
      console.error('Batch generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete an entire batch
  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this QR batch and all its codes across all devices?')) return;
    try {
      await api.deleteBatch(batchId);
      setSelectedBatchId('all_unassigned');
      await Promise.all([onRefreshLinks(), fetchBatches()]);
    } catch (err) {
      console.error('Delete batch error:', err);
    }
  };

  // Handle assigning a destination URL
  const handleOpenAssign = (link: LinkRecord) => {
    setAssigningLink(link);
    setDestinationUrl(link.destinationUrl || '');
    setAssignTitle(link.title || '');
    setAssignError(null);
    setAssignSuccess(null);
    setActiveTemplate(null);
    setTemplateValues({});
  };

  const handleSelectTemplate = (template: DestinationTemplate) => {
    setActiveTemplate(template);
    const initialVals: Record<string, string> = {};
    template.fields.forEach((f) => {
      initialVals[f.key] = f.defaultValue || '';
    });
    setTemplateValues(initialVals);
    setDestinationUrl(template.buildUrl(initialVals));
    setAssignTitle(template.name);
  };

  const handleTemplateFieldChange = (key: string, val: string) => {
    if (!activeTemplate) return;
    const nextVals = { ...templateValues, [key]: val };
    setTemplateValues(nextVals);
    setDestinationUrl(activeTemplate.buildUrl(nextVals));
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningLink) return;

    let target = destinationUrl.trim();
    if (!target) {
      setAssignError('Destination URL is required.');
      return;
    }

    if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('upi://') && !target.startsWith('tel:')) {
      target = 'https://' + target;
    }

    try {
      if (target.startsWith('http')) {
        new URL(target);
      }
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

      setAssignSuccess(`Activated! /r/${assigningLink.slug} is now live.`);
      await onRefreshLinks();
      setTimeout(() => {
        setAssigningLink(null);
        setAssignSuccess(null);
      }, 1500);
    } catch (err: any) {
      setAssignError(err.message || 'Failed to save destination. Please check network.');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  // Download Multi-QR A4 Sheet PNG
  const handleDownloadMultiQRA4 = async () => {
    if (generatedBatchLinks.length === 0) return;
    try {
      setIsDownloadingSheet(true);
      await downloadMultiQRA4Image(
        generatedBatchLinks.map((l) => ({ slug: l.slug, title: l.title })),
        gridCols,
        batchName.trim() || 'multi-qr-sheet'
      );
    } catch (err) {
      console.error('Download Multi-QR error:', err);
    } finally {
      setIsDownloadingSheet(false);
    }
  };

  // Mobile AirPrint & Share
  const handleShareMultiQRA4 = async () => {
    if (generatedBatchLinks.length === 0) return;
    try {
      setIsSharingMulti(true);
      const res = await shareOrSaveMultiQRA4(
        generatedBatchLinks.map((l) => ({ slug: l.slug, title: l.title })),
        gridCols,
        batchName.trim() || 'multi-qr-sheet'
      );
      setMultiShareFeedback(res === 'shared' ? 'AirPrint Sheet Ready!' : 'Saved to Downloads');
      setTimeout(() => setMultiShareFeedback(null), 3000);
    } catch (err) {
      console.error('AirPrint share error:', err);
      setMultiShareFeedback('Failed to open share sheet');
      setTimeout(() => setMultiShareFeedback(null), 3000);
    } finally {
      setIsSharingMulti(false);
    }
  };

  // Preset Label & Thermal Print
  const handlePrintPresetBatch = async () => {
    if (generatedBatchLinks.length === 0) return;
    try {
      setIsPrintingSheet(true);
      await printLabelPresetBatch(
        generatedBatchLinks.map((l) => ({ slug: l.slug, title: l.title })),
        selectedLabelPreset,
        batchName.trim() || 'batch-labels'
      );
    } catch (err) {
      console.error('Print preset error:', err);
      window.print();
    } finally {
      setIsPrintingSheet(false);
    }
  };

  // Filtered inventory list
  const filteredInventory = links.filter((l) => {
    const q = searchQuery.toLowerCase().trim();
    const last4 = getLast4Letters(l.slug).toLowerCase();
    const matchesQuery =
      !q ||
      l.slug.toLowerCase().includes(q) ||
      last4.includes(q) ||
      (l.title && l.title.toLowerCase().includes(q)) ||
      (l.destinationUrl && l.destinationUrl.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (inventoryFilter === 'unassigned') return l.isAssigned === false || !l.destinationUrl;
    if (inventoryFilter === 'assigned') return l.isAssigned === true && l.destinationUrl;
    return true;
  });

  const activePresetConfig = LABEL_PRESETS[selectedLabelPreset];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Batch Print & Cloud Stock</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Cloud Synced
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Generate, print thermal labels or A4 sheets, and assign destinations across all devices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Camera className="w-4 h-4" />
              Quick Scan Camera
            </button>
          )}

          {/* SubTab Toggle */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-2xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveSubTab('print')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'print'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Print & Layout
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('inventory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'inventory'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Stock Inventory ({unassignedLinks.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeSubTab === 'print' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Batch Generator & Controls */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    New Batch Generator
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Owner: {currentUser?.email || 'admin'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-neutral-400 font-medium mb-1">Batch Name / Purpose</label>
                    <input
                      type="text"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      placeholder="e.g. Table Standees, Counter Stickers"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-neutral-400 font-medium mb-1">Slug Prefix</label>
                      <input
                        type="text"
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        placeholder="table"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-400 font-medium mb-1">Quantity</label>
                      <select
                        value={batchCount}
                        onChange={(e) => setBatchCount(Number(e.target.value))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value={6}>6 Codes</option>
                        <option value={12}>12 Codes</option>
                        <option value={24}>24 Codes</option>
                        <option value={36}>36 Codes</option>
                        <option value={48}>48 Codes</option>
                      </select>
                    </div>
                  </div>

                  {/* Physical Label & Thermal Printer Preset Selector */}
                  <div>
                    <label className="block text-neutral-400 font-medium mb-1.5 flex items-center justify-between">
                      <span>Label & Thermal Printer Preset</span>
                      <span className="text-[10px] text-indigo-400 font-bold">{activePresetConfig.dimensions}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(LABEL_PRESETS) as LabelPresetType[]).map((presetKey) => {
                        const p = LABEL_PRESETS[presetKey];
                        const isSelected = selectedLabelPreset === presetKey;
                        return (
                          <button
                            key={presetKey}
                            type="button"
                            onClick={() => setSelectedLabelPreset(presetKey)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-indigo-600/15 border-indigo-500 text-white'
                                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold text-white leading-tight">{p.name}</span>
                              <span className="text-[9px] px-1 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                                {p.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-500 leading-tight">{p.dimensions}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateBatch}
                    disabled={isGenerating}
                    className="w-full min-h-[44px] mt-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md active:scale-98 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving to Cloud Firestore...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Generate & Save Cloud Batch
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Cloud Saved Batches Selector */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    Saved Batches Across Devices
                  </h4>
                  <button
                    type="button"
                    onClick={fetchBatches}
                    className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedBatchId('all_unassigned')}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      selectedBatchId === 'all_unassigned'
                        ? 'bg-neutral-800 border-indigo-500/50 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">All Unassigned Stock</span>
                      <span className="text-[10px] text-neutral-500">Live unassigned QR codes</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                      {unassignedLinks.length} Left
                    </span>
                  </button>

                  {savedBatches.map((b) => (
                    <div
                      key={b.id}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                        selectedBatchId === b.id
                          ? 'bg-neutral-800 border-indigo-500/50 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedBatchId(b.id)}
                        className="flex-1 text-left"
                      >
                        <span className="font-semibold block text-neutral-200">{b.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {b.count} QRs · {new Date(b.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBatch(b.id)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-neutral-800 transition-colors ml-2"
                        title="Delete Batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Print Preview & Action Buttons */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg space-y-4">
                {/* Print Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Print Preview ({generatedBatchLinks.length} QRs)
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {activePresetConfig.name}
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Border-free output. Every sticker includes solely the QR code and 4-digit code.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* AirPrint / Save to Phone for mobile */}
                    <button
                      type="button"
                      onClick={handleShareMultiQRA4}
                      disabled={isSharingMulti || generatedBatchLinks.length === 0}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                      {isSharingMulti ? 'Opening AirPrint...' : 'AirPrint / Save'}
                    </button>

                    {/* Download PNG */}
                    <button
                      type="button"
                      onClick={handleDownloadMultiQRA4}
                      disabled={isDownloadingSheet || generatedBatchLinks.length === 0}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 text-neutral-400" />
                      PNG Image
                    </button>

                    {/* Clean Preset Print Button */}
                    <button
                      type="button"
                      onClick={handlePrintPresetBatch}
                      disabled={isPrintingSheet || generatedBatchLinks.length === 0}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Printer className="w-4 h-4" />
                      {isPrintingSheet ? 'Preparing Print...' : `Print ${activePresetConfig.badge}`}
                    </button>
                  </div>
                </div>

                {multiShareFeedback && (
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {multiShareFeedback}
                  </div>
                )}

                {/* Printable Grid Preview Box */}
                <div className="bg-white rounded-2xl p-6 text-black min-h-[420px] shadow-inner max-h-[640px] overflow-y-auto">
                  {selectedLabelPreset === 'business_card' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {generatedBatchLinks.map((link) => {
                        const last4 = getLast4Letters(link.slug);
                        return (
                          <div
                            key={link.id || link.slug}
                            className="border-2 border-neutral-300 rounded-xl p-4 flex items-center justify-between gap-4 bg-white shadow-sm"
                          >
                            <QRCodeComponent url={`${baseUrl}/r/${link.slug}`} size={110} />
                            <div className="flex-1 text-center">
                              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                                Table Standee
                              </span>
                              <div className="text-2xl font-black font-mono tracking-widest text-black my-1">
                                {last4}
                              </div>
                              <span className="text-[10px] font-mono text-neutral-400 block truncate">
                                /r/{link.slug}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenAssign(link)}
                                className="mt-2 px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-[10px] font-bold hover:bg-neutral-800 transition-colors"
                              >
                                {link.isAssigned ? 'Edit Target' : 'Assign URL'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : selectedLabelPreset === 'thermal_2in' || selectedLabelPreset === 'thermal_3in' ? (
                    <div className="max-w-xs mx-auto space-y-6 border-x border-dashed border-neutral-300 px-4 py-2">
                      <div className="text-center text-[10px] font-mono text-neutral-400 border-b pb-1">
                        Continuous Thermal POS Roll
                      </div>
                      {generatedBatchLinks.map((link) => {
                        const last4 = getLast4Letters(link.slug);
                        return (
                          <div
                            key={link.id || link.slug}
                            className="flex flex-col items-center justify-center p-3 border-b border-dashed border-neutral-300 text-center"
                          >
                            <QRCodeComponent url={`${baseUrl}/r/${link.slug}`} size={140} />
                            <div className="text-xl font-black font-mono tracking-widest text-black mt-2">
                              {last4}
                            </div>
                            <span className="text-[10px] font-mono text-neutral-500">
                              /r/{link.slug}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenAssign(link)}
                              className="mt-2 text-[10px] font-semibold text-indigo-600 hover:underline"
                            >
                              {link.isAssigned ? 'Assigned' : 'Click to Assign'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : selectedLabelPreset === 'shelf_tag' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {generatedBatchLinks.map((link) => {
                        const last4 = getLast4Letters(link.slug);
                        return (
                          <div
                            key={link.id || link.slug}
                            className="border border-neutral-300 rounded-lg p-2 flex flex-col items-center justify-center text-center bg-white"
                          >
                            <QRCodeComponent url={`${baseUrl}/r/${link.slug}`} size={65} />
                            <div className="text-xs font-black font-mono text-black mt-1">
                              {last4}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                      {generatedBatchLinks.map((link) => {
                        const last4 = getLast4Letters(link.slug);
                        return (
                          <div
                            key={link.id || link.slug}
                            className="border border-dashed border-neutral-300 rounded-xl p-4 flex flex-col items-center justify-center text-center relative group"
                          >
                            <QRCodeComponent url={`${baseUrl}/r/${link.slug}`} size={120} />
                            <div className="text-lg font-black font-mono tracking-widest text-black mt-2">
                              {last4}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenAssign(link)}
                              className="mt-2 px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-[10px] font-bold hover:bg-neutral-800 transition-colors"
                            >
                              {link.isAssigned ? 'Active' : 'Assign'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by 4-digit code (e.g. 7k29), slug, or destination..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setInventoryFilter('unassigned')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  inventoryFilter === 'unassigned'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Unassigned ({unassignedLinks.length})
              </button>
              <button
                type="button"
                onClick={() => setInventoryFilter('assigned')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  inventoryFilter === 'assigned'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Assigned ({assignedLinks.length})
              </button>
              <button
                type="button"
                onClick={() => setInventoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  inventoryFilter === 'all'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                All ({links.length})
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-lg">
            <div className="divide-y divide-neutral-800/80">
              {filteredInventory.length === 0 ? (
                <div className="p-12 text-center text-neutral-400 space-y-2">
                  <Layers className="w-8 h-8 mx-auto text-neutral-600" />
                  <p className="font-semibold text-neutral-300">No stock found matching your filter</p>
                  <p className="text-xs">Generate a new batch above to create unassigned physical QR stock.</p>
                </div>
              ) : (
                filteredInventory.map((item) => {
                  const last4 = getLast4Letters(item.slug);
                  return (
                    <div
                      key={item.id || item.slug}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-[9px] uppercase font-mono text-neutral-500">CODE</span>
                          <span className="text-sm font-black font-mono text-amber-400">{last4}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{item.title}</h4>
                            {item.isAssigned ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Live
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Sparkles className="w-3 h-3" /> Unassigned
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                            <span className="font-mono text-neutral-500">/r/{item.slug}</span>
                            {item.destinationUrl && (
                              <span className="text-neutral-300 truncate max-w-xs">
                                &rarr; {item.destinationUrl}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCopyPermanentLink(item.slug)}
                          className="px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          {copiedSlug === item.slug ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy /r/
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAssign(item)}
                          className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                            item.isAssigned
                              ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                              : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20'
                          }`}
                        >
                          {item.isAssigned ? 'Edit Target' : 'Assign Destination'}
                        </button>

                        {onDeleteLink && (
                          <button
                            type="button"
                            onClick={() => onDeleteLink(item.id || item.slug)}
                            className="p-2 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                            title="Delete QR Code"
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
          </div>
        </div>
      )}

      {/* Assignment Modal with One-Tap Destination Templates */}
      {assigningLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Assign Destination
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {getLast4Letters(assigningLink.slug)}
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">/r/{assigningLink.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningLink(null)}
                className="text-neutral-400 hover:text-white p-1"
              >
                &times;
              </button>
            </div>

            {/* One-Tap Destination Templates Section */}
            <div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                ⚡ 1-Tap Presets (Restaurants & Retail)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DESTINATION_TEMPLATES.map((tmpl) => {
                  const isSelected = activeTemplate?.id === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">{tmpl.name}</span>
                      <span className="text-[9px] text-neutral-500 block leading-tight mt-0.5">
                        {tmpl.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Template Dynamic Fields */}
            {activeTemplate && (
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">{activeTemplate.name} Setup</span>
                  <span className="text-[10px] text-neutral-400">{activeTemplate.description}</span>
                </div>
                {activeTemplate.fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-[11px] font-medium text-neutral-300 mb-1">{f.label}</label>
                    <input
                      type={f.type || 'text'}
                      value={templateValues[f.key] || ''}
                      onChange={(e) => handleTemplateFieldChange(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Manual Form */}
            <form onSubmit={handleSaveAssignment} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Destination Web URL
                </label>
                <input
                  type="text"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Display Label / Table Name
                </label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="e.g. Table 04 Standee"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {assignError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  {assignError}
                </div>
              )}

              {assignSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {assignSuccess}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningLink(null)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAssignment}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 text-xs font-black transition-all shadow-md active:scale-98 disabled:opacity-50"
                >
                  {isSavingAssignment ? 'Activating Globally...' : 'Save & Make Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Canvas QR Renderer Helper
const QRCodeComponent: React.FC<{ url: string; size: number }> = ({ url, size }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      }).catch((e) => console.warn('QR render error:', e));
    }
  }, [url, size]);

  return <canvas ref={canvasRef} className="block" />;
};
