import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit,
  BarChart3,
  RotateCw,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { LinkRecord } from '../types';
import { api } from '../services/api';
import { getLast4Letters } from '../utils/a4QrHelper';
import jsQR from 'jsqr';

interface CameraQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  links: LinkRecord[];
  onOpenAssign: (link: LinkRecord) => void;
  onOpenEdit: (link: LinkRecord) => void;
  onOpenAnalytics: (linkId: string) => void;
}

export const CameraQRScannerModal: React.FC<CameraQRScannerModalProps> = ({
  isOpen,
  onClose,
  links,
  onOpenAssign,
  onOpenEdit,
  onOpenAnalytics,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Scanned result state
  const [scannedText, setScannedText] = useState<string | null>(null);
  const [resolvedLink, setResolvedLink] = useState<LinkRecord | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Manual fallback code
  const [manualCode, setManualCode] = useState('');

  // Scanning loop interval
  const scanningRef = useRef<boolean>(false);

  // Start Camera
  const startCamera = async (mode: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported in this browser. Please use manual code lookup.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startScanningLoop();
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings.');
      } else {
        setCameraError('Could not start camera. You can still look up any QR code manually below.');
      }
    }
  };

  const stopCamera = () => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startScanningLoop = () => {
    scanningRef.current = true;

    // Use offscreen canvas for high-performance cross-platform decoding with jsQR
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let lastScanTime = 0;

    const scanFrame = () => {
      if (!scanningRef.current || !videoRef.current) return;

      const video = videoRef.current;
      const now = performance.now();

      // Scan every ~60ms for smooth 16fps scanning without overwhelming the CPU
      if (video.readyState === video.HAVE_ENOUGH_DATA && now - lastScanTime >= 60) {
        lastScanTime = now;
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0 && ctx) {
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          try {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data && code.data.trim()) {
              handleCodeDetected(code.data.trim());
              return;
            }
          } catch (err) {
            console.debug('jsQR decode error', err);
          }
        }
      }

      if (scanningRef.current) {
        requestAnimationFrame(scanFrame);
      }
    };

    requestAnimationFrame(scanFrame);
  };

  const extractSlugFromText = (text: string): string => {
    let clean = text.trim();
    // If it's a URL like https://.../r/table-01-a3fc
    const rMatch = clean.match(/\/r\/([a-zA-Z0-9_-]+)/);
    if (rMatch && rMatch[1]) {
      return rMatch[1];
    }
    // If it's just a slug or starts with http
    clean = clean.replace(/^https?:\/\/[^\/]+/, '');
    clean = clean.replace(/^\/r\//, '').replace(/^\//, '');
    return clean;
  };

  const handleCodeDetected = async (detected: string) => {
    scanningRef.current = false;
    setScannedText(detected);
    setIsSearching(true);

    try {
      // Audio beep
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch {}

      // Vibration
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

      const slug = extractSlugFromText(detected);

      // Look up in links prop first
      let found = links.find(
        (l) => l.slug.toLowerCase() === slug.toLowerCase() || l.id.toLowerCase() === slug.toLowerCase()
      );

      // If not in props, look up via API / Firestore
      if (!found) {
        const cloudLinks = await api.getLinks();
        found = cloudLinks.links.find(
          (l) => l.slug.toLowerCase() === slug.toLowerCase() || l.id.toLowerCase() === slug.toLowerCase()
        );
      }

      if (found) {
        setResolvedLink(found);
      } else {
        // Construct mock unassigned link structure for instant assignment
        setResolvedLink({
          id: `link_${slug}`,
          slug: slug,
          title: `Scanned Physical QR (${slug})`,
          destinationUrl: '',
          isActive: true,
          isAssigned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalClicks: 0,
        });
      }
    } catch (e) {
      console.warn('Scan resolution error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeDetected(manualCode.trim());
  };

  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleResetScanner = () => {
    setScannedText(null);
    setResolvedLink(null);
    setManualCode('');
    startScanningLoop();
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
      setScannedText(null);
      setResolvedLink(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                In-App Quick Scanner
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Live Admin
                </span>
              </h2>
              <p className="text-xs text-neutral-400">Scan physical QR codes without leaving your dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {!scannedText ? (
            <>
              {/* Camera Viewfinder */}
              <div className="relative aspect-square w-full rounded-2xl bg-black border border-neutral-800 overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                {/* Laser scan line overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    {/* Viewfinder brackets */}
                    <div className="relative w-64 h-64 border-2 border-indigo-500/60 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.25)]">
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-[bounce_2s_infinite]" />
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
                    </div>
                    <span className="mt-4 text-xs font-medium text-white/90 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                      Align QR code inside box
                    </span>
                  </div>
                )}

                {/* Camera error / fallback state */}
                {cameraError && (
                  <div className="absolute inset-0 bg-neutral-950 p-6 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                    <p className="text-sm text-neutral-300 font-medium max-w-xs">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="mt-4 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}

                {/* Camera Flip Button */}
                {cameraActive && (
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    className="absolute bottom-3 right-3 p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-transform active:scale-90"
                    title="Switch Camera"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Manual Lookup Form */}
              <div className="pt-2">
                <form onSubmit={handleManualSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Or enter 4-digit code (e.g. 7k29 or table-01)"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap active:scale-95"
                  >
                    Lookup
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Scanned Code Found View */
            <div className="space-y-4 animate-in fade-in zoom-in-95">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                    Detected QR Code
                  </span>
                  {resolvedLink?.isAssigned ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Assigned & Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      Unassigned Stock
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {resolvedLink?.title || 'Physical QR Tag'}
                    </h3>
                    <p className="text-xs font-mono text-neutral-400 mt-0.5">
                      /r/{resolvedLink?.slug}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 uppercase font-mono block">4-Digit Code</span>
                    <span className="text-sm font-mono font-bold text-amber-400">
                      {getLast4Letters(resolvedLink?.slug || '')}
                    </span>
                  </div>
                </div>

                {resolvedLink?.isAssigned ? (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300">
                      <span className="text-[10px] uppercase font-mono text-neutral-500 block mb-0.5">Current Destination</span>
                      <a
                        href={resolvedLink.destinationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline break-all flex items-center gap-1.5 font-medium"
                      >
                        {resolvedLink.destinationUrl}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                      <span>Total Scans: <strong className="text-white">{resolvedLink.totalClicks || 0}</strong></span>
                      <span>Updated: {new Date(resolvedLink.updatedAt || '').toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> Ready for Immediate Assignment
                    </p>
                    <p className="mt-1 text-neutral-300">
                      This QR sticker is printed and active. Assign a destination URL below so customers can start scanning immediately.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                {resolvedLink?.isAssigned ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenEdit(resolvedLink);
                      }}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Destination URL
                    </button>
                    <div className="flex gap-2">
                      <a
                        href={`/r/${resolvedLink.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Test Redirect
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAnalytics(resolvedLink.id);
                        }}
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition-colors"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (resolvedLink) onOpenAssign(resolvedLink);
                    }}
                    className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-98"
                  >
                    <Sparkles className="w-4 h-4" />
                    Assign Destination URL Now
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetScanner}
                  className="w-full py-2.5 text-xs text-neutral-400 hover:text-white font-medium transition-colors"
                >
                  Scan Another Code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
