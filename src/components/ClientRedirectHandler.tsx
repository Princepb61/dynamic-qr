import React, { useEffect, useState } from 'react';
import { localDb } from '../services/localDb';
import { api } from '../services/api';
import { LinkRecord } from '../types';
import {
  ExternalLink,
  AlertCircle,
  Clock,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { getLast4Letters } from '../utils/a4QrHelper';

interface ClientRedirectHandlerProps {
  slug: string;
}

export const ClientRedirectHandler: React.FC<ClientRedirectHandlerProps> = ({ slug }) => {
  const [link, setLink] = useState<LinkRecord | null | undefined>(undefined);
  const [isRedirecting, setIsRedirecting] = useState(false);

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

  // Assignment Form State
  const [destinationUrl, setDestinationUrl] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  useEffect(() => {
    const found = localDb.getLinkBySlug(slug);
    setLink(found || null);

    if (found) {
      setAssignTitle(found.title || '');
    }

    if (found && found.isActive && found.destinationUrl) {
      if (found.presentationMode !== 'button_page') {
        setIsRedirecting(true);
        localDb.simulateScan(found.id, 'mobile');
        const timer = setTimeout(() => {
          window.location.replace(found.destinationUrl);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [slug]);

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
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSaveAndRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;
    setAssignError(null);

    let target = destinationUrl.trim();
    if (!target) {
      setAssignError('Please enter a destination URL.');
      return;
    }

    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    try {
      new URL(target);
    } catch {
      setAssignError('Please enter a valid website address (e.g. https://yourbusiness.com).');
      return;
    }

    try {
      setIsAssigning(true);
      await api.assignBatchLink(link.id, {
        destinationUrl: target,
        title: assignTitle.trim() || link.title,
      });

      setAssignSuccess(`QR code /r/${link.slug} is now live! Redirecting...`);
      setTimeout(() => {
        window.location.replace(target);
      }, 1200);
    } catch (err: any) {
      setAssignError(err.message || 'Failed to bind destination URL.');
      setIsAssigning(false);
    }
  };

  // 1. Loading State
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

  // 2. Link Not Found
  if (!link) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-2">Dynamic Link Not Found</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mb-6">
            The short link <code className="bg-neutral-800 px-2 py-1 rounded text-neutral-300 font-mono">/r/{slug}</code> does not exist or has not been deployed yet.
          </p>
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="w-full bg-white text-neutral-900 font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm hover:bg-neutral-100 transition-colors shadow-xs"
          >
            Go to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 3. Link Is Paused
  if (!link.isActive) {
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

  // 4. PRE-PRINTED / UNASSIGNED QR CODE: Dedicated On-Screen Scan-to-Assign Workflow!
  if (!link.destinationUrl || link.isAssigned === false) {
    const batchCode = getLast4Letters(link.slug);

    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-3 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-5">
          {/* Top Badge & Identifier */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-950/60 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-800/60 shadow-xs">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-indigo-950 text-indigo-300 rounded-md border border-indigo-800 mb-1">
                <span>Code: {batchCode}</span>
                <span>&bull;</span>
                <span>/r/{link.slug}</span>
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">{link.title}</h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Physical QR code scanned. Assign destination URL to activate routing!
              </p>
            </div>
          </div>

          {/* STEP A: If NOT logged in, prompt for admin email & password */}
          {!isAdminLoggedIn ? (
            <div className="space-y-4 pt-2 border-t border-neutral-800">
              <div className="p-3 bg-neutral-800/80 rounded-xl border border-neutral-700/80 text-xs text-neutral-300 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p>Sign in with your administrator ID and password to link this QR code on the spot.</p>
              </div>

              {authError && (
                <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-xs font-medium">
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
                    className="w-full px-3 py-2 text-xs font-mono bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
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
                    className="w-full px-3 py-2 text-xs bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isAuthenticating ? 'Verifying...' : 'Unlock & Assign Destination'}</span>
                </button>
              </form>
            </div>
          ) : (
            /* STEP B: Once logged in, show instant Destination URL Binding form! */
            <div className="space-y-4 pt-2 border-t border-neutral-800">
              <div className="p-3 bg-emerald-950/40 border border-emerald-900 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>Admin session verified. Enter the web address below to activate this QR code immediately.</p>
              </div>

              {assignError && (
                <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-xs font-medium">
                  {assignError}
                </div>
              )}

              {assignSuccess && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{assignSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveAndRedirect} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Destination Website URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://example.com/daily-menu"
                    required
                    autoFocus
                    className="w-full px-3 py-2.5 text-xs font-mono bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Location Identifier / Title
                  </label>
                  <input
                    type="text"
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    placeholder="e.g. Table 04 Acrylic Standee"
                    className="w-full px-3 py-2 text-xs bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAssigning}
                  className="w-full py-2.5 px-4 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isAssigning ? 'Activating QR...' : 'Bind Destination & Activate QR'}</span>
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

  // 5. Dynamic Button Page mode
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
            <span>·</span>
            <span>taplocalin Platform</span>
          </div>
        </div>
      </div>
    );
  }

  // 6. Automatic Instant HTTP 307 Redirecting Screen
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
