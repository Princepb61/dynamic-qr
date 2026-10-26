import React, { useState, useEffect, useRef } from 'react';
import { LinkRecord } from '../types';
import QRCode from 'qrcode';
import { Printer, Download, Check, Copy, QrCode } from 'lucide-react';
import { getLast4Letters, downloadA4QRImage } from '../utils/a4QrHelper';

interface QRPrintCenterProps {
  links: LinkRecord[];
  selectedLink: LinkRecord | null;
  onSelectLink: (link: LinkRecord) => void;
}

export const QRPrintCenter: React.FC<QRPrintCenterProps> = ({
  links,
  selectedLink,
  onSelectLink,
}) => {
  const currentLink = selectedLink || links[0] || null;

  const [qrSizeOption, setQrSizeOption] = useState<'large' | 'medium' | 'compact'>('large');
  const [isDownloadingA4, setIsDownloadingA4] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const fullRedirectUrl = currentLink ? `${baseUrl}/r/${currentLink.slug}` : '';

  const handleCopyLink = () => {
    if (!fullRedirectUrl) return;
    navigator.clipboard.writeText(fullRedirectUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  useEffect(() => {
    if (!currentLink || !canvasRef.current) return;

    // Canvas resolution size based on selection
    const size = qrSizeOption === 'large' ? 360 : qrSizeOption === 'medium' ? 260 : 180;

    QRCode.toCanvas(
      canvasRef.current,
      fullRedirectUrl,
      {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      () => {}
    );
  }, [currentLink, fullRedirectUrl, qrSizeOption]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadA4 = async () => {
    if (!currentLink) return;
    try {
      setIsDownloadingA4(true);
      await downloadA4QRImage({
        slug: currentLink.slug,
        fullUrl: fullRedirectUrl,
      });
    } catch (err) {
      console.error('Download A4 error:', err);
    } finally {
      setIsDownloadingA4(false);
    }
  };

  if (!currentLink) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center text-neutral-500 dark:text-neutral-400">
        <p className="text-sm font-semibold">No dynamic link selected</p>
        <p className="text-xs text-neutral-400 mt-1">Create a dynamic link first to generate printable display sheets.</p>
      </div>
    );
  }

  const batchCode = getLast4Letters(currentLink.slug);

  return (
    <div className="space-y-6">
      {/* Top Header Bar (Hidden during print) */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden transition-colors">
        <div>
          <h2 className="text-base sm:text-lg font-black tracking-tight text-neutral-950 dark:text-white">
            QR Print Center
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Clean A4 print format featuring only the borderless QR code and the 4-digit code.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleDownloadA4}
            disabled={isDownloadingA4}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs active:scale-[0.98]"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{isDownloadingA4 ? 'Generating Image...' : 'Download A4 Image'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-neutral-800 dark:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-xl transition-colors shadow-xs active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Editor & Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column (Hidden in print) */}
        <div className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4 print:hidden transition-colors">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Select Dynamic Link Asset
            </label>
            <select
              value={currentLink.id}
              onChange={(e) => {
                const found = links.find((l) => l.id === e.target.value);
                if (found) onSelectLink(found);
              }}
              className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 font-medium"
            >
              {links.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} (/r/{l.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Display Size on Sheet
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'large', label: 'Large (A4 Poster)' },
                { id: 'medium', label: 'Medium (Standee)' },
                { id: 'compact', label: 'Compact (Sticker)' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setQrSizeOption(item.id as any)}
                  className={`py-2 px-2.5 text-xs font-bold rounded-lg border text-center transition-colors ${
                    qrSizeOption === item.id
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Copy Permanent Link */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-xl transition-colors shadow-2xs"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              <span>{copiedLink ? 'Copied Permanent Link!' : `Copy Link (/r/${currentLink.slug})`}</span>
            </button>
          </div>

          {/* Guarantee Reassurance Notice */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
            <div className="font-bold text-neutral-900 dark:text-neutral-200 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Clean Print Layout</span>
            </div>
            <p className="leading-relaxed">
              All branding, titles, URLs, instructions, and outlines have been removed. The printed page contains exclusively the borderless QR code and its 4-digit code.
            </p>
          </div>
        </div>

        {/* Live Print Preview Sheet */}
        <div className="lg:col-span-8 flex justify-center bg-neutral-100/70 dark:bg-neutral-950/60 p-3 sm:p-6 lg:p-8 rounded-xl border border-neutral-200/80 dark:border-neutral-800 min-h-[420px] sm:min-h-[500px]">
          {/* Printable Container: EXCLUSIVELY QR CODE AND 4 DIGITS */}
          <div
            id="printable-card"
            className="bg-white text-neutral-900 shadow-lg border border-neutral-300 rounded-xl p-8 sm:p-12 flex flex-col items-center justify-center text-center transition-all w-full max-w-[210mm] aspect-[210/297] print:shadow-none print:border-none print:w-full print:h-screen print:max-w-none print:p-0 print:m-0"
          >
            {/* Pure Borderless QR Code Canvas */}
            <div className="flex items-center justify-center p-2 bg-white">
              <canvas ref={canvasRef} />
            </div>

            {/* ONLY the 4 digits directly underneath the QR code */}
            <div className="mt-4 sm:mt-6 text-center">
              <span className="text-3xl sm:text-5xl font-mono font-black text-neutral-950 tracking-widest block select-all">
                {batchCode}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
