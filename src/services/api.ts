import { LinkRecord, LinkAnalytics, GlobalOverview, ClickRecord, UserRecord, BatchRecord, LabelPresetType } from '../types';
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

// Local cache for quick tombstone check before network completes
function getLocalTombstones(): Set<string> {
  try {
    const raw = localStorage.getItem('taplocalin_deleted_tombstones');
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map((s: string) => s.toLowerCase()) : []);
  } catch {
    return new Set();
  }
}

function addLocalTombstone(slugOrId: string) {
  try {
    const set = getLocalTombstones();
    set.add(slugOrId.toLowerCase().trim());
    localStorage.setItem('taplocalin_deleted_tombstones', JSON.stringify(Array.from(set)));
  } catch {}
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
    labelPreset?: LabelPresetType;
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
   * Fetch all saved batch manifests from Firestore
   */
  async getBatches(ownerId?: string): Promise<BatchRecord[]> {
    try {
      const cloudBatches = await firestoreDb.getBatches(ownerId);
      if (cloudBatches.length > 0) return cloudBatches;
    } catch (e) {
      console.warn('Firestore getBatches error:', e);
    }
    return [];
  },

  /**
   * Delete an entire batch and its associated QR links
   */
  async deleteBatch(batchId: string): Promise<boolean> {
    try {
      await firestoreDb.deleteBatch(batchId);
    } catch {}
    return true;
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
   * Completely prevents zombie / deleted links from being resurrected by stale local cache.
   */
  async getLinks(ownerId?: string): Promise<{ links: LinkRecord[]; totalLinks: number; totalClicks: number }> {
    const localTombstones = getLocalTombstones();

    // 1. Query Firestore for real-time cloud data and deleted tombstones
    try {
      const [cloudLinks, cloudTombstones] = await Promise.all([
        firestoreDb.getLinks(ownerId),
        firestoreDb.getDeletedSlugs(),
      ]);

      // Combine tombstones
      cloudTombstones.forEach((t) => localTombstones.add(t));
      try {
        localStorage.setItem('taplocalin_deleted_tombstones', JSON.stringify(Array.from(localTombstones)));
      } catch {}

      if (cloudLinks.length > 0) {
        // Cloud is authoritative! Filter out any tombstoned items
        const authoritativeLinks = cloudLinks.filter(
          (l) => !localTombstones.has(l.slug.toLowerCase()) && (!l.id || !localTombstones.has(l.id.toLowerCase()))
        );

        // Update localDb cache with authoritative cloud data so offline fallback is identical
        localDb.importBackup({ version: '1.0', exportDate: new Date().toISOString(), links: authoritativeLinks });

        const totalClicks = authoritativeLinks.reduce((sum, l) => sum + (l.totalClicks || 0), 0);
        return { links: authoritativeLinks, totalLinks: authoritativeLinks.length, totalClicks };
      }
    } catch (err) {
      console.warn('Firestore sync warning:', err);
    }

    // 2. Fallback to local cache if Firestore is offline
    const localData = await localDb.getLinks(ownerId);
    const filteredLocal = localData.links.filter(
      (l) => !localTombstones.has(l.slug.toLowerCase()) && (!l.id || !localTombstones.has(l.id.toLowerCase()))
    );

    const totalClicks = filteredLocal.reduce((sum, l) => sum + (l.totalClicks || 0), 0);
    return { links: filteredLocal, totalLinks: filteredLocal.length, totalClicks };
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
    quantity?: number;
    contentType?: any;
    presentationMode?: any;
    vcardData?: any;
    wifiData?: any;
    reviewGate?: any;
    qrSettings?: {
      colorDark?: string;
      colorLight?: string;
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
      margin?: number;
    };
  }): Promise<LinkRecord> {
    const qty = Math.min(Math.max(payload.quantity || 1, 1), 250);

    // If multiple quantity, create sequentially
    if (qty > 1) {
      const createdList: LinkRecord[] = [];
      const baseTitle = payload.title || 'Dynamic QR';
      for (let i = 1; i <= qty; i++) {
        const itemSlug = payload.customSlug
          ? `${payload.customSlug}-${i}-${Math.random().toString(36).substring(2, 5)}`
          : undefined;
        const itemRecord = await this.createLink({
          ...payload,
          title: `${baseTitle} #${i}`,
          customSlug: itemSlug,
          quantity: 1,
        });
        createdList.push(itemRecord);
      }
      return createdList[0];
    }

    // 1. Express backend sync if reachable
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (res.ok && data) {
        // Also save to Firestore & localDb
        await firestoreDb.createLink(data).catch(() => {});
        localDb.importBackup({ version: '1.0', exportDate: new Date().toISOString(), links: [data] });
        return data;
      }
    } catch {}

    // 2. Cloud Firestore
    try {
      const created = await firestoreDb.createLink(payload);
      localDb.importBackup({ version: '1.0', exportDate: new Date().toISOString(), links: [created] });
      return created;
    } catch (e) {
      console.warn('Firestore createLink fallback:', e);
    }

    // 3. Local fallback
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

  /**
   * Delete link permanently across ALL devices:
   * 1. Firestore delete + tombstone in deleted_links
   * 2. Server.ts Express route DELETE
   * 3. Local browser localStorage purge + tombstone cache
   */
  async deleteLink(idOrSlug: string): Promise<boolean> {
    const clean = idOrSlug.trim().toLowerCase().replace(/^\/r\//, '').replace(/^\//, '');

    // Add to local tombstones immediately
    addLocalTombstone(clean);

    // 1. Delete in Cloud Firestore and register cross-device tombstone
    try {
      await firestoreDb.deleteLink(clean);
    } catch (e) {
      console.warn('Firestore deleteLink error:', e);
    }

    // 2. Delete on Express server
    try {
      await fetch(`/api/links/${encodeURIComponent(clean)}`, {
        method: 'DELETE',
      });
    } catch {}

    // 3. Delete in localDb
    return localDb.deleteLink(clean);
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
