import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Download, Palette, Image as ImageIcon, Eye, Frame, Check, Sliders, Coffee, Wifi, Star, Heart, Utensils, Link2, Upload } from 'lucide-react';
import QRCode from 'qrcode';
import { QRSettings, QREyeShape } from '../types';

interface QRStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl?: string;
  linkTitle?: string;
  link?: LinkRecord | null;
  initialSettings?: QRSettings;
  onSaveSettings?: (settings: QRSettings) => void;
  onDeleteQR?: (id: string) => void;
}

export const QRStudioModal: React.FC<QRStudioModalProps> = ({
  isOpen,
  onClose,
  targetUrl: explicitTargetUrl,
  linkTitle: explicitLinkTitle,
  link,
  initialSettings: explicitInitialSettings,
  onSaveSettings,
  onDeleteQR,
}) => {
  const currentLink = link || null;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const targetUrl = explicitTargetUrl || (currentLink ? `${baseUrl}/r/${currentLink.slug}` : '');
  const linkTitle = explicitLinkTitle || currentLink?.title || 'Dynamic QR Code';
  const initialSettings = explicitInitialSettings || currentLink?.qrSettings;
  const [activeTab, setActiveTab] = useState<'colors' | 'eyes' | 'logo' | 'frame'>('colors');
  const [colorDark, setColorDark] = useState(initialSettings?.colorDark || '#0f172a');
  const [colorLight, setColorLight] = useState(initialSettings?.colorLight || '#ffffff');
  const [gradientEnabled, setGradientEnabled] = useState(initialSettings?.gradientEnabled || false);
  const [gradientColor1, setGradientColor1] = useState(initialSettings?.gradientColor1 || '#3b82f6');
  const [gradientColor2, setGradientColor2] = useState(initialSettings?.gradientColor2 || '#8b5cf6');
  const [gradientDirection, setGradientDirection] = useState<'to-r' | 'to-br' | 'to-b' | 'to-bl'>(
    initialSettings?.gradientDirection || 'to-br'
  );
  const [eyeShape, setEyeShape] = useState<QREyeShape>(initialSettings?.eyeShape || 'rounded');
  const [eyeColor, setEyeColor] = useState(initialSettings?.eyeColor || '');
  const [frameStyle, setFrameStyle] = useState(initialSettings?.frameStyle || 'bottom_badge');
  const [frameText, setFrameText] = useState(initialSettings?.frameText || 'SCAN ME');
  const [centerIcon, setCenterIcon] = useState(initialSettings?.centerIcon || 'none');
  const [customLogoUrl, setCustomLogoUrl] = useState(initialSettings?.centerLogoUrl || '');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const [qrSvgContent, setQrSvgContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate QR matrix/SVG
  useEffect(() => {
    if (!isOpen || !targetUrl) return;

    QRCode.toString(targetUrl, {
      type: 'svg',
      errorCorrectionLevel: 'H', // High error correction needed for center logos
      margin: 1,
      color: {
        dark: gradientEnabled ? '#000000' : colorDark,
        light: colorLight,
      },
    })
      .then((svg) => {
        setQrSvgContent(svg);
      })
      .catch((err) => {
        console.error('QR preview error:', err);
      });
  }, [isOpen, targetUrl, colorDark, colorLight, gradientEnabled]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomLogoUrl(reader.result as string);
        setCenterIcon('none');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const updatedSettings: QRSettings = {
      colorDark,
      colorLight,
      errorCorrectionLevel: 'H',
      margin: 2,
      frameStyle,
      frameText,
      centerIcon,
      centerLogoUrl: customLogoUrl,
      gradientEnabled,
      gradientColor1,
      gradientColor2,
      gradientDirection,
      eyeShape,
      eyeColor: eyeColor || (gradientEnabled ? gradientColor1 : colorDark),
    };
    if (onSaveSettings) {
      onSaveSettings(updatedSettings);
    }
    setCopiedNotification(true);
    setTimeout(() => {
      setCopiedNotification(false);
      onClose();
    }, 600);
  };

  const downloadSVG = () => {
    const blob = new Blob([qrSvgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${linkTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-vector.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadHighResPNG = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await QRCode.toDataURL(targetUrl, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: colorDark,
          light: colorLight,
        },
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `qr-${linkTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-1024px.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Visual QR Designer Studio</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Custom Branding
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Style vector QR codes with gradients, eye patterns, frames, and custom center brand logos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          {/* Controls Column (Left) */}
          <div className="md:col-span-7 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-neutral-800 bg-neutral-950/40 p-1.5 gap-1">
              {[
                { id: 'colors', label: 'Colors & Gradient', icon: Palette },
                { id: 'eyes', label: 'Eye Patterns', icon: Eye },
                { id: 'logo', label: 'Center Brand Logo', icon: ImageIcon },
                { id: 'frame', label: 'Callout Frame', icon: Frame },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-neutral-800 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* TAB 1: COLORS & GRADIENTS */}
              {activeTab === 'colors' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div>
                      <span className="text-xs font-bold text-white block">Linear Gradient</span>
                      <span className="text-[11px] text-neutral-400">
                        Render dynamic two-tone color gradient across QR modules
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gradientEnabled}
                        onChange={(e) => setGradientEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {gradientEnabled ? (
                    <div className="space-y-3 p-4 rounded-xl bg-neutral-950/60 border border-neutral-800">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-neutral-400 font-medium">Start Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={gradientColor1}
                              onChange={(e) => setGradientColor1(e.target.value)}
                              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={gradientColor1}
                              onChange={(e) => setGradientColor1(e.target.value)}
                              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white uppercase font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-neutral-400 font-medium">End Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={gradientColor2}
                              onChange={(e) => setGradientColor2(e.target.value)}
                              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={gradientColor2}
                              onChange={(e) => setGradientColor2(e.target.value)}
                              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white uppercase font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="space-y-1 pt-2">
                        <span className="text-[10px] uppercase font-bold text-neutral-500">Preset Gradients</span>
                        <div className="flex gap-2">
                          {[
                            { c1: '#4f46e5', c2: '#06b6d4', name: 'Ocean' },
                            { c1: '#ec4899', c2: '#8b5cf6', name: 'Sunset' },
                            { c1: '#10b981', c2: '#059669', name: 'Emerald' },
                            { c1: '#f59e0b', c2: '#ef4444', name: 'Flame' },
                            { c1: '#0f172a', c2: '#334155', name: 'Midnight' },
                          ].map((p) => (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => {
                                setGradientColor1(p.c1);
                                setGradientColor2(p.c2);
                              }}
                              className="w-7 h-7 rounded-lg border border-neutral-700 hover:scale-110 transition-transform"
                              style={{ background: `linear-gradient(135deg, ${p.c1}, ${p.c2})` }}
                              title={p.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-neutral-950/60 border border-neutral-800">
                      <div className="space-y-1">
                        <label className="text-[11px] text-neutral-400 font-medium">QR Dots Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colorDark}
                            onChange={(e) => setColorDark(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={colorDark}
                            onChange={(e) => setColorDark(e.target.value)}
                            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white uppercase font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-neutral-400 font-medium">Background Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colorLight}
                            onChange={(e) => setColorLight(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={colorLight}
                            onChange={(e) => setColorLight(e.target.value)}
                            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white uppercase font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EYE PATTERNS */}
              {activeTab === 'eyes' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white block">Finder Corner Eye Style</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'square', label: 'Classic Square', desc: 'Standard industrial look' },
                        { id: 'rounded', label: 'Smooth Rounded', desc: 'Sleek rounded corners' },
                        { id: 'circle', label: 'Circular Dot', desc: 'Modern high-tech circular' },
                        { id: 'leaf', label: 'Curved Leaf', desc: 'Diagonal organic corner' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setEyeShape(item.id as any)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            eyeShape === item.id
                              ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-sm'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <span className="text-xs font-bold block">{item.label}</span>
                          <span className="text-[10px] text-neutral-500 block mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CENTER BRAND LOGO */}
              {activeTab === 'logo' && (
                <div className="space-y-4">
                  {/* Custom upload */}
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Upload Custom Brand Logo</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Image</span>
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {customLogoUrl ? (
                      <div className="flex items-center gap-3 p-2 bg-neutral-900 rounded-lg border border-neutral-700">
                        <img
                          src={customLogoUrl}
                          alt="Brand Logo"
                          className="w-10 h-10 object-contain rounded bg-white p-1"
                        />
                        <div className="flex-1 text-xs">
                          <span className="text-white font-medium block">Custom logo attached</span>
                          <span className="text-[10px] text-emerald-400">High error-correction active</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCustomLogoUrl('')}
                          className="text-xs text-rose-400 hover:text-rose-300"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-neutral-500">
                        PNG or SVG works best. The center logo is placed with automatic quiet zone padding.
                      </p>
                    )}
                  </div>

                  {/* Icon Presets */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white block">Or Choose a Business Icon</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'none', label: 'None', icon: X },
                        { id: 'star', label: '5-Star', icon: Star },
                        { id: 'coffee', label: 'Coffee', icon: Coffee },
                        { id: 'wifi', label: 'WiFi', icon: Wifi },
                        { id: 'heart', label: 'Heart', icon: Heart },
                        { id: 'utensils', label: 'Food', icon: Utensils },
                        { id: 'link', label: 'Link', icon: Link2 },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = centerIcon === item.id && !customLogoUrl;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setCenterIcon(item.id as any);
                              setCustomLogoUrl('');
                            }}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                              isSelected
                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-[10px] font-semibold">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CALLOUT FRAME */}
              {activeTab === 'frame' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white block">Frame Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'none', label: 'No Frame (Clean QR)' },
                        { id: 'bottom_badge', label: 'Bottom Badge (Classic)' },
                        { id: 'top_badge', label: 'Top Header Banner' },
                        { id: 'rounded_card', label: 'Curved Card Border' },
                        { id: 'sleek_border', label: 'Minimalist Line Frame' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFrameStyle(f.id as any)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            frameStyle === f.id
                              ? 'bg-indigo-500/10 border-indigo-500 text-white'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <span className="text-xs font-bold block">{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {frameStyle !== 'none' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white block">Call-To-Action Text</label>
                      <input
                        type="text"
                        value={frameText}
                        onChange={(e) => setFrameText(e.target.value)}
                        placeholder="e.g. SCAN ME, TAP FOR MENU, 5-STAR REVIEWS..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Column (Right) */}
          <div className="md:col-span-5 p-6 flex flex-col items-center justify-between bg-neutral-950/60">
            <div className="w-full text-center space-y-1 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Live Preview</span>
              <h3 className="text-sm font-bold text-white truncate">{linkTitle}</h3>
            </div>

            {/* Visual Canvas Container */}
            <div
              className={`relative transition-all duration-300 p-5 rounded-2xl flex flex-col items-center justify-center shadow-xl ${
                frameStyle === 'rounded_card'
                  ? 'border-2 border-indigo-500/40 bg-white text-neutral-900'
                  : 'bg-white text-neutral-900'
              }`}
              style={{
                borderRadius: eyeShape === 'rounded' || eyeShape === 'circle' ? '24px' : '12px',
              }}
            >
              {/* Top Banner Frame */}
              {frameStyle === 'top_badge' && (
                <div className="w-full bg-neutral-900 text-white text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-lg mb-3 text-center">
                  {frameText || 'SCAN HERE'}
                </div>
              )}

              {/* QR Image / SVG */}
              <div
                className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center overflow-hidden rounded-xl"
                style={{
                  background: gradientEnabled
                    ? `linear-gradient(135deg, ${gradientColor1}, ${gradientColor2})`
                    : colorDark,
                  WebkitMaskImage: qrSvgContent ? undefined : undefined,
                }}
              >
                {/* Embedded SVG with styling */}
                <div
                  className="w-full h-full p-2 bg-white"
                  dangerouslySetInnerHTML={{ __html: qrSvgContent }}
                  style={{
                    filter: gradientEnabled
                      ? `drop-shadow(0 0 0 ${gradientColor1})`
                      : undefined,
                  }}
                />

                {/* Center Brand Logo Overlay */}
                {(customLogoUrl || centerIcon !== 'none') && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-lg border-2 border-neutral-100 flex items-center justify-center p-1.5">
                      {customLogoUrl ? (
                        <img
                          src={customLogoUrl}
                          alt="Logo"
                          className="w-full h-full object-contain rounded"
                        />
                      ) : centerIcon === 'star' ? (
                        <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                      ) : centerIcon === 'coffee' ? (
                        <Coffee className="w-6 h-6 text-amber-800" />
                      ) : centerIcon === 'wifi' ? (
                        <Wifi className="w-6 h-6 text-indigo-600" />
                      ) : centerIcon === 'heart' ? (
                        <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
                      ) : centerIcon === 'utensils' ? (
                        <Utensils className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <Link2 className="w-6 h-6 text-neutral-800" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Badge Frame */}
              {frameStyle === 'bottom_badge' && (
                <div className="mt-3 bg-neutral-900 text-white text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-4 rounded-full shadow-md">
                  {frameText || 'SCAN ME'}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2 mt-6">
              <button
                type="button"
                onClick={handleSave}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
              >
                {copiedNotification ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Applied to QR Code!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Apply Brand Style to Link</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={downloadSVG}
                  className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-neutral-700"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Vector SVG</span>
                </button>
                <button
                  type="button"
                  onClick={downloadHighResPNG}
                  disabled={isExporting}
                  className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-neutral-700"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-400" />
                  <span>High-Res PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
