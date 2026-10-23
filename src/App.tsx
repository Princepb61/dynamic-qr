import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OverviewStats } from './components/OverviewStats';
import { LinksTable } from './components/LinksTable';
import { CreateLinkModal } from './components/CreateLinkModal';
import { EditDestinationModal } from './components/EditDestinationModal';
import { QRStudioModal } from './components/QRStudioModal';
import { LinkAnalyticsModal } from './components/LinkAnalyticsModal';
import { ScanSimulatorModal } from './components/ScanSimulatorModal';
import { QRPrintCenter } from './components/QRPrintCenter';
import { AnalyticsView } from './components/AnalyticsView';
import { ClientApprovalsView } from './components/ClientApprovalsView';
import { BatchPrintPage } from './components/BatchPrintPage';
import { AuthPage } from './components/AuthPage';
import { ToastContainer, ToastMessage } from './components/Toast';
import { LinkRecord, GlobalOverview, UserRecord, ClientAccount } from './types';
import { api } from './services/api';
import { RefreshCw, QrCode, LogOut, Shield, User } from 'lucide-react';

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(() => {
    try {
      const stored = localStorage.getItem('dynamicqr_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<'links' | 'analytics' | 'clients' | 'batch-print' | 'print' | 'simulator'>('links');
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [overview, setOverview] = useState<GlobalOverview | null>(null);
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorInitialLinkId, setSimulatorInitialLinkId] = useState<string | undefined>(undefined);

  const [activeQRLink, setActiveQRLink] = useState<LinkRecord | null>(null);
  const [activeEditLink, setActiveEditLink] = useState<LinkRecord | null>(null);
  const [activeAnalyticsLink, setActiveAnalyticsLink] = useState<LinkRecord | null>(null);
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

      const ownerId = user.role === 'client' ? user.id : undefined;

      const [linksData, overviewData] = await Promise.all([
        api.getLinks(ownerId),
        api.getOverview(ownerId),
      ]);

      setLinks(linksData.links);
      setOverview(overviewData);

      // If admin, load clients for approval queue
      if (user.role === 'admin') {
        const clientRes = await api.getClients();
        setClients(clientRes.clients);
      }
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
      `Welcome, ${user.name}! Signed in as ${user.role === 'admin' ? 'Administrator' : 'Client'}.`
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('dynamicqr_user');
    localStorage.removeItem('dynamicqr_token');
    setCurrentUser(null);
    setLinks([]);
    setOverview(null);
    setClients([]);
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

  // Client Approval Handlers
  const handleApproveClient = async (id: string) => {
    try {
      const res = await api.updateClientStatus(id, 'approved');
      addToast('success', res.message);
      const clientRes = await api.getClients();
      setClients(clientRes.clients);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to approve client');
    }
  };

  const handleRejectClient = async (id: string) => {
    try {
      const res = await api.updateClientStatus(id, 'rejected');
      addToast('info', res.message);
      const clientRes = await api.getClients();
      setClients(clientRes.clients);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update client status');
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await api.deleteClient(id);
      addToast('info', 'Client account removed.');
      const clientRes = await api.getClients();
      setClients(clientRes.clients);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete client');
    }
  };

  const openSimulatorForLink = (linkId: string) => {
    setSimulatorInitialLinkId(linkId);
    setIsSimulatorOpen(true);
  };

  // If not logged in, render the Authentication & Client Portal page
  if (!currentUser) {
    return (
      <>
        <AuthPage onLoginSuccess={handleLoginSuccess} />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  const pendingClientsCount = clients.filter((c) => c.status === 'pending').length;
  const unassignedCount = links.filter((l) => l.isAssigned === false || !l.destinationUrl || l.destinationUrl.trim() === '').length;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      {/* Top Bar Header with Role Context */}
      <Header
        user={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingClientsCount={pendingClientsCount}
        unassignedCount={unassignedCount}
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenSimulator={() => {
          setSimulatorInitialLinkId(links[0]?.id);
          setIsSimulatorOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading && links.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto" />
            <p className="text-sm text-neutral-500">Connecting to Dynamic Redirection Service...</p>
          </div>
        ) : error && links.length === 0 ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl max-w-md mx-auto text-center space-y-3">
            <p className="text-sm font-semibold text-red-800">Connection Error</p>
            <p className="text-xs text-red-600">{error}</p>
            <button
              onClick={() => loadData(currentUser)}
              className="px-4 py-2 text-xs font-semibold bg-red-900 text-white rounded-lg hover:bg-red-800"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* View 1: Dynamic Links Management (Default) */}
            {activeTab === 'links' && (
              <div className="space-y-8">
                {/* KPI Metrics & Velocity Strip */}
                <OverviewStats
                  overview={overview}
                  onOpenSimulator={() => {
                    setSimulatorInitialLinkId(links[0]?.id);
                    setIsSimulatorOpen(true);
                  }}
                  onSelectLink={(id) => {
                    const l = links.find((item) => item.id === id);
                    if (l) setActiveAnalyticsLink(l);
                  }}
                />

                {/* Primary Dynamic Links Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-neutral-900">
                        {currentUser.role === 'admin' ? 'Dynamic Links & QR Roster' : 'My Dynamic Endpoints'}
                      </h2>
                      <p className="text-xs text-neutral-500">
                        {currentUser.role === 'admin'
                          ? 'Manage system short URLs, edit destination targets, and inspect client-assigned QR assets.'
                          : 'Manage and update destination targets for your registered QR codes in real-time.'}
                      </p>
                    </div>
                  </div>

                  <LinksTable
                    links={links}
                    onOpenQR={(link) => setActiveQRLink(link)}
                    onOpenAnalytics={(link) => setActiveAnalyticsLink(link)}
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

            {/* View 2: Analytics & Traffic Telemetry */}
            {activeTab === 'analytics' && (
              <AnalyticsView
                overview={overview}
                links={links}
                onSelectLinkForAnalytics={(link) => setActiveAnalyticsLink(link)}
                onOpenSimulator={() => {
                  setSimulatorInitialLinkId(links[0]?.id);
                  setIsSimulatorOpen(true);
                }}
              />
            )}

            {/* View 3: Admin-Only Client Approvals */}
            {activeTab === 'clients' && currentUser.role === 'admin' && (
              <ClientApprovalsView
                clients={clients}
                loading={loading}
                onApproveClient={handleApproveClient}
                onRejectClient={handleRejectClient}
                onDeleteClient={handleDeleteClient}
                onRefresh={() => loadData(currentUser)}
              />
            )}

            {/* View 4: Multi-QR Batch Print & Fast Assignment */}
            {activeTab === 'batch-print' && (
              <BatchPrintPage
                links={links}
                onRefreshLinks={() => loadData(currentUser)}
                onOpenSimulatorForLink={(linkId) => openSimulatorForLink(linkId)}
              />
            )}

            {/* View 5: QR Print Center (Single Cards & Display Sheets) */}
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
        onOpenPrint={(link) => {
          setSelectedPrintLink(link);
          setActiveTab('print');
        }}
        onOpenSimulator={() => {
          if (activeQRLink) openSimulatorForLink(activeQRLink.id);
        }}
      />

      <LinkAnalyticsModal
        link={activeAnalyticsLink}
        isOpen={!!activeAnalyticsLink}
        onClose={() => setActiveAnalyticsLink(null)}
        onOpenSimulatorForLink={(linkId) => openSimulatorForLink(linkId)}
      />

      <ScanSimulatorModal
        links={links}
        initialLinkId={simulatorInitialLinkId}
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onScanRecorded={() => loadData(currentUser)}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
