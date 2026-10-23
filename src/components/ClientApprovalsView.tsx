import React, { useState } from 'react';
import { ClientAccount } from '../types';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Search,
  ExternalLink,
  ShieldCheck,
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
  loading,
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
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Client Accounts & Approval Queue</h2>
          <p className="text-xs text-neutral-500">
            Clients registered via the Client Portal require administrator approval before they can log in and generate dynamic links.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            Refresh Roster
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium mb-1">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-600">
            {pendingClients.length}
          </div>
          <p className="mt-1 text-xs text-neutral-400">Awaiting your approval to log in</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium mb-1">
            <span>Approved Active Clients</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
            {approvedClients.length}
          </div>
          <p className="mt-1 text-xs text-neutral-400">Can log in and manage their own dynamic links</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium mb-1">
            <span>Total Registered Accounts</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
            {clients.length}
          </div>
          <p className="mt-1 text-xs text-neutral-400">Across all external client organizations</p>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients by name, email, or company..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All ({clients.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-white text-amber-700 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Pending ({pendingClients.length})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'approved'
                  ? 'bg-white text-emerald-700 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Approved ({approvedClients.length})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-neutral-200">
            <thead className="bg-neutral-50 text-neutral-600 font-semibold uppercase">
              <tr>
                <th className="px-5 py-3">Client Name & Organization</th>
                <th className="px-5 py-3">Login Email</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Links Created</th>
                <th className="px-5 py-3">Registered Date</th>
                <th className="px-5 py-3 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-neutral-400 font-sans">
                    No client accounts found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isProcessing = processingId === client.id;
                  return (
                    <tr key={client.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-neutral-900 text-sm">{client.name}</div>
                        <div className="flex items-center gap-1.5 text-neutral-500 text-xs mt-0.5">
                          <Building className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{client.company}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-neutral-700">
                        {client.email}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {client.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {client.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                        {client.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-700 font-medium">
                            <XCircle className="w-3 h-3" />
                            <span>Suspended</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center font-mono tabular-nums text-neutral-800">
                        <span className="font-semibold">{client.linkCount}</span> links
                        <span className="text-neutral-400 block text-[10px]">({client.totalScans} scans)</span>
                      </td>

                      <td className="px-5 py-3.5 text-neutral-500">
                        {new Date(client.createdAt).toLocaleDateString()}
                        {client.approvedAt && (
                          <span className="text-[10px] text-neutral-400 block">
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
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {client.status === 'approved' && (
                            <button
                              onClick={() => handleReject(client.id)}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                            >
                              <span>Suspend</span>
                            </button>
                          )}

                          {client.status === 'rejected' && (
                            <button
                              onClick={() => handleApprove(client.id)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs"
                            >
                              Re-Approve
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(client.id)}
                            disabled={isProcessing}
                            title="Delete Client Account"
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
