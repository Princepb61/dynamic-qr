import React, { useState, useEffect } from 'react';
import {
  LinkRecord,
  ReviewGateConfig,
  QRSettings,
  HubActionItem,
  MultiActionHubConfig,
  MockupCategory,
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
  Lock,
  Eye,
  EyeOff,
  ImageIcon,
  Upload,
} from 'lucide-react';
import { QRStudioModal } from './QRStudioModal';
import { getPraiseTagsForCategory } from '../utils/categoryTags';
import { GooglePlaceSearchInput, PlaceResult } from './GooglePlaceSearchInput';
import { MOCKUP_LABELS } from '../utils/bulkExportHelper';

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
    enableAiReviews: true,
    businessName: '',
    businessCategory: 'Restaurant & Cafe',
    praiseTags: ['Fast Service', 'Friendly Staff', 'Outstanding Quality', 'Clean & Cozy', 'Great Value'],
    customTone: 'friendly',
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
    subtitle: 'Instant network access',
    wifiSsid: '',
    wifiPassword: '',
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

interface SwitchButtonProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeColor?: 'indigo' | 'amber' | 'emerald';
  onText?: string;
  offText?: string;
}

const SwitchButton: React.FC<SwitchButtonProps> = ({
  checked,
  onChange,
  activeColor = 'indigo',
  onText = 'ON',
  offText = 'OFF',
}) => {
  const bg = {
    indigo: checked ? '#4f46e5' : '#262626',
    amber: checked ? '#f59e0b' : '#262626',
    emerald: checked ? '#10b981' : '#262626',
  };

  const badgeClass = {
    indigo: checked
      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
      : 'bg-neutral-800 text-neutral-400 border-neutral-700',
    amber: checked
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-neutral-800 text-neutral-400 border-neutral-700',
    emerald: checked
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : 'bg-neutral-800 text-neutral-400 border-neutral-700',
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(!checked);
      }}
      className="inline-flex items-center gap-2 cursor-pointer select-none group focus:outline-none"
    >
      <span
        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider transition-colors ${badgeClass[activeColor]}`}
      >
        {checked ? onText : offText}
      </span>
      <div
        style={{ backgroundColor: bg[activeColor], transition: 'background-color 200ms ease' }}
        className="relative inline-flex h-6 w-11 shrink-0 rounded-full p-0.5 border border-white/10"
      >
        <div
          style={{
            transform: checked ? 'translateX(20px)' : 'translateX(0px)',
            transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="h-4.5 w-4.5 rounded-full bg-white shadow-md pointer-events-none"
        />
      </div>
    </button>
  );
};

export const EditDestinationModal: React.FC<EditDestinationModalProps> = ({
  link,
  isOpen,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'hub'>('general');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [batchPassword, setBatchPassword] = useState('');
  const [presentationMode, setPresentationMode] = useState<
    'instant_redirect' | 'button_page' | 'review_gate' | 'multi_action_hub' | 'vcard_profile' | 'wifi_card'
  >('instant_redirect');

  // Pre-print Mockup & Stand attributes
  const [targetMockup, setTargetMockup] = useState<MockupCategory>('google_review');
  const [standNumber, setStandNumber] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeRating, setPlaceRating] = useState<number | undefined>(undefined);

  // Multi-Action Smart Hub state
  const [hubEnabled, setHubEnabled] = useState(false);
  const [hubHeading, setHubHeading] = useState('');
  const [hubSubheading, setHubSubheading] = useState('');
  const [hubCustomImage, setHubCustomImage] = useState('');
  const [hubActions, setHubActions] = useState<HubActionItem[]>(DEFAULT_HUB_ACTIONS);

  // Quick tag input state for the Google Review action inside Hub
  const [newTagInput, setNewTagInput] = useState('');
  const [showWifiPass, setShowWifiPass] = useState(false);

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
      setTargetMockup(link.targetMockup || 'google_review');
      setStandNumber(link.standNumber || (link.batchIndex !== undefined ? `Stand-${String(link.batchIndex + 1).padStart(2, '0')}` : ''));
      setPlaceId(link.placeId || '');
      setPlaceAddress(link.placeAddress || '');
      setPlaceRating(link.placeRating);

      // Multi-Action Hub setup
      if (link.hubConfig && Array.isArray(link.hubConfig.actions) && link.hubConfig.actions.length > 0) {
        setHubEnabled(link.hubConfig.enabled !== false);
        setHubHeading(link.hubConfig.heading || link.title || '');
        setHubSubheading(link.hubConfig.subheading || 'Choose an option below');
        setHubCustomImage(link.hubConfig.customImageUrl || '');

        // Merge with existing reviewGate configs if review action exists
        const mergedActions = link.hubConfig.actions.map((act) => {
          if (act.type === 'google_review') {
            return {
              ...act,
              enableAiReviews: act.enableAiReviews !== false,
              businessName: act.businessName || link.reviewGate?.businessName || link.title || '',
              businessCategory: act.businessCategory || link.reviewGate?.businessCategory || 'Restaurant & Cafe',
              destinationUrl: act.destinationUrl || link.reviewGate?.googleReviewUrl || link.destinationUrl || '',
              praiseTags:
                act.praiseTags && act.praiseTags.length > 0
                  ? act.praiseTags
                  : link.reviewGate?.praiseTags && link.reviewGate.praiseTags.length > 0
                  ? link.reviewGate.praiseTags
                  : getPraiseTagsForCategory(act.businessCategory || link.reviewGate?.businessCategory || 'Restaurant & Cafe'),
              customTone: act.customTone || link.reviewGate?.customTone || 'friendly',
            };
          }
          if (act.type === 'wifi') {
            return {
              ...act,
              wifiSsid: act.wifiSsid || link.wifiData?.ssid || '',
              wifiPassword: act.wifiPassword || link.wifiData?.password || '',
            };
          }
          return act;
        });

        setHubActions(mergedActions);
      } else {
        setHubEnabled(link.presentationMode === 'multi_action_hub');
        setHubHeading(link.title || '');
        setHubSubheading('Tap any option below to get started');
        setHubCustomImage('');
        setHubActions(
          DEFAULT_HUB_ACTIONS.map((act) => {
            if (act.type === 'google_review') {
              return {
                ...act,
                destinationUrl: link.reviewGate?.googleReviewUrl || link.destinationUrl || '',
                businessName: link.reviewGate?.businessName || link.title || '',
                businessCategory: link.reviewGate?.businessCategory || 'Restaurant & Cafe',
                praiseTags:
                  link.reviewGate?.praiseTags && link.reviewGate.praiseTags.length > 0
                    ? link.reviewGate.praiseTags
                    : getPraiseTagsForCategory(link.reviewGate?.businessCategory || 'Restaurant & Cafe'),
                customTone: link.reviewGate?.customTone || 'friendly',
              };
            }
            if (act.type === 'wifi') {
              return {
                ...act,
                wifiSsid: link.wifiData?.ssid || '',
                wifiPassword: link.wifiData?.password || '',
              };
            }
            return act;
          })
        );
      }

      setError(null);
    }
  }, [link]);

  if (!isOpen || !link) return null;

  const handleToggleHubAction = (actionId: string) => {
    setHubActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, enabled: a.enabled === false } : a))
    );
  };

  const handleUpdateHubAction = (actionId: string, updates: Partial<HubActionItem>) => {
    setHubActions((prev) =>
      prev.map((a) => {
        if (a.id !== actionId) return a;
        const updated = { ...a, ...updates };

        // When businessCategory changes for google_review, refresh default tags
        if (updates.businessCategory && updates.businessCategory !== a.businessCategory) {
          const suggested = getPraiseTagsForCategory(updates.businessCategory);
          updated.praiseTags = suggested;
        }

        return updated;
      })
    );
  };

  const handleAddReviewPraiseTag = (actionId: string, tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setHubActions((prev) =>
      prev.map((a) => {
        if (a.id !== actionId) return a;
        const existing = a.praiseTags || [];
        if (existing.includes(trimmed)) return a;
        return { ...a, praiseTags: [...existing, trimmed] };
      })
    );
    setNewTagInput('');
  };

  const handleRemoveReviewPraiseTag = (actionId: string, tagToRemove: string) => {
    setHubActions((prev) =>
      prev.map((a) => {
        if (a.id !== actionId) return a;
        const existing = a.praiseTags || [];
        return { ...a, praiseTags: existing.filter((t) => t !== tagToRemove) };
      })
    );
  };

  const handleAddHubAction = (type: HubActionItem['type'] = 'url') => {
    const newId = `action_${Date.now()}`;
    const defaults: Record<string, { title: string; subtitle: string; icon: string; color: string }> = {
      url: { title: 'Custom Website Link', subtitle: 'Visit our official website', icon: 'globe', color: 'indigo' },
      whatsapp: { title: 'WhatsApp Us', subtitle: 'Chat with our support team', icon: 'message-square', color: 'emerald' },
      menu: { title: 'Digital Menu', subtitle: 'Browse items and pricing', icon: 'utensils', color: 'orange' },
      location: { title: 'Find Us on Maps', subtitle: 'Turn-by-turn navigation', icon: 'map-pin', color: 'rose' },
      instagram: { title: 'Instagram Profile', subtitle: 'Follow our daily updates', icon: 'camera', color: 'pink' },
      facebook: { title: 'Facebook Page', subtitle: 'Connect with our page', icon: 'share-2', color: 'blue' },
      wifi: { title: 'Guest Wi-Fi', subtitle: 'Connect to fast guest internet', icon: 'wifi', color: 'cyan' },
      contact: { title: 'Save Contact Card', subtitle: 'Add details to phone contacts', icon: 'user', color: 'purple' },
      google_review: { title: 'Review on Google', subtitle: 'Share your 5-star experience', icon: 'star', color: 'amber' },
    };

    const meta = defaults[type] || defaults.url;
    const newAction: HubActionItem = {
      id: newId,
      type,
      title: meta.title,
      subtitle: meta.subtitle,
      destinationUrl: '',
      enabled: true,
      color: meta.color,
      icon: meta.icon,
      enableAiReviews: type === 'google_review' ? true : undefined,
      businessName: type === 'google_review' ? (title || link?.title || '') : undefined,
      businessCategory: type === 'google_review' ? 'Restaurant & Cafe' : undefined,
      praiseTags: type === 'google_review' ? getPraiseTagsForCategory('Restaurant & Cafe') : undefined,
    };

    setHubActions((prev) => [...prev, newAction]);
  };

  const handleDeleteHubAction = (actionId: string) => {
    setHubActions((prev) => prev.filter((a) => a.id !== actionId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let target = destinationUrl.trim();
    if (target && !target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('/r/')) {
      target = 'https://' + target;
    }

    const isHubActive = presentationMode === 'multi_action_hub';
    const isSingleReviewGate = presentationMode === 'review_gate';

    if (isHubActive && !target) {
      target = `/r/${link.slug}`;
    }

    if (!target && presentationMode === 'instant_redirect') {
      setError('Please provide a destination URL for instant redirect mode, or select Multi-Action Smart Hub.');
      return;
    }

    // Extract google_review action config to keep reviewGate synchronized
    const reviewAct = hubActions.find((a) => a.type === 'google_review');
    const wifiAct = hubActions.find((a) => a.type === 'wifi');

    const isAiReviewsEnabled =
      reviewAct ? reviewAct.enabled !== false && reviewAct.enableAiReviews !== false : false;

    // Review gate is enabled only if standalone review_gate mode or hub action has it active
    const isReviewGateEnabled = isSingleReviewGate || (isHubActive && isAiReviewsEnabled);

    const reviewGateConfig: ReviewGateConfig = {
      enabled: isReviewGateEnabled,
      businessName: (reviewAct?.businessName || title || link.title || '').trim(),
      businessCategory: (reviewAct?.businessCategory || 'Local Business').trim(),
      googleReviewUrl: (reviewAct?.destinationUrl || target || '').trim(),
      minRatingForGoogle: 4,
      praiseTags: reviewAct?.praiseTags && reviewAct.praiseTags.length > 0
        ? reviewAct.praiseTags
        : getPraiseTagsForCategory(reviewAct?.businessCategory || 'Local Business'),
      customTone: (reviewAct?.customTone as any) || 'friendly',
    };

    const multiActionHubConfig: MultiActionHubConfig = {
      enabled: isHubActive,
      heading: hubHeading.trim() || title || link.title,
      subheading: hubSubheading.trim() || 'Choose an option below',
      customImageUrl: hubCustomImage.trim() || undefined,
      actions: hubActions,
    };

    let effectivePresentationMode: 'instant_redirect' | 'button_page' | 'review_gate' | 'multi_action_hub' | 'vcard_profile' | 'wifi_card' = 'instant_redirect';
    if (isHubActive) {
      effectivePresentationMode = 'multi_action_hub';
    } else if (isSingleReviewGate) {
      effectivePresentationMode = 'review_gate';
    } else {
      effectivePresentationMode = 'instant_redirect';
    }

    try {
      setIsSaving(true);
      await onSave(link.id, {
        destinationUrl: target,
        title: title.trim() || link.title,
        description: description.trim(),
        batchPassword: batchPassword.trim() || undefined,
        presentationMode: effectivePresentationMode,
        isAssigned: true,
        reviewGate: reviewGateConfig,
        hubConfig: multiActionHubConfig,
        wifiData: wifiAct && wifiAct.wifiSsid ? {
          ssid: wifiAct.wifiSsid,
          password: wifiAct.wifiPassword || '',
          encryption: 'WPA',
        } : link.wifiData,
        targetMockup,
        standNumber: standNumber.trim() || undefined,
        placeId: placeId.trim() || undefined,
        placeAddress: placeAddress.trim() || undefined,
        placeRating,
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
                Printed physical QR codes never change. All destination behaviors update instantaneously.
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

          {/* Navigation Tabs: 2 Tabs only */}
          <div className="flex border-b border-neutral-800 bg-neutral-950/40 p-2 gap-1 shrink-0 overflow-x-auto no-scrollbar">
            {[
              { id: 'general', label: 'Destination & Mode', icon: Globe },
              { id: 'hub', label: '🔗 Multi-Action Hub (Reviews, Wi-Fi & More)', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isActive
                      ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                  }`}
                >
                  <Icon className="w-4 h-4 text-indigo-400" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {error}
              </div>
            )}

            {/* Top-Level Mode Selector: Single Direct Link vs Multi-Action Hub */}
            <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl transition-colors ${
                    presentationMode === 'multi_action_hub'
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {presentationMode === 'multi_action_hub' ? <Layers className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">QR Code Scan Behavior</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        presentationMode === 'multi_action_hub'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {presentationMode === 'multi_action_hub' ? 'Multi-Action Hub' : 'Single Direct Link'}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">
                    {presentationMode === 'multi_action_hub'
                      ? 'Displays mobile landing page with your buttons, review AI & guest Wi-Fi.'
                      : 'Bypasses landing page and redirects directly to the primary link.'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <SwitchButton
                  checked={presentationMode === 'multi_action_hub'}
                  onChange={(checked) => {
                    setHubEnabled(checked);
                    setPresentationMode(checked ? 'multi_action_hub' : 'instant_redirect');
                    if (checked) {
                      setActiveTab('hub');
                    }
                  }}
                  activeColor="indigo"
                  onText="HUB ACTIVE"
                  offText="SINGLE LINK"
                />
              </div>
            </div>

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
                    placeholder="https://example.com/menu or leave blank if using Multi-Action Hub"
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
                      placeholder="e.g. Dining Table #4 Standee"
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

                {/* Physical Mockup Graphic Template & Stand Number */}
                <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🖼️ Physical Mockup Graphic Template</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">PRINT READY</span>
                      </span>
                      <p className="text-[11px] text-neutral-400">
                        Assign this QR code to the physical graphic mockup template you place it on before printing.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(MOCKUP_LABELS).map(([key, meta]) => {
                      const isSelected = targetMockup === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTargetMockup(key as MockupCategory)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-sm ring-1 ring-amber-500/30'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                          }`}
                        >
                          <span className="text-base shrink-0">{meta.icon}</span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate">{meta.label}</span>
                            <span className="text-[10px] text-neutral-500 block font-mono truncate">/{meta.folder}/</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-neutral-300 block">
                        Stand / Table Number Label
                      </label>
                      <input
                        type="text"
                        value={standNumber}
                        onChange={(e) => setStandNumber(e.target.value)}
                        placeholder="e.g. Table 01, VIP Stand #3, Counter B"
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    {placeId ? (
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-300 block">
                          Verified Google Place ID
                        </label>
                        <input
                          type="text"
                          value={placeId}
                          readOnly
                          className="w-full bg-neutral-900/60 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono"
                        />
                      </div>
                    ) : null}
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white block">Active Scan Mode</label>
                    <span className="text-[11px] text-neutral-400">
                      {presentationMode === 'multi_action_hub' ? 'Multi-Action Hub Active' : 'Single Direct Mode Active'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPresentationMode('instant_redirect');
                        setHubEnabled(false);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        presentationMode !== 'multi_action_hub'
                          ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/40'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold block text-emerald-300">⚡ Single Direct Destination</span>
                        {presentationMode !== 'multi_action_hub' && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-mono font-bold">ACTIVE</span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400 block leading-relaxed">
                        Redirects customer immediately to your primary URL or review link.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPresentationMode('multi_action_hub');
                        setHubEnabled(true);
                        setActiveTab('hub');
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        presentationMode === 'multi_action_hub'
                          ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold block text-indigo-300">🔗 Multi-Action Smart Hub</span>
                        {presentationMode === 'multi_action_hub' && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 rounded font-mono font-bold">ACTIVE</span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400 block leading-relaxed">
                        All-in-one landing page with Google AI reviews, WhatsApp, Wi-Fi, digital menu & logo.
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MULTI-ACTION SMART HUB (Includes Organic Google AI Reviews & Wi-Fi) */}
            {activeTab === 'hub' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Multi-Action Smart Hub</span>
                        <span className="text-[11px] text-neutral-300 block">
                          {presentationMode === 'multi_action_hub'
                            ? 'ON — Displays multi-button smart mobile landing page'
                            : 'OFF — Bypasses hub and redirects directly to single URL'}
                        </span>
                      </div>
                    </div>
                    <SwitchButton
                      checked={presentationMode === 'multi_action_hub'}
                      onChange={(checked) => {
                        setHubEnabled(checked);
                        setPresentationMode(checked ? 'multi_action_hub' : 'instant_redirect');
                      }}
                      activeColor="indigo"
                      onText="HUB ON"
                      offText="HUB OFF"
                    />
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    A single QR code serves an interactive smart landing page on mobile. Guests can generate organic AI reviews, connect to guest Wi-Fi, chat on WhatsApp, or view digital menus.
                  </p>
                </div>

                {/* Hub Custom Image / Brand Logo */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">Hub Header Brand Logo / Avatar</span>
                    </div>
                    {hubCustomImage && (
                      <button
                        type="button"
                        onClick={() => setHubCustomImage('')}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Image</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Preview circle / rounded square */}
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-neutral-700 bg-neutral-900 shrink-0 flex items-center justify-center relative shadow-inner">
                      {hubCustomImage ? (
                        <img
                          src={hubCustomImage}
                          alt="Hub Logo Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <Layers className="w-6 h-6 text-neutral-600 mx-auto" />
                          <span className="text-[9px] text-neutral-500 block leading-tight mt-1">Default Icon</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={hubCustomImage}
                          onChange={(e) => setHubCustomImage(e.target.value)}
                          placeholder="Paste image URL (https://...) or upload below"
                          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 font-mono"
                        />
                        <label className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 3 * 1024 * 1024) {
                                  alert('Image size exceeds 3MB limit. Please choose a smaller image.');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = (loadEvent) => {
                                  const result = loadEvent.target?.result as string;
                                  if (result) {
                                    setHubCustomImage(result);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        Shows prominently as the avatar / brand logo atop your Multi-Action Smart Hub when scanned.
                      </p>
                    </div>
                  </div>
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
                    <span className="text-[11px] text-neutral-500">Enable and customize each button</span>
                  </div>

                  <div className="space-y-3">
                    {hubActions.map((action) => {
                      const isEnabled = action.enabled !== false;
                      return (
                        <div
                          key={action.id}
                          className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                            isEnabled
                              ? 'bg-neutral-950 border-neutral-800'
                              : 'bg-neutral-950/40 border-neutral-800/40 opacity-60'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {action.type === 'google_review' && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                              {action.type === 'whatsapp' && <MessageCircle className="w-4 h-4 text-emerald-400" />}
                              {action.type === 'menu' && <Utensils className="w-4 h-4 text-orange-400" />}
                              {action.type === 'wifi' && <Wifi className="w-4 h-4 text-cyan-400" />}
                              {action.type === 'contact' && <User className="w-4 h-4 text-purple-400" />}
                              {action.type === 'location' && <MapPin className="w-4 h-4 text-rose-400" />}
                              {action.type === 'instagram' && <Share2 className="w-4 h-4 text-pink-400" />}
                              {action.type === 'facebook' && <Share2 className="w-4 h-4 text-blue-400" />}
                              {action.type === 'website' && <Globe className="w-4 h-4 text-indigo-400" />}
                              <div>
                                <span className="text-xs font-bold text-white block">{action.title}</span>
                                {action.type === 'google_review' && (
                                  <span className="text-[10px] text-amber-400 font-medium">Includes Organic Google AI Reviews</span>
                                )}
                                {action.type === 'wifi' && (
                                  <span className="text-[10px] text-cyan-400 font-medium">Guest Wi-Fi (SSID & Password)</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <SwitchButton
                                checked={isEnabled}
                                onChange={() => handleToggleHubAction(action.id)}
                                activeColor="indigo"
                                onText="ON"
                                offText="OFF"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteHubAction(action.id)}
                                className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Remove this action card"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {isEnabled && (
                            <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                              {/* Title & Subtitle inputs */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-neutral-400 block mb-0.5">Button Title</label>
                                  <input
                                    type="text"
                                    value={action.title}
                                    onChange={(e) => handleUpdateHubAction(action.id, { title: e.target.value })}
                                    placeholder="Button title"
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-neutral-400 block mb-0.5">Subtitle / Subtext</label>
                                  <input
                                    type="text"
                                    value={action.subtitle || ''}
                                    onChange={(e) => handleUpdateHubAction(action.id, { subtitle: e.target.value })}
                                    placeholder="Sub-description"
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                  />
                                </div>
                              </div>

                              {/* 1. GOOGLE REVIEW ACTION: EMBEDDED AI REVIEWS & CATEGORY PRAISE TAGS */}
                              {action.type === 'google_review' && (
                                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-3">
                                  {/* AI Review Toggle */}
                                  <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="w-4 h-4 text-amber-400" />
                                      <div>
                                        <span className="text-xs font-bold text-white block">
                                          Organic Google AI Review Generator
                                        </span>
                                        <span className="text-[10px] text-neutral-400 block">
                                          {action.enableAiReviews !== false
                                            ? 'ON: Guests pick category praise tags; AI creates 3-5 unique review drafts'
                                            : 'OFF: Direct mode. Guests go directly to your Google Review page'}
                                        </span>
                                      </div>
                                    </div>
                                    <SwitchButton
                                      checked={action.enableAiReviews !== false}
                                      onChange={(checked) => {
                                        handleUpdateHubAction(action.id, { enableAiReviews: checked });
                                      }}
                                      activeColor="amber"
                                      onText="AI ON"
                                      offText="AI OFF"
                                    />
                                  </div>

                                   {/* Live Google Maps Auto-Search */}
                                  <div className="space-y-1.5 p-3 rounded-xl bg-neutral-900/80 border border-amber-500/30">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Auto-Fetch Business via Google Maps Search</span>
                                      </label>
                                      <span className="text-[10px] text-neutral-400">Search city &amp; name</span>
                                    </div>
                                    <GooglePlaceSearchInput
                                      initialQuery={action.businessName || ''}
                                      placeholder="Type business name &amp; city (e.g. Copper Kettle Cafe Mumbai)..."
                                      onSelectPlace={(place) => {
                                        handleUpdateHubAction(action.id, {
                                          destinationUrl: place.googleReviewUrl,
                                          businessName: place.name,
                                          businessCategory: place.category || 'Local Business',
                                          googlePlaceId: place.placeId,
                                          praiseTags: place.suggestedTags && place.suggestedTags.length > 0
                                            ? place.suggestedTags
                                            : getPraiseTagsForCategory(place.category || 'Local Business'),
                                        });
                                        setPlaceId(place.placeId);
                                        setPlaceAddress(place.formattedAddress);
                                        setPlaceRating(place.rating);
                                        if (!title || title.startsWith('QR Code') || title.startsWith('Pre-Printed')) {
                                          setTitle(`${place.name} - Review Stand`);
                                        }
                                      }}
                                    />
                                  </div>

                                  {/* Direct Google Review URL */}
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-neutral-300 font-semibold block">
                                      Google Review Direct Link <span className="text-amber-400">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={action.destinationUrl || ''}
                                      onChange={(e) =>
                                        handleUpdateHubAction(action.id, { destinationUrl: e.target.value })
                                      }
                                      placeholder="https://g.page/r/your-google-place-id/review"
                                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                    />
                                    <span className="text-[10px] text-neutral-500">
                                      Where guests submit their final review on Google.
                                    </span>
                                  </div>

                                  {/* AI Review Configuration when toggle is ON */}
                                  {action.enableAiReviews !== false && (
                                    <div className="space-y-2.5 pt-1">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-neutral-300 font-semibold block">
                                            Business Name
                                          </label>
                                          <input
                                            type="text"
                                            value={action.businessName || ''}
                                            onChange={(e) =>
                                              handleUpdateHubAction(action.id, { businessName: e.target.value })
                                            }
                                            placeholder="e.g. Copper Kettle Cafe"
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-neutral-300 font-semibold block">
                                            Business Category <span className="text-amber-400">*</span>
                                          </label>
                                          <input
                                            type="text"
                                            value={action.businessCategory || ''}
                                            onChange={(e) =>
                                              handleUpdateHubAction(action.id, { businessCategory: e.target.value })
                                            }
                                            placeholder="e.g. Italian Restaurant, Hair Salon, Dental..."
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                          />
                                        </div>
                                      </div>

                                      {/* Category Praise Tags */}
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <label className="text-[10px] text-neutral-300 font-semibold block">
                                            Category Praise Tags ({action.businessCategory || 'Selected Category'})
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const tags = getPraiseTagsForCategory(action.businessCategory || 'Restaurant');
                                              handleUpdateHubAction(action.id, { praiseTags: tags });
                                            }}
                                            className="text-[10px] text-amber-400 hover:underline"
                                          >
                                            Reset to Category Defaults
                                          </button>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                          {(action.praiseTags || []).map((tag) => (
                                            <span
                                              key={tag}
                                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700"
                                            >
                                              <span>{tag}</span>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveReviewPraiseTag(action.id, tag)}
                                                className="text-neutral-400 hover:text-rose-400 font-bold ml-0.5"
                                              >
                                                ×
                                              </button>
                                            </span>
                                          ))}
                                        </div>

                                        <div className="flex gap-2 pt-1">
                                          <input
                                            type="text"
                                            value={newTagInput}
                                            onChange={(e) => setNewTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddReviewPraiseTag(action.id, newTagInput);
                                              }
                                            }}
                                            placeholder="Add custom praise tag (e.g. Homemade Pasta)..."
                                            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleAddReviewPraiseTag(action.id, newTagInput)}
                                            className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
                                          >
                                            Add
                                          </button>
                                        </div>
                                      </div>

                                      {/* Tone */}
                                      <div className="space-y-1">
                                        <label className="text-[10px] text-neutral-300 font-semibold block">
                                          AI Writing Tone
                                        </label>
                                        <select
                                          value={action.customTone || 'friendly'}
                                          onChange={(e) =>
                                            handleUpdateHubAction(action.id, { customTone: e.target.value as any })
                                          }
                                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                        >
                                          <option value="friendly">Warm & Friendly (Everyday human tone)</option>
                                          <option value="enthusiastic">Enthusiastic & Delighted (Great for restaurants & experiences)</option>
                                          <option value="short_and_sweet">Short, Punchy & Direct (2-3 sentences)</option>
                                          <option value="professional">Detailed & Professional (Great for clinics & services)</option>
                                        </select>
                                      </div>
                                    </div>
                                  )}

                                  {action.enableAiReviews === false && (
                                    <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
                                      <span>Direct Google Review redirect is active. Guests will bypass AI drafting and open your Google Review link immediately.</span>
                                      <span className="text-amber-400/90 font-mono text-[10px] shrink-0 ml-2">Direct Link</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 2. WI-FI ACTION: ONLY NETWORK NAME AND PASSWORD */}
                              {action.type === 'wifi' && (
                                <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl space-y-2.5">
                                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                                    <Wifi className="w-4 h-4" />
                                    <span>Guest Wi-Fi Credentials</span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-neutral-300 font-semibold block">
                                        Network Name (SSID) <span className="text-cyan-400">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={action.wifiSsid || ''}
                                        onChange={(e) =>
                                          handleUpdateHubAction(action.id, { wifiSsid: e.target.value })
                                        }
                                        placeholder="e.g. CopperKettle_Guest"
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[10px] text-neutral-300 font-semibold block">
                                        Password
                                      </label>
                                      <div className="relative">
                                        <input
                                          type={showWifiPass ? 'text' : 'password'}
                                          value={action.wifiPassword || ''}
                                          onChange={(e) =>
                                            handleUpdateHubAction(action.id, { wifiPassword: e.target.value })
                                          }
                                          placeholder="Network Password (leave blank if open)"
                                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-white font-mono"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setShowWifiPass(!showWifiPass)}
                                          className="absolute right-2 top-2 text-neutral-400 hover:text-white"
                                        >
                                          {showWifiPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 3. WHATSAPP ACTION */}
                              {action.type === 'whatsapp' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={action.phone || ''}
                                    onChange={(e) => handleUpdateHubAction(action.id, { phone: e.target.value })}
                                    placeholder="Phone with country code (e.g. +919876543210)"
                                    className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                  />
                                  <input
                                    type="text"
                                    value={action.message || ''}
                                    onChange={(e) => handleUpdateHubAction(action.id, { message: e.target.value })}
                                    placeholder="Prefilled greeting message"
                                    className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                  />
                                </div>
                              )}

                              {/* 4. INSTAGRAM OR FACEBOOK */}
                              {(action.type === 'instagram' || action.type === 'facebook') && (
                                <input
                                  type="text"
                                  value={action.handle || action.destinationUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateHubAction(action.id, { handle: e.target.value, destinationUrl: e.target.value })
                                  }
                                  placeholder={
                                    action.type === 'instagram'
                                      ? 'Instagram username (e.g. @yourbusiness)'
                                      : 'Facebook page handle or URL'
                                  }
                                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                />
                              )}

                              {/* 5. LOCATION / MAPS */}
                              {action.type === 'location' && (
                                <input
                                  type="text"
                                  value={action.address || action.destinationUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateHubAction(action.id, { address: e.target.value, destinationUrl: e.target.value })
                                  }
                                  placeholder="Physical address or Google Maps URL"
                                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                />
                              )}

                              {/* 6. GENERAL URL (Menu, Website, Contact) */}
                              {action.type !== 'google_review' &&
                                action.type !== 'wifi' &&
                                action.type !== 'whatsapp' &&
                                action.type !== 'instagram' &&
                                action.type !== 'facebook' &&
                                action.type !== 'location' && (
                                  <input
                                    type="text"
                                    value={action.destinationUrl || ''}
                                    onChange={(e) =>
                                      handleUpdateHubAction(action.id, { destinationUrl: e.target.value })
                                    }
                                    placeholder="Target destination URL (e.g. https://...)"
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                  />
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add New Action / Link to Smart Hub */}
                    <div className="p-4 rounded-2xl border border-dashed border-indigo-500/30 bg-neutral-950/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-bold text-white">Add New Action or Link to Hub</span>
                        </div>
                        <span className="text-[10px] text-neutral-400">Choose action type</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { type: 'url', label: 'Website Link', icon: Globe, color: 'text-indigo-400', border: 'hover:border-indigo-500/50' },
                          { type: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-400', border: 'hover:border-emerald-500/50' },
                          { type: 'menu', label: 'Digital Menu', icon: Utensils, color: 'text-orange-400', border: 'hover:border-orange-500/50' },
                          { type: 'location', label: 'Google Maps', icon: MapPin, color: 'text-rose-400', border: 'hover:border-rose-500/50' },
                          { type: 'instagram', label: 'Instagram', icon: Share2, color: 'text-pink-400', border: 'hover:border-pink-500/50' },
                          { type: 'facebook', label: 'Facebook', icon: Share2, color: 'text-blue-400', border: 'hover:border-blue-500/50' },
                          { type: 'wifi', label: 'Guest Wi-Fi', icon: Wifi, color: 'text-cyan-400', border: 'hover:border-cyan-500/50' },
                          { type: 'contact', label: 'Contact Card', icon: User, color: 'text-purple-400', border: 'hover:border-purple-500/50' },
                        ].map((btn) => {
                          const IconComp = btn.icon;
                          return (
                            <button
                              key={btn.type}
                              type="button"
                              onClick={() => handleAddHubAction(btn.type as any)}
                              className={`p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 ${btn.border} text-left flex items-center gap-2 transition-all group`}
                            >
                              <IconComp className={`w-4 h-4 ${btn.color} shrink-0`} />
                              <span className="text-[11px] font-semibold text-neutral-300 group-hover:text-white truncate">
                                + {btn.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">
                All changes take effect immediately across all physical and digital scans.
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
