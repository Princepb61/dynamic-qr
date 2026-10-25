import React, { useState, useRef } from 'react';
import { UserRecord, LinkRecord } from '../types';
import { localDb } from '../services/localDb';
import {
  X,
  User,
  ShieldCheck,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  LogOut,
  QrCode,
  HardDrive,
  Copy,
  Check,
} from 'lucide-react';

interface ProfileBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserRecord | null;
  links: LinkRecord[];
  onLogout: () => void;
  onRefreshData: () => Promise<void>;
  onAddToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const ProfileBackupModal: React.FC<ProfileBackupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  links,
  onLogout,
  onRefreshData,
  onAddToast,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !currentUser) return null;

  const totalScans = links.reduce((sum, l) => sum + (l.totalClicks || 0), 0);

  const handleExportBackup = () => {
    try {
      setIsExporting(true);
      const data = localDb.exportBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const linkEl = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      linkEl.href = url;
      linkEl.download = `taplocalin-qr-backup-${timestamp}.json`;
      document.body.appendChild(linkEl);
      linkEl.click();
      document.body.removeChild(linkEl);
      URL.revokeObjectURL(url);
      onAddToast('success', `Exported ${links.length} dynamic links and QR stock to JSON backup!`);
    } catch (err: any) {
      console.error('Backup export failed:', err);
      onAddToast('error', 'Failed to generate backup file.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportMessage(null);
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = localDb.importBackup(parsed);
      if (res.success) {
        setImportMessage({
          type: 'success',
          text: `Successfully restored ${res.count} links and QR codes!`,
        });
        onAddToast('success', `Restored ${res.count} links from backup!`);
        await onRefreshData();
      } else {
        throw new Error(res.error || 'Invalid backup format');
      }
    } catch (err: any) {
      setImportMessage({
        type: 'error',
        text: err.message || 'Failed to parse backup JSON file.',
      });
      onAddToast('error', 'Invalid or corrupt backup JSON file.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">Admin Profile & Data Security</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Account status & 1-click database backup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Profile Details Card */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Account</span>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                  Master Administrator
                </span>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-neutral-900 dark:text-white">{currentUser.name}</div>
              <div className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{currentUser.email}</div>
            </div>

            {/* Quick Metrics */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/80 grid grid-cols-2 gap-3 text-center">
              <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-750">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">QR Link Stock</span>
                <span className="text-lg font-black font-mono tabular-nums text-neutral-900 dark:text-white">{links.length}</span>
              </div>
              <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-750">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total Scans</span>
                <span className="text-lg font-black font-mono tabular-nums text-indigo-600 dark:text-indigo-400">{totalScans}</span>
              </div>
            </div>
          </div>

          {/* Data Safety Reassurance */}
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
            <HardDrive className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-blue-950 dark:text-blue-200">Logout Safety Guarantee</span>
              <p className="text-blue-800 dark:text-blue-300 leading-relaxed font-normal">
                Logging out only ends your active session. All your created dynamic QR codes, pre-printed stock batches, and destination assignments remain permanently saved in your profile and reload automatically upon signing in.
              </p>
            </div>
          </div>

          {/* Import / Export Feedback */}
          {importMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                importMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
              }`}
            >
              {importMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span>{importMessage.text}</span>
            </div>
          )}

          {/* 1-Click JSON Backup & Restore Actions */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
              Offline Data Backup & Migration
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Download a complete JSON snapshot of all QR endpoints, or restore a backup across new browsers and devices.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Exporting...' : 'Download JSON Backup'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isImporting ? 'Restoring...' : 'Restore from JSON File'}</span>
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Sign Out Action */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">End your administrator session</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors border border-red-200 dark:border-red-900/60"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
