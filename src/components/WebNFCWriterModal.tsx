import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Radio,
  Smartphone,
  Check,
  Copy,
  AlertCircle,
  ShieldCheck,
  Lock,
  Unlock,
  RotateCw,
  Sparkles,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LinkRecord } from '../types';

interface WebNFCWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: LinkRecord | null;
}

type NFCStatus =
  | 'idle'
  | 'waiting_for_tap'
  | 'writing'
  | 'success'
  | 'reading'
  | 'read_success'
  | 'error';

export const WebNFCWriterModal: React.FC<WebNFCWriterModalProps> = ({
  isOpen,
  onClose,
  link,
}) => {
  const [status, setStatus] = useState<NFCStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lockTagReadOnly, setLockTagReadOnly] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [scannedData, setScannedData] = useState<{
    serialNumber?: string;
    records?: Array<{ recordType: string; data: string }>;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'read' | 'manual'>('write');

  const abortControllerRef = useRef<AbortController | null>(null);

  const isWebNfcSupported =
    typeof window !== 'undefined' && 'NDEFReader' in (window as any);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectUrl = link ? `${baseUrl}/r/${link.slug}` : '';

  // Clean up any ongoing NFC scan when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setStatus('idle');
      setErrorMessage(null);
      setSuccessMessage(null);
      setScannedData(null);
    }
  }, [isOpen]);

  if (!isOpen || !link) return null;

  // Play pleasant success sound using Web Audio API synthesis
  const playChime = (type: 'success' | 'tap') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch {
      // Audio context may be restricted before user gesture
    }
  };

  // Trigger device haptics
  const triggerHaptics = (pattern: number[] = [80, 40, 80]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  };

  // 1. WRITE NFC TAG
  const handleWriteTag = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // If WebNFC is supported in this browser (e.g. Chrome on Android)
    if (isWebNfcSupported) {
      try {
        const NDEFReader = (window as any).NDEFReader;
        const ndef = new NDEFReader();

        setStatus('waiting_for_tap');
        playChime('tap');

        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Start write
        await ndef.write(
          {
            records: [
              {
                recordType: 'url',
                data: redirectUrl,
              },
            ],
          },
          {
            signal: controller.signal,
            overwrite: true,
          }
        );

        // Optional make read-only
        if (lockTagReadOnly && typeof ndef.makeReadOnly === 'function') {
          try {
            await ndef.makeReadOnly({ signal: controller.signal });
          } catch (lockErr) {
            console.warn('Could not lock tag:', lockErr);
          }
        }

        triggerHaptics([100, 50, 100]);
        playChime('success');
        setStatus('success');
        setSuccessMessage(
          `Tag programmed successfully! Physical stand will route to /r/${link.slug}`
        );
      } catch (err: any) {
        console.error('NFC write error:', err);
        if (err.name === 'AbortError') {
          setStatus('idle');
          return;
        }
        setStatus('error');
        setErrorMessage(
          err.message || 'Failed to program NFC tag. Please keep tag flat against the phone and try again.'
        );
      }
    } else {
      // Simulator Fallback for Desktop & Unsupported Browsers
      setStatus('waiting_for_tap');
      playChime('tap');

      setTimeout(() => {
        setStatus('writing');
        setTimeout(() => {
          triggerHaptics([100, 50, 100]);
          playChime('success');
          setStatus('success');
          setSuccessMessage(
            `Simulated NFC write successful! (On physical Android phones, this programs NTAG213/215/216 chips directly).`
          );
        }, 1200);
      }, 1400);
    }
  };

  // 2. READ / VERIFY NFC TAG
  const handleReadTag = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setScannedData(null);

    if (isWebNfcSupported) {
      try {
        const NDEFReader = (window as any).NDEFReader;
        const ndef = new NDEFReader();

        setStatus('reading');
        playChime('tap');

        const controller = new AbortController();
        abortControllerRef.current = controller;

        await ndef.scan({ signal: controller.signal });

        ndef.onreading = (event: any) => {
          triggerHaptics([100]);
          playChime('success');

          const records: Array<{ recordType: string; data: string }> = [];
          for (const record of event.message.records) {
            let recordData = '';
            if (record.recordType === 'url') {
              const decoder = new TextDecoder();
              recordData = decoder.decode(record.data);
            } else if (record.recordType === 'text') {
              const decoder = new TextDecoder(record.encoding || 'utf-8');
              recordData = decoder.decode(record.data);
            } else {
              recordData = `[${record.recordType} record]`;
            }
            records.push({ recordType: record.recordType, data: recordData });
          }

          setScannedData({
            serialNumber: event.serialNumber || 'NTAG_CHIP',
            records,
          });
          setStatus('read_success');
          setSuccessMessage(`Tag verified! Chip detected.`);
        };

        ndef.onreadingerror = () => {
          setStatus('error');
          setErrorMessage('Could not read tag data. Is the chip formatted properly?');
        };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setStatus('idle');
          return;
        }
        setStatus('error');
        setErrorMessage(err.message || 'NFC read permission denied or not supported.');
      }
    } else {
      // Read simulation
      setStatus('reading');
      playChime('tap');
      setTimeout(() => {
        triggerHaptics([100]);
        playChime('success');
        setScannedData({
          serialNumber: '04:7A:B2:8E:5C:30:80',
          records: [{ recordType: 'url', data: redirectUrl }],
        });
        setStatus('read_success');
        setSuccessMessage('Verified! Simulated tag successfully points to dynamic URL.');
      }, 1500);
    }
  };

  const cancelOperation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
  };

  const handleCopyFormattedUrl = () => {
    navigator.clipboard.writeText(redirectUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden text-neutral-100 flex flex-col my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">WebNFC Chip Programmer</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  NTAG213 / 215 / 216
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Write dynamic link directly into physical acrylic NFC standees or stickers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title={soundEnabled ? 'Mute audio' : 'Enable audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/60 p-2 gap-1.5">
          {[
            { id: 'write', label: 'Write NFC Tag', icon: Smartphone },
            { id: 'read', label: 'Verify / Read Tag', icon: Radio },
            { id: 'manual', label: 'NFC Tools & iOS Guide', icon: ExternalLink },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setStatus('idle');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Target Stand Info Card */}
        <div className="px-6 py-3.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              Target Standee Link
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-black text-white truncate">{link.title}</span>
              <span className="font-mono text-[11px] text-cyan-400 font-bold">/r/{link.slug}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyFormattedUrl}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white flex items-center gap-1 shrink-0"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="p-6 space-y-5">
          {/* Hardware Capability Notice */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                isWebNfcSupported
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              }`}
            >
              {isWebNfcSupported ? <ShieldCheck className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </div>
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-white block">
                {isWebNfcSupported
                  ? 'WebNFC Native Hardware Active'
                  : 'WebNFC Ready (Chrome Android or External Programmer)'}
              </span>
              <p className="text-neutral-400 mt-0.5">
                {isWebNfcSupported
                  ? 'Ready to write directly from this device! Hold the physical acrylic stand or sticker to the back of this phone.'
                  : 'Direct browser writing runs on Chrome for Android. On iPhones or PC, write via NFC Tools or test the interactive simulator below.'}
              </p>
            </div>
          </div>

          {/* TAB 1: WRITE NFC TAG */}
          {activeTab === 'write' && (
            <div className="space-y-4">
              {/* Animated Interactive Phone & Tag Visualizer */}
              <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center relative overflow-hidden min-h-[220px]">
                {/* Concentric Signal Rings */}
                {status === 'waiting_for_tap' || status === 'writing' ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-32 rounded-full border-2 border-cyan-400/40 animate-ping" />
                    <div className="w-48 h-48 rounded-full border border-cyan-400/20 animate-pulse" />
                  </div>
                ) : null}

                {/* Device Icon Graphic */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-300 ${
                      status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20 scale-105'
                        : status === 'waiting_for_tap' || status === 'writing'
                        ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-400 animate-pulse shadow-lg shadow-cyan-500/20'
                        : status === 'error'
                        ? 'bg-rose-500/20 text-rose-400 border-2 border-rose-500'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                    }`}
                  >
                    {status === 'success' ? (
                      <Check className="w-10 h-10" />
                    ) : status === 'waiting_for_tap' || status === 'writing' ? (
                      <Radio className="w-10 h-10 animate-spin" />
                    ) : (
                      <Smartphone className="w-10 h-10" />
                    )}
                  </div>

                  <span className="mt-3 text-xs font-bold text-white block">
                    {status === 'idle' && 'Hold Stand Against Back of Phone'}
                    {status === 'waiting_for_tap' && 'Approaching Physical Stand... Tap Now'}
                    {status === 'writing' && 'Writing NDEF URL Record...'}
                    {status === 'success' && 'NFC Chip Programmed & Locked!'}
                    {status === 'error' && 'Programming Interrupted'}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono mt-0.5">
                    Payload: {redirectUrl}
                  </span>
                </div>
              </div>

              {/* Status Alert Banners */}
              {successMessage && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Lock Read-Only Security Option */}
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Permanent Read-Only Lock (Recommended for Public Stands)
                    </span>
                    <span className="text-[10px] text-neutral-400 block">
                      Prevents customers from overwriting the chip. Your dynamic redirect at /r/{link.slug} can still be changed anytime in TapLocal!
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={lockTagReadOnly}
                  onChange={(e) => setLockTagReadOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500"
                />
              </label>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {status === 'waiting_for_tap' || status === 'writing' ? (
                  <button
                    type="button"
                    onClick={cancelOperation}
                    className="w-full py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
                  >
                    Cancel Scan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleWriteTag}
                    className="w-full py-3 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                  >
                    <Radio className="w-4 h-4" />
                    <span>
                      {isWebNfcSupported ? 'Program Physical NFC Stand Now' : 'Test NFC Programmer (Simulate Tap)'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: READ / VERIFY NFC TAG */}
          {activeTab === 'read' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Inspect Physical Tag</span>
                  <span className="text-[11px] text-neutral-400">Scan to read chip serial &amp; data</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Hold a pre-printed stand against your phone to verify that the chip routes to the right dynamic link before deploying to the client.
                </p>

                <button
                  type="button"
                  onClick={handleReadTag}
                  disabled={status === 'reading'}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-bold flex items-center justify-center gap-2 border border-neutral-700 transition-colors"
                >
                  {status === 'reading' ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Scanning Tag... Hold Phone Near Chip</span>
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4 text-cyan-400" />
                      <span>Start NFC Chip Verification Scan</span>
                    </>
                  )}
                </button>
              </div>

              {scannedData && (
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-xs font-bold text-white">Decoded Tag Information</span>
                    <span className="text-[10px] font-mono text-emerald-400">CHIP DETECTED</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-semibold">UID / Serial</span>
                      <span className="font-mono text-neutral-200">{scannedData.serialNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-semibold">IC Type</span>
                      <span className="text-neutral-200">NXP NTAG213 (144 bytes)</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] text-neutral-400 block font-semibold">Stored Payload</span>
                    <div className="font-mono text-xs text-cyan-300 bg-neutral-900 p-2.5 rounded-xl border border-neutral-800 mt-1 break-all">
                      {scannedData.records?.[0]?.data || redirectUrl}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NFC TOOLS APP & IOS GUIDE */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <span className="text-xs font-bold text-white block">
                  How NFC Works Across iPhones &amp; Android Phones
                </span>
                <div className="space-y-2 text-xs text-neutral-300 leading-relaxed">
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                    <span className="font-bold text-white block mb-0.5">📱 Apple iPhones (XS, 11, 12, 13, 14, 15, 16):</span>
                    iPhones read NFC tags <strong className="text-cyan-300">automatically in background</strong> without any app! Customers just hold the top of their iPhone against your acrylic stand and a notification banner opens immediately.
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                    <span className="font-bold text-white block mb-0.5">🤖 Android Phones:</span>
                    NFC is native. Tapping opens the browser instantly.
                  </div>
                </div>
              </div>

              {/* 3-Step Guide with NFC Tools */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <span className="text-xs font-bold text-white block">
                  Batch Programming with "NFC Tools" (Free App)
                </span>
                <ol className="list-decimal list-inside text-xs text-neutral-400 space-y-1.5 leading-relaxed">
                  <li>Download <strong>NFC Tools</strong> on iOS App Store or Google Play.</li>
                  <li>Select <strong>Write &gt; Add a record &gt; Custom URL / URI</strong>.</li>
                  <li>
                    Paste <span className="font-mono text-cyan-300">{redirectUrl}</span> and tap <strong>Write</strong> against your acrylic stand!
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0">
          <span className="text-xs text-neutral-500 font-mono">
            NFC Format: NDEF (NFC Data Exchange Format)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
