import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { LinkRecord, ClickRecord, BatchRecord, LabelPresetType } from '../types';

const LINKS_COLLECTION = 'links';
const CLICKS_COLLECTION = 'clicks';
const BATCHES_COLLECTION = 'batches';
const DELETED_LINKS_COLLECTION = 'deleted_links';

export const firestoreDb = {
  /**
   * Fetch all tombstone deleted slugs to enforce permanent cross-device deletion.
   */
  async getDeletedSlugs(): Promise<Set<string>> {
    try {
      const snap = await getDocs(collection(db, DELETED_LINKS_COLLECTION));
      const deletedSet = new Set<string>();
      snap.forEach((d) => {
        deletedSet.add(d.id.toLowerCase());
        const data = d.data();
        if (data?.slug) deletedSet.add(data.slug.toLowerCase());
        if (data?.linkId) deletedSet.add(data.linkId.toLowerCase());
      });
      return deletedSet;
    } catch (err) {
      console.warn('Firestore getDeletedSlugs error:', err);
      return new Set();
    }
  },

  /**
   * Fetch a single link by its slug or ID from Firestore.
   */
  async getLinkBySlug(slug: string): Promise<LinkRecord | null> {
    try {
      const cleanSlug = slug.trim().toLowerCase().replace(/^\/r\//, '').replace(/^\//, '');

      // Check if it was tombstoned
      const deletedDoc = await getDoc(doc(db, DELETED_LINKS_COLLECTION, cleanSlug));
      if (deletedDoc.exists()) {
        return null;
      }

      // 1. Try direct doc lookup by slug
      const directDocRef = doc(db, LINKS_COLLECTION, cleanSlug);
      const directDocSnap = await getDoc(directDocRef);
      if (directDocSnap.exists()) {
        return directDocSnap.data() as LinkRecord;
      }

      // 2. Query collection where slug == cleanSlug
      const q = query(collection(db, LINKS_COLLECTION), where('slug', '==', cleanSlug));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        return querySnap.docs[0].data() as LinkRecord;
      }

      // 3. Fallback: Query by ID
      const qId = query(collection(db, LINKS_COLLECTION), where('id', '==', cleanSlug));
      const qIdSnap = await getDocs(qId);
      if (!qIdSnap.empty) {
        return qIdSnap.docs[0].data() as LinkRecord;
      }

      return null;
    } catch (err) {
      console.warn('Firestore getLinkBySlug error:', err);
      return null;
    }
  },

  /**
   * Fetch all links from Firestore, filtering out tombstoned deletions
   * and deduplicating dual-index documents. Ensures unassigned QR batch codes
   * persist across all devices.
   */
  async getLinks(ownerId?: string): Promise<LinkRecord[]> {
    try {
      const [linksSnap, deletedSet] = await Promise.all([
        getDocs(collection(db, LINKS_COLLECTION)),
        this.getDeletedSlugs(),
      ]);

      const mapBySlug = new Map<string, LinkRecord>();

      linksSnap.forEach((d) => {
        const item = d.data() as LinkRecord;
        if (!item || !item.slug) return;

        const cleanSlug = item.slug.toLowerCase().trim();

        // 1. If tombstoned as deleted on another device, purge and skip!
        if (deletedSet.has(cleanSlug) || (item.id && deletedSet.has(item.id.toLowerCase()))) {
          // Asynchronously purge stale zombie doc from Firestore
          deleteDoc(doc(db, LINKS_COLLECTION, d.id)).catch(() => {});
          return;
        }

        // 2. Filter by ownerId if provided, but preserve default admin items and unassigned batches
        if (ownerId && item.ownerId && item.ownerId !== ownerId && item.ownerId !== 'usr_admin_1') {
          return;
        }

        // 3. Deduplicate (dual-write creates docs under both slug and ID)
        const existing = mapBySlug.get(cleanSlug);
        if (!existing) {
          mapBySlug.set(cleanSlug, item);
        } else {
          // Keep the record that has assignment or more recent updatedAt
          if (item.isAssigned && !existing.isAssigned) {
            mapBySlug.set(cleanSlug, item);
          } else if (new Date(item.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
            mapBySlug.set(cleanSlug, { ...existing, ...item });
          }
        }
      });

      const links = Array.from(mapBySlug.values());

      // Sort newest first
      links.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      return links;
    } catch (err) {
      console.warn('Firestore getLinks error:', err);
      return [];
    }
  },

  /**
   * Assign or activate a pre-printed QR code slug with destination URL.
   */
  async assignBatchLink(
    slugOrId: string,
    payload: Partial<LinkRecord> & { destinationUrl: string; title?: string; description?: string }
  ): Promise<LinkRecord> {
    const clean = slugOrId.trim().toLowerCase().replace(/^\/r\//, '').replace(/^\//, '');
    let existing = await this.getLinkBySlug(clean);

    let target = payload.destinationUrl.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('data:') && !target.startsWith('WIFI:')) {
      target = 'https://' + target;
    }

    const now = new Date().toISOString();
    const record: LinkRecord = existing
      ? {
          ...existing,
          ...payload,
          destinationUrl: target,
          title: payload.title?.trim() || existing.title,
          description: payload.description?.trim() || existing.description || 'Assigned via mobile scan',
          isAssigned: true,
          isActive: true,
          updatedAt: now,
        }
      : {
          id: `link_${clean}`,
          slug: clean,
          title: payload.title?.trim() || `QR Code (${clean})`,
          description: payload.description?.trim() || 'Assigned via mobile scan',
          isActive: true,
          isAssigned: true,
          createdAt: now,
          updatedAt: now,
          tags: ['Pre-Printed', 'Assigned'],
          totalClicks: 0,
          ownerId: 'usr_admin_1',
          ownerEmail: 'p0667500@gmail.com',
          ownerName: 'System Administrator',
          qrSettings: {
            colorDark: '#000000',
            colorLight: '#ffffff',
            errorCorrectionLevel: 'H',
            margin: 2,
          },
          ...payload,
          destinationUrl: target,
        };

    // Save to Firestore using clean slug as doc ID for instant O(1) lookup
    const docRef = doc(db, LINKS_COLLECTION, clean);
    await setDoc(docRef, record, { merge: true });

    // Also write by record.id if different
    if (record.id !== clean) {
      await setDoc(doc(db, LINKS_COLLECTION, record.id), record, { merge: true });
    }

    // Remove any tombstone if re-assigned
    await deleteDoc(doc(db, DELETED_LINKS_COLLECTION, clean)).catch(() => {});

    return record;
  },

  /**
   * Create a new dynamic link in Firestore.
   */
  async createLink(payload: any): Promise<LinkRecord> {
    const slug = (payload.customSlug || Math.random().toString(36).substring(2, 7))
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');
    const id = `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    let target = (payload.destinationUrl || '').trim();
    if (target && !target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    const newLink: LinkRecord = {
      id,
      slug,
      title: payload.title || 'Dynamic Link',
      destinationUrl: target,
      description: payload.description || '',
      isActive: true,
      isAssigned: Boolean(target),
      createdAt: now,
      updatedAt: now,
      tags: payload.tags || ['Dynamic'],
      totalClicks: 0,
      ownerId: payload.ownerId || 'usr_admin_1',
      ownerEmail: payload.ownerEmail || 'p0667500@gmail.com',
      ownerName: payload.ownerName || 'Administrator',
      qrSettings: payload.qrSettings || {
        colorDark: '#000000',
        colorLight: '#ffffff',
        errorCorrectionLevel: 'H',
        margin: 2,
      },
    };

    // Save under slug and ID
    await setDoc(doc(db, LINKS_COLLECTION, slug), newLink);
    await setDoc(doc(db, LINKS_COLLECTION, id), newLink);

    // Remove any tombstone
    await deleteDoc(doc(db, DELETED_LINKS_COLLECTION, slug)).catch(() => {});

    return newLink;
  },

  /**
   * Update an existing link in Firestore.
   */
  async updateLink(idOrSlug: string, updates: any): Promise<LinkRecord> {
    const clean = idOrSlug.trim().toLowerCase().replace(/^\/r\//, '').replace(/^\//, '');
    const existing = await this.getLinkBySlug(clean);
    if (!existing) throw new Error('Link not found');

    const updated: LinkRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.destinationUrl) {
      let target = updates.destinationUrl.trim();
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = 'https://' + target;
      }
      updated.destinationUrl = target;
      updated.isAssigned = true;
    }

    await setDoc(doc(db, LINKS_COLLECTION, updated.slug), updated, { merge: true });
    await setDoc(doc(db, LINKS_COLLECTION, updated.id), updated, { merge: true });

    return updated;
  },

  /**
   * Permanently delete a link from Firestore and record a cross-device tombstone
   * in `deleted_links` so no device can resurrect it from cache.
   */
  async deleteLink(idOrSlug: string): Promise<boolean> {
    const clean = idOrSlug.trim().toLowerCase().replace(/^\/r\//, '').replace(/^\//, '');
    const existing = await this.getLinkBySlug(clean);

    const slug = existing ? existing.slug.toLowerCase() : clean;
    const linkId = existing ? existing.id : clean;

    // 1. Write tombstone in deleted_links
    const tombstoneDoc = doc(db, DELETED_LINKS_COLLECTION, slug);
    await setDoc(tombstoneDoc, {
      slug,
      linkId,
      deletedAt: new Date().toISOString(),
    }).catch((e) => console.warn('Tombstone write warning:', e));

    // Also tombstone by ID if distinct
    if (linkId !== slug) {
      await setDoc(doc(db, DELETED_LINKS_COLLECTION, linkId), {
        slug,
        linkId,
        deletedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    // 2. Delete from links collection
    await deleteDoc(doc(db, LINKS_COLLECTION, slug)).catch(() => {});
    await deleteDoc(doc(db, LINKS_COLLECTION, linkId)).catch(() => {});

    // 3. Also query and delete any duplicate docs
    try {
      const q = query(collection(db, LINKS_COLLECTION), where('slug', '==', slug));
      const snap = await getDocs(q);
      const deletes = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletes);
    } catch {}

    return true;
  },

  /**
   * Generate a batch of pre-printed unassigned QR links in Firestore.
   * Persists both the individual unassigned links and the batch manifest so that
   * any device logging in immediately retrieves the full unassigned stock.
   */
  async generateBatch(payload: {
    batchName: string;
    prefix?: string;
    count: number;
    ownerId?: string;
    ownerEmail?: string;
    ownerName?: string;
    labelPreset?: LabelPresetType;
  }): Promise<{ batchId: string; batchName: string; count: number; links: LinkRecord[] }> {
    const batchId = `batch_${Date.now()}`;
    const count = Math.min(Math.max(payload.count || 12, 1), 100);
    const prefix = (payload.prefix || 'qr').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const newLinks: LinkRecord[] = [];
    const now = new Date().toISOString();

    const ownerId = payload.ownerId || 'usr_admin_1';
    const ownerEmail = payload.ownerEmail || 'p0667500@gmail.com';
    const ownerName = payload.ownerName || 'Administrator';
    const labelPreset = payload.labelPreset || 'a4_grid';

    for (let i = 1; i <= count; i++) {
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const slug = `${prefix}-${i}-${randomSuffix}`;
      const link: LinkRecord = {
        id: `link_${batchId}_${i}`,
        slug,
        title: `${payload.batchName} #${i}`,
        destinationUrl: '',
        description: `Pre-printed QR stock (${payload.batchName})`,
        isActive: true,
        isAssigned: false,
        batchId,
        batchName: payload.batchName,
        batchIndex: i,
        createdAt: now,
        updatedAt: now,
        tags: ['Pre-Printed', payload.batchName],
        totalClicks: 0,
        ownerId,
        ownerEmail,
        ownerName,
        qrSettings: {
          colorDark: '#000000',
          colorLight: '#ffffff',
          errorCorrectionLevel: 'H',
          margin: 2,
        },
      };

      await setDoc(doc(db, LINKS_COLLECTION, slug), link);
      await setDoc(doc(db, LINKS_COLLECTION, link.id), link);
      newLinks.push(link);
    }

    // Save batch record manifest in Firestore
    const batchRecord: BatchRecord = {
      id: batchId,
      name: payload.batchName,
      prefix,
      count,
      labelPreset,
      ownerId,
      ownerEmail,
      createdAt: now,
      unassignedCount: count,
      slugs: newLinks.map((l) => l.slug),
    };

    await setDoc(doc(db, BATCHES_COLLECTION, batchId), batchRecord).catch((e) => {
      console.warn('Batch manifest write warning:', e);
    });

    return { batchId, batchName: payload.batchName, count, links: newLinks };
  },

  /**
   * Fetch all saved batches from Firestore with up-to-date unassigned count.
   */
  async getBatches(ownerId?: string): Promise<BatchRecord[]> {
    try {
      const snap = await getDocs(collection(db, BATCHES_COLLECTION));
      let batches: BatchRecord[] = [];
      snap.forEach((d) => {
        batches.push(d.data() as BatchRecord);
      });

      if (ownerId && ownerId !== 'usr_admin_1') {
        batches = batches.filter((b) => b.ownerId === ownerId || b.ownerId === 'usr_admin_1');
      }

      batches.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return batches;
    } catch (err) {
      console.warn('Firestore getBatches error:', err);
      return [];
    }
  },

  /**
   * Delete a batch and all of its associated links.
   */
  async deleteBatch(batchId: string): Promise<boolean> {
    try {
      // 1. Fetch batch to know its slugs
      const batchDoc = await getDoc(doc(db, BATCHES_COLLECTION, batchId));
      if (batchDoc.exists()) {
        const data = batchDoc.data() as BatchRecord;
        if (data.slugs && Array.isArray(data.slugs)) {
          for (const slug of data.slugs) {
            await this.deleteLink(slug);
          }
        }
      }

      // 2. Query any remaining links with this batchId
      const q = query(collection(db, LINKS_COLLECTION), where('batchId', '==', batchId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await this.deleteLink(d.id);
      }

      // 3. Delete batch doc
      await deleteDoc(doc(db, BATCHES_COLLECTION, batchId));
      return true;
    } catch (err) {
      console.warn('Firestore deleteBatch error:', err);
      return false;
    }
  },

  /**
   * Record scan telemetry in Firestore and increment click counter.
   */
  async simulateScan(linkIdOrSlug: string, deviceType: string = 'mobile', location: string = 'New York, US'): Promise<void> {
    try {
      const clean = linkIdOrSlug.trim().toLowerCase().replace(/^\/r\//, '').replace(/^\//, '');
      const link = await this.getLinkBySlug(clean);
      if (!link) return;

      const clickId = `clk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const click: ClickRecord = {
        id: clickId,
        linkId: link.id,
        slug: link.slug,
        timestamp: new Date().toISOString(),
        referrer: 'Camera QR Scan',
        deviceType: (['mobile', 'tablet', 'desktop'].includes(deviceType) ? deviceType : 'mobile') as any,
        browser: 'Mobile Safari',
        os: 'iOS 18.2',
        ip: '172.56.21.84',
        country: location.split(',')[1]?.trim() || 'United States',
        city: location.split(',')[0]?.trim() || 'New York',
        userAgent: 'Mobile Scanner',
      };

      await setDoc(doc(db, CLICKS_COLLECTION, clickId), click);

      // Increment click count on the link doc
      await updateDoc(doc(db, LINKS_COLLECTION, link.slug), {
        totalClicks: increment(1),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    } catch (e) {
      console.warn('Click logging error:', e);
    }
  },
};
