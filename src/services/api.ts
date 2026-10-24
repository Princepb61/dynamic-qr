import { LinkRecord, LinkAnalytics, GlobalOverview, ClickRecord, UserRecord, ClientAccount } from '../types';
import { localDb } from './localDb';

/**
 * Checks if a fetch response returned JSON rather than HTML SPA fallback.
 */
async function parseJsonResponse(res: Response): Promise<any | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export const api = {
  // Authentication
  async login(payload: { email: string; password: string; portalType?: 'admin' | 'client' }): Promise<{ token: string; user: UserRecord }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (data !== null) {
        if (!res.ok) {
          const error: any = new Error(data.error || 'Authentication failed');
          error.code = data.code;
          error.user = data.user;
          throw error;
        }
        return data;
      }
    } catch (err: any) {
      if (err.code || err.user) throw err;
    }
    // Netlify Static Fallback
    return localDb.login(payload);
  },

  async registerClient(payload: { name: string; email: string; password: string; company?: string }): Promise<{ message: string; user: UserRecord }> {
    try {
      const res = await fetch('/api/auth/register-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (data !== null) {
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        return data;
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) throw err;
    }
    return localDb.registerClient(payload);
  },

  // Admin Client Approval & Management
  async getClients(): Promise<{ clients: ClientAccount[]; pendingCount: number; approvedCount: number }> {
    try {
      const res = await fetch('/api/admin/clients');
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return data;
    } catch {}
    return localDb.getClients();
  },

  async updateClientStatus(id: string, status: 'approved' | 'rejected' | 'pending'): Promise<{ success: boolean; message: string; client: any }> {
    try {
      const res = await fetch(`/api/admin/clients/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return data;
    } catch {}
    return localDb.updateClientStatus(id, status);
  },

  async deleteClient(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: 'DELETE',
      });
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return true;
    } catch {}
    return localDb.deleteClient(id);
  },

  // Batch QR Operations
  async generateBatch(payload: {
    batchName: string;
    prefix?: string;
    count: number;
    ownerId?: string;
    ownerEmail?: string;
    ownerName?: string;
  }): Promise<{ success: boolean; batchId: string; batchName: string; count: number; links: LinkRecord[] }> {
    try {
      const res = await fetch('/api/batch-qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return data;
    } catch {}
    return localDb.generateBatch(payload);
  },

  async assignBatchLink(
    id: string,
    payload: { destinationUrl: string; title?: string; description?: string }
  ): Promise<{ success: boolean; message: string; link: LinkRecord }> {
    try {
      const res = await fetch(`/api/batch-qr/${id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return data;
    } catch {}
    return localDb.assignBatchLink(id, payload);
  },

  // Dynamic Links
  async getLinks(ownerId?: string): Promise<{ links: LinkRecord[]; totalLinks: number; totalClicks: number }> {
    try {
      const url = ownerId ? `/api/links?ownerId=${encodeURIComponent(ownerId)}` : '/api/links';
      const res = await fetch(url);
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return data;
    } catch {}
    return localDb.getLinks(ownerId);
  },

  async createLink(payload: {
    title: string;
    destinationUrl: string;
    customSlug?: string;
    description?: string;
    tags?: string[];
    ownerId?: string;
    ownerEmail?: string;
    ownerName?: string;
    qrSettings?: {
      colorDark?: string;
      colorLight?: string;
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
      margin?: number;
    };
  }): Promise<LinkRecord> {
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return data;
    } catch {}
    return localDb.createLink(payload);
  },

  async updateLink(
    id: string,
    payload: {
      destinationUrl?: string;
      title?: string;
      description?: string;
      isActive?: boolean;
      tags?: string[];
      qrSettings?: any;
    }
  ): Promise<{ success: boolean; message: string; link: LinkRecord }> {
    try {
      const res = await fetch(`/api/links/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return data;
    } catch {}
    return localDb.updateLink(id, payload);
  },

  async deleteLink(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/links/${id}`, {
        method: 'DELETE',
      });
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return true;
    } catch {}
    return localDb.deleteLink(id);
  },

  async getLinkAnalytics(id: string): Promise<LinkAnalytics> {
    try {
      const res = await fetch(`/api/links/${id}/analytics`);
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return data;
    } catch {}
    return localDb.getLinkAnalytics(id);
  },

  async getOverview(ownerId?: string): Promise<GlobalOverview> {
    try {
      const url = ownerId ? `/api/analytics/overview?ownerId=${encodeURIComponent(ownerId)}` : '/api/analytics/overview';
      const res = await fetch(url);
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return data;
    } catch {}
    return localDb.getOverview(ownerId);
  },

  async simulateScan(
    linkId: string,
    deviceType: string = 'mobile',
    location: string = 'New York, US'
  ): Promise<{ success: boolean; click: ClickRecord; updatedTotalClicks: number }> {
    try {
      const res = await fetch('/api/simulate-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, deviceType, location }),
      });
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return data;
    } catch {}
    return localDb.simulateScan(linkId, deviceType, location);
  },
};
