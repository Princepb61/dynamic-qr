import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  RefreshCw,
  QrCode,
  Globe,
  MessageSquare,
  Contact,
  Wifi,
  Sparkles,
  Star,
  Layers,
  Plus,
  Minus,
  Check,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { VCardData, WifiData } from '../types';
import { generateVCardString, generateWifiString } from '../utils/vcardHelper';
import { BUSINESS_CATEGORIES, getPraiseTagsForCategory } from '../utils/categoryTags';
import { validateSecureHttpsUrl } from '../utils/urlValidator';
import { normalizeToGoogleReviewUrl } from '../utils/mapsUrlHelper';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    destinationUrl: string;
    customSlug?: string;
    description?: string;
    tags?: string[];
    quantity?: number;
    contentType?: 'url' | 'whatsapp' | 'vcard' | 'wifi' | 'text' | 'button' | 'google_review' | 'instagram' | 'facebook';
    presentationMode?: 'instant_redirect' | 'button_page' | 'review_gate' | 'wifi_card' | 'vcard_profile';
    vcardData?: VCardData;
    wifiData?: WifiData;
    reviewGate?: any;
    standNumber?: string;
    qrSettings?: {
      colorDark?: string;
      colorLight?: string;
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
      margin?: number;
      frameStyle?: 'none' | 'bottom_badge' | 'top_badge' | 'rounded_card';
      frameText?: string;
    };
  }) => Promise<void>;
}

type ModalPresetType =
  | 'url'
  | 'google_review'
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'wifi'
  | 'vcard'
  | 'unassigned';

