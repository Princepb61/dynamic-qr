import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { localDb } from '../services/localDb';
import { api } from '../services/api';
import { firestoreDb } from '../services/firestoreDb';
import { LinkRecord, VCardData, WifiData } from '../types';
import {
  ExternalLink,
  Clock,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
  Copy,
  Check,
  Star,
  MessageSquare,
  Wifi,
  Contact,
  Globe,
  Phone,
  Mail,
  MapPin,
  Download,
  Eye,
  EyeOff,
  User,
  Share2,
} from 'lucide-react';
import { getLast4Letters } from '../utils/a4QrHelper';
import { downloadVCard, generateWifiString, generateVCardString } from '../utils/vcardHelper';
import { ReviewGatekeeperView } from './ReviewGatekeeperView';

interface ClientRedirectHandlerProps {
  slug: string;
}

type PresetType = 'google_review' | 'whatsapp' | 'instagram' | 'facebook' | 'wifi' | 'vcard' | 'url';

export const ClientRedirectHandler: React.FC<ClientRedirectHandlerProps> = ({ slug }) => {
  const cleanSlug = slug.trim().toLowerCase().replace(/^\/r\//, '').replace(/^\//, '');
  const [link, setLink] = useState<LinkRecord | undefined>(undefined);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [rawWifiQrUrl, setRawWifiQrUrl] = useState<string>('');
  const [showWifiCameraQr, setShowWifiCameraQr] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWifiPass, setCopiedWifiPass] = useState(false);
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  // Scan-to-Assign Authentication & Assignment State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('dynamicqr_user'));
    } catch {
      return false;
    }
  });

  const [authEmail, setAuthEmail] = useState('p0667500@gmail.com');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Preset Selection State
  const [activePreset, setActivePreset] = useState<PresetType>('google_review');

  // Preset 1: Google Review
  const [googlePlaceIdOrUrl, setGooglePlaceIdOrUrl] = useState('');
  const [enableReviewGatekeeper, setEnableReviewGatekeeper] = useState(true);
  const [businessName, setBusinessName] = useState('');

  // Preset 2: WhatsApp
  const [waCountryCode, setWaCountryCode] = useState('+91');
  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('Hello! I scanned your QR code and would like more details.');

  // Preset 3: Instagram
  const [instaHandle, setInstaHandle] = useState('');

  // Preset 4: Facebook
  const [facebookHandle, setFacebookHandle] = useState('');

  // Preset 5: WiFi
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiEncryption, setWifiEncryption] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [wifiHidden, setWifiHidden] = useState(false);

  // Preset 6: Contact Details (vCard)
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactOrg, setContactOrg] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [contactWebsite, setContactWebsite] = useState('');
  const [contactAddress, setContactAddress] = useState('');

  // Preset 7: Custom Website URL
  const [customUrl, setCustomUrl] = useState('');

  // Shared Assignment Settings
  const [assignTitle, setAssignTitle] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  const fullRedirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/r/${cleanSlug}`
    : `/r/${cleanSlug}`;

  // Generate QR code data URL for preview
  useEffect(() => {
    QRCode.toDataURL(fullRedirectUrl, {
      margin: 2,
      width: 220,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [fullRedirectUrl]);

  // Record pending slug in sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('pending_assign_slug', cleanSlug);
    } catch {}
  }, [cleanSlug]);

  useEffect(() => {
    let active = true;

    async function resolveSlug() {
      // 1. Check Cloud Firestore FIRST
      let found: LinkRecord | undefined = undefined;
      try {
        const cloudFound = await firestoreDb.getLinkBySlug(cleanSlug);
        if (cloudFound) {
          found = cloudFound;
        }
      } catch (err) {
        console.warn('Firestore lookup error:', err);
      }

      // 2. Check local database cache
      const localFound = localDb.getLinkBySlug(cleanSlug);
      if (localFound) {
        if (!found) {
          found = localFound;
        } else if (localFound.destinationUrl && !found.destinationUrl) {
          found = { ...found, ...localFound, isAssigned: true };
          firestoreDb.assignBatchLink(cleanSlug, {
            destinationUrl: localFound.destinationUrl,
            title: localFound.title,
          }).catch(() => {});
        }
      }

      // 3. Try fetching full links roster if needed
      if (!found || !found.destinationUrl) {
        try {
          const remote = await api.getLinks();
          const remoteFound = remote.links.find(
            (l) => l.slug.toLowerCase() === cleanSlug || l.id === cleanSlug
          );
          if (remoteFound && (remoteFound.destinationUrl || !found)) {
            found = remoteFound;
          }
        } catch {}
      }

      if (!active) return;

      // 4. PUBLIC PERMANENT REDIRECT / PRESENTATION:
      if (found && (found.destinationUrl || found.vcardData || found.wifiData) && found.isAssigned !== false) {
        setLink(found);

        // Generate raw WiFi QR if this is a WiFi link
        if (found.contentType === 'wifi' || found.wifiData) {
          const wifiPayload = found.wifiData
            ? generateWifiString(found.wifiData)
            : found.destinationUrl;
          QRCode.toDataURL(wifiPayload, {
            margin: 2,
            width: 240,
            errorCorrectionLevel: 'M',
          })
            .then(setRawWifiQrUrl)
            .catch(() => {});
        }

        if (found.isActive) {
          // If interactive presentation mode (WiFi, vCard, Review Gate, Button), stay on page!
          const isInteractive =
            found.presentationMode === 'wifi_card' ||
            found.presentationMode === 'vcard_profile' ||
            found.presentationMode === 'review_gate' ||
            found.presentationMode === 'button_page' ||
            found.contentType === 'wifi' ||
            found.contentType === 'vcard' ||
            Boolean(found.reviewGate?.enabled);

          if (!isInteractive && found.destinationUrl) {
            setIsRedirecting(true);
            firestoreDb.simulateScan(found.id, 'mobile').catch(() => {});
            localDb.simulateScan(found.id, 'mobile');
            // Instant redirect!
            window.location.replace(found.destinationUrl);
            return;
          }
        }
        return;
      }

      // 5. If unassigned pre-printed QR code:
      const resolvedLink: LinkRecord = found || {
        id: `link_${cleanSlug}`,
        slug: cleanSlug,
        title: `Pre-Printed QR #${getLast4Letters(cleanSlug)}`,
        destinationUrl: '',
        isActive: true,
        isAssigned: false,
        totalClicks: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['Pre-Printed', 'Scanned'],
      };

      setLink(resolvedLink);
      setAssignTitle(resolvedLink.title || `QR Code #${getLast4Letters(cleanSlug)}`);
    }

    resolveSlug();
    return () => {
      active = false;
    };
  }, [cleanSlug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullRedirectUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      setIsAuthenticating(true);
      const res = await api.login({
        email: authEmail.trim(),
        password: authPassword,
      });
      localStorage.setItem('dynamicqr_user', JSON.stringify(res.user));
      localStorage.setItem('dynamicqr_token', res.token);
      setIsAdminLoggedIn(true);
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify administrator credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Compute Destination Target & Preset Metadata
  const buildPresetPayload = (): {
    destinationUrl: string;
    contentType: LinkRecord['contentType'];
    presentationMode: LinkRecord['presentationMode'];
    vcardData?: VCardData;
    wifiData?: WifiData;
    reviewGate?: any;
    title: string;
  } => {
    switch (activePreset) {
      case 'google_review': {
        const input = googlePlaceIdOrUrl.trim();
        let target = input;
        if (!target) {
          throw new Error('Please enter a Google Review link or Place ID.');
        }
        if (target.startsWith('ChIJ')) {
          target = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(target)}`;
        } else if (!target.startsWith('http://') && !target.startsWith('https://')) {
          target = `https://www.google.com/search?q=${encodeURIComponent(target + ' reviews')}`;
        }

        const bName = businessName.trim() || assignTitle.trim() || 'Our Business';
        return {
          destinationUrl: target,
          contentType: 'google_review',
          presentationMode: enableReviewGatekeeper ? 'review_gate' : 'instant_redirect',
          reviewGate: enableReviewGatekeeper
            ? {
                enabled: true,
                businessName: bName,
                businessCategory: 'Local Business',
                googleReviewUrl: target,
                minRatingForGoogle: 4,
                praiseTags: ['⚡ Fast Service', '😊 Friendly Staff', '✨ Clean & Welcoming', '💎 Great Value'],
              }
            : undefined,
          title: assignTitle.trim() || `Google Review - ${bName}`,
        };
      }

      case 'whatsapp': {
        const cleanDigits = (waCountryCode + waPhone).replace(/[^0-9]/g, '');
        if (!cleanDigits || cleanDigits.length < 7) {
          throw new Error('Please enter a valid WhatsApp phone number.');
        }
        const textParam = waMessage.trim() ? `?text=${encodeURIComponent(waMessage.trim())}` : '';
        const target = `https://wa.me/${cleanDigits}${textParam}`;
        return {
          destinationUrl: target,
          contentType: 'whatsapp',
          presentationMode: 'instant_redirect',
          title: assignTitle.trim() || `WhatsApp (${waPhone})`,
        };
      }

      case 'instagram': {
        const handle = instaHandle.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
        if (!handle) {
          throw new Error('Please enter an Instagram handle or profile link.');
        }
        const target = `https://instagram.com/${handle}`;
        return {
          destinationUrl: target,
          contentType: 'instagram',
          presentationMode: 'instant_redirect',
          title: assignTitle.trim() || `Instagram @${handle}`,
        };
      }

      case 'facebook': {
        const handle = facebookHandle.trim().replace(/^https?:\/\/(www\.)?facebook\.com\//i, '').replace(/\/$/, '');
        if (!handle) {
          throw new Error('Please enter a Facebook profile or page name.');
        }
        const target = `https://facebook.com/${handle}`;
        return {
          destinationUrl: target,
          contentType: 'facebook',
          presentationMode: 'instant_redirect',
          title: assignTitle.trim() || `Facebook /${handle}`,
        };
      }

      case 'wifi': {
        if (!wifiSsid.trim()) {
          throw new Error('Please enter the Wi-Fi Network Name (SSID).');
        }
        const wifiData: WifiData = {
          ssid: wifiSsid.trim(),
          password: wifiPassword,
          encryption: wifiEncryption,
          hidden: wifiHidden,
        };
        const rawWifiString = generateWifiString(wifiData);
        return {
          destinationUrl: rawWifiString,
          contentType: 'wifi',
          presentationMode: 'wifi_card',
          wifiData,
          title: assignTitle.trim() || `Wi-Fi (${wifiSsid.trim()})`,
        };
      }

      case 'vcard': {
        if (!contactName.trim()) {
          throw new Error('Contact full name is required.');
        }
        if (!contactPhone.trim() && !contactEmail.trim()) {
          throw new Error('Please provide at least a phone number or email.');
        }
        const vcardData: VCardData = {
          fullName: contactName.trim(),
          phone: contactPhone.trim(),
          email: contactEmail.trim() || undefined,
          organization: contactOrg.trim() || undefined,
          title: contactTitle.trim() || undefined,
          website: contactWebsite.trim() || undefined,
          address: contactAddress.trim() || undefined,
        };
        const vcfString = generateVCardString(vcardData);
        return {
          destinationUrl: `data:text/vcard;charset=utf-8,${encodeURIComponent(vcfString)}`,
          contentType: 'vcard',
          presentationMode: 'vcard_profile',
          vcardData,
          title: assignTitle.trim() || `Contact: ${contactName.trim()}`,
        };
      }

      case 'url':
      default: {
        let target = customUrl.trim();
        if (!target) {
          throw new Error('Please enter a destination website URL.');
        }
        if (!target.startsWith('http://') && !target.startsWith('https://')) {
          target = 'https://' + target;
        }
        new URL(target);
        return {
          destinationUrl: target,
          contentType: 'url',
          presentationMode: 'instant_redirect',
          title: assignTitle.trim() || `Website (${cleanSlug})`,
        };
      }
    }
  };

  const handleSaveAndRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;
    setAssignError(null);

    let payload: ReturnType<typeof buildPresetPayload>;
    try {
      payload = buildPresetPayload();
    } catch (err: any) {
      setAssignError(err.message || 'Please check the form inputs.');
      return;
    }

    try {
      setIsAssigning(true);

      const assigned = await api.assignBatchLink(link.slug, {
        destinationUrl: payload.destinationUrl,
        title: payload.title,
        contentType: payload.contentType,
        presentationMode: payload.presentationMode,
        vcardData: payload.vcardData,
        wifiData: payload.wifiData,
        reviewGate: payload.reviewGate,
      });

      // Clear pending slug
      try {
        sessionStorage.removeItem('pending_assign_slug');
      } catch {}

      setAssignSuccess(`QR code /r/${link.slug} is now live and activated!`);
      setLink(assigned.link);

      // If interactive card (WiFi or vCard), stay on screen to show preview!
      if (payload.presentationMode === 'wifi_card' || payload.presentationMode === 'vcard_profile') {
        setIsAssigning(false);
        return;
      }

      // If instant redirect, proceed in 1.2s
      setTimeout(() => {
        window.location.replace(payload.destinationUrl);
      }, 1200);
    } catch (err: any) {
      setAssignError(err.message || 'Failed to activate QR code destination.');
      setIsAssigning(false);
    }
  };

  // 1. Loading State
  if (!link) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-neutral-300">Checking dynamic link...</p>
        </div>
      </div>
    );
  }

  // 2. Link Is Paused
  if (link.destinationUrl && !link.isActive) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-amber-950/60 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-2">Link Temporarily Inactive</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mb-6">
            This QR code link has been temporarily paused by its administrator. Please check back later.
          </p>
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="w-full bg-white text-neutral-900 font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm hover:bg-neutral-100 transition-colors shadow-xs"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 3. UNASSIGNED QR CODE: Dedicated On-Screen Scan-to-Assign Workflow with 7 Presets!
  if (!link.destinationUrl || link.isAssigned === false) {
    const batchCode = getLast4Letters(link.slug);

    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-3 sm:p-6 font-sans">
        <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
          {/* Top Identifier & QR Preview */}
          <div className="text-center space-y-3">
            {qrDataUrl && (
              <div className="inline-block p-2 bg-white rounded-2xl shadow-md border border-neutral-700">
                <img src={qrDataUrl} alt="QR Code" className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
              </div>
            )}

            <div className="text-center">
              <span className="text-base font-mono font-black text-white tracking-widest block">
                {batchCode}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl transition-all shadow-xs active:scale-[0.98]"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
              <span>{copiedLink ? 'Copied Link!' : 'Copy Permanent Link'}</span>
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-amber-950/60 text-amber-300 rounded-md border border-amber-800/60 mb-1">
                <span>Unassigned Dynamic QR</span>
                <span>&bull;</span>
                <span>/r/{link.slug}</span>
              </div>
              <h1 className="text-xl font-black text-white tracking-tight">{link.title}</h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Physical QR code scanned. Choose what happens when customers scan this QR!
              </p>
            </div>
          </div>

          {/* STEP A: If NOT logged in, prompt for admin password right on this screen */}
          {!isAdminLoggedIn ? (
            <div className="space-y-4 pt-3 border-t border-neutral-800">
              <div className="p-3.5 bg-neutral-800/80 rounded-2xl border border-neutral-700/80 text-xs text-neutral-300 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p>Sign in with your administrator ID and password to link this QR code on the spot.</p>
              </div>

              {authError && (
                <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-xs font-medium">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAdminAuth} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Admin Email</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="p0667500@gmail.com"
                    required
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full min-h-[44px] py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isAuthenticating ? 'Verifying...' : 'Unlock & Choose Destination Preset'}</span>
                </button>
              </form>
            </div>
          ) : (
            /* STEP B: Once logged in, show the 7 Preset Options! */
            <div className="space-y-5 pt-3 border-t border-neutral-800">
              <div className="p-3 bg-emerald-950/40 border border-emerald-900 rounded-2xl text-xs text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Admin verified. Select a destination preset below:</span>
                </div>
              </div>

              {/* 7 Preset Selector Tabs Grid */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Select Action Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Preset 1: Google Review */}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreset('google_review');
                      if (!assignTitle || assignTitle.includes('QR Code')) setAssignTitle('Google 5-Star Reviews');
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      activePreset === 'google_review'
                        ? 'bg-amber-500/10 border-amber-500/60 text-amber-300 shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <Star className="w-5 h-5 text-amber-400 mb-1" />
                    <div>
                      <span className="font-bold text-xs block text-white">Google Review</span>
                      <span className="text-[10px] text-neutral-400">AI 5-Star Booster</span>
                    </div>
                  </button>

                  {/* Preset 2: WhatsApp */}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreset('whatsapp');
                      if (!assignTitle || assignTitle.includes('QR Code')) setAssignTitle('WhatsApp Ordering & Chat');
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      activePreset === 'whatsapp'
                        ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-300 shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 text-emerald-400 mb-1" />
                    <div>
                      <span className="font-bold text-xs block text-white">WhatsApp</span>
                      <span className="text-[10px] text-neutral-400">Direct Chat & Order</span>
                    </div>
                  </button>

                  {/* Preset 3: Instagram */}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreset('instagram');
                      if (!assignTitle || assignTitle.includes('QR Code')) setAssignTitle('Instagram Profile');
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      activePreset === 'instagram'
                        ? 'bg-pink-500/10 border-pink-500/60 text-pink-300 shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <svg className="w-5 h-5 text-pink-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                    </svg>
                    <div>
                      <span className="font-bold text-xs block text-white">Instagram</span>
                      <span className="text-[10px] text-neutral-400">Follow & Stories</span>
                    </div>
                  </button>

                  {/* Preset 4: Facebook */}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreset('facebook');
                      if (!assignTitle || assignTitle.includes('QR Code')) setAssignTitle('Facebook Page');
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      activePreset === 'facebook'
                        ? 'bg-blue-500/10 border-blue-500/60 text-blue-300 shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <svg className="w-5 h-5 text-blue-400 mb-1" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                    </svg>
                    <div>
                      <span className="font-bold text-xs block text-white">Facebook</span>
                      <span className="text-[10px] text-neutral-400">Page or Profile</span>
                    </div>
                  </button>

                  {/* Preset 5: Wi-Fi */}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreset('wifi');
                      if (!assignTitle || assignTitle.includes('QR Code')) setAssignTitle('Guest Wi-Fi Network');
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      activePreset === 'wifi'
                        ? 'bg-cyan-500/10 border-cyan-500/60 text-cyan-300 shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <Wifi className="w-5 h-5 text-cyan-400 mb-1" />
                    <div>
                      <span className="font-bold text-xs block text-white">Wi-Fi Connect</span>
                      <span className="text-[10px] text-neutral-400">Instant Access Card</span>
                    </div>
                  </button>

                  {/* Preset 6: Contact / vCard */}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreset('vcard');
                      if (!assignTitle || assignTitle.includes('QR Code')) setAssignTitle('Digital Business Card');
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      activePreset === 'vcard'
                        ? 'bg-purple-500/10 border-purple-500/60 text-purple-300 shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <Contact className="w-5 h-5 text-purple-400 mb-1" />
                    <div>
                      <span className="font-bold text-xs block text-white">Contact (vCard)</span>
                      <span className="text-[10px] text-neutral-400">Save to Phone</span>
                    </div>
                  </button>

                  {/* Preset 7: Custom Website URL */}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreset('url');
                      if (!assignTitle || assignTitle.includes('QR Code')) setAssignTitle('Website Link');
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between col-span-2 transition-all ${
                      activePreset === 'url'
                        ? 'bg-indigo-500/10 border-indigo-500/60 text-indigo-300 shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <Globe className="w-5 h-5 text-indigo-400 mb-1" />
                    <div>
                      <span className="font-bold text-xs block text-white">Custom Web URL</span>
                      <span className="text-[10px] text-neutral-400">Direct Online Menu, Store, or App</span>
                    </div>
                  </button>
                </div>
              </div>

              {assignError && (
                <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-xs font-medium">
                  {assignError}
                </div>
              )}

              {assignSuccess && (
                <div className="p-3.5 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{assignSuccess}</span>
                </div>
              )}

              {/* Dynamic Preset Forms */}
              <form onSubmit={handleSaveAndRedirect} className="space-y-4">
                {/* 1. GOOGLE REVIEW FORM */}
                {activePreset === 'google_review' && (
                  <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-2xl space-y-3.5">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                      <Star className="w-4 h-4" />
                      <span>Google Review Destination</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Google Review Link or Google Place ID <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={googlePlaceIdOrUrl}
                        onChange={(e) => setGooglePlaceIdOrUrl(e.target.value)}
                        placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4 or https://g.page/r/..."
                        required
                        className="w-full px-3.5 py-2.5 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Paste your direct Google Maps review URL, or place ID (starts with ChIJ...).
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Business Name (for AI Drafts)
                      </label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Royal Bakes & Cafe"
                        className="w-full px-3.5 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="p-3 bg-neutral-900/90 border border-amber-500/30 rounded-xl flex items-center justify-between">
                      <div className="pr-3">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>AI 5-Star Review Booster & Gatekeeper</span>
                        </span>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          Directs 4-5 stars to Gemini AI review writer; captures 1-3 stars privately to management.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableReviewGatekeeper}
                        onChange={(e) => setEnableReviewGatekeeper(e.target.checked)}
                        className="w-5 h-5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900"
                      />
                    </div>
                  </div>
                )}

                {/* 2. WHATSAPP FORM */}
                {activePreset === 'whatsapp' && (
                  <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-2xl space-y-3.5">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp Profile / Direct Chat</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">Code</label>
                        <input
                          type="text"
                          value={waCountryCode}
                          onChange={(e) => setWaCountryCode(e.target.value)}
                          placeholder="+91"
                          required
                          className="w-full px-3 py-2.5 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Phone Number <span className="text-emerald-400">*</span>
                        </label>
                        <input
                          type="tel"
                          value={waPhone}
                          onChange={(e) => setWaPhone(e.target.value)}
                          placeholder="9876543210"
                          required
                          className="w-full px-3.5 py-2.5 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Prefilled Greeting Message (Optional)
                      </label>
                      <input
                        type="text"
                        value={waMessage}
                        onChange={(e) => setWaMessage(e.target.value)}
                        placeholder="Hello! I would like to place an order."
                        className="w-full px-3.5 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {waPhone && (
                      <div className="p-2.5 bg-neutral-900 rounded-xl text-[11px] font-mono text-emerald-400 truncate border border-neutral-800">
                        Target: https://wa.me/{(waCountryCode + waPhone).replace(/[^0-9]/g, '')}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. INSTAGRAM FORM */}
                {activePreset === 'instagram' && (
                  <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-2xl space-y-3.5">
                    <div className="flex items-center gap-2 text-pink-400 text-xs font-bold">
                      <Share2 className="w-4 h-4" />
                      <span>Instagram Profile Link</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Instagram Username or URL <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-xs text-neutral-500 font-mono">@</span>
                        <input
                          type="text"
                          value={instaHandle}
                          onChange={(e) => setInstaHandle(e.target.value)}
                          placeholder="yourbusiness"
                          required
                          className="w-full pl-8 pr-3.5 py-2.5 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Enter your handle (e.g. @taplocal.in) or full profile link.
                      </p>
                    </div>

                    {instaHandle && (
                      <div className="p-2.5 bg-neutral-900 rounded-xl text-[11px] font-mono text-pink-400 truncate border border-neutral-800">
                        Target: https://instagram.com/{instaHandle.replace(/^@/, '')}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. FACEBOOK FORM */}
                {activePreset === 'facebook' && (
                  <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-2xl space-y-3.5">
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                      <Share2 className="w-4 h-4" />
                      <span>Facebook Profile or Page</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Facebook Handle, Page Name, or URL <span className="text-blue-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={facebookHandle}
                        onChange={(e) => setFacebookHandle(e.target.value)}
                        placeholder="e.g. taplocalbusiness or https://facebook.com/..."
                        required
                        className="w-full px-3.5 py-2.5 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {facebookHandle && (
                      <div className="p-2.5 bg-neutral-900 rounded-xl text-[11px] font-mono text-blue-400 truncate border border-neutral-800">
                        Target: https://facebook.com/{facebookHandle.replace(/^https?:\/\/(www\.)?facebook\.com\//i, '')}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. WI-FI NETWORK FORM */}
                {activePreset === 'wifi' && (
                  <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-2xl space-y-3.5">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                      <Wifi className="w-4 h-4" />
                      <span>Guest Wi-Fi Network Preset</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Network Name (SSID) <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        placeholder="e.g. TapLocal_Guest_WiFi"
                        required
                        className="w-full px-3.5 py-2.5 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">Security</label>
                        <select
                          value={wifiEncryption}
                          onChange={(e: any) => setWifiEncryption(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="WPA">WPA / WPA2 / WPA3 (Standard)</option>
                          <option value="WEP">WEP (Legacy)</option>
                          <option value="nopass">None (Open Network)</option>
                        </select>
                      </div>

                      {wifiEncryption !== 'nopass' && (
                        <div>
                          <label className="block text-xs font-semibold text-neutral-300 mb-1">Password</label>
                          <div className="relative">
                            <input
                              type={showWifiPassword ? 'text' : 'password'}
                              value={wifiPassword}
                              onChange={(e) => setWifiPassword(e.target.value)}
                              placeholder="Network Password"
                              className="w-full pl-3 pr-8 py-2 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowWifiPassword(!showWifiPassword)}
                              className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-white"
                            >
                              {showWifiPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="wifiHiddenCheck"
                        checked={wifiHidden}
                        onChange={(e) => setWifiHidden(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-700 text-cyan-500"
                      />
                      <label htmlFor="wifiHiddenCheck" className="text-xs text-neutral-300">
                        Hidden Network (SSID is hidden)
                      </label>
                    </div>

                    <p className="text-[11px] text-neutral-400">
                      When customers scan, TapLocal presents an instant WiFi Connect Card with 1-tap "Copy Password" and camera join QR.
                    </p>
                  </div>
                )}

                {/* 6. CONTACT DETAILS / VCARD FORM */}
                {activePreset === 'vcard' && (
                  <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-2xl space-y-3.5">
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                      <Contact className="w-4 h-4" />
                      <span>Digital Business Card (vCard)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Full Name <span className="text-purple-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="e.g. Alex Sharma"
                          required
                          className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Phone Number <span className="text-purple-400">*</span>
                        </label>
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          required
                          className="w-full px-3 py-2 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">Email</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="alex@company.com"
                          className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">Company / Org</label>
                        <input
                          type="text"
                          value={contactOrg}
                          onChange={(e) => setContactOrg(e.target.value)}
                          placeholder="Acme Retail"
                          className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">Job Title</label>
                        <input
                          type="text"
                          value={contactTitle}
                          onChange={(e) => setContactTitle(e.target.value)}
                          placeholder="Managing Director"
                          className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">Website</label>
                        <input
                          type="text"
                          value={contactWebsite}
                          onChange={(e) => setContactWebsite(e.target.value)}
                          placeholder="https://company.com"
                          className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Address / Store Location</label>
                      <input
                        type="text"
                        value={contactAddress}
                        onChange={(e) => setContactAddress(e.target.value)}
                        placeholder="124 Main Street, Bengaluru"
                        className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* 7. CUSTOM URL FORM */}
                {activePreset === 'url' && (
                  <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                      <Globe className="w-4 h-4" />
                      <span>Custom Website Destination</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Destination URL <span className="text-indigo-400">*</span>
                      </label>
                      <input
                        type="url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://example.com/daily-menu"
                        required
                        className="w-full px-3.5 py-2.5 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* Shared Campaign / Location Title Input */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Campaign Title / Location Identifier
                  </label>
                  <input
                    type="text"
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    placeholder="e.g. Table 04 Standee or Main Reception"
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAssigning}
                  className="w-full min-h-[46px] py-3 px-4 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isAssigning ? 'Activating Preset...' : 'Activate QR Code Now'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Secondary Link to Dashboard */}
          <div className="pt-2 border-t border-neutral-800/80 text-center">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="text-xs text-neutral-400 hover:text-white transition-colors underline"
            >
              Open Full Admin Console
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. ASSIGNED QR CODE: WI-FI CONNECT CARD PRESENTATION
  if (link.presentationMode === 'wifi_card' || link.contentType === 'wifi' || link.wifiData) {
    const wifi = link.wifiData || {
      ssid: link.title || 'Guest Wi-Fi',
      password: '',
      encryption: 'WPA' as const,
    };

    const handleCopyPass = () => {
      if (wifi.password) {
        navigator.clipboard.writeText(wifi.password);
        setCopiedWifiPass(true);
        setTimeout(() => setCopiedWifiPass(false), 2500);
      }
    };

    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-3xl flex items-center justify-center mx-auto border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
            <Wifi className="w-8 h-8" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-xs font-semibold mb-2">
              <span>Verified Wi-Fi Access</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{wifi.ssid}</h1>
            <p className="text-xs text-neutral-400 mt-1">Connect your device to the local network</p>
          </div>

          <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl space-y-3 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">Network Name (SSID)</span>
              <span className="font-mono font-bold text-white">{wifi.ssid}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">Security</span>
              <span className="text-cyan-400 font-semibold">{wifi.encryption || 'WPA/WPA2'}</span>
            </div>

            {wifi.password ? (
              <div className="pt-2 border-t border-neutral-800 space-y-2">
                <span className="text-neutral-400 font-medium text-xs block">Password</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-neutral-900 px-3 py-2.5 rounded-xl border border-neutral-800 font-mono text-sm text-white font-bold tracking-wider truncate">
                    {showWifiPassword ? wifi.password : '••••••••••••'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWifiPassword(!showWifiPassword)}
                    className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    {showWifiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPass}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-neutral-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
                >
                  {copiedWifiPass ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWifiPass ? 'Password Copied to Clipboard!' : 'Copy Wi-Fi Password'}</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs text-center font-semibold">
                Open Network (No password required)
              </div>
            )}
          </div>

          {/* Connection Guidance */}
          <div className="text-xs text-neutral-400 text-left space-y-1.5 p-3.5 bg-neutral-950/40 rounded-xl border border-neutral-800">
            <span className="font-bold text-white block mb-1">How to connect:</span>
            <p>1. Tap the "Copy Wi-Fi Password" button above.</p>
            <p>2. Open your phone's <strong>Settings &gt; Wi-Fi</strong>.</p>
            <p>3. Select <strong>{wifi.ssid}</strong> and paste the password.</p>
          </div>

          {/* Toggle raw QR for camera scanner */}
          {rawWifiQrUrl && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowWifiCameraQr(!showWifiCameraQr)}
                className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showWifiCameraQr ? 'Hide Native Connect QR' : 'Show Camera Auto-Join QR Code'}</span>
              </button>

              {showWifiCameraQr && (
                <div className="mt-3 p-3 bg-white rounded-2xl inline-block shadow-xl">
                  <img src={rawWifiQrUrl} alt="Wi-Fi QR" className="w-44 h-44 object-contain" />
                  <p className="text-[10px] text-neutral-700 font-bold mt-1 text-center">Point Camera to Join</p>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <span className="font-mono text-neutral-400">/r/{cleanSlug}</span>
            <span>&bull;</span>
            <span>TAPLOCAL.IN</span>
          </div>
        </div>
      </div>
    );
  }

  // 5. ASSIGNED QR CODE: DIGITAL BUSINESS CARD (VCARD) PRESENTATION
  if (link.presentationMode === 'vcard_profile' || link.contentType === 'vcard' || link.vcardData) {
    const vcard = link.vcardData || {
      fullName: link.title || 'Contact',
      phone: '',
    };

    const initials = vcard.fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'TL';

    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6">
          {/* Avatar / Profile Header */}
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-xl shadow-purple-600/30 border-2 border-white/10">
              {initials}
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">{vcard.fullName}</h1>
            {vcard.title && <p className="text-sm font-semibold text-purple-400 mt-0.5">{vcard.title}</p>}
            {vcard.organization && (
              <p className="text-xs text-neutral-400 mt-0.5">{vcard.organization}</p>
            )}
          </div>

          {/* Primary CTA: 1-Tap Save Contact to Phone */}
          <button
            type="button"
            onClick={() => downloadVCard(vcard, `${vcard.fullName || 'contact'}.vcf`)}
            className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
          >
            <Download className="w-5 h-5 stroke-[2.5]" />
            <span>Save Contact to Phone (.vcf)</span>
          </button>

          {/* Quick Action Contact Links */}
          <div className="grid grid-cols-2 gap-2 text-left">
            {vcard.phone && (
              <a
                href={`tel:${vcard.phone}`}
                className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex items-center gap-2.5 hover:border-purple-500/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase block">Call</span>
                  <span className="text-xs text-white font-bold truncate block">{vcard.phone}</span>
                </div>
              </a>
            )}

            {vcard.email && (
              <a
                href={`mailto:${vcard.email}`}
                className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex items-center gap-2.5 hover:border-purple-500/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase block">Email</span>
                  <span className="text-xs text-white font-bold truncate block">{vcard.email}</span>
                </div>
              </a>
            )}

            {vcard.website && (
              <a
                href={vcard.website.startsWith('http') ? vcard.website : `https://${vcard.website}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex items-center gap-2.5 hover:border-purple-500/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase block">Website</span>
                  <span className="text-xs text-white font-bold truncate block">{vcard.website.replace(/^https?:\/\//, '')}</span>
                </div>
              </a>
            )}

            {vcard.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(vcard.address)}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex items-center gap-2.5 hover:border-purple-500/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase block">Location</span>
                  <span className="text-xs text-white font-bold truncate block">{vcard.address}</span>
                </div>
              </a>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <span className="font-mono text-neutral-400">/r/{cleanSlug}</span>
            <span>&bull;</span>
            <span>TAPLOCAL DIGITAL CONTACT</span>
          </div>
        </div>
      </div>
    );
  }

  // 6. Review Gatekeeper Mode (Google 5-Star AI Boost)
  if (link.presentationMode === 'review_gate' || link.reviewGate?.enabled) {
    const reviewGateConfig = link.reviewGate || {
      enabled: true,
      googleReviewUrl: link.destinationUrl,
      minRatingForGoogle: 4,
      praiseTags: ['⚡ Fast Service', '😊 Friendly Staff', '✨ Clean & Welcoming', '💎 Great Value'],
    };
    return (
      <ReviewGatekeeperView
        businessName={reviewGateConfig.businessName || link.title}
        businessCategory={reviewGateConfig.businessCategory || 'Local Business'}
        config={reviewGateConfig}
        slug={cleanSlug}
      />
    );
  }

  // 7. Dynamic Button Page mode
  if (link.presentationMode === 'button_page' && link.dynamicButton?.enabled) {
    const btn = link.dynamicButton;
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
            <QrCode className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black mb-1">{link.title}</h1>
          <p className="text-neutral-400 text-xs mb-8">{link.description || 'Tap the interactive button below to proceed'}</p>

          <a
            href={link.destinationUrl}
            onClick={() => localDb.simulateScan(link.id, 'mobile')}
            className="w-full inline-flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black text-white text-base shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
          >
            <span>{btn.text || 'Continue to Destination'}</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </a>

          {btn.subtitle && (
            <p className="text-xs text-neutral-500 mt-3 font-medium">{btn.subtitle}</p>
          )}

          <div className="mt-8 pt-6 border-t border-neutral-800 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <span className="font-mono text-neutral-400">Code: {getLast4Letters(link.slug)}</span>
            <span>&bull;</span>
            <span>TAPLOCAL.IN</span>
          </div>
        </div>
      </div>
    );
  }

  // 8. Automatic Instant HTTP Redirecting Screen
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl space-y-4">
        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-neutral-300">Redirecting to destination...</p>
        <p className="text-xs text-neutral-500 font-mono">/r/{cleanSlug}</p>
      </div>
    </div>
  );
};
