import React, { useState, useEffect } from 'react';
import { LinkRecord } from '../types';
import { X, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

interface EditDestinationModalProps {
  link: LinkRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: { destinationUrl: string; title: string; description: string }) => Promise<void>;
}

export const EditDestinationModal: React.FC<EditDestinationModalProps> = ({
  link,
  isOpen,
  onClose,
  onSave,
}) => {
  const [destinationUrl, setDestinationUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (link) {
      setDestinationUrl(link.destinationUrl);
      setTitle(link.title);
      setDescription(link.description || '');
      setError(null);
    }
  }, [link]);

  if (!isOpen || !link) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let target = destinationUrl.trim();
    if (!target) {
      setError('Please provide a destination URL.');
      return;
    }

    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    try {
      new URL(target);
    } catch {
      setError('Please enter a valid web URL (e.g. https://yourcompany.com/landing).');
      return;
    }

    try {
      setIsSaving(true);
      await onSave(link.id, {
        destinationUrl: target,
        title: title.trim() || link.title,
        description: description.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update destination');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Change Destination URL</h3>
            <p className="text-xs text-neutral-500 font-mono">Dynamic endpoint: /r/{link.slug}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Reassurance Callout */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-blue-950">Printed QR codes stay 100% valid.</span>
              <p className="text-blue-800 leading-relaxed">
                You do not need to re-print flyers, packaging, or table tents. The short link and QR code continue working, and will redirect to this new destination URL immediately.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          {/* Current vs New comparison */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Current Destination
            </label>
            <div className="text-xs font-mono text-neutral-500 bg-neutral-100 px-3 py-2 rounded-lg border border-neutral-200 truncate">
              {link.destinationUrl}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              New Destination URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://example.com/new-campaign"
              className="w-full px-3.5 py-2.5 text-xs font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 transition-colors"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Link Title / Campaign Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Promo Standee"
              className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Placement Notes (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Table tents on 2nd floor café"
              rows={2}
              className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              {isSaving ? 'Updating...' : 'Update Destination Immediately'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
