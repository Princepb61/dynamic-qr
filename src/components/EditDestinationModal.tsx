import React, { useState, useEffect } from 'react';
import {
  LinkRecord,
  ReviewGateConfig,
  QRSettings,
  HubActionItem,
  MultiActionHubConfig,
  HubActionType,
} from '../types';
import {
  X,
  ShieldCheck,
  Sparkles,
  Star,
  Plus,
  Trash2,
  Palette,
  Globe,
  Layers,
  Phone,
  MessageCircle,
  Wifi,
  User,
  Utensils,
  MapPin,
  Share2,
  ArrowRight,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { QRStudioModal } from './QRStudioModal';

interface EditDestinationModalProps {
  link: LinkRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<LinkRecord>) => Promise<void>;
}

const DEFAULT_HUB_ACTIONS: HubActionItem[] = [
  {
    id: 'act_review',
    type: 'google_review',
    title: 'Write a 5-Star Google Review',
    subtitle: 'Share your experience with our team',
    destinationUrl: '',
    enabled: true,
  },
  {
    id: 'act_whatsapp',
    type: 'whatsapp',
    title: 'Chat with Us on WhatsApp',
    subtitle: 'Direct support & reservations',
    phone: '',
    message: 'Hello! I scanned your QR code and would like to ask a question.',
    enabled: true,
  },
  {
    id: 'act_menu',
    type: 'menu',
    title: 'View Digital Menu',
    subtitle: 'Explore our latest food & drink offerings',
    destinationUrl: '',
    enabled: true,
  },
  {
    id: 'act_wifi',
    type: 'wifi',
    title: 'Connect to Free Guest Wi-Fi',
    subtitle: 'One-tap network connection',
    enabled: false,
  },
  {
    id: 'act_contact',
    type: 'contact',
    title: 'Save Business Contact',
    subtitle: 'Add to phone contacts with 1 tap',
    enabled: false,
  },
  {
    id: 'act_location',
    type: 'location',
    title: 'Get Directions on Google Maps',
    subtitle: 'Find us easily',
    address: '',
    enabled: false,
  },
  {
    id: 'act_website',
    type: 'website',
    title: 'Visit Official Website',
    subtitle: 'Explore services, pricing & specials',
    destinationUrl: '',
    enabled: true,
  },
  {
    id: 'act_instagram',
    type: 'instagram',
    title: 'Follow Us on Instagram',
    subtitle: 'Tag us in your photos & stories',
    handle: '',
    enabled: false,
  },
  {
    id: 'act_facebook',
    type: 'facebook',
    title: 'Like Our Facebook Page',
    subtitle: 'Stay updated on community news',
    handle: '',
    enabled: false,
  },
];

