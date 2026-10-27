import React, { useState, useEffect } from 'react';
import { LinkRecord, ReviewGateConfig, ConditionalRoutingConfig, ConditionalRule, QRSettings } from '../types';
import { X, ShieldCheck, Sparkles, Star, Clock, Smartphone, Plus, Trash2, Palette, Globe, Layers } from 'lucide-react';
import { QRStudioModal } from './QRStudioModal';

interface EditDestinationModalProps {
  link: LinkRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<LinkRecord>) => Promise<void>;
}

export const EditDestinationModal: React.FC<EditDestinationModalProps> = ({
  link,
  isOpen,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'reviews' | 'conditional'>('general');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [presentationMode, setPresentationMode] = useState<'instant_redirect' | 'button_page' | 'review_gate'>('instant_redirect');
  
  // Review Gatekeeper state
  const [reviewGateEnabled, setReviewGateEnabled] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [minRating, setMinRating] = useState(4);
  const [praiseTags, setPraiseTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [reviewTone, setReviewTone] = useState<'enthusiastic' | 'friendly' | 'professional' | 'short_and_sweet'>('enthusiastic');

  // Conditional Routing state
  const [conditionalEnabled, setConditionalEnabled] = useState(false);
  const [rules, setRules] = useState<ConditionalRule[]>([]);

  // QR Studio Modal state
  const [isQRStudioOpen, setIsQRStudioOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (link) {
      setDestinationUrl(link.destinationUrl || '');
      setTitle(link.title || '');
      setDescription(link.description || '');
      setPresentationMode(link.presentationMode || (link.reviewGate?.enabled ? 'review_gate' : 'instant_redirect'));

      // Review Gatekeeper
      setReviewGateEnabled(link.reviewGate?.enabled || false);
      setBusinessName(link.reviewGate?.businessName || link.title || '');
      setBusinessCategory(link.reviewGate?.businessCategory || 'Local Business');
      setGoogleReviewUrl(link.reviewGate?.googleReviewUrl || link.destinationUrl || '');
      setMinRating(link.reviewGate?.minRatingForGoogle || 4);
      setPraiseTags(
        link.reviewGate?.praiseTags && link.reviewGate.praiseTags.length > 0
          ? link.reviewGate.praiseTags
          : ['Fast Service', 'Friendly Staff', 'Outstanding Quality', 'Clean & Cozy', 'Great Value']
      );
      setReviewTone(link.reviewGate?.customTone || 'enthusiastic');

      // Conditional Routing
      setConditionalEnabled(link.conditionalRouting?.enabled || false);
      setRules(link.conditionalRouting?.rules || []);

      setError(null);
    }
  }, [link]);

  if (!isOpen || !link) return null;

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !praiseTags.includes(trimmed)) {
      setPraiseTags([...praiseTags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setPraiseTags(praiseTags.filter((t) => t !== tagToRemove));
  };

  const handleAddRule = (type: 'time' | 'device_os') => {
    const newRule: ConditionalRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: type === 'time' ? 'Breakfast / Morning Shift' : 'iOS App Store Download',
      type,
      timeStart: type === 'time' ? '06:00' : undefined,
      timeEnd: type === 'time' ? '11:30' : undefined,
      targetOs: type === 'device_os' ? 'ios' : undefined,
      destinationUrl: link.destinationUrl || 'https://',
    };
    setRules([...rules, newRule]);
  };

  const handleRemoveRule = (ruleId: string) => {
    setRules(rules.filter((r) => r.id !== ruleId));
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<ConditionalRule>) => {
    setRules(rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let target = destinationUrl.trim();
    if (!target && !reviewGateEnabled) {
      setError('Please provide a destination URL.');
      return;
    }

    if (target && !target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    const reviewGateConfig: ReviewGateConfig = {
      enabled: reviewGateEnabled || presentationMode === 'review_gate',
      businessName: businessName.trim() || title,
      businessCategory: businessCategory.trim() || 'Local Business',
      googleReviewUrl: googleReviewUrl.trim() || target,
      minRatingForGoogle: minRating,
      praiseTags,
      customTone: reviewTone,
    };

    const conditionalRoutingConfig: ConditionalRoutingConfig = {
      enabled: conditionalEnabled,
      rules,
      fallbackUrl: target,
    };

    try {
      setIsSaving(true);
      await onSave(link.id, {
        destinationUrl: target,
        title: title.trim() || link.title,
        description: description.trim(),
        presentationMode,
        reviewGate: reviewGateConfig,
        conditionalRouting: conditionalRoutingConfig,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update destination');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQRSettings = async (newSettings: QRSettings) => {
    await onSave(link.id, { qrSettings: newSettings });
  };

  const dynamicEndpoint = `/r/${link.slug}`;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="bg-neutral-900 rounded-3xl max-w-2xl w-full border border-neutral-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Configure Dynamic Destination</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {dynamicEndpoint}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Printed physical QR codes never change. All behavior updates instantaneously.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsQRStudioOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Open Visual QR Designer Studio"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">QR Studio</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-neutral-800 bg-neutral-950/40 p-2 gap-1 shrink-0">
            {[
              { id: 'general', label: 'Destination & Mode', icon: Globe },
              { id: 'reviews', label: '⭐ Google Review AI Gate', icon: Sparkles },
              { id: 'conditional', label: 'Smart Redirects (Time/OS)', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {error}
              </div>
            )}

            {/* TAB 1: GENERAL DESTINATION & MODE */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl text-xs text-indigo-300 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Printed QR stays 100% active.</span>
                    <p className="text-neutral-400 leading-relaxed font-normal mt-0.5">
                      No need to re-print table tents or packaging. The link redirects to your updated destination immediately.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white block">Destination Web URL</label>
                  <input
                    type="text"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://example.com/menu"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white block">Display Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Dining Table #4 Menu"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white block">Description / Internal Notes</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Internal reference or customer sub-label..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-white block">Scan Presentation Mode</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: 'instant_redirect',
                        title: '⚡ Instant 307',
                        desc: 'Redirects browser immediately',
                      },
                      {
                        id: 'review_gate',
                        title: '⭐ Review Gatekeeper',
                        desc: 'Filter 5-star Google vs private feedback',
                      },
                      {
                        id: 'button_page',
                        title: '🔘 Action Landing Page',
                        desc: 'Branded button screen before target',
                      },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setPresentationMode(mode.id as any);
                          if (mode.id === 'review_gate') setReviewGateEnabled(true);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          presentationMode === mode.id
                            ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-sm'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-xs font-bold block">{mode.title}</span>
                        <span className="text-[10px] text-neutral-500 block mt-0.5">{mode.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: REVIEW GATEKEEPER & AI 5-STAR REVIEWS */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Enable Customer Review Gatekeeper</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reviewGateEnabled || presentationMode === 'review_gate'}
                        onChange={(e) => {
                          setReviewGateEnabled(e.target.checked);
                          if (e.target.checked) setPresentationMode('review_gate');
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  <p className="text-xs text-neutral-300">
                    4-5 star happy customers generate a tailor-made Google review via Gemini AI with 1-tap clipboard copying. 1-3 star dissatisfied ratings are privately intercepted to your admin inbox!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Business Name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Copper Kettle Cafe"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Business Category</label>
                    <input
                      type="text"
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      placeholder="e.g. Specialty Coffee, Italian Dining"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400">
                    Google Review Direct URL (Target for 4-5 Stars)
                  </label>
                  <input
                    type="text"
                    value={googleReviewUrl}
                    onChange={(e) => setGoogleReviewUrl(e.target.value)}
                    placeholder="https://g.page/r/your-google-place-id/review"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-neutral-500">
                    Find this in your Google Business Profile &gt; "Ask for reviews" link.
                  </span>
                </div>

                {/* Praise Tags */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-neutral-400">
                    Praise Tags (Customers can tap these to guide the AI)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {praiseTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-neutral-400 hover:text-rose-400 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add tag (e.g. Amazing Desserts, Fast WiFi)..."
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* AI Review Tone */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400">Default AI Tone</label>
                  <select
                    value={reviewTone}
                    onChange={(e) => setReviewTone(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="enthusiastic">Enthusiastic & Delighted (Most effective for local search)</option>
                    <option value="friendly">Warm & Friendly</option>
                    <option value="short_and_sweet">Short, Punchy & Direct</option>
                    <option value="professional">Professional & Detailed</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB 3: SMART CONDITIONAL ROUTING */}
            {activeTab === 'conditional' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">Smart Conditional Redirect Rules</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={conditionalEnabled}
                        onChange={(e) => setConditionalEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <p className="text-xs text-neutral-300">
                    Route scans dynamically based on the current time of day (Breakfast vs Dinner menu) or visitor device operating system (iOS vs Android store download).
                  </p>
                </div>

                {conditionalEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Active Priority Rules</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddRule('time')}
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Time Window</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddRule('device_os')}
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Device OS</span>
                        </button>
                      </div>
                    </div>

                    {rules.length === 0 ? (
                      <div className="py-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-2xl">
                        No conditional rules defined yet. Add a Time Window or Device OS rule above.
                      </div>
                    ) : (
                      rules.map((rule) => (
                        <div
                          key={rule.id}
                          className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {rule.type === 'time' ? (
                                <Clock className="w-4 h-4 text-amber-400" />
                              ) : (
                                <Smartphone className="w-4 h-4 text-indigo-400" />
                              )}
                              <input
                                type="text"
                                value={rule.label}
                                onChange={(e) => handleUpdateRule(rule.id, { label: e.target.value })}
                                placeholder="Rule name"
                                className="bg-transparent text-xs font-bold text-white border-b border-transparent hover:border-neutral-700 focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveRule(rule.id)}
                              className="text-neutral-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {rule.type === 'time' ? (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="text-[10px] text-neutral-500 block">From Time (24h)</label>
                                <input
                                  type="time"
                                  value={rule.timeStart || '06:00'}
                                  onChange={(e) => handleUpdateRule(rule.id, { timeStart: e.target.value })}
                                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-neutral-500 block">To Time (24h)</label>
                                <input
                                  type="time"
                                  value={rule.timeEnd || '11:30'}
                                  onChange={(e) => handleUpdateRule(rule.id, { timeEnd: e.target.value })}
                                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs">
                              <label className="text-[10px] text-neutral-500 block mb-1">Target Operating System</label>
                              <select
                                value={rule.targetOs || 'ios'}
                                onChange={(e) => handleUpdateRule(rule.id, { targetOs: e.target.value as any })}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white"
                              >
                                <option value="ios">Apple iOS (iPhone / iPad) - Route to App Store</option>
                                <option value="android">Google Android - Route to Play Store</option>
                                <option value="desktop">Desktop Computers (Mac / Windows / Linux)</option>
                              </select>
                            </div>
                          )}

                          <div>
                            <label className="text-[10px] text-neutral-500 block">Target Redirect URL</label>
                            <input
                              type="text"
                              value={rule.destinationUrl}
                              onChange={(e) => handleUpdateRule(rule.id, { destinationUrl: e.target.value })}
                              placeholder="https://..."
                              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">
                All changes take effect immediately across all devices.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Updating...' : 'Save & Update Destination'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* QR Studio Modal */}
      {isQRStudioOpen && (
        <QRStudioModal
          isOpen={isQRStudioOpen}
          onClose={() => setIsQRStudioOpen(false)}
          targetUrl={`${window.location.origin}/r/${link.slug}`}
          linkTitle={link.title}
          initialSettings={link.qrSettings}
          onSaveSettings={handleSaveQRSettings}
        />
      )}
    </>
  );
};
