import React, { useState, useEffect, useRef } from 'react';
import { LinkRecord } from '../types';
import QRCode from 'qrcode';
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  Link as LinkIcon,
  Wifi,
  Phone,
  MessageSquare,
  Star,
  Coffee,
  Trash2,
  Printer,
} from 'lucide-react';
import { getLast4Letters, downloadA4QRImage } from '../utils/a4QrHelper';

interface QRStudioModalProps {
  link: LinkRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteQR?: (id: string) => void;
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
  onDeleteQR,
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

  const [isDownloadingA4, setIsDownloadingA4] = useState(false);

  const handleDownloadA4 = async () => {
    if (!link) return;
    try {
      setIsDownloadingA4(true);
      await downloadA4QRImage({
        slug: link.slug,
        title: link.title,
        fullUrl: fullRedirectUrl,
        brandName: 'taplocalin',
        subcaption: 'Scan with smartphone camera to open',
      });
    } catch (err) {
      console.error('A4 download error:', err);
    } finally {
      setIsDownloadingA4(false);
    }
  };

  const handlePrintA4 = () => {
    window.print();
  };

  const handleDownloadPNG = async () => {
    try {
      const last4 = getLast4Letters(link.slug);
      // Generate clean simple QR canvas
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, fullRedirectUrl, {
        width: exportRes,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });

      // Canvas with space underneath for batch code (no outline border)
      const footerHeight = Math.round(exportRes * 0.14);
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = exportRes;
      outputCanvas.height = exportRes + footerHeight;
      const ctx = outputCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
        ctx.drawImage(qrCanvas, 0, 0);

        // Mention ONLY batch code under QR without outline border
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.font = `bold ${Math.round(exportRes * 0.055)}px ui-monospace, monospace`;
        ctx.fillText(last4, exportRes / 2, exportRes + Math.round(footerHeight * 0.65));
      }

      const a = document.createElement('a');
      a.href = outputCanvas.toDataURL('image/png');
      a.download = `${link.slug}-qr-${last4}.png`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">QR Code Studio</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate max-w-[240px] sm:max-w-md">Dynamic destination: {link.destinationUrl || '(Unassigned Pre-Printed Stock)'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
          {/* Left Column: QR Canvas & Frame Preview */}
          <div className="flex flex-col items-center">
            {/* Clean Borderless QR Code Container */}
            <div
              className="p-3 rounded-2xl transition-all flex flex-col items-center bg-white dark:bg-neutral-800"
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

            {/* Mention ONLY the batch code directly under QR (No outline border, no "last 4" label) */}
            <div className="mt-2 text-center w-full">
              <span className="text-lg font-mono font-black text-neutral-900 dark:text-white tracking-widest">
                {getLast4Letters(link.slug)}
              </span>
            </div>

            {/* COPY PERMANENT LINK BUTTON DIRECTLY UNDER THE QR */}
            <div className="mt-3 w-full">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-xs active:scale-[0.98]"
              >
                {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                <span>{copiedLink ? 'Copied Permanent Link!' : 'Copy Permanent Link'}</span>
              </button>
            </div>

            {/* Target URL Info */}
            <div className="mt-4 text-center w-full">
              <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">{link.title}</div>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                <span className="truncate max-w-[200px]">{fullRedirectUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                  title="Copy short link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-4 w-full flex items-center gap-2">
              <button
                onClick={handleCopyImage}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedImage ? 'Copied PNG!' : 'Copy Image'}</span>
              </button>
              <a
                href={fullRedirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Redirect</span>
              </a>
            </div>

            {/* Prominent Delete QR Code Button */}
            {onDeleteQR && (
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete this QR code ("/r/${link.slug}")? This cannot be undone.`)) {
                    onDeleteQR(link.id);
                    onClose();
                  }
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-lg transition-colors border border-red-200 dark:border-red-900 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                <span>Delete QR Code</span>
              </button>
            )}
          </div>

          {/* Right Column: Customization Controls & Export */}
          <div className="space-y-4">
            {/* FRAME CUSTOMIZER */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Frame Style
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
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-colors ${
                      frameStyle === item.id
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
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
                  className="w-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg text-center focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                />
              )}
            </div>

            {/* CENTER ICON EMBEDDING */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
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
                    className={`py-1 px-2.5 text-xs font-bold rounded-md border transition-colors ${
                      centerIcon === ic.id
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {ic.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Foreground Color Swatches */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Foreground Color
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setColorDark(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full border border-black/10 dark:border-white/10 transition-transform ${
                      colorDark.toLowerCase() === c.hex.toLowerCase() ? 'scale-125 ring-2 ring-neutral-900 dark:ring-white ring-offset-2 dark:ring-offset-neutral-900' : ''
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
                  className="w-7 h-7 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={colorDark}
                  onChange={(e) => setColorDark(e.target.value)}
                  className="text-xs font-mono font-bold px-2 py-1 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg w-24 uppercase"
                />
              </div>
            </div>

            {/* Quiet Zone Margin */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Quiet Zone Padding</label>
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 font-bold">{margin} blocks</span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                className="w-full accent-neutral-900 dark:accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Resolution Selector for PNG */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
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
                    className={`py-1 px-2 text-xs font-bold rounded-lg border transition-colors ${
                      exportRes === item.res
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Download & Print Actions */}
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2.5">
              {/* PRIMARY ACTION: Download A4 Size Image */}
              <button
                onClick={handleDownloadA4}
                disabled={isDownloadingA4}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-xl transition-all shadow-sm"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>{isDownloadingA4 ? 'Generating A4 Image...' : 'Download A4 Size Image (Print Ready)'}</span>
              </button>
              <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 px-1 font-medium">
                <span>Standard A4 (210×297mm · 2480×3508px)</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Code: {getLast4Letters(link.slug)}</span>
              </div>

              {/* Direct Print A4 Command Button */}
              <button
                onClick={handlePrintA4}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors border border-neutral-300 dark:border-neutral-700"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Command Print (A4 Format)</span>
              </button>

              {/* Secondary Single Asset Downloads */}
              <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadPNG}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-3 text-xs font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/80 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700 shadow-2xs"
                  title="Download clean QR PNG with batch code"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Simple PNG ({exportRes}px)</span>
                </button>
                <button
                  onClick={handleDownloadSVG}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 sm:py-2 px-3 text-xs font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/80 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Vector SVG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
