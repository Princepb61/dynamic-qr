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
  FileText,
  Sparkles,
} from 'lucide-react';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    destinationUrl: string;
    customSlug?: string;
    description?: string;
    tags?: string[];
    contentType?: 'url' | 'whatsapp' | 'vcard' | 'wifi' | 'text' | 'button';
    dynamicButton?: any;
    presentationMode?: 'instant_redirect' | 'button_page';
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

export const CreateLinkModal: React.FC<CreateLinkModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [contentType, setContentType] = useState<'url' | 'whatsapp' | 'vcard' | 'wifi' | 'text' | 'button'>('url');
  const [title, setTitle] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Dynamic Button State
  const [buttonText, setButtonText] = useState('Order Online Now');
  const [buttonSubtitle, setButtonSubtitle] = useState('Tap to unlock specials & deals');
  const [buttonUrl, setButtonUrl] = useState('');
  const [buttonTheme, setButtonTheme] = useState<'indigo' | 'emerald' | 'amber' | 'dark' | 'neon' | 'glass'>('indigo');
  const [buttonPresentation, setButtonPresentation] = useState<'button_page' | 'instant_redirect'>('button_page');

  // Type 1: Standard URL
  const [urlInput, setUrlInput] = useState('');

  // Type 2: WhatsApp
  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('');

  // Type 3: VCard
  const [vcardName, setVcardName] = useState('');
  const [vcardOrg, setVcardOrg] = useState('');
  const [vcardPhone, setVcardPhone] = useState('');
  const [vcardEmail, setVcardEmail] = useState('');
  const [vcardTitle, setVcardTitle] = useState('');

  // Type 4: Wi-Fi
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiType, setWifiType] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');

  // Type 5: Text / Coupon
  const [textContent, setTextContent] = useState('');

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
        width: 130,
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

  const computeDestinationUrl = (): string => {
    if (contentType === 'url') {
      let target = urlInput.trim();
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = 'https://' + target;
      }
      return target;
    }

    if (contentType === 'whatsapp') {
      const cleanPhone = waPhone.replace(/[^0-9]/g, '');
      const msg = encodeURIComponent(waMessage.trim());
      return `https://wa.me/${cleanPhone}${msg ? `?text=${msg}` : ''}`;
    }

    if (contentType === 'wifi') {
      // Direct Wi-Fi string encoded as destination target
      return `WIFI:S:${wifiSsid.trim()};T:${wifiType};P:${wifiPassword};;`;
    }

    if (contentType === 'vcard') {
      // VCard data URI format or contact card
      const vcf = `BEGIN:VCARD\nVERSION:3.0\nN:${vcardName}\nFN:${vcardName}\nORG:${vcardOrg}\nTITLE:${vcardTitle}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nEND:VCARD`;
      return `data:text/vcard;charset=utf-8,${encodeURIComponent(vcf)}`;
    }

    if (contentType === 'text') {
      return `data:text/plain;charset=utf-8,${encodeURIComponent(textContent.trim())}`;
    }

    return urlInput;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let destinationUrl = '';
    try {
      destinationUrl = computeDestinationUrl();
    } catch {
      setError('Please check the input fields.');
      return;
    }

    if (!destinationUrl || destinationUrl.trim() === '') {
      setError('Please fill in the required content for this QR code type.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // Auto tag by type
    if (!tags.includes(contentType.toUpperCase())) {
      tags.push(contentType.toUpperCase());
    }

    const finalTitle =
      title.trim() ||
      (contentType === 'whatsapp'
        ? `WhatsApp (${waPhone})`
        : contentType === 'vcard'
        ? `Contact: ${vcardName}`
        : contentType === 'wifi'
        ? `Wi-Fi (${wifiSsid})`
        : `Campaign ${customSlug.trim() || 'Dynamic'}`);

    try {
      setIsSubmitting(true);
      await onCreate({
        title: finalTitle,
        destinationUrl,
        customSlug: customSlug.trim() || undefined,
        description: description.trim(),
        tags,
        contentType,
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
      setWaMessage('');
      setVcardName('');
      setWifiSsid('');
      setTextContent('');
      setCustomSlug('');
      setDescription('');
      setTagsInput('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create link');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Create Dynamic QR Code</h3>
            <p className="text-xs text-neutral-500">
              Inspired by PHP-Dynamic-QR: choose content type, customize frame, and update destination anytime.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Type Selector Tabs */}
        <div className="px-6 pt-4 pb-2 border-b border-neutral-100 bg-neutral-50/50">
          <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
            Select Dynamic Content Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {[
              { id: 'url', name: 'Website URL', icon: Globe },
              { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare },
              { id: 'vcard', name: 'VCard Contact', icon: Contact },
              { id: 'wifi', name: 'Wi-Fi Connect', icon: Wifi },
              { id: 'text', name: 'Text / Promo', icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = contentType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setContentType(item.id as any)}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] truncate w-full text-center">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          {/* DYNAMIC CONTENT INPUTS */}
          {contentType === 'url' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Destination Website URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://yourcompany.com/landing-page"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                Where scanners will be redirected via HTTP 307. You can change this target anytime later.
              </p>
            </div>
          )}

          {contentType === 'whatsapp' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  WhatsApp Phone Number (with Country Code) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  placeholder="e.g. +14155552671"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2 text-xs font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Prefilled Chat Message (Optional)
                </label>
                <input
                  type="text"
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  placeholder="Hello! I scanned your QR code and would like more information."
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>
          )}

          {contentType === 'vcard' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vcardName}
                    onChange={(e) => setVcardName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={vcardOrg}
                    onChange={(e) => setVcardOrg(e.target.value)}
                    placeholder="Acme Global"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={vcardPhone}
                    onChange={(e) => setVcardPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={vcardEmail}
                    onChange={(e) => setVcardEmail(e.target.value)}
                    placeholder="jane@acme.com"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>
            </div>
          )}

          {contentType === 'wifi' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Wi-Fi Network Name (SSID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="e.g. Guest_Lounge_5G"
                  required
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Wi-Fi Password
                  </label>
                  <input
                    type="text"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="Network password"
                    className="w-full px-3.5 py-2 text-xs font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Security</label>
                  <select
                    value={wifiType}
                    onChange={(e) => setWifiType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="WPA">WPA / WPA2 / WPA3 (Standard)</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">No Password (Open)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {contentType === 'text' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Plain Text / Promo Coupon Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={3}
                placeholder="e.g. SHOW THIS CODE AT REGISTER FOR 20% OFF: VIP2026"
                required
                className="w-full px-3.5 py-2 text-xs font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
              />
            </div>
          )}

          {/* Title & Custom Slug Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Campaign / Asset Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer Promo Standee"
                className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-neutral-700">Custom Slug</label>
                <button
                  type="button"
                  onClick={generateRandomSlug}
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Random</span>
                </button>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-neutral-400 font-mono pl-3 py-2 bg-neutral-100 border border-r-0 border-neutral-300 rounded-l-lg">
                  /r/
                </span>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="summer-promo"
                  className="w-full px-2.5 py-2 text-xs font-mono border border-neutral-300 rounded-r-lg focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>
          </div>

          {/* FRAME STYLING (Inspired by PHP Dynamic QR Code) */}
          <div className="pt-2 border-t border-neutral-100">
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              QR Frame Style (PHP-Dynamic-QR Signature)
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { id: 'bottom_badge', name: 'SCAN ME Frame' },
                { id: 'top_badge', name: 'Top Label Frame' },
                { id: 'none', name: 'No Frame (Clean)' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFrameStyle(f.id as any)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-colors ${
                    frameStyle === f.id
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>

            {frameStyle !== 'none' && (
              <div>
                <input
                  type="text"
                  value={frameText}
                  onChange={(e) => setFrameText(e.target.value)}
                  placeholder="SCAN ME"
                  className="w-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-neutral-300 rounded-lg text-center focus:outline-none focus:border-neutral-900"
                />
              </div>
            )}
          </div>

          {/* Live Preview Strip */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-4">
            {/* Framed QR Preview */}
            <div className="p-2.5 bg-white rounded-xl border-2 border-neutral-900 shadow-2xs flex flex-col items-center shrink-0">
              {frameStyle === 'top_badge' && (
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-900 pb-1">
                  {frameText || 'SCAN ME'}
                </div>
              )}
              <canvas ref={canvasRef} className="rounded" />
              {frameStyle === 'bottom_badge' && (
                <div className="text-[10px] font-extrabold uppercase tracking-widest bg-neutral-900 text-white px-2 py-0.5 rounded-sm mt-1 w-full text-center">
                  {frameText || 'SCAN ME'}
                </div>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Dynamic Short Endpoint</span>
              </div>
              <div className="text-neutral-500 font-mono text-[11px] truncate">
                {previewUrl}
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                The printed QR code remains 100% static. Destination content and routing can be changed anytime from the admin panel!
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? 'Generating...' : 'Create Dynamic QR Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
