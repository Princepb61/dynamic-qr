import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OverviewStats } from './components/OverviewStats';
import { LinksTable } from './components/LinksTable';
import { CreateLinkModal } from './components/CreateLinkModal';
import { EditDestinationModal } from './components/EditDestinationModal';
import { QRStudioModal } from './components/QRStudioModal';
import { QRPrintCenter } from './components/QRPrintCenter';
import { BatchPrintPage } from './components/BatchPrintPage';
import { AuthPage } from './components/AuthPage';
import { ClientRedirectHandler } from './components/ClientRedirectHandler';
import { ProfileBackupModal } from './components/ProfileBackupModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { LinkRecord, GlobalOverview, UserRecord } from './types';
import { api } from './services/api';
import { RefreshCw, Plus } from 'lucide-react';

export default function App() {
  // Global Dark Mode Theme State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('taplocalin_theme');
      if (saved) return saved === 'dark';
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('taplocalin_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('taplocalin_theme', 'light');
      }
    } catch (e) {
      console.error('Theme sync error', e);
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Auth state
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(() => {
    try {
      const stored = localStorage.getItem('dynamicqr_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<'links' | 'batch-print' | 'print'>('links');
  // Dynamic redirect slug detection for Netlify SPA deployments
  const [redirectSlug] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/r/')) {
      const s = window.location.pathname.replace(/^\/r\//, '').trim();
      return s || null;
    }
    return null;
  });
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [overview, setOverview] = useState<GlobalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeQRLink, setActiveQRLink] = useState<LinkRecord | null>(null);
  const [activeEditLink, setActiveEditLink] = useState<LinkRecord | null>(null);
  const [selectedPrintLink, setSelectedPrintLink] = useState<LinkRecord | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = async (user = currentUser) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const [linksData, overviewData] = await Promise.all([
        api.getLinks(),
        api.getOverview(),
      ]);

      setLinks(linksData.links);
      setOverview(overviewData);
    } catch (err: any) {
      console.error('Data loading error:', err);
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData(currentUser);
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: UserRecord, token: string) => {
    localStorage.setItem('dynamicqr_user', JSON.stringify(user));
    localStorage.setItem('dynamicqr_token', token);
    setCurrentUser(user);
    setActiveTab('links');
    addToast(
      'success',
      `Welcome back, ${user.name}! Administrator session active.`
    );
  };

  const handleLogout = () => {
    // Only remove user session tokens so database is safe in local storage
    localStorage.removeItem('dynamicqr_user');
    localStorage.removeItem('dynamicqr_token');
    setCurrentUser(null);
    setLinks([]);
    setOverview(null);
    setIsProfileModalOpen(false);
  };

  const handleCreateLink = async (payload: any) => {
    try {
      const ownerPayload = {
        ...payload,
        ownerId: currentUser?.id,
        ownerEmail: currentUser?.email,
        ownerName: currentUser?.name,
      };

      const newLink = await api.createLink(ownerPayload);
      addToast('success', `Dynamic link "/r/${newLink.slug}" created. QR code is ready for print.`);
      await loadData();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create link');
      throw err;
    }
  };

  const handleUpdateDestination = async (
    id: string,
    updates: { destinationUrl: string; title: string; description: string }
  ) => {
    try {
      await api.updateLink(id, updates);
      addToast(
        'success',
        'Destination updated! Physical QR codes and short links route to the new target immediately.'
      );
      await loadData();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update destination');
      throw err;
    }
  };

  const handleToggleStatus = async (link: LinkRecord) => {
    try {
      const nextStatus = !link.isActive;
      await api.updateLink(link.id, { isActive: nextStatus });
      addToast(
        'info',
        nextStatus
          ? `Link "/r/${link.slug}" is now Active and redirecting.`
          : `Link "/r/${link.slug}" is paused. Scanners will see a pause notice.`
      );
      await loadData();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update status');
    }
  };

  const handleDeleteLink = async (id: string) => {
    const target = links.find((l) => l.id === id);
    if (!target) return;

    if (
      window.confirm(
        `Are you sure you want to delete "${target.title}" (/r/${target.slug})? Any printed QR codes will stop redirecting.`
      )
    ) {
      try {
        await api.deleteLink(id);
        addToast('info', `Link "/r/${target.slug}" deleted.`);
        await loadData();
      } catch (err: any) {
        addToast('error', err.message || 'Failed to delete link');
      }
    }
  };

  // Handle direct dynamic link scan / redirection on Netlify SPA
  if (redirectSlug) {
    return <ClientRedirectHandler slug={redirectSlug} />;
  }

  // If not logged in, render the Administrator Sign-In page (Zero exposed credentials)
  if (!currentUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs text-xs font-bold"
              aria-label="Toggle dark mode"
            >
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
          <AuthPage onLoginSuccess={handleLoginSuccess} />
          <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </div>
      </div>
    );
  }

  const unassignedCount = links.filter((l) => l.isAssigned === false || !l.destinationUrl || l.destinationUrl.trim() === '').length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors">
      {/* Top Bar Header with Bold Typography & Dark Theme Toggle */}
      <Header
        user={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unassignedCount={unassignedCount}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Container - Mobile Optimized Padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {loading && links.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto" />
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Connecting to Dynamic Redirection Service...</p>
          </div>
        ) : error && links.length === 0 ? (
          <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl max-w-md mx-auto text-center space-y-3">
            <p className="text-sm font-bold text-red-800 dark:text-red-300">Connection Error</p>
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => loadData(currentUser)}
              className="px-4 py-2 text-xs font-bold bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* View 1: Dynamic Links Management (Default) */}
            {activeTab === 'links' && (
              <div className="space-y-4 sm:space-y-8">
                {/* KPI Metrics */}
                <OverviewStats overview={overview} />

                {/* Primary Dynamic Links Section with Direct Create Button */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-black tracking-tight text-neutral-950 dark:text-white">
                        Dynamic Links &amp; QR Roster
                      </h2>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                        Manage system short URLs, edit destination targets in real-time, and customize QR codes.
                      </p>
                    </div>

                    {/* Direct Create Dynamic Link Button */}
                    <button
                      onClick={() => setIsCreateOpen(true)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-neutral-950 dark:bg-indigo-600 hover:bg-neutral-800 dark:hover:bg-indigo-500 rounded-xl transition-colors shadow-xs w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>+ Create Dynamic Link</span>
                    </button>
                  </div>

                  <LinksTable
                    links={links}
                    onOpenQR={(link) => setActiveQRLink(link)}
                    onOpenEdit={(link) => setActiveEditLink(link)}
                    onOpenPrint={(link) => {
                      setSelectedPrintLink(link);
                      setActiveTab('print');
                    }}
                    onDeleteLink={handleDeleteLink}
                    onToggleStatus={handleToggleStatus}
                    onOpenCreate={() => setIsCreateOpen(true)}
                  />
                </div>
              </div>
            )}

            {/* View 2: Multi-QR Batch Print & Fast Assignment */}
            {activeTab === 'batch-print' && (
              <BatchPrintPage
                links={links}
                onRefreshLinks={() => loadData(currentUser)}
                onDeleteLink={handleDeleteLink}
              />
            )}

            {/* View 3: QR Print Center (Single Cards & Display Sheets) */}
            {activeTab === 'print' && (
              <QRPrintCenter
                links={links}
                selectedLink={selectedPrintLink}
                onSelectLink={(link) => setSelectedPrintLink(link)}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <CreateLinkModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateLink}
      />

      <EditDestinationModal
        link={activeEditLink}
        isOpen={!!activeEditLink}
        onClose={() => setActiveEditLink(null)}
        onSave={handleUpdateDestination}
      />

      <QRStudioModal
        link={activeQRLink}
        isOpen={!!activeQRLink}
        onClose={() => setActiveQRLink(null)}
        onDeleteQR={handleDeleteLink}
      />

      {/* Admin Profile & Data Backup Modal */}
      <ProfileBackupModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        links={links}
        onLogout={handleLogout}
        onRefreshData={() => loadData(currentUser)}
        onAddToast={addToast}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
