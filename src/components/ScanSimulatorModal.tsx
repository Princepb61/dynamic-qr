import React, { useState } from 'react';
import { LinkRecord } from '../types';
import { api } from '../services/api';
import {
  X,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  Zap,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface ScanSimulatorModalProps {
  links: LinkRecord[];
  initialLinkId?: string;
  isOpen: boolean;
  onClose: () => void;
  onScanRecorded: () => void;
}

const TEST_DEVICES = [
  { id: 'mobile', name: 'Apple iPhone 16 Pro', browser: 'Mobile Safari', icon: Smartphone },
  { id: 'mobile', name: 'Samsung Galaxy S24', browser: 'Chrome Mobile', icon: Smartphone },
  { id: 'tablet', name: 'Apple iPad Air', browser: 'Safari', icon: Tablet },
  { id: 'desktop', name: 'Apple MacBook Pro', browser: 'Google Chrome', icon: Laptop },
  { id: 'desktop', name: 'Windows 11 Workstation', browser: 'Microsoft Edge', icon: Laptop },
];

const TEST_LOCATIONS = [
  'New York, United States',
  'San Francisco, United States',
  'London, United Kingdom',
  'Tokyo, Japan',
  'Berlin, Germany',
  'Paris, France',
  'Sydney, Australia',
  'Singapore, Singapore',
];

export const ScanSimulatorModal: React.FC<ScanSimulatorModalProps> = ({
  links,
  initialLinkId,
  isOpen,
  onClose,
  onScanRecorded,
}) => {
  const [selectedLinkId, setSelectedLinkId] = useState<string>(
    initialLinkId || (links[0]?.id ?? '')
  );
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(TEST_LOCATIONS[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    slug: string;
    destinationUrl: string;
    timestamp: string;
  } | null>(null);

  if (!isOpen) return null;

  const selectedLink = links.find((l) => l.id === selectedLinkId) || links[0];
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const currentDevice = TEST_DEVICES[selectedDeviceIndex];

  const handleSimulate = async () => {
    if (!selectedLink) return;

    try {
      setIsSimulating(true);
      await api.simulateScan(
        selectedLink.id,
        currentDevice.id,
        selectedLocation
      );

      setLastResult({
        success: true,
        slug: selectedLink.slug,
        destinationUrl: selectedLink.destinationUrl,
        timestamp: new Date().toLocaleTimeString(),
      });

      onScanRecorded();
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">QR Scan Simulator</h3>
              <p className="text-xs text-neutral-500">Test live redirection without physical hardware</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {/* Link Picker */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Select Dynamic Link to Scan
            </label>
            <select
              value={selectedLinkId}
              onChange={(e) => {
                setSelectedLinkId(e.target.value);
                setLastResult(null);
              }}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-neutral-900 transition-colors font-medium text-neutral-900"
            >
              {links.map((link) => (
                <option key={link.id} value={link.id}>
                  {link.title} (/r/{link.slug})
                </option>
              ))}
            </select>
            {selectedLink && (
              <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between font-mono bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                <span className="truncate">Destination: {selectedLink.destinationUrl}</span>
                <span className="font-semibold text-neutral-800 shrink-0 ml-2">
                  {selectedLink.totalClicks} scans
                </span>
              </div>
            )}
          </div>

          {/* Device Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Simulated Client Device & Browser
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEST_DEVICES.map((dev, idx) => {
                const Icon = dev.icon;
                const isSelected = selectedDeviceIndex === idx;
                return (
                  <button
                    key={dev.name}
                    type="button"
                    onClick={() => setSelectedDeviceIndex(idx)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-500'}`} />
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate">{dev.name}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                        {dev.browser}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Picker */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Simulated Geographic Origin
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-neutral-900 transition-colors"
            >
              {TEST_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Success Banner */}
          {lastResult && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>HTTP 307 Dynamic Redirection Successful!</span>
              </div>
              <p className="text-emerald-800">
                Logged scan from <strong className="font-semibold">{currentDevice.name}</strong> in {selectedLocation} at {lastResult.timestamp}.
              </p>
              <div className="font-mono text-[11px] text-emerald-700 truncate pt-1">
                Routed to: {lastResult.destinationUrl}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-neutral-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-between gap-2.5 sm:gap-3">
            {selectedLink ? (
              <a
                href={`${baseUrl}/r/${selectedLink.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neutral-600 hover:text-neutral-900 underline flex items-center justify-center sm:justify-start gap-1 py-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test in New Tab</span>
              </a>
            ) : <div />}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors text-center"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSimulate}
                disabled={isSimulating || !selectedLink}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSimulating ? 'Logging Scan...' : 'Trigger Simulated Scan'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
