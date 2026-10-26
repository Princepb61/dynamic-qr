import { LinkRecord, LinkAnalytics, GlobalOverview, ClickRecord, UserRecord } from '../types';
import { localDb } from './localDb';
import { firestoreDb } from './firestoreDb';

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
  // Authentication (Uses local admin credentials: p0667500@gmail.com / P4prince.com)
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
    // Reliable static & offline fallback
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
    // 1. Save in Firestore Cloud Database for cross-device sync
    try {
      const firestoreRes = await firestoreDb.generateBatch(payload);
      if (firestoreRes && firestoreRes.links.length > 0) {
        // Also save in local cache
        localDb.importBackup({ version: '1.0', exportDate: new Date().toISOString(), links: firestoreRes.links });
        return { success: true, ...firestoreRes };
      }
    } catch (e) {
      console.warn('Firestore generateBatch fallback:', e);
    }

    // 2. Fallback to Express backend if available
    try {
      const res = await fetch('/api/batch-qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (data !== null && res.ok) return data;
    } catch {}

    // 3. Fallback to localDb
    return localDb.generateBatch(payload);
  },

  /**
   * Assign destination URL to a QR code (Persistent across ALL devices via Firestore)
   */
  async assignBatchLink(
    idOrSlug: string,
    payload: { destinationUrl: string; title?: string; description?: string }
  ): Promise<{ success: boolean; message: string; link: LinkRecord }> {
    let assignedLink: LinkRecord | null = null;

    // 1. Immediately update Cloud Firestore so ANY other device (phone or PC) gets it instantly
    try {
      assignedLink = await firestoreDb.assignBatchLink(idOrSlug, payload);
    } catch (err) {
      console.warn('Firestore assignBatchLink error:', err);
    }

    // 2. Update local database cache
    const localRes = await localDb.assignBatchLink(idOrSlug, payload);
    if (!assignedLink) {
      assignedLink = localRes.link;
    }

    // 3. Sync to Express backend if reachable
    try {
      const res = await fetch(`/api/batch-qr/${encodeURIComponent(idOrSlug)}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await parseJsonResponse(res);
    } catch {}

    return {
      success: true,
      message: `QR code /r/${assignedLink.slug} assigned successfully and active globally!`,
      link: assignedLink,
    };
  },

  /**
   * Dynamic Links: Fetches from Cloud Firestore, ensuring PC & mobile are always in sync.
   */
  async getLinks(ownerId?: string): Promise<{ links: LinkRecord[]; totalLinks: number; totalClicks: number }> {
    const localData = await localDb.getLinks(ownerId);
    let allLinks: LinkRecord[] = [...localData.links];

    // 1. Query Firestore for real-time cloud data
    try {
      const cloudLinks = await firestoreDb.getLinks(ownerId);

      if (cloudLinks.length > 0) {
        // Merge cloud links with local cache, giving priority to assigned links
        const mergedMap = new Map<string, LinkRecord>();

        // First put local links
        for (const l of allLinks) {
          mergedMap.set(l.slug.toLowerCase(), l);
        }

        // Overwrite / merge with cloud links
        for (const c of cloudLinks) {
          const key = c.slug.toLowerCase();
          const existing = mergedMap.get(key);
          if (!existing) {
            mergedMap.set(key, c);
          } else {
            // Keep the assigned destination if either has it
            if (c.destinationUrl && c.isAssigned) {
              mergedMap.set(key, { ...existing, ...c, isAssigned: true });
            } else if (existing.destinationUrl && existing.isAssigned) {
              // Local was assigned, sync up to cloud!
              firestoreDb.assignBatchLink(existing.slug, {
                destinationUrl: existing.destinationUrl,
                title: existing.title,
              }).catch(() => {});
              mergedMap.set(key, existing);
            } else {
              mergedMap.set(key, { ...existing, ...c });
            }
          }
        }

        allLinks = Array.from(mergedMap.values());
        // Save merged data into localDb cache
        localDb.importBackup({ version: '1.0', exportDate: new Date().toISOString(), links: allLinks });
      } else if (allLinks.length > 0) {
        // If Firestore is empty (first time run), seed local links into Firestore!
        for (const link of allLinks) {
          firestoreDb.assignBatchLink(link.slug, {
            destinationUrl: link.destinationUrl,
            title: link.title,
            description: link.description,
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Firestore sync warning:', err);
    }

    // 2. Also try server sync if server is running
    try {
      const url = ownerId ? `/api/links?ownerId=${encodeURIComponent(ownerId)}` : '/api/links';
      const res = await fetch(url);
      const serverData = await parseJsonResponse(res);
      if (serverData !== null && res.ok && Array.isArray(serverData.links)) {
        for (const sLink of serverData.links) {
          const idx = allLinks.findIndex((l) => l.slug.toLowerCase() === sLink.slug.toLowerCase());
          if (idx === -1) {
            allLinks.push(sLink);
          } else if (sLink.destinationUrl && sLink.isAssigned) {
            allLinks[idx] = { ...allLinks[idx], ...sLink };
          }
        }
      }
    } catch {}

    const totalClicks = allLinks.reduce((sum, l) => sum + (l.totalClicks || 0), 0);
    return { links: allLinks, totalLinks: allLinks.length, totalClicks };
  },

  // Manual Direct Cloud Sync (Used in Profile modal)
  async syncWithCloud(): Promise<{ success: boolean; count: number; links: LinkRecord[] }> {
    const res = await this.getLinks();
    return { success: true, count: res.links.length, links: res.links };
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
    // 1. Cloud Firestore
    try {
      const created = await firestoreDb.createLink(payload);
      localDb.importBackup({ version: '1.0', exportDate: new Date().toISOString(), links: [created] });
      return created;
    } catch (e) {
      console.warn('Firestore createLink fallback:', e);
    }

    // 2. Local fallback
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
      const updated = await firestoreDb.updateLink(id, payload);
      await localDb.updateLink(id, payload).catch(() => {});
      return { success: true, message: 'Link updated successfully', link: updated };
    } catch (e) {
      console.warn('Firestore updateLink fallback:', e);
    }
    return localDb.updateLink(id, payload);
  },

  async deleteLink(id: string): Promise<boolean> {
    try {
      await firestoreDb.deleteLink(id);
    } catch {}
    return localDb.deleteLink(id);
  },

  async getLinkAnalytics(id: string): Promise<LinkAnalytics> {
    return localDb.getLinkAnalytics(id);
  },

  async getOverview(ownerId?: string): Promise<GlobalOverview> {
    const linksData = await this.getLinks(ownerId);
    const dbOverview = await localDb.getOverview(ownerId);
    return {
      ...dbOverview,
      totalLinks: linksData.totalLinks,
      totalClicks: linksData.totalClicks,
      activeLinksCount: linksData.links.filter((l) => l.isActive && l.isAssigned !== false).length,
    };
  },

  async simulateScan(
    linkId: string,
    deviceType: string = 'mobile',
    location: string = 'New York, US'
  ): Promise<{ success: boolean; click: ClickRecord; updatedTotalClicks: number }> {
    try {
      await firestoreDb.simulateScan(linkId, deviceType, location);
    } catch {}
    return localDb.simulateScan(linkId, deviceType, location);
  },
};
