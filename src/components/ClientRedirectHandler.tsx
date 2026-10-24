import React, { useEffect, useState } from 'react';
import { localDb } from '../services/localDb';
import { LinkRecord } from '../types';
import { ExternalLink, AlertCircle, Clock, QrCode, ArrowRight } from 'lucide-react';

interface ClientRedirectHandlerProps {
  slug: string;
}

export const ClientRedirectHandler: React.FC<ClientRedirectHandlerProps> = ({ slug }) => {
  const [link, setLink] = useState<LinkRecord | null | undefined>(undefined);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const found = localDb.getLinkBySlug(slug);
    setLink(found || null);

    if (found && found.isActive && found.destinationUrl) {
      if (found.presentationMode !== 'button_page') {
        setIsRedirecting(true);
        // Record scan telemetry in local database
        localDb.simulateScan(found.id, 'mobile');
        const timer = setTimeout(() => {
          window.location.replace(found.destinationUrl);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [slug]);

  // Loading
  if (link === undefined) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-neutral-400">Loading dynamic link...</p>
        </div>
      </div>
    );
  }

  // Not Found
  if (!link) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-2">Dynamic Link Not Found</h1>
          <p className="text-neutral-400 text-sm mb-6">
            The short link <code className="bg-neutral-800 px-2 py-1 rounded text-neutral-300 font-mono">/r/{slug}</code> does not exist or may have been removed.
          </p>
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="w-full bg-white text-neutral-900 font-bold py-2.5 px-4 rounded-xl text-sm hover:bg-neutral-100 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Link is paused
  if (!link.isActive) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-amber-950/60 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-2">Link Temporarily Inactive</h1>
          <p className="text-neutral-400 text-sm mb-6">
            This QR code link has been temporarily paused by its owner. Please check back later.
          </p>
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="w-full bg-white text-neutral-900 font-bold py-2.5 px-4 rounded-xl text-sm hover:bg-neutral-100 transition-colors"
          >
            Go to Platform Home
          </button>
        </div>
      </div>
    );
  }

  // Pre-printed unassigned link
  if (!link.destinationUrl) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-indigo-950/60 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8" />
          </div>
          <span className="px-2.5 py-1 text-xs font-bold bg-indigo-950 text-indigo-300 rounded-md border border-indigo-800 inline-block mb-3">
            Pre-Printed Stock #{link.slug.slice(-4).toUpperCase()}
          </span>
          <h1 className="text-xl font-bold mb-2">{link.title}</h1>
          <p className="text-neutral-400 text-sm mb-6">
            This physical QR code is active and deployed, awaiting target URL assignment in the administrator dashboard.
          </p>
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl text-sm hover:bg-indigo-500 transition-colors shadow-xs"
          >
            Assign Destination in Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Dynamic Button Page mode
  if (link.presentationMode === 'button_page' && link.dynamicButton?.enabled) {
    const btn = link.dynamicButton;
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center shadow-2xl">
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
            <span className="font-mono text-neutral-400">Code: {link.slug.slice(-4).toUpperCase()}</span>
            <span>·</span>
            <span>taplocalin Platform</span>
          </div>
        </div>
      </div>
    );
  }

  // Automatic Instant Redirecting Screen
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl space-y-4">
        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-lg font-bold">Redirecting you now...</h2>
        <p className="text-xs text-neutral-400 font-mono truncate max-w-xs mx-auto">
          {link.destinationUrl}
        </p>
        <div className="pt-2">
          <a
            href={link.destinationUrl}
            className="text-xs text-indigo-400 hover:underline inline-flex items-center gap-1"
          >
            <span>Click here if not redirected automatically</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
