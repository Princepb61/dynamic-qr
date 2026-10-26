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
  addDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { LinkRecord, ClickRecord } from '../types';

const LINKS_COLLECTION = 'links';
const CLICKS_COLLECTION = 'clicks';

export const firestoreDb = {
  /**
   * Fetch a single link by its slug or ID from Firestore.
   */
  async getLinkBySlug(slug: string): Promise<LinkRecord | null> {
    try {
      const cleanSlug = slug.trim().toLowerCase().replace(/^\/r\//, '').replace(/^\//, '');

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
   * Fetch all links from Firestore.
   */
  async getLinks(ownerId?: string): Promise<LinkRecord[]> {
    try {
      const coll = collection(db, LINKS_COLLECTION);
      const snapshot = await getDocs(coll);
      let links: LinkRecord[] = [];
      snapshot.forEach((d) => {
        links.push(d.data() as LinkRecord);
      });

      // Sort newest first
      links.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      if (ownerId) {
        links = links.filter((l) => l.ownerId === ownerId);
      }

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
    payload: { destinationUrl: string; title?: string; description?: string }
  ): Promise<LinkRecord> {
    const clean = slugOrId.trim().toLowerCase().replace(/^\/r\//, '').replace(/^\//, '');
    let existing = await this.getLinkBySlug(clean);

    let target = payload.destinationUrl.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    const now = new Date().toISOString();

    const record: LinkRecord = existing
      ? {
          ...existing,
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
          destinationUrl: target,
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
        };

    // Save to Firestore using clean slug as doc ID for instant O(1) lookup
    const docRef = doc(db, LINKS_COLLECTION, clean);
    await setDoc(docRef, record, { merge: true });

    // Also write by record.id if different
    if (record.id !== clean) {
      await setDoc(doc(db, LINKS_COLLECTION, record.id), record, { merge: true });
    }

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

    // Save under slug for direct lookup
    await setDoc(doc(db, LINKS_COLLECTION, slug), newLink);
    await setDoc(doc(db, LINKS_COLLECTION, id), newLink);

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
   * Delete a link from Firestore.
   */
  async deleteLink(idOrSlug: string): Promise<boolean> {
    const clean = idOrSlug.trim().toLowerCase().replace(/^\/r\//, '').replace(/^\//, '');
    const existing = await this.getLinkBySlug(clean);
    if (existing) {
      await deleteDoc(doc(db, LINKS_COLLECTION, existing.slug)).catch(() => {});
      await deleteDoc(doc(db, LINKS_COLLECTION, existing.id)).catch(() => {});
    }
    return true;
  },

  /**
   * Generate a batch of pre-printed QR links in Firestore.
   */
  async generateBatch(payload: {
    batchName: string;
    prefix?: string;
    count: number;
    ownerId?: string;
    ownerEmail?: string;
    ownerName?: string;
  }): Promise<{ batchId: string; batchName: string; count: number; links: LinkRecord[] }> {
    const batchId = `batch_${Date.now()}`;
    const count = Math.min(Math.max(payload.count || 12, 1), 60);
    const prefix = (payload.prefix || 'qr').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const newLinks: LinkRecord[] = [];
    const now = new Date().toISOString();

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
        ownerId: payload.ownerId || 'usr_admin_1',
        ownerEmail: payload.ownerEmail || 'p0667500@gmail.com',
        ownerName: payload.ownerName || 'Administrator',
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

    return { batchId, batchName: payload.batchName, count, links: newLinks };
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