export const EditDestinationModal: React.FC<EditDestinationModalProps> = ({
  link,
  isOpen,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'hub' | 'reviews'>('general');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [batchPassword, setBatchPassword] = useState('');
  const [presentationMode, setPresentationMode] = useState<
    'instant_redirect' | 'button_page' | 'review_gate' | 'multi_action_hub' | 'vcard_profile' | 'wifi_card'
  >('instant_redirect');

  // Multi-Action Smart Hub state
  const [hubEnabled, setHubEnabled] = useState(false);
  const [hubHeading, setHubHeading] = useState('');
  const [hubSubheading, setHubSubheading] = useState('');
  const [hubActions, setHubActions] = useState<HubActionItem[]>(DEFAULT_HUB_ACTIONS);

  // Review & Feedback state
  const [reviewGateEnabled, setReviewGateEnabled] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [minRating, setMinRating] = useState(4);
  const [praiseTags, setPraiseTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [reviewTone, setReviewTone] = useState<
    'enthusiastic' | 'friendly' | 'professional' | 'short_and_sweet'
  >('friendly');

  // QR Studio Modal state
  const [isQRStudioOpen, setIsQRStudioOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (link) {
      setDestinationUrl(link.destinationUrl || '');
      setTitle(link.title || '');
      setDescription(link.description || '');
      setBatchPassword(link.batchPassword || '');
      setPresentationMode(
        link.presentationMode ||
          (link.hubConfig?.enabled
            ? 'multi_action_hub'
            : link.reviewGate?.enabled
            ? 'review_gate'
            : 'instant_redirect')
      );

      // Multi-Action Hub setup
      if (link.hubConfig && Array.isArray(link.hubConfig.actions) && link.hubConfig.actions.length > 0) {
        setHubEnabled(link.hubConfig.enabled !== false);
        setHubHeading(link.hubConfig.heading || link.title || '');
        setHubSubheading(link.hubConfig.subheading || 'Choose an option below');
        setHubActions(link.hubConfig.actions);
      } else {
        setHubEnabled(link.presentationMode === 'multi_action_hub');
        setHubHeading(link.title || '');
        setHubSubheading('Tap any option below to get started');
        setHubActions(DEFAULT_HUB_ACTIONS);
      }

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
      setReviewTone(link.reviewGate?.customTone || 'friendly');

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

  const handleToggleHubAction = (actionId: string) => {
    setHubActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, enabled: a.enabled === false ? true : false } : a))
    );
  };

  const handleUpdateHubAction = (actionId: string, updates: Partial<HubActionItem>) => {
    setHubActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, ...updates } : a))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let target = destinationUrl.trim();
    if (target && !target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    if (!target && presentationMode === 'instant_redirect') {
      setError('Please provide a destination URL for instant redirect mode, or select Multi-Action Smart Hub.');
      return;
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

    const multiActionHubConfig: MultiActionHubConfig = {
      enabled: hubEnabled || presentationMode === 'multi_action_hub',
      heading: hubHeading.trim() || title,
      subheading: hubSubheading.trim() || 'Choose an option below',
      actions: hubActions,
    };

    try {
      setIsSaving(true);
      await onSave(link.id, {
        destinationUrl: target,
        title: title.trim() || link.title,
        description: description.trim(),
        batchPassword: batchPassword.trim() || undefined,
        presentationMode,
        reviewGate: reviewGateConfig,
        hubConfig: multiActionHubConfig,
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
          <div className="flex border-b border-neutral-800 bg-neutral-950/40 p-2 gap-1 shrink-0 overflow-x-auto no-scrollbar">
            {[
              { id: 'general', label: 'Destination & Mode', icon: Globe },
              { id: 'hub', label: '🔗 Multi-Action Hub', icon: Layers },
              { id: 'reviews', label: '⭐ Organic Google AI Reviews', icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
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
                      No need to re-print stands, stickers or cards. Change where the QR routes anytime.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white block">Primary Destination URL</label>
                  <input
                    type="text"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://example.com/menu"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Batch Password (Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={batchPassword}
                      onChange={(e) => setBatchPassword(e.target.value)}
                      placeholder="Staff activation password"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white block">Description / Notes</label>
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
                        desc: 'Redirects browser immediately to primary URL',
                      },
                      {
                        id: 'multi_action_hub',
                        title: '🔗 Multi-Action Hub',
                        desc: 'Interactive hub with reviews, WhatsApp, menu & WiFi',
                      },
                      {
                        id: 'review_gate',
                        title: '⭐ Google Review Mode',
                        desc: 'Organic category AI reviews & direct feedback',
                      },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setPresentationMode(mode.id as any);
                          if (mode.id === 'multi_action_hub') setHubEnabled(true);
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

            {/* TAB 2: MULTI-ACTION SMART HUB */}
            {activeTab === 'hub' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">Enable Multi-Action Smart Hub</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hubEnabled || presentationMode === 'multi_action_hub'}
                        onChange={(e) => {
                          setHubEnabled(e.target.checked);
                          if (e.target.checked) setPresentationMode('multi_action_hub');
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <p className="text-xs text-neutral-300">
                    A single QR code displays an all-in-one smart landing page with direct buttons for reviews, WhatsApp, digital menu, guest Wi-Fi, contact card, location, and social profiles.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Hub Heading</label>
                    <input
                      type="text"
                      value={hubHeading}
                      onChange={(e) => setHubHeading(e.target.value)}
                      placeholder="e.g. Welcome to Bella Trattoria"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Subheading</label>
                    <input
                      type="text"
                      value={hubSubheading}
                      onChange={(e) => setHubSubheading(e.target.value)}
                      placeholder="e.g. Tap any option below to connect"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Configured Action Buttons</span>
                    <span className="text-[11px] text-neutral-500">Toggle on/off as needed</span>
                  </div>

                  <div className="space-y-2">
                    {hubActions.map((action) => {
                      const isEnabled = action.enabled !== false;
                      return (
                        <div
                          key={action.id}
                          className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                            isEnabled
                              ? 'bg-neutral-950 border-neutral-800'
                              : 'bg-neutral-950/40 border-neutral-800/40 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {action.type === 'google_review' && <Star className="w-4 h-4 text-amber-400" />}
                              {action.type === 'whatsapp' && <MessageCircle className="w-4 h-4 text-emerald-400" />}
                              {action.type === 'menu' && <Utensils className="w-4 h-4 text-orange-400" />}
                              {action.type === 'wifi' && <Wifi className="w-4 h-4 text-cyan-400" />}
                              {action.type === 'contact' && <User className="w-4 h-4 text-purple-400" />}
                              {action.type === 'location' && <MapPin className="w-4 h-4 text-rose-400" />}
                              {action.type === 'instagram' && <Share2 className="w-4 h-4 text-pink-400" />}
                              {action.type === 'facebook' && <Share2 className="w-4 h-4 text-blue-400" />}
                              {action.type === 'website' && <Globe className="w-4 h-4 text-indigo-400" />}
                              <span className="text-xs font-bold text-white">{action.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleHubAction(action.id)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                                isEnabled
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                              }`}
                            >
                              {isEnabled ? 'ACTIVE' : 'DISABLED'}
                            </button>
                          </div>

                          {isEnabled && (
                            <div className="space-y-2 pt-1 border-t border-neutral-800/60">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={action.title}
                                  onChange={(e) => handleUpdateHubAction(action.id, { title: e.target.value })}
                                  placeholder="Button title"
                                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                />
                                <input
                                  type="text"
                                  value={action.subtitle || ''}
                                  onChange={(e) => handleUpdateHubAction(action.id, { subtitle: e.target.value })}
                                  placeholder="Sub-description"
                                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                />
                              </div>

                              {action.type === 'whatsapp' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={action.phone || ''}
                                    onChange={(e) => handleUpdateHubAction(action.id, { phone: e.target.value })}
                                    placeholder="Phone with country code (e.g. +14155552671)"
                                    className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                  />
                                  <input
                                    type="text"
                                    value={action.message || ''}
                                    onChange={(e) => handleUpdateHubAction(action.id, { message: e.target.value })}
                                    placeholder="Prefilled message"
                                    className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                  />
                                </div>
                              ) : action.type === 'instagram' || action.type === 'facebook' ? (
                                <input
                                  type="text"
                                  value={action.handle || action.destinationUrl || ''}
                                  onChange={(e) => handleUpdateHubAction(action.id, { handle: e.target.value, destinationUrl: e.target.value })}
                                  placeholder={action.type === 'instagram' ? 'Instagram username (e.g. @bellatrattoria)' : 'Facebook page handle'}
                                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                />
                              ) : action.type === 'location' ? (
                                <input
                                  type="text"
                                  value={action.address || action.destinationUrl || ''}
                                  onChange={(e) => handleUpdateHubAction(action.id, { address: e.target.value, destinationUrl: e.target.value })}
                                  placeholder="Physical address or Google Maps URL"
                                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={action.destinationUrl || ''}
                                  onChange={(e) => handleUpdateHubAction(action.id, { destinationUrl: e.target.value })}
                                  placeholder="Destination URL (e.g. https://...)"
                                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ORGANIC GOOGLE REVIEWS & FEEDBACK */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Enable Category AI Google Reviews</span>
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
                    Gemini 3.8 Flash generates authentic, natural, human 5-star Google review drafts tailored precisely to your custom business category. All customers can submit honest feedback or post directly to Google.
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
                    <label className="text-[11px] font-semibold text-neutral-400">
                      Custom Business Category <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      placeholder="Type any category (e.g. Italian Trattoria, Hair Salon, Dental Clinic...)"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400">
                    Google Review Direct URL
                  </label>
                  <input
                    type="text"
                    value={googleReviewUrl}
                    onChange={(e) => setGoogleReviewUrl(e.target.value)}
                    placeholder="https://g.page/r/your-google-place-id/review"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-neutral-500">
                    From Google Business Profile &gt; "Ask for reviews" link.
                  </span>
                </div>

                {/* Praise Tags */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-neutral-400">
                    Category Praise Tags (Selected by guests to guide organic AI draft)
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
                      placeholder="Add tag (e.g. Homemade Pasta, Attentive Server, Spotless Clinic)..."
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
                  <label className="text-[11px] font-semibold text-neutral-400">Default AI Review Style</label>
                  <select
                    value={reviewTone}
                    onChange={(e) => setReviewTone(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="friendly">Warm & Friendly (Everyday human tone)</option>
                    <option value="enthusiastic">Enthusiastic & Delighted (Great for restaurants & experiences)</option>
                    <option value="short_and_sweet">Short, Punchy & Direct (2-3 sentences)</option>
                    <option value="professional">Detailed & Professional (Great for clinics & services)</option>
                  </select>
                </div>
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
