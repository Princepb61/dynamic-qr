import React from 'react';
import { QrCode, Sun, Moon, LogOut, Shield, User, Printer, Users } from 'lucide-react';
import { UserRecord } from '../types';

interface HeaderProps {
  user: UserRecord | null;
  activeTab: 'links' | 'clients' | 'batch-print' | 'print';
  setActiveTab: (tab: 'links' | 'clients' | 'batch-print' | 'print') => void;
  pendingClientsCount?: number;
  unassignedCount?: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  pendingClientsCount = 0,
  unassignedCount = 0,
  darkMode,
  onToggleDarkMode,
  onLogout,
}) => {
  const isAdmin = user?.role === 'admin';

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Zone 1: Bold Brand Wordmark */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-neutral-950 dark:bg-neutral-800 text-white flex items-center justify-center shadow-xs border border-neutral-800 dark:border-neutral-700">
            <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-black tracking-tight text-neutral-950 dark:text-white whitespace-nowrap block leading-tight">
              taplocalin
            </span>
            <span className="text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider block">
              {isAdmin ? 'Admin Console' : 'Client Workspace'}
            </span>
          </div>
        </div>

        {/* Zone 2: Single-Line Bold Navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-bold tracking-tight">
          <button
            onClick={() => setActiveTab('links')}
            className={`transition-colors whitespace-nowrap shrink-0 py-5 border-b-2 text-sm font-bold ${
              activeTab === 'links'
                ? 'border-neutral-950 dark:border-white text-neutral-950 dark:text-white'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            {isAdmin ? 'Dynamic Links' : 'My Dynamic Links'}
          </button>

          {/* Dedicated Pre-Printed Multi-QR Print & Assign Tab */}
          <button
            onClick={() => setActiveTab('batch-print')}
            className={`flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 py-5 border-b-2 text-sm font-bold ${
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

          {/* Admin-only Client Approvals tab */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 py-5 border-b-2 text-sm font-bold ${
                activeTab === 'clients'
                  ? 'border-neutral-950 dark:border-white text-neutral-950 dark:text-white'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              <span>Client Approvals</span>
              {pendingClientsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-black bg-amber-500 text-white rounded-full leading-none shadow-xs">
                  {pendingClientsCount}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* Zone 3: Dark Mode Toggle, User Identity & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Dark Mode Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700"
            aria-label="Toggle color theme"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-700" />
            )}
          </button>

          {/* Desktop User Profile Capsule */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
              {isAdmin ? (
                <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              ) : (
                <User className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300 shrink-0" />
              )}
              <div className="truncate max-w-[140px] font-bold">
                {user.email}
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="p-1 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded text-neutral-400 dark:text-neutral-500 ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Sign Out Button */}
          {user && (
            <button
              onClick={onLogout}
              title="Sign out"
              className="sm:hidden p-2 rounded-lg text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Phone Navigation Bar (Thumb-friendly touch targets) */}
      <div className="md:hidden flex items-center justify-around px-2 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-bold gap-1">
        <button
          onClick={() => setActiveTab('links')}
          className={`flex-1 py-2 px-2 rounded-lg text-center transition-all min-h-[38px] flex items-center justify-center ${
            activeTab === 'links'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-900 font-black shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
          }`}
        >
          Dynamic Links
        </button>

        <button
          onClick={() => setActiveTab('batch-print')}
          className={`flex-1 py-2 px-2 rounded-lg text-center transition-all min-h-[38px] flex items-center justify-center gap-1.5 ${
            activeTab === 'batch-print'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-900 font-black shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
          }`}
        >
          <span>Multi-QR</span>
          {unassignedCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
          )}
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex-1 py-2 px-2 rounded-lg text-center transition-all min-h-[38px] flex items-center justify-center gap-1.5 ${
              activeTab === 'clients'
                ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-900 font-black shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
            }`}
          >
            <span>Clients</span>
            {pendingClientsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            )}
          </button>
        )}
      </div>
    </header>
  );
};
