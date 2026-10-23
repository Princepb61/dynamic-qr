import React, { useState, useEffect, useRef } from 'react';
import { LinkRecord } from '../types';
import QRCode from 'qrcode';
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Sparkles,
  Link as LinkIcon,
  Wifi,
  Phone,
  MessageSquare,
  Star,
  Coffee,
  Trash2,
} from 'lucide-react';

interface QRStudioModalProps {
  link: LinkRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteQR?: (id: string) => void;
  onOpenSimulator?: () => void;
}

const PRESET_COLORS = [
  { name: 'Slate Black', hex: '#0f172a' },
  { name: 'Royal Navy', hex: '#1e3a8a' },
  { name: 'Forest Emerald', hex: '#064e3b' },
  { name: 'Imperial Violet', hex: '#312e81' },
  { name: 'Deep Burgundy', hex: '#881337' },
  { name: 'Coffee Bronze', hex: '#451a03' },
];

export const QRStudioModal: React.FC<QRStudioModalProps> = ({
  link,
  isOpen,
  onClose,
  onOpenPrint,
  onOpenSimulator,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [colorDark, setColorDark] = useState('#0f172a');
  const [colorLight, setColorLight] = useState('#ffffff');
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [margin, setMargin] = useState(2);
  const [frameStyle, setFrameStyle] = useState<'none' | 'bottom_badge' | 'top_badge' | 'rounded_card'>('bottom_badge');
  const [frameText, setFrameText] = useState('SCAN ME');
  const [centerIcon, setCenterIcon] = useState<'none' | 'link' | 'wifi' | 'phone' | 'message' | 'star' | 'coffee'>('none');
  const [exportRes, setExportRes] = useState<512 | 1024 | 2048>(1024);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  useEffect(() => {
    if (link) {
      setColorDark(link.qrSettings?.colorDark || '#0f172a');
      setColorLight(link.qrSettings?.colorLight || '#ffffff');
      setLevel(link.qrSettings?.errorCorrectionLevel || 'H');
      setMargin(typeof link.qrSettings?.margin === 'number' ? link.qrSettings.margin : 2);
      if (link.qrSettings?.frameStyle) setFrameStyle(link.qrSettings.frameStyle);
      if (link.qrSettings?.frameText) setFrameText(link.qrSettings.frameText);
    }
  }, [link]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const fullRedirectUrl = link ? `${baseUrl}/r/${link.slug}` : '';

  useEffect(() => {
    if (!isOpen || !link || !canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      fullRedirectUrl,
      {
        width: 220,
        margin,
        color: {
          dark: colorDark,
          light: colorLight,
        },
        errorCorrectionLevel: centerIcon !== 'none' ? 'H' : level,
      },
      (error) => {
        if (error) console.error('QR Render Error:', error);
      }
    );
  }, [isOpen, link, fullRedirectUrl, colorDark, colorLight, level, margin, centerIcon]);

  if (!isOpen || !link) return null;

  const handleDownloadPNG = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(fullRedirectUrl, {
        width: exportRes,
        margin,
        color: {
          dark: colorDark,
          light: colorLight,
        },
        errorCorrectionLevel: centerIcon !== 'none' ? 'H' : level,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${link.slug}-qr-${exportRes}px.png`;
      a.click();
    } catch (err) {
      console.error('PNG download error:', err);
    }
  };

  const handleDownloadSVG = async () => {
    try {
      const svgString = await QRCode.toString(fullRedirectUrl, {
        type: 'svg',
        margin,
        color: {
          dark: colorDark,
          light: colorLight,
        },
        errorCorrectionLevel: centerIcon !== 'none' ? 'H' : level,
      });

      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${link.slug}-qr-vector.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('SVG download error:', err);
    }
  };

  const handleCopyImage = async () => {
    try {
      if (!canvasRef.current) return;
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2000);
      });
    } catch (err) {
      console.error('Copy image error:', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullRedirectUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900">QR Code Studio</h3>
            <p className="text-xs text-neutral-500 font-mono">Dynamic destination: {link.destinationUrl || '(Unassigned Pre-Printed Stock)'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left Column: QR Canvas & Frame Preview */}
          <div className="flex flex-col items-center">
            {/* Framed QR Code Container */}
            <div
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center shadow-xs ${
                frameStyle === 'rounded_card'
                  ? 'border-neutral-900 bg-white shadow-md'
                  : 'border-neutral-200 bg-white'
              }`}
              style={{ backgroundColor: colorLight }}
            >
              {frameStyle === 'top_badge' && (
                <div className="text-[11px] font-black uppercase tracking-widest text-neutral-900 pb-1.5 text-center">
                  {frameText || 'SCAN ME'}
                </div>
              )}

              <div className="relative">
                <canvas ref={canvasRef} className="rounded" />
                {/* Center Icon Overlay */}
                {centerIcon !== 'none' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 bg-white rounded-lg shadow-md border-2 border-neutral-900 flex items-center justify-center">
                      {centerIcon === 'link' && <LinkIcon className="w-5 h-5 text-neutral-900" />}
                      {centerIcon === 'wifi' && <Wifi className="w-5 h-5 text-neutral-900" />}
                      {centerIcon === 'phone' && <Phone className="w-5 h-5 text-neutral-900" />}
                      {centerIcon === 'message' && <MessageSquare className="w-5 h-5 text-neutral-900" />}
                      {centerIcon === 'star' && <Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
                      {centerIcon === 'coffee' && <Coffee className="w-5 h-5 text-amber-800" />}
                    </div>
                  </div>
                )}
              </div>

              {frameStyle === 'bottom_badge' && (
                <div className="text-[11px] font-black uppercase tracking-widest bg-neutral-900 text-white px-3 py-1 rounded-md mt-2 w-full text-center shadow-2xs">
                  {frameText || 'SCAN ME'}
                </div>
              )}
            </div>

            {/* Target URL Info */}
            <div className="mt-4 text-center w-full">
              <div className="text-xs font-semibold text-neutral-900 truncate">{link.title}</div>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-neutral-500 font-mono">
                <span className="truncate max-w-[200px]">{fullRedirectUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
                  title="Copy short link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-4 w-full flex items-center gap-2">
              <button
                onClick={handleCopyImage}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedImage ? 'Copied PNG!' : 'Copy Image'}</span>
              </button>
              <a
                href={fullRedirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Redirect</span>
              </a>
            </div>

            {onDeleteQR && (
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete this QR code ("/r/${link.slug}")? This cannot be undone.`)) {
                    onDeleteQR(link.id);
                    onClose();
                  }
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete QR Code</span>
              </button>
            )}
          </div>

          {/* Right Column: Customization Controls & Export */}
          <div className="space-y-4">
            {/* FRAME CUSTOMIZER (Signature from PHP-Dynamic-QR) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Frame Style (PHP-Dynamic-QR Classic)
              </label>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {[
                  { id: 'bottom_badge', label: 'Bottom Frame' },
                  { id: 'top_badge', label: 'Top Frame' },
                  { id: 'none', label: 'No Frame' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFrameStyle(item.id as any)}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-colors ${
                      frameStyle === item.id
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {frameStyle !== 'none' && (
                <input
                  type="text"
                  value={frameText}
                  onChange={(e) => setFrameText(e.target.value)}
                  placeholder="SCAN ME"
                  className="w-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-neutral-300 rounded-lg text-center focus:outline-none focus:border-neutral-900"
                />
              )}
            </div>

            {/* CENTER ICON EMBEDDING */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Center Logo / Icon Badge
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'link', label: 'Link' },
                  { id: 'wifi', label: 'Wi-Fi' },
                  { id: 'phone', label: 'Phone' },
                  { id: 'message', label: 'Chat' },
                  { id: 'star', label: 'Star' },
                  { id: 'coffee', label: 'Café' },
                ].map((ic) => (
                  <button
                    key={ic.id}
                    onClick={() => setCenterIcon(ic.id as any)}
                    className={`py-1 px-2.5 text-xs font-medium rounded-md border transition-colors ${
                      centerIcon === ic.id
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {ic.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Foreground Color Swatches */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Foreground Color
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setColorDark(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full border border-black/10 transition-transform ${
                      colorDark.toLowerCase() === c.hex.toLowerCase() ? 'scale-125 ring-2 ring-neutral-900 ring-offset-2' : ''
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorDark}
                  onChange={(e) => setColorDark(e.target.value)}
                  className="w-7 h-7 rounded border border-neutral-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={colorDark}
                  onChange={(e) => setColorDark(e.target.value)}
                  className="text-xs font-mono px-2 py-1 border border-neutral-300 rounded-lg w-24 uppercase"
                />
              </div>
            </div>

            {/* Quiet Zone Margin */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-neutral-700">Quiet Zone Padding</label>
                <span className="text-xs font-mono text-neutral-500">{margin} blocks</span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                className="w-full accent-neutral-900 cursor-pointer"
              />
            </div>

            {/* Resolution Selector for PNG */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                PNG Resolution
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { res: 512, label: '512px (Screen)' },
                  { res: 1024, label: '1024px (Print)' },
                  { res: 2048, label: '2048px (Poster)' },
                ].map((item) => (
                  <button
                    key={item.res}
                    onClick={() => setExportRes(item.res as any)}
                    className={`py-1 px-2 text-xs font-medium rounded-lg border transition-colors ${
                      exportRes === item.res
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Download Buttons */}
            <div className="pt-2 border-t border-neutral-100 flex items-center gap-2">
              <button
                onClick={handleDownloadPNG}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>PNG ({exportRes}px)</span>
              </button>
              <button
                onClick={handleDownloadSVG}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-neutral-800 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors border border-neutral-200"
              >
                <Download className="w-4 h-4" />
                <span>Vector SVG</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
