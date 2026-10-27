import React from 'react';
import { QrCode, Sun, Moon, LogOut, Shield, Camera, Smartphone, MessageSquare } from 'lucide-react';
import { UserRecord } from '../types';

interface HeaderProps {
  user: UserRecord | null;
  activeTab: 'links' | 'batch-print';
  setActiveTab: (tab: 'links' | 'batch-print') => void;
  unassignedCount?: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  onOpenProfileModal?: () => void;
  onOpenScanner?: () => void;
  onOpenFeedbackInbox?: () => void;
  feedbackBadgeCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  unassignedCount = 0,
  darkMode,
  onToggleDarkMode,
  onLogout,
  onOpenProfileModal,
  onOpenScanner,
  onOpenFeedbackInbox,
  feedbackBadgeCount = 0,
}) => {
  const handleBrandClick = () => {
    setActiveTab('links');
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/';
    }
  };

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Zone 1: Clickable Brand Wordmark -> Redirect to Homepage */}
        <button
          type="button"
          onClick={handleBrandClick}
          className="flex items-center gap-2.5 sm:gap-3 shrink-0 text-left hover:opacity-85 transition-opacity cursor-pointer focus:outline-none group"
          title="Return to TapLocal Homepage"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-950 dark:bg-neutral-800 text-white flex items-center justify-center shadow-xs border border-neutral-800 dark:border-neutral-700 group-hover:scale-105 transition-transform">
            <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-black tracking-tight text-neutral-950 dark:text-white whitespace-nowrap block leading-tight">
              TAPLOCAL.IN
            </span>
            <span className="text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider block">
              Admin Console
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation (Desktop) - Clean & Focused */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-bold tracking-tight">
          <button
            onClick={() => setActiveTab('links')}
            className={`transition-colors whitespace-nowrap shrink-0 py-5 border-b-2 text-sm font-bold cursor-pointer ${
              activeTab === 'links'
                ? 'border-neutral-950 dark:border-white text-neutral-950 dark:text-white'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            Dynamic Links
          </button>
          {/* Multi-QR Batch Print & Assign Tab */}
          <button
            onClick={() => setActiveTab('batch-print')}
            className={`flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 py-5 border-b-2 text-sm font-bold cursor-pointer ${
              activeTab === 'batch-print'
                ? 'border-neutral-950 dark:border-white text-neutral-950 dark:text-white'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            <span>Multi-QR Print & Assign</span>
            {unassignedCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-black bg-indigo-600 text-white rounded-full leading-none shadow-xs">
                {unassignedCount}
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Quick Scan Camera, Feedback, Dark Mode Toggle, Profile & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick Scan Camera Button */}
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              title="Open In-App Camera Scanner"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-xs active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
          )}

          {/* Feedback Inbox Button */}
          {onOpenFeedbackInbox && (
            <button
              onClick={onOpenFeedbackInbox}
              title="Customer Reviews & Private Feedback Inbox"
              className="relative p-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Feedback Inbox"
            >
              <MessageSquare className="w-4 h-4" />
              {feedbackBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-neutral-950 font-black text-[9px] rounded-full flex items-center justify-center animate-pulse shadow-xs">
                  {feedbackBadgeCount > 9 ? '9+' : feedbackBadgeCount}
                </span>
              )}
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
          </button>

          {/* Profile & Backup Modal Trigger */}
          {user && onOpenProfileModal && (
            <button
              onClick={onOpenProfileModal}
              title="Cloud Sync, Profile & Database Backup"
              className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-neutral-950 dark:bg-neutral-700 text-white font-bold flex items-center justify-center text-[10px]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <span className="block text-neutral-900 dark:text-white leading-tight truncate max-w-[100px]">
                  {user.name}
                </span>
                <span className="text-[9px] text-neutral-500 dark:text-neutral-400 block leading-none">
                  {user.role === 'admin' ? 'Super Admin' : user.company || 'Client'}
                </span>
              </div>
            </button>
          )}

          {/* Logout Button */}
          {user && (
            <button
              onClick={onLogout}
              title="Sign out of Admin Console"
              className="p-2 rounded-lg text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden grid grid-cols-3 px-2 py-1.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-bold gap-1">
        <button
          onClick={() => setActiveTab('links')}
          className={`py-2 px-1 rounded-lg text-center transition-all min-h-[38px] flex items-center justify-center truncate ${
            activeTab === 'links'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-900 font-black shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
          }`}
        >
          Dynamic Links
        </button>
        <button
          onClick={() => setActiveTab('batch-print')}
          className={`py-2 px-1 rounded-lg text-center transition-all min-h-[38px] flex items-center justify-center gap-1 truncate ${
            activeTab === 'batch-print'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-900 font-black shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
          }`}
        >
          <span>Multi-QR Print</span>
          {unassignedCount > 0 && (
            <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] leading-none">
              {unassignedCount}
            </span>
          )}
        </button>
        {onOpenScanner && (
          <button
            onClick={onOpenScanner}
            className="py-2 px-1 rounded-lg text-center transition-all min-h-[38px] flex items-center justify-center gap-1 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </button>
        )}
      </div>
    </header>
  );
};
