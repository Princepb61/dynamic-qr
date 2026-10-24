import React, { useState } from 'react';
import { ClientAccount } from '../types';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Search,
  Building,
} from 'lucide-react';

interface ClientApprovalsViewProps {
  clients: ClientAccount[];
  loading: boolean;
  onApproveClient: (id: string) => Promise<void>;
  onRejectClient: (id: string) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export const ClientApprovalsView: React.FC<ClientApprovalsViewProps> = ({
  clients,
  loading: _loading,
  onApproveClient,
  onRejectClient,
  onDeleteClient,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingClients = clients.filter((c) => c.status === 'pending');
  const approvedClients = clients.filter((c) => c.status === 'approved');

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await onApproveClient(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      await onRejectClient(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client account?')) {
      try {
        setProcessingId(id);
        await onDeleteClient(id);
      } finally {
        setProcessingId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">Client Accounts & Approval Queue</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Clients registered via the Client Portal require administrator approval before they can log in and generate dynamic links.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-3.5 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-700"
          >
            Refresh Roster
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-bold mb-1">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {pendingClients.length}
          </div>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 font-medium">Awaiting your approval to log in</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-bold mb-1">
            <span>Approved Active Clients</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-neutral-900 dark:text-white">
            {approvedClients.length}
          </div>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 font-medium">Can log in and manage their own dynamic links</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-bold mb-1">
            <span>Total Registered Accounts</span>
            <Users className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-neutral-900 dark:text-white">
            {clients.length}
          </div>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 font-medium">Across all external client organizations</p>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden transition-colors">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients by name, email, or company..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:bg-white dark:focus:bg-neutral-800 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400 transition-colors font-medium"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              All ({clients.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-white dark:bg-neutral-900 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Pending ({pendingClients.length})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                statusFilter === 'approved'
                  ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Approved ({approvedClients.length})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-neutral-200 dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Client Name & Organization</th>
                <th className="px-5 py-3">Login Email</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Links Created</th>
                <th className="px-5 py-3">Registered Date</th>
                <th className="px-5 py-3 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-neutral-400 dark:text-neutral-500 font-sans font-medium">
                    No client accounts found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isProcessing = processingId === client.id;
                  return (
                    <tr key={client.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-neutral-900 dark:text-white text-sm">{client.name}</div>
                        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
                          <Building className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{client.company}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-neutral-700 dark:text-neutral-300 font-medium">
                        {client.email}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {client.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold">
                            <Clock className="w-3 h-3" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {client.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                        {client.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold">
                            <XCircle className="w-3 h-3" />
                            <span>Suspended</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
                        <span className="font-bold">{client.linkCount}</span> links
                        <span className="text-neutral-400 dark:text-neutral-500 block text-[10px]">({client.totalScans} scans)</span>
                      </td>

                      <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 font-medium">
                        {new Date(client.createdAt).toLocaleDateString()}
                        {client.approvedAt && (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">
                            Approved {new Date(client.approvedAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {client.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(client.id)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {client.status === 'approved' && (
                            <button
                              onClick={() => handleReject(client.id)}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg transition-colors border border-amber-200 dark:border-amber-800"
                            >
                              <span>Suspend</span>
                            </button>
                          )}

                          {client.status === 'rejected' && (
                            <button
                              onClick={() => handleApprove(client.id)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs"
                            >
                              Re-Approve
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(client.id)}
                            disabled={isProcessing}
                            title="Delete Client Account"
                            className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
