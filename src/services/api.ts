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
    // 1. Immediately update local database so UI reflects assignment instantly
    const localRes = await localDb.assignBatchLink(id, payload);

    // 2. Synchronize with backend server if available
    try {
      const res = await fetch(`/api/batch-qr/${encodeURIComponent(id)}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok && data.link) {
        return { success: true, message: data.message || 'QR code assigned successfully', link: data.link };
      }
    } catch {}

    return localRes;
  },

  // Dynamic Links with 2-Way Sync (Merges PC and Mobile data)
  async getLinks(ownerId?: string): Promise<{ links: LinkRecord[]; totalLinks: number; totalClicks: number }> {
    const localData = await localDb.getLinks(ownerId);
    let mergedLinks = [...localData.links];

    try {
      const url = ownerId ? `/api/links?ownerId=${encodeURIComponent(ownerId)}` : '/api/links';
      const res = await fetch(url);
      const serverData = await parseJsonResponse(res);

      if (serverData !== null && res.ok && Array.isArray(serverData.links)) {
        const existingSlugs = new Set(mergedLinks.map((l) => l.slug.toLowerCase()));
        
        // Merge server links
        for (const sLink of serverData.links) {
          const localIdx = mergedLinks.findIndex(
            (l) => l.id === sLink.id || l.slug.toLowerCase() === sLink.slug.toLowerCase()
          );

          if (localIdx === -1) {
            // New link on server (e.g. from PC) -> add to mobile!
            mergedLinks.push(sLink);
            existingSlugs.add(sLink.slug.toLowerCase());
          } else {
            // Already exists locally: if local is assigned, keep assigned state!
            const localLink = mergedLinks[localIdx];
            if (localLink.isAssigned && localLink.destinationUrl && !sLink.destinationUrl) {
              // Local has priority for newly assigned destination
            } else if (sLink.isAssigned && sLink.destinationUrl) {
              mergedLinks[localIdx] = { ...localLink, ...sLink, isAssigned: true };
            }
          }
        }

        // Persist merged data to localDb
        localDb.importBackup({ version: '1.0', exportDate: new Date().toISOString(), links: mergedLinks });

        // Push any local-only links to server in background
        const localOnlyLinks = mergedLinks.filter(
          (ml) => !serverData.links.some((sl: LinkRecord) => sl.id === ml.id || sl.slug.toLowerCase() === ml.slug.toLowerCase())
        );
        if (localOnlyLinks.length > 0) {
          fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ links: localOnlyLinks }),
          }).catch(() => {});
        }
      }
    } catch {}

    const totalClicks = mergedLinks.reduce((sum, l) => sum + (l.totalClicks || 0), 0);
    return { links: mergedLinks, totalLinks: mergedLinks.length, totalClicks };
  },

  // Manual Direct Cloud Sync (Used in Profile modal)
  async syncWithCloud(): Promise<{ success: boolean; count: number; links: LinkRecord[] }> {
    const localData = await localDb.getLinks();
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: localData.links }),
      });
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok && Array.isArray(data.links)) {
        localDb.importBackup({ version: '1.0', exportDate: new Date().toISOString(), links: data.links });
        return { success: true, count: data.links.length, links: data.links };
      }
    } catch (err: any) {
      return { success: false, count: localData.links.length, links: localData.links };
    }
    return { success: true, count: localData.links.length, links: localData.links };
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