export const CreateLinkModal: React.FC<CreateLinkModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [contentType, setContentType] = useState<ModalPresetType>('url');
  const [title, setTitle] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isUnassignedReservation, setIsUnassignedReservation] = useState<boolean>(false);
  const [standNumber, setStandNumber] = useState('');

  // Preset 1: URL
  const [urlInput, setUrlInput] = useState('');

  // Preset 2: Google Review
  const [googlePlaceOrUrl, setGooglePlaceOrUrl] = useState('');
  const [isConvertingMapsUrl, setIsConvertingMapsUrl] = useState(false);
  const [mapsConversionStatus, setMapsConversionStatus] = useState<{ isConverted: boolean; message?: string } | null>(null);
  const [enableReviewGatekeeper, setEnableReviewGatekeeper] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('restaurant');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [praiseTags, setPraiseTags] = useState<string[]>(() =>
    BUSINESS_CATEGORIES[0]?.defaultTags ? [...BUSINESS_CATEGORIES[0].defaultTags] : []
  );
  const [newTagInput, setNewTagInput] = useState('');

  const handleGoogleUrlBlurOrPaste = async (inputVal: string) => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    setIsConvertingMapsUrl(true);
    try {
      const res = await normalizeToGoogleReviewUrl(trimmed);
      if (res.isConverted && res.reviewUrl) {
        setGooglePlaceOrUrl(res.reviewUrl);
        setMapsConversionStatus({
          isConverted: true,
          message: res.message || 'Auto-converted to direct Google Rate & Review dialog',
        });
      } else if (res.reviewUrl.includes('search.google.com/local/writereview')) {
        setMapsConversionStatus({
          isConverted: true,
          message: 'Direct 5-Star Review Dialog Ready',
        });
      }
    } catch {
      // Keep input if resolution fails
    } finally {
      setIsConvertingMapsUrl(false);
    }
  };

  // Preset 3: WhatsApp
  const [waCountryCode, setWaCountryCode] = useState('+91');
  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('Hello! I saw your QR code and would like more details.');

  // Preset 4: Instagram
  const [instaHandle, setInstaHandle] = useState('');

  // Preset 5: Facebook
  const [facebookHandle, setFacebookHandle] = useState('');

  // Preset 6: Wi-Fi
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiType, setWifiType] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  // Preset 7: Contact / vCard
  const [vcardName, setVcardName] = useState('');
  const [vcardPhone, setVcardPhone] = useState('');
  const [vcardEmail, setVcardEmail] = useState('');
  const [vcardOrg, setVcardOrg] = useState('');

  // QR Design & Frame
  const [colorDark, setColorDark] = useState('#0f172a');
  const [frameStyle, setFrameStyle] = useState<'none' | 'bottom_badge' | 'top_badge' | 'rounded_card'>('bottom_badge');
  const [frameText, setFrameText] = useState('SCAN ME');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const previewSlug = customSlug.trim() || 'preview-qr';
  const previewUrl = `${baseUrl}/r/${previewSlug}`;

  // Update praise tags when category changes
  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    if (catId === 'custom') {
      setIsCustomCategory(true);
      if (customCategoryName.trim()) {
        setPraiseTags(getPraiseTagsForCategory(customCategoryName));
      } else {
        const cat = BUSINESS_CATEGORIES.find((c) => c.id === 'custom');
        if (cat) setPraiseTags([...cat.defaultTags]);
      }
    } else {
      setIsCustomCategory(false);
      const cat = BUSINESS_CATEGORIES.find((c) => c.id === catId);
      if (cat) {
        setPraiseTags([...cat.defaultTags]);
      }
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !praiseTags.includes(trimmed)) {
      setPraiseTags([...praiseTags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setPraiseTags(praiseTags.filter((t) => t !== tagToRemove));
  };

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (canvasRef.current) {
        QRCode.toCanvas(
          canvasRef.current,
          previewUrl,
          {
            width: 130,
            margin: 2,
            color: {
              dark: colorDark,
              light: '#ffffff',
            },
            errorCorrectionLevel: 'H',
          },
          (err) => {
            if (err) console.error('QR preview canvas error:', err);
          }
        );
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, previewUrl, colorDark]);

  if (!isOpen) return null;

  const generateRandomSlug = () => {
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < 6; i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    setCustomSlug(s);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let destinationUrl = '';
      let presentationMode: 'instant_redirect' | 'button_page' | 'review_gate' | 'wifi_card' | 'vcard_profile' = 'instant_redirect';
      let vcardData: VCardData | undefined = undefined;
      let wifiData: WifiData | undefined = undefined;
      let reviewGate: any = undefined;

      const activeCategory = BUSINESS_CATEGORIES.find((c) => c.id === selectedCategoryId);
      const categoryName = (isCustomCategory || selectedCategoryId === 'custom') && customCategoryName.trim()
        ? customCategoryName.trim()
        : (activeCategory ? activeCategory.name : 'Local Business');

      // If user chose to reserve blank stock QR code
      if (isUnassignedReservation || contentType === 'unassigned') {
        destinationUrl = '';
        presentationMode = 'instant_redirect';
      } else {
        switch (contentType) {
          case 'url': {
            const trimmed = urlInput.trim();
            if (trimmed) {
              const res = validateSecureHttpsUrl(trimmed);
              destinationUrl = res.sanitizedUrl || trimmed;
            } else {
              destinationUrl = '';
            }
            presentationMode = 'instant_redirect';
            break;
          }

          case 'google_review': {
            let target = googlePlaceOrUrl.trim();
            if (!target) {
              setError('Please enter a Google Review link or Place ID.');
              setIsSubmitting(false);
              return;
            }
            try {
              const norm = await normalizeToGoogleReviewUrl(target);
              if (norm.reviewUrl) {
                target = norm.reviewUrl;
              }
            } catch {
              if (target.startsWith('ChIJ')) {
                target = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(target)}`;
              } else if (!target.startsWith('http://') && !target.startsWith('https://')) {
                target = `https://www.google.com/search?q=${encodeURIComponent(target + ' reviews')}`;
              }
            }
            destinationUrl = target;
            if (enableReviewGatekeeper) {
              presentationMode = 'review_gate';
              reviewGate = {
                enabled: true,
                businessName: businessName.trim() || title.trim() || 'Our Business',
                businessCategory: categoryName,
                googleReviewUrl: target,
                minRatingForGoogle: 4,
                praiseTags: praiseTags.length > 0 ? praiseTags : getPraiseTagsForCategory(categoryName),
              };
            }
            break;
          }

          case 'whatsapp': {
            const cleanPhone = (waCountryCode + waPhone).replace(/[^0-9]/g, '');
            if (!cleanPhone || cleanPhone.length < 7) {
              setError('Please enter a valid WhatsApp phone number.');
              setIsSubmitting(false);
              return;
            }
            const msg = encodeURIComponent(waMessage.trim());
            destinationUrl = `https://wa.me/${cleanPhone}${msg ? `?text=${msg}` : ''}`;
            break;
          }

          case 'instagram': {
            const handle = instaHandle.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
            if (!handle) {
              setError('Please enter an Instagram handle.');
              setIsSubmitting(false);
              return;
            }
            destinationUrl = `https://instagram.com/${handle}`;
            break;
          }

          case 'facebook': {
            const handle = facebookHandle.trim().replace(/^https?:\/\/(www\.)?facebook\.com\//i, '').replace(/\/$/, '');
            if (!handle) {
              setError('Please enter a Facebook profile or page handle.');
              setIsSubmitting(false);
              return;
            }
            destinationUrl = `https://facebook.com/${handle}`;
            break;
          }

          case 'wifi': {
            if (!wifiSsid.trim()) {
              setError('Please enter the Wi-Fi Network Name (SSID).');
              setIsSubmitting(false);
              return;
            }
            wifiData = {
              ssid: wifiSsid.trim(),
              password: wifiPassword,
              encryption: wifiType,
            };
            destinationUrl = generateWifiString(wifiData);
            presentationMode = 'wifi_card';
            break;
          }

          case 'vcard': {
            if (!vcardName.trim() || !vcardPhone.trim()) {
              setError('Name and Phone Number are required for contact card.');
              setIsSubmitting(false);
              return;
            }
            vcardData = {
              fullName: vcardName.trim(),
              phone: vcardPhone.trim(),
              email: vcardEmail.trim() || undefined,
              organization: vcardOrg.trim() || undefined,
            };
            destinationUrl = generateVCardString(vcardData);
            presentationMode = 'vcard_profile';
            break;
          }
        }
      }

      let finalTitle = title.trim();
      if (!finalTitle) {
        if (contentType === 'google_review') finalTitle = `${businessName || 'Google'} 5-Star Reviews`;
        else if (contentType === 'whatsapp') finalTitle = 'WhatsApp Support & Ordering';
        else if (contentType === 'instagram') finalTitle = 'Instagram Profile';
        else if (contentType === 'facebook') finalTitle = 'Facebook Community';
        else if (contentType === 'wifi') finalTitle = `Guest Wi-Fi (${wifiSsid || 'Network'})`;
        else if (contentType === 'vcard') finalTitle = `Contact: ${vcardName || 'Business'}`;
        else finalTitle = isUnassignedReservation ? 'Unassigned QR Code' : 'Dynamic QR Link';
      }

      await onCreate({
        title: finalTitle,
        destinationUrl,
        customSlug: customSlug.trim() || undefined,
        description: description.trim() || undefined,
        quantity,
        contentType: isUnassignedReservation ? 'url' : (contentType as any),
        presentationMode,
        vcardData,
        wifiData,
        reviewGate,
        standNumber: standNumber.trim() || undefined,
        qrSettings: {
          colorDark,
          colorLight: '#ffffff',
          errorCorrectionLevel: 'H',
          margin: 2,
          frameStyle,
          frameText: frameStyle !== 'none' ? frameText : undefined,
        },
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create link');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto text-neutral-900 dark:text-neutral-100">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-950 dark:text-white leading-tight">
                Create Dynamic QR Link
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Print once, update destination anytime without changing the QR code
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-800 dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Type Selector Tabs */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-850 shrink-0">
          <label className="block text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
            Choose Destination Type or Preset
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[
              { id: 'url', name: 'Website URL', icon: Globe },
              { id: 'google_review', name: 'Google Review', icon: Star },
              { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare },
              { id: 'instagram', name: 'Instagram', icon: Globe },
              { id: 'facebook', name: 'Facebook', icon: Globe },
              { id: 'wifi', name: 'Wi-Fi Connect', icon: Wifi },
              { id: 'vcard', name: 'VCard Contact', icon: Contact },
              { id: 'unassigned', name: 'Blank / Unassigned', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = contentType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setContentType(tab.id as ModalPresetType);
                    setIsUnassignedReservation(tab.id === 'unassigned');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all border text-left ${
                    isActive
                      ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-900 border-neutral-950 dark:border-white shadow-xs'
                      : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-750'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body Form */}
        <div className="p-5 sm:px-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* PRESET INPUT FIELDS */}
          {!isUnassignedReservation && contentType !== 'unassigned' && (
            <>
              {/* Type: URL */}
              {contentType === 'url' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Destination Website URL <span className="text-neutral-400 font-normal">(optional - leave empty to assign later)</span>
                  </label>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/daily-menu"
                    className="w-full px-3.5 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Type: Google Review */}
              {contentType === 'google_review' && (
                <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                  {/* Category Selection Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                      Business Category *
                    </label>
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
                    >
                      {BUSINESS_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                      Loads industry-specific highlights (salon, clinic, auto repair, cafe, etc.) for authentic customer reviews.
                    </p>

                    {(isCustomCategory || selectedCategoryId === 'custom') && (
                      <div className="mt-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 animate-in fade-in">
                        <label className="block text-xs font-bold text-amber-800 dark:text-amber-300">
                          Type Custom Business Category *
                        </label>
                        <input
                          type="text"
                          value={customCategoryName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomCategoryName(val);
                            if (val.trim()) {
                              setPraiseTags(getPraiseTagsForCategory(val));
                            }
                          }}
                          placeholder="e.g. Pet Grooming, Dance Academy, Tattoo Studio, Yoga..."
                          required
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-amber-500/40 rounded-lg text-neutral-900 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                          AI reviews will be tailored specifically around this business type.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Google Maps Review Link or Place ID *
                      </label>
                      <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Auto-Converts to 5-Star Dialog</span>
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={googlePlaceOrUrl}
                        onChange={(e) => {
                          setGooglePlaceOrUrl(e.target.value);
                          setMapsConversionStatus(null);
                        }}
                        onBlur={(e) => handleGoogleUrlBlurOrPaste(e.target.value)}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData('text');
                          if (pasted) {
                            setTimeout(() => handleGoogleUrlBlurOrPaste(pasted), 10);
                          }
                        }}
                        placeholder="Paste any link: maps.app.goo.gl/... or google.com/maps or Place ID (ChIJ...)"
                        required
                        className="w-full px-3.5 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                      {isConvertingMapsUrl && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Live Conversion Status Banner */}
                    {isConvertingMapsUrl && (
                      <p className="text-[11px] text-amber-500 flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Resolving Google Maps link and converting to direct 5-star review page...</span>
                      </p>
                    )}

                    {mapsConversionStatus && (
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 animate-in fade-in">
                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                        <span>{mapsConversionStatus.message}</span>
                      </div>
                    )}

                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Supports short links (maps.app.goo.gl), desktop place URLs, Place IDs, and CIDs. Customers will be taken directly into Google's 5-star review dialog.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Glamour Hair Studio, City Dental Clinic..."
                      className="w-full px-3.5 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* CUSTOM TAGS MANAGEMENT */}
                  <div className="space-y-2 pt-1 border-t border-neutral-200 dark:border-neutral-750">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-500" />
                        <span>Praise Tags &amp; Highlights for Reviews</span>
                      </label>
                      <span className="text-[10px] text-neutral-500">
                        {praiseTags.length} tags configured
                      </span>
                    </div>

                    {/* Active tags pills with removal */}
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-white dark:bg-neutral-800/80 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      {praiseTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-amber-600 dark:text-amber-400 hover:text-red-500 text-xs font-black p-0.5"
                            title="Remove tag"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Add Custom Tag Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomTag();
                          }
                        }}
                        placeholder="Add custom tag (e.g. Painless Root Canal, Great Mocktails)..."
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomTag}
                        className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 text-neutral-950 rounded-xl hover:bg-amber-400 transition-colors shadow-2xs"
                      >
                        + Add Tag
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                      Enable 5-Star Booster Gatekeeper Page
                    </span>
                    <input
                      type="checkbox"
                      checked={enableReviewGatekeeper}
                      onChange={(e) => setEnableReviewGatekeeper(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Type: WhatsApp */}
              {contentType === 'whatsapp' && (
                <div className="space-y-3 p-3.5 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Code</label>
                      <input
                        type="text"
                        value={waCountryCode}
                        onChange={(e) => setWaCountryCode(e.target.value)}
                        placeholder="+91"
                        className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={waPhone}
                        onChange={(e) => setWaPhone(e.target.value)}
                        placeholder="9876543210"
                        required
                        className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Welcome Message
                    </label>
                    <input
                      type="text"
                      value={waMessage}
                      onChange={(e) => setWaMessage(e.target.value)}
                      placeholder="Hi! I want to order."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Type: Instagram */}
              {contentType === 'instagram' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Instagram Handle or Link *
                  </label>
                  <input
                    type="text"
                    value={instaHandle}
                    onChange={(e) => setInstaHandle(e.target.value)}
                    placeholder="e.g. @yourbusiness or instagram.com/brand"
                    required
                    className="w-full px-3.5 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                  />
                </div>
              )}

              {/* Type: Facebook */}
              {contentType === 'facebook' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Facebook Page or Profile *
                  </label>
                  <input
                    type="text"
                    value={facebookHandle}
                    onChange={(e) => setFacebookHandle(e.target.value)}
                    placeholder="e.g. brandpage or facebook.com/page"
                    required
                    className="w-full px-3.5 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                  />
                </div>
              )}

              {/* Type: Wi-Fi */}
              {contentType === 'wifi' && (
                <div className="space-y-3 p-3.5 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Wi-Fi Network Name (SSID) *
                    </label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="MyStore_Guest"
                      required
                      className="w-full px-3.5 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Security</label>
                      <select
                        value={wifiType}
                        onChange={(e: any) => setWifiType(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                      >
                        <option value="WPA">WPA/WPA2/WPA3</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">None (Open)</option>
                      </select>
                    </div>
                    {wifiType !== 'nopass' && (
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Password</label>
                        <div className="relative">
                          <input
                            type={showWifiPassword ? 'text' : 'password'}
                            value={wifiPassword}
                            onChange={(e) => setWifiPassword(e.target.value)}
                            placeholder="Network Password"
                            className="w-full pl-3 pr-8 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowWifiPassword(!showWifiPassword)}
                            className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600"
                          >
                            {showWifiPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Type: VCard */}
              {contentType === 'vcard' && (
                <div className="space-y-3 p-3.5 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={vcardName}
                        onChange={(e) => setVcardName(e.target.value)}
                        placeholder="Alex Sharma"
                        required
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        value={vcardPhone}
                        onChange={(e) => setVcardPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        required
                        className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={vcardEmail}
                        onChange={(e) => setVcardEmail(e.target.value)}
                        placeholder="alex@company.com"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Company / Organization</label>
                      <input
                        type="text"
                        value={vcardOrg}
                        onChange={(e) => setVcardOrg(e.target.value)}
                        placeholder="Acme Retail"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* QUANTITY CONTROL & TITLE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Campaign Title / Label
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Table Standees, Counter Stickers"
                className="w-full px-3.5 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Quantity
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="250"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(250, parseInt(e.target.value, 10) || 1)))}
                  className="w-full text-center px-2 py-2 text-xs font-mono font-bold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(250, q + 1))}
                  className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Custom Slug (Only if quantity is 1) */}
          {quantity === 1 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Custom Short Slug (Optional)
                </label>
                <button
                  type="button"
                  onClick={generateRandomSlug}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Random</span>
                </button>
              </div>
              <div className="flex items-center">
                <span className="px-3 py-2 text-xs font-mono bg-neutral-100 dark:bg-neutral-800 border border-r-0 border-neutral-300 dark:border-neutral-700 rounded-l-xl text-neutral-500">
                  /r/
                </span>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="custom-name"
                  className="flex-1 px-3.5 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-r-xl text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Stand / Location label */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Table / Stand Number (Optional)
            </label>
            <input
              type="text"
              value={standNumber}
              onChange={(e) => setStandNumber(e.target.value)}
              placeholder="e.g. Table 04, Front Desk, Salon Chair 2"
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Quick Preview & Frame Selector */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-4">
            <div className="p-2 bg-white rounded-xl border border-neutral-200 shadow-sm shrink-0">
              <canvas ref={canvasRef} />
            </div>
            <div className="space-y-2 flex-1">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                QR Frame Badge
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'bottom_badge', label: 'Bottom Badge' },
                  { id: 'top_badge', label: 'Top Badge' },
                  { id: 'rounded_card', label: 'Card Frame' },
                  { id: 'none', label: 'No Frame' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrameStyle(f.id as any)}
                    className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold border text-left truncate transition-colors ${
                      frameStyle === f.id
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-neutral-950 dark:bg-indigo-600 hover:bg-neutral-800 dark:hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>
              {isSubmitting
                ? 'Creating...'
                : quantity > 1
                ? `Create ${quantity} Dynamic QRs`
                : isUnassignedReservation
                ? 'Reserve Unassigned QR'
                : 'Create Dynamic Link'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
