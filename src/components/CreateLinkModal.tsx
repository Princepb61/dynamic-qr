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
} from 'lucide-react';
import { VCardData, WifiData } from '../types';
import { generateVCardString, generateWifiString } from '../utils/vcardHelper';

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
  const [tagsInput, setTagsInput] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isUnassignedReservation, setIsUnassignedReservation] = useState<boolean>(false);

  // Preset 1: URL
  const [urlInput, setUrlInput] = useState('');

  // Preset 2: Google Review
  const [googlePlaceOrUrl, setGooglePlaceOrUrl] = useState('');
  const [enableReviewGatekeeper, setEnableReviewGatekeeper] = useState(true);
  const [businessName, setBusinessName] = useState('');

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
  const [wifiHidden, setWifiHidden] = useState(false);
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  // Preset 7: Contact / vCard
  const [vcardName, setVcardName] = useState('');
  const [vcardPhone, setVcardPhone] = useState('');
  const [vcardEmail, setVcardEmail] = useState('');
  const [vcardOrg, setVcardOrg] = useState('');
  const [vcardTitle, setVcardTitle] = useState('');
  const [vcardWebsite, setVcardWebsite] = useState('');
  const [vcardAddress, setVcardAddress] = useState('');

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

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      previewUrl,
      {
        width: 120,
        margin: 1,
        color: {
          dark: colorDark,
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      () => {}
    );
  }, [isOpen, previewUrl, colorDark]);

  if (!isOpen) return null;

  const generateRandomSlug = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < 6; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    setCustomSlug(s);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let destinationUrl = '';
    let presentationMode: 'instant_redirect' | 'button_page' | 'review_gate' | 'wifi_card' | 'vcard_profile' = 'instant_redirect';
    let vcardData: VCardData | undefined = undefined;
    let wifiData: WifiData | undefined = undefined;
    let reviewGate: any = undefined;

    // Check if user wants unassigned reservation
    if (isUnassignedReservation || contentType === 'unassigned') {
      destinationUrl = '';
    } else {
      switch (contentType) {
        case 'url': {
          let target = urlInput.trim();
          if (target) {
            if (!target.startsWith('http://') && !target.startsWith('https://')) {
              target = 'https://' + target;
            }
            try {
              new URL(target);
            } catch {
              setError('Please enter a valid website address.');
              return;
            }
            destinationUrl = target;
          }
          // If empty and not explicit, allow creating as unassigned
          break;
        }

        case 'google_review': {
          let target = googlePlaceOrUrl.trim();
          if (!target) {
            setError('Please enter a Google Review link or Place ID.');
            return;
          }
          if (target.startsWith('ChIJ')) {
            target = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(target)}`;
          } else if (!target.startsWith('http://') && !target.startsWith('https://')) {
            target = `https://www.google.com/search?q=${encodeURIComponent(target + ' reviews')}`;
          }
          destinationUrl = target;
          if (enableReviewGatekeeper) {
            presentationMode = 'review_gate';
            reviewGate = {
              enabled: true,
              businessName: businessName.trim() || title.trim() || 'Our Business',
              businessCategory: 'Local Business',
              googleReviewUrl: target,
              minRatingForGoogle: 4,
              praiseTags: ['⚡ Fast Service', '😊 Friendly Staff', '✨ Clean & Welcoming', '💎 Great Value'],
            };
          }
          break;
        }

        case 'whatsapp': {
          const cleanPhone = (waCountryCode + waPhone).replace(/[^0-9]/g, '');
          if (!cleanPhone || cleanPhone.length < 7) {
            setError('Please enter a valid WhatsApp phone number.');
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
            return;
          }
          destinationUrl = `https://instagram.com/${handle}`;
          break;
        }

        case 'facebook': {
          const handle = facebookHandle.trim().replace(/^https?:\/\/(www\.)?facebook\.com\//i, '').replace(/\/$/, '');
          if (!handle) {
            setError('Please enter a Facebook profile or page handle.');
            return;
          }
          destinationUrl = `https://facebook.com/${handle}`;
          break;
        }

        case 'wifi': {
          if (!wifiSsid.trim()) {
            setError('Please enter the Wi-Fi Network Name (SSID).');
            return;
          }
          wifiData = {
            ssid: wifiSsid.trim(),
            password: wifiPassword,
            encryption: wifiType,
            hidden: wifiHidden,
          };
          destinationUrl = generateWifiString(wifiData);
          presentationMode = 'wifi_card';
          break;
        }

        case 'vcard': {
          if (!vcardName.trim()) {
            setError('Please enter contact full name.');
            return;
          }
          vcardData = {
            fullName: vcardName.trim(),
            phone: vcardPhone.trim(),
            email: vcardEmail.trim() || undefined,
            organization: vcardOrg.trim() || undefined,
            title: vcardTitle.trim() || undefined,
            website: vcardWebsite.trim() || undefined,
            address: vcardAddress.trim() || undefined,
          };
          const vcf = generateVCardString(vcardData);
          destinationUrl = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcf)}`;
          presentationMode = 'vcard_profile';
          break;
        }
      }
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (!destinationUrl && !tags.includes('Unassigned')) {
      tags.push('Unassigned');
    }

    const defaultTitle = !destinationUrl
      ? (quantity > 1 ? `Reserved QR Stock` : `Unassigned QR (${customSlug.trim() || 'Scan to Claim'})`)
      : contentType === 'whatsapp'
      ? `WhatsApp (${waPhone})`
      : contentType === 'google_review'
      ? `Google Review (${businessName.trim() || 'Store'})`
      : contentType === 'instagram'
      ? `Instagram @${instaHandle.replace(/^@/, '')}`
      : contentType === 'vcard'
      ? `Contact: ${vcardName}`
      : contentType === 'wifi'
      ? `Wi-Fi (${wifiSsid})`
      : `Campaign ${customSlug.trim() || 'Dynamic'}`;

    const finalTitle = title.trim() || defaultTitle;

    try {
      setIsSubmitting(true);
      await onCreate({
        title: finalTitle,
        destinationUrl,
        customSlug: quantity === 1 ? (customSlug.trim() || undefined) : (customSlug.trim() || undefined),
        description: description.trim() || (!destinationUrl ? 'Unassigned QR code waiting to be claimed on scan' : ''),
        tags,
        quantity,
        contentType: contentType === 'unassigned' ? 'url' : contentType,
        presentationMode,
        vcardData,
        wifiData,
        reviewGate,
        qrSettings: {
          colorDark,
          colorLight: '#ffffff',
          errorCorrectionLevel: 'H',
          margin: 2,
          frameStyle,
          frameText: frameStyle !== 'none' ? frameText : undefined,
        },
      });

      // Reset
      setTitle('');
      setUrlInput('');
      setWaPhone('');
      setGooglePlaceOrUrl('');
      setInstaHandle('');
      setFacebookHandle('');
      setVcardName('');
      setWifiSsid('');
      setCustomSlug('');
      setDescription('');
      setTagsInput('');
      setQuantity(1);
      setIsUnassignedReservation(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create link');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-indigo-500" />
              <span>Create Dynamic QR Code</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Create instant destinations, reserve unassigned QRs, or generate in custom batch quantities.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
              { id: 'unassigned', name: 'Blank / Scan Later', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = contentType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setContentType(tab.id as ModalPresetType);
                    if (tab.id === 'unassigned') {
                      setIsUnassignedReservation(true);
                    } else {
                      setIsUnassignedReservation(false);
                    }
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Option: Create without destination URL toggle */}
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl flex items-center justify-between">
            <div className="pr-3">
              <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Create Without Destination URL (Assign Later on Scan)</span>
              </span>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Generate pre-printed QR stickers now. When you scan them later with your phone, choose destination on the spot!
              </p>
            </div>
            <input
              type="checkbox"
              checked={isUnassignedReservation || contentType === 'unassigned'}
              onChange={(e) => {
                setIsUnassignedReservation(e.target.checked);
                if (e.target.checked) setContentType('unassigned');
                else if (contentType === 'unassigned') setContentType('url');
              }}
              className="w-5 h-5 rounded border-neutral-300 dark:border-neutral-700 text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {/* PRESET INPUT FIELDS (Hidden if unassigned reservation is active) */}
          {!isUnassignedReservation && contentType !== 'unassigned' && (
            <>
              {/* Type: URL */}
              {contentType === 'url' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Destination Website URL <span className="text-neutral-400">(optional - leave empty to assign later)</span>
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
                <div className="space-y-3 p-3.5 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Google Review Link or Google Place ID *
                    </label>
                    <input
                      type="text"
                      value={googlePlaceOrUrl}
                      onChange={(e) => setGooglePlaceOrUrl(e.target.value)}
                      placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4 or https://g.page/r/..."
                      required
                      className="w-full px-3.5 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. The Coffee Room"
                      className="w-full px-3.5 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                      Enable AI 5-Star Review Booster & Gatekeeper
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
                    placeholder="e.g. @yourbusiness or taplocal.in"
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
                    placeholder="e.g. taplocalbusiness or profile link"
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

            {/* Custom Quantity Option */}
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

          {quantity > 1 && (
            <div className="p-2.5 bg-neutral-100 dark:bg-neutral-850 rounded-xl text-[11px] text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
              <span className="font-bold text-indigo-500">Custom Batch:</span>
              <span>Will generate {quantity} sequential QR codes ({title || 'Dynamic QR'} #1 through #{quantity}).</span>
            </div>
          )}

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
