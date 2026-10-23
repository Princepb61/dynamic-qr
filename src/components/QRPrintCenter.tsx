import React, { useState, useEffect, useRef } from 'react';
import { LinkRecord } from '../types';
import QRCode from 'qrcode';
import { Printer, Download, Sparkles, Check, Copy } from 'lucide-react';

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

  const [template, setTemplate] = useState<'standee' | 'sticker' | 'poster' | 'badge'>('standee');
  const [headline, setHeadline] = useState('Scan with your smartphone camera');
  const [subcaption, setSubcaption] = useState('Instant access · No app required · Always up to date');
  const [brandName, setBrandName] = useState('DynamicQR Studio');
  const [callToAction, setCallToAction] = useState('Point camera at the code below to open');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const fullRedirectUrl = currentLink ? `${baseUrl}/r/${currentLink.slug}` : '';

  useEffect(() => {
    if (!currentLink || !canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      fullRedirectUrl,
      {
        width: template === 'poster' ? 240 : template === 'sticker' ? 140 : 180,
        margin: 1,
        color: {
          dark: currentLink.qrSettings?.colorDark || '#0f172a',
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

  if (!currentLink) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-500">
        <p className="text-sm">Create a dynamic link first to generate printable display sheets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-base font-bold text-neutral-900">QR Print & Display Sheet Center</h2>
          <p className="text-xs text-neutral-500">
            Generate physical flyers, acrylic table tents, and product stickers with guaranteed dynamic destination persistence.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Display Sheet</span>
          </button>
        </div>
      </div>

      {/* Editor & Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4 print:hidden">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
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
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Physical Format Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'standee', name: 'Table Stand (4x6")' },
                { id: 'sticker', name: 'Sticker (Square)' },
                { id: 'poster', name: 'Poster (A4/Letter)' },
                { id: 'badge', name: 'Badge Card' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTemplate(item.id as any)}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-colors ${
                    template === item.id
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Headline Title
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Call to Action
            </label>
            <input
              type="text"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Footnote / Subtitle
            </label>
            <input
              type="text"
              value={subcaption}
              onChange={(e) => setSubcaption(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Organization / Brand Name
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div className="pt-2 border-t border-neutral-100 text-xs text-neutral-500">
            <span className="font-semibold text-neutral-800">Print Note:</span> When printed via browser, this container is automatically isolated with no backgrounds or web chrome.
          </div>
        </div>

        {/* Live Print Preview Sheet */}
        <div className="lg:col-span-8 flex justify-center bg-neutral-100/70 p-8 rounded-xl border border-neutral-200/80 min-h-[500px]">
          {/* Printable Container */}
          <div
            id="printable-card"
            className={`bg-white shadow-md border border-neutral-300 rounded-xl p-8 flex flex-col items-center justify-between text-center transition-all ${
              template === 'standee'
                ? 'w-full max-w-sm aspect-[4/6]'
                : template === 'sticker'
                ? 'w-full max-w-xs aspect-square'
                : template === 'poster'
                ? 'w-full max-w-md aspect-[3/4]'
                : 'w-full max-w-sm aspect-[5/3]'
            }`}
          >
            {/* Header of the Print Card */}
            <div className="space-y-1 w-full">
              <div className="text-[11px] font-bold tracking-widest text-neutral-400 uppercase">
                {brandName}
              </div>
              <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight leading-snug">
                {headline}
              </h1>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                {callToAction}
              </p>
            </div>

            {/* QR Canvas Container with Clean Inner Frame */}
            <div className="p-4 bg-white border-2 border-neutral-900 rounded-2xl shadow-xs my-4 flex items-center justify-center">
              <canvas ref={canvasRef} />
            </div>

            {/* Bottom Details of the Print Card */}
            <div className="space-y-2 w-full pt-2 border-t border-neutral-100">
              <div className="text-xs font-semibold text-neutral-800">
                {currentLink.title}
              </div>
              <div className="text-[11px] font-mono text-neutral-400">
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
