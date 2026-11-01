import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Eye,
  Download,
  Printer,
  Sparkles,
  Radio,
  Star,
  Check,
  Copy,
  Layers,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  RotateCw,
} from 'lucide-react';
import { LinkRecord } from '../types';

export type PhysicalMockupType =
  | 'acrylic_stand'
  | 'table_tent'
  | 'window_decal'
  | 'wooden_block'
  | 'round_sticker';

interface PhysicalMockupPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: LinkRecord | null;
  onOpenNFCWriter?: (link: LinkRecord) => void;
}

const LANGUAGE_PRESETS = {
  en: {
    label: 'English',
    headline: 'Scan to Review & View Menu',
    subtext: 'Tap phone near top for NFC or scan QR with camera',
    nfcBadge: 'Dual NFC + QR Active',
    reviewPrompt: '5-Star Google Reviews Appreciated',
  },
  hi: {
    label: 'हिन्दी (Hindi)',
    headline: 'स्कैन करें और 5-स्टार रेटिंग दें',
    subtext: 'फ़ोन को ऊपर टैप करें या कैमरे से QR स्कैन करें',
    nfcBadge: 'NFC और QR सक्रिय',
    reviewPrompt: 'Google पर 5-स्टार रेटिंग देकर हमारा हौसला बढ़ाएं',
  },
  pa: {
    label: 'ਪੰਜਾਬੀ (Punjabi)',
    headline: 'ਸਕੈਨ ਕਰੋ ਅਤੇ ਰਿਵਿਊ ਦਿਓ',
    subtext: 'ਫੋਨ ਨਾਲ ਟੈਪ ਕਰੋ ਜਾਂ ਕੈਮਰੇ ਨਾਲ QR ਸਕੈਨ ਕਰੋ',
    nfcBadge: 'NFC ਅਤੇ QR ਚਾਲੂ ਹੈ',
    reviewPrompt: 'ਗੂਗਲ ਤੇ 5-ਸਟਾਰ ਰੇਟਿੰਗ ਦੇ ਕੇ ਸਹਿਯੋਗ ਦਿਓ',
  },
};

