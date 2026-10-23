import { LinkRecord, LinkAnalytics, GlobalOverview, ClickRecord, UserRecord, ClientAccount } from '../types';

export const api = {
  // Authentication
  async login(payload: { email: string; password: string; portalType?: 'admin' | 'client' }): Promise<{ token: string; user: UserRecord }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error: any = new Error(data.error || 'Authentication failed');
      error.code = data.code;
      error.user = data.user;
      throw error;
    }
    return data;
  },

  async registerClient(payload: { name: string; email: string; password: string; company?: string }): Promise<{ message: string; user: UserRecord }> {
    const res = await fetch('/api/auth/register-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    return data;
  },

  // Admin Client Approval & Management
  async getClients(): Promise<{ clients: ClientAccount[]; pendingCount: number; approvedCount: number }> {
    const res = await fetch('/api/admin/clients');
    if (!res.ok) throw new Error('Failed to fetch clients');
    return res.json();
  },

  async updateClientStatus(id: string, status: 'approved' | 'rejected' | 'pending'): Promise<{ success: boolean; message: string; client: any }> {
    const res = await fetch(`/api/admin/clients/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to update client status');
    return data;
  },

  async deleteClient(id: string): Promise<boolean> {
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete client');
    return true;
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
    const res = await fetch('/api/batch-qr/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to generate batch QR codes');
    }
    return res.json();
  },

  async assignBatchLink(
    id: string,
    payload: { destinationUrl: string; title?: string; description?: string }
  ): Promise<{ success: boolean; message: string; link: LinkRecord }> {
    const res = await fetch(`/api/batch-qr/${id}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to assign destination to QR code');
    }
    return res.json();
  },

  // Dynamic Links
  async getLinks(ownerId?: string): Promise<{ links: LinkRecord[]; totalLinks: number; totalClicks: number }> {
    const url = ownerId ? `/api/links?ownerId=${encodeURIComponent(ownerId)}` : '/api/links';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch links');
    return res.json();
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
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to create dynamic link');
    }
    return res.json();
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
    const res = await fetch(`/api/links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to update dynamic link');
    }
    return res.json();
  },

  async deleteLink(id: string): Promise<boolean> {
    const res = await fetch(`/api/links/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete dynamic link');
    return true;
  },

  async getLinkAnalytics(id: string): Promise<LinkAnalytics> {
    const res = await fetch(`/api/links/${id}/analytics`);
    if (!res.ok) throw new Error('Failed to fetch link analytics');
    return res.json();
  },

  async getOverview(ownerId?: string): Promise<GlobalOverview> {
    const url = ownerId ? `/api/analytics/overview?ownerId=${encodeURIComponent(ownerId)}` : '/api/analytics/overview';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch overview analytics');
    return res.json();
  },

  async simulateScan(
    linkId: string,
    deviceType: string = 'mobile',
    location: string = 'New York, US'
  ): Promise<{ success: boolean; click: ClickRecord; updatedTotalClicks: number }> {
    const res = await fetch('/api/simulate-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId, deviceType, location }),
    });
    if (!res.ok) throw new Error('Failed to simulate scan');
    return res.json();
  },
};
