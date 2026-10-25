import React, { useState, useEffect, useRef } from 'react';
import { LinkRecord } from '../types';
import QRCode from 'qrcode';
import { Printer, Download, Sparkles, Check, Copy } from 'lucide-react';
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

  const [template, setTemplate] = useState<'poster' | 'standee' | 'sticker' | 'badge'>('poster');
  const [headline, setHeadline] = useState('Scan with your smartphone camera');
  const [subcaption, setSubcaption] = useState('Instant access · No app required · Always up to date');
  const [brandName, setBrandName] = useState('taplocalin');
  const [callToAction, setCallToAction] = useState('Point camera at the code below to open');
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

    QRCode.toCanvas(
      canvasRef.current,
      fullRedirectUrl,
      {
        width: template === 'poster' ? 240 : template === 'sticker' ? 140 : 180,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      () => {}
    );
  }, [currentLink, fullRedirectUrl, template]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadA4 = async () => {
    if (!currentLink) return;
    try {
      setIsDownloadingA4(true);
      await downloadA4QRImage({
        slug: currentLink.slug,
        title: headline || currentLink.title,
        fullUrl: fullRedirectUrl,
        brandName: brandName || 'taplocalin',
        subcaption: callToAction || subcaption,
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
        <p className="text-sm">Create a dynamic link first to generate printable display sheets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden transition-colors">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">QR Print & Display Sheet Center</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            A4 format with borderless QR and batch code ({getLast4Letters(currentLink.slug)}) printed directly under the QR code.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleDownloadA4}
            disabled={isDownloadingA4}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{isDownloadingA4 ? 'Generating A4...' : 'Download A4 Image'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-xs font-bold text-neutral-800 dark:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print A4 Sheet</span>
          </button>
        </div>
      </div>

      {/* Editor & Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4 print:hidden transition-colors">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Select Link Asset
            </label>
            <select
              value={currentLink.id}
              onChange={(e) => {
                const found = links.find((l) => l.id === e.target.value);
                if (found) onSelectLink(found);
              }}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-neutral-900 font-medium"
            >
              {links.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} (/r/{l.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Physical Format Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'poster', name: 'A4 Sheet (210×297mm)' },
                { id: 'standee', name: 'Table Stand (4x6")' },
                { id: 'sticker', name: 'Sticker (Square)' },
                { id: 'badge', name: 'Badge Card' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTemplate(item.id as any)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-left transition-colors ${
                    template === item.id
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Headline Title
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Call to Action
            </label>
            <input
              type="text"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Footnote / Subtitle
            </label>
            <input
              type="text"
              value={subcaption}
              onChange={(e) => setSubcaption(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Organization / Brand Name
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <button
              onClick={handleDownloadA4}
              disabled={isDownloadingA4}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{isDownloadingA4 ? 'Generating A4...' : 'Download A4 Size Image'}</span>
            </button>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">A4 Guarantee:</span> Formatted for standard A4 paper with borderless QR and batch code ({getLast4Letters(currentLink.slug)}) printed directly beneath.
            </div>
          </div>
        </div>

        {/* Live Print Preview Sheet */}
        <div className="lg:col-span-8 flex justify-center bg-neutral-100/70 dark:bg-neutral-950/60 p-3 sm:p-6 lg:p-8 rounded-xl border border-neutral-200/80 dark:border-neutral-800 min-h-[420px] sm:min-h-[500px]">
          {/* Printable Container */}
          <div
            id="printable-card"
            className={`bg-white text-neutral-900 shadow-md border border-neutral-300 rounded-xl p-4 sm:p-8 flex flex-col items-center justify-between text-center transition-all ${
              template === 'poster'
                ? 'w-full max-w-[190mm] aspect-[210/297]'
                : template === 'standee'
                ? 'w-full max-w-sm aspect-[4/6]'
                : template === 'sticker'
                ? 'w-full max-w-xs aspect-square'
                : 'w-full max-w-sm aspect-[5/3]'
            }`}
          >
            {/* Header of the Print Card */}
            <div className="space-y-1 w-full">
              <div className="text-[11px] font-bold tracking-widest text-neutral-400 uppercase">
                {brandName}
              </div>
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-snug">
                {headline}
              </h1>
              <p className="text-xs text-neutral-600 max-w-md mx-auto">
                {callToAction}
              </p>
            </div>

            {/* QR Canvas Container (No outline border around QR) */}
            <div className="flex flex-col items-center my-4">
              <div className="p-2 bg-white flex items-center justify-center">
                <canvas ref={canvasRef} />
              </div>

              {/* Mention ONLY batch code directly under QR (No outline border, no "last 4" label) */}
              <div className="mt-2 text-center">
                <div className="text-3xl font-mono font-black text-neutral-950 tracking-widest">
                  {getLast4Letters(currentLink.slug)}
                </div>
              </div>

              {/* Copy Permanent Link button under QR */}
              <div className="mt-3 w-full max-w-xs print:hidden">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg transition-colors shadow-2xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{copiedLink ? 'Copied Permanent Link!' : 'Copy Permanent Link'}</span>
                </button>
              </div>
            </div>

            {/* Bottom Details of the Print Card */}
            <div className="space-y-1.5 w-full pt-3 border-t border-neutral-200">
              <div className="text-xs font-bold text-neutral-800">
                {currentLink.title}
              </div>
              <div className="text-xs font-mono font-bold text-neutral-600">
                {fullRedirectUrl}
              </div>
              <div className="text-[10px] text-neutral-400 font-medium tracking-wide">
                {subcaption}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