export const PhysicalMockupPreviewModal: React.FC<PhysicalMockupPreviewModalProps> = ({
  isOpen,
  onClose,
  link,
  onOpenNFCWriter,
}) => {
  const [mockupType, setMockupType] = useState<PhysicalMockupType>('acrylic_stand');
  const [language, setLanguage] = useState<'en' | 'hi' | 'pa'>('en');
  const [headline, setHeadline] = useState('');
  const [subtext, setSubtext] = useState('');
  const [standLabel, setStandLabel] = useState('');
  const [businessTitle, setBusinessTitle] = useState('');
  const [showNfcBadge, setShowNfcBadge] = useState(true);
  const [showRatingStars, setShowRatingStars] = useState(true);
  const [themeAccent, setThemeAccent] = useState<'amber' | 'emerald' | 'indigo' | 'black'>('amber');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectUrl = link ? `${baseUrl}/r/${link.slug}` : '';

  // Synchronize defaults whenever link opens or language changes
  useEffect(() => {
    if (!link) return;
    const langPreset = LANGUAGE_PRESETS[language];
    setHeadline(langPreset.headline);
    setSubtext(langPreset.subtext);
    setBusinessTitle(
      link.reviewGate?.businessName ||
      link.title ||
      'Our Business'
    );
    setStandLabel(
      link.standNumber ||
      (link.batchIndex !== undefined ? `Stand #${String(link.batchIndex + 1).padStart(2, '0')}` : 'Standee #01')
    );
  }, [link, language]);

  // Generate crisp QR code data URL
  useEffect(() => {
    if (!redirectUrl) return;
    QRCode.toDataURL(redirectUrl, {
      margin: 1,
      width: 420,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to render mockup QR:', err));
  }, [redirectUrl]);

  if (!isOpen || !link) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(redirectUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // High-Resolution 300-DPI Canvas Rendering & Download
  const handleDownloadMockupPng = async () => {
    if (!qrDataUrl) return;
    setIsExporting(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1200;
      canvas.height = 1600;

      // Base Background Studio Tabletop
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1600);
      bgGrad.addColorStop(0, '#0a0d14');
      bgGrad.addColorStop(1, '#151a26');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Radial Studio Spotlight
      const spotGrad = ctx.createRadialGradient(600, 700, 50, 600, 700, 650);
      spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Mockup Physical Body based on type
      const cardX = 220;
      const cardY = 220;
      const cardW = 760;
      const cardH = 1100;
      const radius = mockupType === 'round_sticker' ? 380 : 36;

      if (mockupType === 'acrylic_stand') {
        // Acrylic base plate shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(600, 1360, 440, 40, 0, 0, Math.PI * 2);
        ctx.fill();

        // Heavy Acrylic Base
        const baseGrad = ctx.createLinearGradient(200, 1280, 1000, 1340);
        baseGrad.addColorStop(0, '#1e293b');
        baseGrad.addColorStop(0.5, '#475569');
        baseGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = baseGrad;
        ctx.roundRect(180, 1280, 840, 60, [12, 12, 20, 20]);
        ctx.fill();

        // Clear Acrylic body card
        const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
        cardGrad.addColorStop(0, '#ffffff');
        cardGrad.addColorStop(1, '#f8fafc');
        ctx.fillStyle = cardGrad;
        ctx.roundRect(cardX, cardY, cardW, cardH, radius);
        ctx.fill();

        // Acrylic Glass Rim Bevel
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 14;
        ctx.stroke();

        // Top glossy reflection streak
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(cardX + 20, cardY + 20);
        ctx.lineTo(cardX + cardW - 20, cardY + 20);
        ctx.lineTo(cardX + cardW - 140, cardY + 220);
        ctx.lineTo(cardX + 20, cardY + 220);
        ctx.closePath();
        ctx.fill();
      } else if (mockupType === 'wooden_block') {
        // Wooden block shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(600, 1380, 420, 36, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rich Walnut / Oak Wood Block
        const woodGrad = ctx.createLinearGradient(160, 1260, 1040, 1360);
        woodGrad.addColorStop(0, '#78350f');
        woodGrad.addColorStop(0.5, '#92400e');
        woodGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = woodGrad;
        ctx.roundRect(160, 1250, 880, 90, 18);
        ctx.fill();

        // Inset brass plate
        const brassGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
        brassGrad.addColorStop(0, '#fef3c7');
        brassGrad.addColorStop(0.5, '#fde68a');
        brassGrad.addColorStop(1, '#f59e0b');
        ctx.fillStyle = brassGrad;
        ctx.roundRect(cardX, cardY, cardW, cardH, radius);
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 6;
        ctx.stroke();
      } else if (mockupType === 'table_tent') {
        // Folded tent card with 3D drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.moveTo(cardX - 40, cardY + cardH + 40);
        ctx.lineTo(cardX + cardW + 40, cardY + cardH + 40);
        ctx.lineTo(cardX + cardW, cardY + cardH);
        ctx.lineTo(cardX, cardY + cardH);
        ctx.closePath();
        ctx.fill();

        // Tent card face
        ctx.fillStyle = '#ffffff';
        ctx.roundRect(cardX, cardY, cardW, cardH, 20);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (mockupType === 'window_decal') {
        // Translucent Storefront Decal with frosted glass ring
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.roundRect(cardX, cardY, cardW, cardH, radius);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 18;
        ctx.stroke();
      } else {
        // Round Table Coaster / Sticker
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(600, 800 + 30, 380, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(600, 800, 380, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = themeAccent === 'amber' ? '#f59e0b' : '#6366f1';
        ctx.lineWidth = 14;
        ctx.stroke();
      }

      // Render Graphic Content inside Stand
      // 1. Stand Header & Business Title
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(businessTitle.toUpperCase(), 600, cardY + 90);

      // Stand/Table label pill
      ctx.fillStyle = '#f1f5f9';
      ctx.roundRect(500, cardY + 115, 200, 38, 12);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(standLabel, 600, cardY + 140);

      // Star Rating row if enabled
      if (showRatingStars) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = '32px sans-serif';
        ctx.fillText('★★★★★', 600, cardY + 195);
      }

      // Main Call to Action Headline
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(headline, 600, cardY + 245);

      // Subtitle
      ctx.fillStyle = '#64748b';
      ctx.font = '20px sans-serif';
      ctx.fillText(subtext, 600, cardY + 285);

      // 2. Center QR Code Image
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });

      const qrSize = 440;
      const qrDrawX = 600 - qrSize / 2;
      const qrDrawY = cardY + 330;

      // QR bounding frame
      ctx.fillStyle = '#ffffff';
      ctx.roundRect(qrDrawX - 16, qrDrawY - 16, qrSize + 32, qrSize + 32, 24);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.drawImage(qrImg, qrDrawX, qrDrawY, qrSize, qrSize);

      // 3. Dual NFC Chip Badge beneath or above QR
      if (showNfcBadge) {
        ctx.fillStyle = '#0f172a';
        ctx.roundRect(420, cardY + 830, 360, 56, 18);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('📱 TAP NFC OR SCAN QR', 600, cardY + 866);
      }

      // 4. Footer Shortlink & taplocalin watermark
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`/r/${link.slug}`, 600, cardY + 935);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText('POWERED BY TAPLOCAL DYNAMIC INFRASTRUCTURE', 600, cardY + 975);

      // Export image
      const dataUri = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = `${link.slug}-${mockupType}-mockup.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export high-res mockup:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintMockup = () => {
    window.print();
  };

  const mockupOptions = [
    {
      id: 'acrylic_stand' as PhysicalMockupType,
      name: 'Clear Acrylic T-Stand',
      desc: 'Table counter display with heavy clear base & NFC',
      icon: '🪟',
    },
    {
      id: 'table_tent' as PhysicalMockupType,
      name: 'Restaurant Table Tent',
      desc: 'Double-sided standing tent card for dining tables',
      icon: '⛺',
    },
    {
      id: 'window_decal' as PhysicalMockupType,
      name: 'Storefront Window Decal',
      desc: 'Glass door sticker with frosted border & high contrast',
      icon: '🚪',
    },
    {
      id: 'wooden_block' as PhysicalMockupType,
      name: 'Laser-Etched Wood Block',
      desc: 'Warm walnut/oak solid block with metallic brass plate',
      icon: '🪵',
    },
    {
      id: 'round_sticker' as PhysicalMockupType,
      name: 'Round Vinyl Table Sticker',
      desc: 'Water-resistant round table disc with concentric antenna',
      icon: '⭕',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-5xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100 my-auto">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Physical Standee Mockup Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PRINT PRE-FLIGHT
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Visualize how this QR code and NFC tag will look on physical hardware before printing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Body: Split View (Settings Controls vs Live 3D/Physical Canvas) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-neutral-800">
          {/* LEFT COLUMN: Controls & Customization (5 cols) */}
          <div className="lg:col-span-5 p-5 sm:p-6 space-y-5 overflow-y-auto bg-neutral-950/50">
            {/* 1. Mockup Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-neutral-400 block">
                1. Select Physical Mockup Medium
              </label>
              <div className="grid grid-cols-1 gap-2">
                {mockupOptions.map((opt) => {
                  const isSelected = mockupType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMockupType(opt.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/40'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:bg-neutral-850 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl shrink-0">{opt.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-white">{opt.name}</div>
                          <div className="text-[11px] text-neutral-400 leading-tight">{opt.desc}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Bilingual Language Presets (English, Hindi, Punjabi) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-400 block">
                  2. Language &amp; Copywriting
                </label>
                <span className="text-[10px] text-amber-400 font-semibold">1-Tap Translate</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(LANGUAGE_PRESETS) as Array<'en' | 'hi' | 'pa'>).map((lKey) => {
                  const isSelected = language === lKey;
                  return (
                    <button
                      key={lKey}
                      type="button"
                      onClick={() => setLanguage(lKey)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      {LANGUAGE_PRESETS[lKey].label}
                    </button>
                  );
                })}
              </div>

              {/* Editable Headline */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold text-neutral-400">Printed Stand Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Scan to Review or Order"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Editable Subtext */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-400">Instruction Subtitle</label>
                <input
                  type="text"
                  value={subtext}
                  onChange={(e) => setSubtext(e.target.value)}
                  placeholder="Tap phone near top or scan with camera"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* 3. Hardware Details */}
            <div className="space-y-3 p-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
              <label className="text-xs font-black uppercase tracking-wider text-neutral-400 block">
                3. Standee Identifier &amp; Badges
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-400">Business Display Name</label>
                  <input
                    type="text"
                    value={businessTitle}
                    onChange={(e) => setBusinessTitle(e.target.value)}
                    placeholder="e.g. Copper Kettle Cafe"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-400">Stand / Table Label</label>
                  <input
                    type="text"
                    value={standLabel}
                    onChange={(e) => setStandLabel(e.target.value)}
                    placeholder="e.g. Table 04, VIP Stand"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Dual NFC + QR Badge</span>
                      <span className="text-[10px] text-neutral-400">Adds top contactless tap antenna indicator</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showNfcBadge}
                    onChange={(e) => setShowNfcBadge(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">5-Star Gold Rating Header</span>
                      <span className="text-[10px] text-neutral-400">Promotes Google Reviews booster</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showRatingStars}
                    onChange={(e) => setShowRatingStars(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                </label>
              </div>
            </div>

            {/* Quick NFC Programmer Launch Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-neutral-900 border border-indigo-500/30 flex items-center justify-between gap-3 shadow-lg">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                  <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>Dual NFC Stand?</span>
                </div>
                <p className="text-[11px] text-neutral-300">
                  Write <span className="font-mono text-cyan-300">/r/{link.slug}</span> directly into the acrylic stand's NFC chip.
                </p>
              </div>

              {onOpenNFCWriter && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNFCWriter(link);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-md transition-all active:scale-95"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Program NFC</span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Realistic Live Visual Mockup Viewport (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 relative overflow-hidden min-h-[460px]">
            {/* Ambient Spotlight */}
            <div className="absolute top-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Render Selected Mockup Card in 3D / Perspective Container */}
            <div
              ref={previewContainerRef}
              className="relative w-full max-w-sm sm:max-w-md mx-auto transition-all duration-300 transform select-none"
            >
              {/* ACRYLIC STAND MOCKUP */}
              {mockupType === 'acrylic_stand' && (
                <div className="flex flex-col items-center">
                  {/* Standee Body (Clear Acrylic Card with border sheen) */}
                  <div className="w-full bg-white rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border-4 border-neutral-200 relative overflow-hidden text-neutral-900">
                    {/* Glass glare highlight */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/70 via-white/20 to-transparent pointer-events-none" />
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/40 rounded-full blur-xl pointer-events-none" />

                    {/* Top Business Title & Table Badge */}
                    <div className="text-center space-y-1 relative z-10">
                      <h4 className="text-sm sm:text-base font-black tracking-tight text-neutral-950 uppercase truncate">
                        {businessTitle || 'Your Business Name'}
                      </h4>
                      <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-300 text-[10px] font-mono font-bold">
                        <span>{standLabel}</span>
                      </div>
                    </div>

                    {/* Gold Rating Stars */}
                    {showRatingStars && (
                      <div className="flex justify-center gap-1 text-amber-400 mt-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-4 h-4 fill-amber-400" />
                        ))}
                      </div>
                    )}

                    {/* Primary Headline */}
                    <div className="text-center mt-2.5 space-y-0.5">
                      <h5 className="text-xs sm:text-sm font-extrabold text-neutral-900 leading-snug">
                        {headline}
                      </h5>
                      <p className="text-[10px] text-neutral-500 font-medium">
                        {subtext}
                      </p>
                    </div>

                    {/* QR Code Container with NFC wave badge */}
                    <div className="my-3.5 flex flex-col items-center">
                      <div className="p-3 bg-white rounded-2xl border-2 border-neutral-200 shadow-inner relative group">
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="Physical QR"
                            className="w-44 h-44 sm:w-52 sm:h-52 object-contain"
                          />
                        ) : (
                          <div className="w-48 h-48 bg-neutral-100 animate-pulse rounded-xl" />
                        )}

                        {/* Stand Center Watermark Badge */}
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-neutral-950 text-white rounded text-[8px] font-mono font-bold opacity-80">
                          300 DPI
                        </div>
                      </div>

                      {/* Contactless Tap Badge */}
                      {showNfcBadge && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-neutral-950 text-white text-[11px] font-bold shadow-md">
                          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                          <span>TAP NFC CHIP OR SCAN</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer details */}
                    <div className="text-center pt-1 border-t border-neutral-200/80 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                      <span className="font-bold text-indigo-700">/r/{link.slug}</span>
                      <span className="uppercase text-[9px] text-neutral-400">taplocalin stand</span>
                    </div>
                  </div>

                  {/* Heavy Acrylic Base Stand Slot */}
                  <div className="w-[86%] h-6 bg-gradient-to-r from-neutral-700 via-neutral-400 to-neutral-700 rounded-b-xl shadow-2xl border-t border-white/40 -mt-1 relative z-20 flex items-center justify-center">
                    <div className="w-32 h-1 bg-neutral-900/40 rounded-full" />
                  </div>
                  {/* Table Reflection Shadow */}
                  <div className="w-72 h-4 bg-black/60 rounded-full blur-md -mt-1" />
                </div>
              )}

              {/* RESTAURANT TABLE TENT MOCKUP */}
              {mockupType === 'table_tent' && (
                <div className="flex flex-col items-center">
                  <div className="w-full bg-stone-50 rounded-2xl p-6 sm:p-7 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)] border border-stone-300 relative text-stone-900 overflow-hidden">
                    {/* Fold crease hint at top */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-stone-200 border-b border-stone-300" />

                    <div className="text-center space-y-1">
                      <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold block">
                        TABLE CARD
                      </span>
                      <h4 className="text-sm font-black text-stone-900 uppercase">
                        {businessTitle}
                      </h4>
                      <div className="inline-block px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-800 text-[10px] font-bold font-mono">
                        {standLabel}
                      </div>
                    </div>

                    {showRatingStars && (
                      <div className="flex justify-center gap-1 text-amber-500 mt-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-4 h-4 fill-amber-500" />
                        ))}
                      </div>
                    )}

                    <h5 className="text-center text-xs font-bold text-stone-800 mt-2">
                      {headline}
                    </h5>

                    <div className="my-3 flex flex-col items-center">
                      <div className="p-3 bg-white rounded-xl border border-stone-300 shadow-sm">
                        {qrDataUrl && (
                          <img
                            src={qrDataUrl}
                            alt="Table Tent QR"
                            className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                          />
                        )}
                      </div>
                      {showNfcBadge && (
                        <div className="mt-2 text-[10px] font-bold text-stone-600 bg-stone-200/80 px-2.5 py-0.5 rounded-full">
                          📡 NFC Tag Embedded Inside Card
                        </div>
                      )}
                    </div>

                    <div className="text-center text-[10px] font-mono text-stone-400">
                      Scan with Phone Camera &bull; /r/{link.slug}
                    </div>
                  </div>
                  {/* Angled base shadow */}
                  <div className="w-64 h-5 bg-black/50 rounded-full blur-md -mt-1" />
                </div>
              )}

              {/* WINDOW DECAL MOCKUP */}
              {mockupType === 'window_decal' && (
                <div className="flex flex-col items-center">
                  <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.9)] border-4 border-dashed border-sky-400/80 relative text-neutral-900">
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-sky-500 text-white text-[9px] font-bold uppercase">
                      PEEL &amp; STICK
                    </div>

                    <div className="text-center space-y-1">
                      <div className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                        Storefront Window Sticker
                      </div>
                      <h4 className="text-base font-black text-neutral-950 uppercase">
                        {businessTitle}
                      </h4>
                    </div>

                    {showRatingStars && (
                      <div className="flex justify-center gap-1 text-amber-500 mt-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-4 h-4 fill-amber-500" />
                        ))}
                      </div>
                    )}

                    <h5 className="text-center text-xs font-bold text-neutral-800 mt-2">
                      {headline}
                    </h5>

                    <div className="my-3 flex flex-col items-center">
                      <div className="p-3 bg-white rounded-2xl border-2 border-neutral-300 shadow-md">
                        {qrDataUrl && (
                          <img
                            src={qrDataUrl}
                            alt="Window Decal QR"
                            className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                          />
                        )}
                      </div>
                    </div>

                    <div className="text-center text-[10px] font-mono font-bold text-sky-700 bg-sky-50 py-1 rounded-lg">
                      OPEN 24/7 &bull; /r/{link.slug}
                    </div>
                  </div>
                </div>
              )}

              {/* WOODEN BLOCK MOCKUP */}
              {mockupType === 'wooden_block' && (
                <div className="flex flex-col items-center">
                  <div className="w-full bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300 rounded-3xl p-6 sm:p-7 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.85)] border-2 border-amber-600/60 relative text-amber-950">
                    <div className="text-center space-y-1">
                      <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                        Laser-Etched Wood Stand
                      </div>
                      <h4 className="text-base font-black uppercase text-amber-950">
                        {businessTitle}
                      </h4>
                      <span className="px-2 py-0.5 rounded bg-amber-900/10 text-amber-900 text-[10px] font-mono font-bold">
                        {standLabel}
                      </span>
                    </div>

                    <div className="my-3 flex flex-col items-center">
                      <div className="p-3 bg-white/90 rounded-2xl border border-amber-700/40 shadow-inner">
                        {qrDataUrl && (
                          <img
                            src={qrDataUrl}
                            alt="Wooden Block QR"
                            className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                          />
                        )}
                      </div>
                    </div>

                    <h5 className="text-center text-xs font-bold text-amber-900">
                      {headline}
                    </h5>
                    <div className="text-center text-[10px] font-mono text-amber-800 mt-1">
                      /r/{link.slug}
                    </div>
                  </div>

                  {/* Solid Hardwood Base */}
                  <div className="w-[90%] h-8 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 rounded-b-2xl shadow-2xl border-t border-amber-700/60 -mt-1 flex items-center justify-center">
                    <div className="w-24 h-1 bg-black/40 rounded-full" />
                  </div>
                  <div className="w-64 h-4 bg-black/60 rounded-full blur-md -mt-1" />
                </div>
              )}

              {/* ROUND TABLE STICKER MOCKUP */}
              {mockupType === 'round_sticker' && (
                <div className="flex flex-col items-center">
                  <div className="w-72 h-72 sm:w-80 sm:h-80 bg-white rounded-full p-4 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.9)] border-4 border-amber-500 relative text-neutral-900 flex flex-col items-center justify-between text-center overflow-hidden">
                    {/* Concentric NFC antenna ring */}
                    <div className="absolute inset-2 border-2 border-dashed border-amber-400/60 rounded-full pointer-events-none" />

                    <div className="pt-2 z-10">
                      <span className="text-[10px] font-black uppercase text-amber-600 block">
                        TAP OR SCAN
                      </span>
                      <h4 className="text-xs font-black text-neutral-950 uppercase truncate max-w-[200px]">
                        {businessTitle}
                      </h4>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-neutral-200 shadow-sm z-10">
                      {qrDataUrl && (
                        <img
                          src={qrDataUrl}
                          alt="Round Coaster QR"
                          className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                        />
                      )}
                    </div>

                    <div className="pb-2 z-10">
                      <span className="text-[10px] font-mono font-bold text-neutral-600 block">
                        {standLabel} &bull; /r/{link.slug}
                      </span>
                    </div>
                  </div>
                  <div className="w-48 h-4 bg-black/60 rounded-full blur-md mt-2" />
                </div>
              )}
            </div>

            {/* Live Spec Indicators below mockup */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-400 font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
                Resolution: 300 DPI Press Ready
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
                Target: {mockupOptions.find((o) => o.id === mockupType)?.name}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-indigo-400 font-bold">
                /r/{link.slug}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
            <span>Permanent Link:</span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="hover:text-white underline inline-flex items-center gap-1"
            >
              <span>{redirectUrl}</span>
              {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrintMockup}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-neutral-700 shadow-sm"
            >
              <Printer className="w-4 h-4 text-neutral-400" />
              <span>Print Mockup Sheet</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadMockupPng}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Compositing...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download 300 DPI PNG</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
