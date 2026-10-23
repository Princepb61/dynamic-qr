import React from 'react';
import { QrCode, Plus, Smartphone, LogOut, Shield, User, Users } from 'lucide-react';
import { UserRecord } from '../types';

interface HeaderProps {
  user: UserRecord | null;
  activeTab: 'links' | 'analytics' | 'clients' | 'batch-print' | 'simulator';
  setActiveTab: (tab: 'links' | 'analytics' | 'clients' | 'batch-print' | 'simulator') => void;
  pendingClientsCount?: number;
  unassignedCount?: number;
  onOpenCreate: () => void;
  onOpenSimulator: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  pendingClientsCount = 0,
  unassignedCount = 0,
  onOpenCreate,
  onOpenSimulator,
  onLogout,
}) => {
  const isAdmin = user?.role === 'admin';

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-xs">
            <QrCode className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-neutral-900 whitespace-nowrap block leading-tight">
              taplocalin
            </span>
            <span className="text-[10px] text-neutral-500 font-medium block">
              {isAdmin ? 'Administrator Console' : 'Client Workspace'}
            </span>
          </div>
        </div>

        {/* Zone 2: Single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-neutral-600">
          <button
            onClick={() => setActiveTab('links')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 text-sm ${
              activeTab === 'links'
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {isAdmin ? 'Dynamic Links' : 'My Dynamic Links'}
          </button>

          {/* Dedicated Pre-Printed Multi-QR Print & Assign Tab */}
          <button
            onClick={() => setActiveTab('batch-print')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 text-sm ${
              activeTab === 'batch-print'
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <span>Multi-QR Print & Assign</span>
            {unassignedCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full leading-none">
                {unassignedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 text-sm ${
              activeTab === 'analytics'
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {isAdmin ? 'Analytics & Scans' : 'Traffic Analytics'}
          </button>

          {/* Admin-only Client Approvals tab */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 text-sm ${
                activeTab === 'clients'
                  ? 'border-neutral-900 text-neutral-900 font-semibold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <span>Client Approvals</span>
              {pendingClientsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full leading-none">
                  {pendingClientsCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 text-sm text-neutral-500 hover:text-neutral-900"
          >
            <Smartphone className="w-4 h-4 text-neutral-400" />
            <span>Simulator</span>
          </button>
        </nav>

        {/* Zone 3: User Identity & Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {/* User Profile Capsule */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-neutral-100 rounded-lg text-xs text-neutral-700 border border-neutral-200">
              {isAdmin ? (
                <Shield className="w-3.5 h-3.5 text-neutral-800" />
              ) : (
                <User className="w-3.5 h-3.5 text-neutral-800" />
              )}
              <div className="truncate max-w-[140px] font-medium">
                {user.email}
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="p-1 hover:text-red-600 transition-colors rounded text-neutral-400"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={onOpenCreate}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors shadow-xs whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Dynamic Link</span>
          </button>
        </div>
      </div>
    </header>
  );
};
