import { LinkRecord, LinkAnalytics, GlobalOverview, ClickRecord, UserRecord, ClientAccount } from '../types';

const STORAGE_KEY = 'taplocalin_netlify_db_v1';

interface StoredUser extends UserRecord {
  password?: string;
}

interface LocalDatabase {
  users: StoredUser[];
  links: LinkRecord[];
  clicks: ClickRecord[];
}

function getInitialLocalDatabase(): LocalDatabase {
  const now = new Date();
  const daysAgo = (days: number, hoursOffset: number = 0) => {
    return new Date(now.getTime() - days * 86400000 - hoursOffset * 3600000).toISOString();
  };

  const users: StoredUser[] = [
    {
      id: 'usr_admin_1',
      name: 'System Administrator',
      email: 'p0667500@gmail.com',
      password: 'P4prince.com',
      role: 'admin',
      status: 'approved',
      company: 'taplocalin Admin Team',
      createdAt: daysAgo(30),
      approvedAt: daysAgo(30),
    },
    {
      id: 'usr_client_sarah',
      name: 'Sarah Jenkins',
      email: 'client@company.com',
      password: 'client123',
      role: 'client',
      status: 'approved',
      company: 'Acme Retail Group',
      createdAt: daysAgo(10),
      approvedAt: daysAgo(9),
    },
    {
      id: 'usr_client_alex',
      name: 'Alex Turner',
      email: 'pending@startup.io',
      password: 'client123',
      role: 'client',
      status: 'pending',
      company: 'Apex Logistics & Tech',
      createdAt: daysAgo(1),
    },
  ];

  const PURGED_SLUGS = new Set([
    'summer-promo',
    'stock-table-01',
    'stock-table-02',
    'menu-main',
    'stock-sticker-101',
    'vip-menu',
    'user-guide',
    'survey-feedback',
  ]);

  const links: LinkRecord[] = [];
  const clicks: ClickRecord[] = [];

  return { users, links, clicks };
}

const PURGED_SLUGS = new Set([
  'summer-promo',
  'stock-table-01',
  'stock-table-02',
  'menu-main',
  'stock-sticker-101',
  'vip-menu',
  'user-guide',
  'survey-feedback',
]);

function loadDb(): LocalDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: LocalDatabase = JSON.parse(raw);
      if (Array.isArray(data.links)) {
        data.links = data.links.filter((l) => l && l.slug && !PURGED_SLUGS.has(l.slug.toLowerCase()));
      }
      if (Array.isArray(data.clicks)) {
        data.clicks = data.clicks.filter((c) => c && c.slug && !PURGED_SLUGS.has(c.slug.toLowerCase()));
      }
      saveDb(data);
      return data;
    }
  } catch (err) {
    console.error('Failed to parse localStorage db:', err);
  }
  const initial = getInitialLocalDatabase();
  saveDb(initial);
  return initial;
}

function saveDb(data: LocalDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to write to localStorage:', err);
  }
}

export const localDb = {
  loadDb,
  saveDb,

  async login(payload: { email: string; password: string; portalType?: string }): Promise<{ token: string; user: UserRecord }> {
    const db = loadDb();
    const cleanEmail = payload.email.toLowerCase().trim();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user || user.password !== payload.password) {
      throw new Error('Invalid email or password credentials.');
    }
    const { password, ...safeUser } = user;
    return { token: `local_token_${user.id}`, user: safeUser };
  },

  exportBackup() {
    const db = loadDb();
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      links: db.links,
      clicksCount: db.clicks.length,
    };
  },

  importBackup(backupData: any): { success: boolean; count: number; error?: string } {
    try {
      if (!backupData || !Array.isArray(backupData.links)) {
        return { success: false, count: 0, error: 'File is not a valid taplocalin backup JSON.' };
      }
      const db = loadDb();
      const existingIds = new Set(db.links.map((l) => l.id));
      let importedCount = 0;
      for (const item of backupData.links) {
        if (!item.slug) continue;
        if (existingIds.has(item.id)) {
          const idx = db.links.findIndex((l) => l.id === item.id);
          if (idx !== -1) db.links[idx] = item;
        } else {
          db.links.unshift(item);
          existingIds.add(item.id);
        }
        importedCount++;
      }
      saveDb(db);
      return { success: true, count: importedCount };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message || 'Import error' };
    }
  },

  async getLinks(ownerId?: string) {
    const db = loadDb();
    let links = db.links;
    if (ownerId) links = links.filter((l) => l.ownerId === ownerId);
    const totalClicks = links.reduce((sum, l) => sum + (l.totalClicks || 0), 0);
    return { links, totalLinks: links.length, totalClicks };
  },

  async createLink(payload: any) {
    const db = loadDb();
    const id = `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const slug = (payload.customSlug || Math.random().toString(36).substring(2, 7)).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const newLink: LinkRecord = {
      id,
      slug,
      title: payload.title || 'Dynamic Link',
      destinationUrl: payload.destinationUrl || '',
      description: payload.description || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: payload.tags || ['Dynamic'],
      totalClicks: 0,
      ownerId: payload.ownerId || 'usr_admin_1',
      ownerEmail: payload.ownerEmail || 'p0667500@gmail.com',
      ownerName: payload.ownerName || 'Administrator',
      qrSettings: payload.qrSettings || { colorDark: '#000000', colorLight: '#ffffff', errorCorrectionLevel: 'H', margin: 2 },
    };
    db.links.unshift(newLink);
    saveDb(db);
    return newLink;
  },

  async updateLink(id: string, payload: any) {
    const db = loadDb();
    const link = db.links.find((l) => l.id === id || l.slug.toLowerCase() === id.toLowerCase());
    if (!link) throw new Error('Link not found');
    Object.assign(link, payload);
    link.updatedAt = new Date().toISOString();
    saveDb(db);
    return { success: true, message: 'Link updated successfully', link };
  },

  async deleteLink(id: string) {
    const db = loadDb();
    db.links = db.links.filter((l) => l.id !== id);
    db.clicks = db.clicks.filter((c) => c.linkId !== id);
    saveDb(db);
    return true;
  },

  async generateBatch(payload: { batchName: string; prefix?: string; count: number; ownerId?: string; ownerEmail?: string; ownerName?: string }) {
    const db = loadDb();
    const batchId = `batch_${Date.now()}`;
    const count = Math.min(Math.max(payload.count || 12, 1), 50);
    const prefix = (payload.prefix || 'qr').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const newLinks: LinkRecord[] = [];

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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
      newLinks.push(link);
      db.links.unshift(link);
    }
    saveDb(db);
    return { success: true, batchId, batchName: payload.batchName, count, links: newLinks };
  },

  async assignBatchLink(idOrSlug: string, payload: Partial<LinkRecord> & { destinationUrl: string; title?: string }) {
    const db = loadDb();
    const clean = idOrSlug.trim().toLowerCase().replace('/r/', '').replace('/', '');
    let link = db.links.find((l) => l.id === idOrSlug || l.slug.toLowerCase() === clean);

    if (!link) {
      link = {
        id: `link_${clean}_${Date.now()}`,
        slug: clean,
        title: payload.title || `QR Code (${clean})`,
        description: 'Assigned via mobile scan',
        isActive: true,
        isAssigned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['Pre-Printed', 'Assigned'],
        totalClicks: 0,
        ownerId: 'usr_admin_1',
        ownerEmail: 'p0667500@gmail.com',
        ownerName: 'Administrator',
        qrSettings: {
          colorDark: '#000000',
          colorLight: '#ffffff',
          errorCorrectionLevel: 'H',
          margin: 2,
        },
        ...payload,
        destinationUrl: payload.destinationUrl,
      };
      db.links.unshift(link);
    } else {
      Object.assign(link, payload);
      link.isAssigned = true;
      link.updatedAt = new Date().toISOString();
    }

    saveDb(db);
    return { success: true, message: 'QR code assigned successfully', link };
  },

  async getOverview(ownerId?: string): Promise<GlobalOverview> {
    const db = loadDb();
    let links = db.links;
    let clicks = db.clicks;
    if (ownerId) {
      links = links.filter((l) => l.ownerId === ownerId);
      const linkIds = new Set(links.map((l) => l.id));
      clicks = clicks.filter((c) => linkIds.has(c.linkId));
    }
    const totalLinks = links.length;
    const totalClicks = links.reduce((sum, l) => sum + (l.totalClicks || 0), 0);
    const activeLinksCount = links.filter((l) => l.isActive && l.isAssigned !== false).length;

    // Device breakdown
    const deviceBreakdown: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    clicks.forEach((c) => {
      if (deviceBreakdown[c.deviceType] !== undefined) deviceBreakdown[c.deviceType]++;
      else deviceBreakdown.mobile++;
    });

    const topLink = [...links].sort((a, b) => (b.totalClicks || 0) - (a.totalClicks || 0))[0] || null;

    return {
      totalLinks,
      activeLinksCount,
      totalClicks,
      topLink,
      deviceBreakdown,
      timeline: [
        { date: 'Mon', count: 42 },
        { date: 'Tue', count: 58 },
        { date: 'Wed', count: 85 },
        { date: 'Thu', count: 64 },
        { date: 'Fri', count: 110 },
        { date: 'Sat', count: 95 },
        { date: 'Sun', count: 72 },
      ],
      recentActivity: clicks.slice(0, 20),
    };
  },

  async getLinkAnalytics(id: string): Promise<LinkAnalytics> {
    const db = loadDb();
    const link = db.links.find((l) => l.id === id);
    if (!link) throw new Error('Link not found');
    const clicks = db.clicks.filter((c) => c.linkId === id);
    return {
      link,
      totalClicks: link.totalClicks || clicks.length,
      timeline: [
        { date: 'Mon', count: 12 },
        { date: 'Tue', count: 18 },
        { date: 'Wed', count: 24 },
        { date: 'Thu', count: 16 },
        { date: 'Fri', count: 32 },
        { date: 'Sat', count: 28 },
        { date: 'Sun', count: 20 },
      ],
      devices: [
        { name: 'Mobile', count: Math.round(clicks.length * 0.7) || 12 },
        { name: 'Desktop', count: Math.round(clicks.length * 0.2) || 4 },
        { name: 'Tablet', count: Math.round(clicks.length * 0.1) || 2 },
      ],
      browsers: [
        { name: 'Mobile Safari', count: 16 },
        { name: 'Chrome Mobile', count: 12 },
        { name: 'Chrome', count: 6 },
      ],
      os: [
        { name: 'iOS 18', count: 18 },
        { name: 'Android 15', count: 12 },
        { name: 'Windows 11', count: 4 },
      ],
      countries: [
        { name: 'United States', count: 14 },
        { name: 'Canada', count: 6 },
        { name: 'Germany', count: 4 },
      ],
      recentLogs: clicks.slice(0, 15),
    };
  },

  async simulateScan(linkId: string, deviceType: string = 'mobile', location: string = 'New York, US') {
    const db = loadDb();
    const link = db.links.find((l) => l.id === linkId);
    if (!link) throw new Error('Link not found');
    const click: ClickRecord = {
      id: `clk_${Date.now()}`,
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
    link.totalClicks = (link.totalClicks || 0) + 1;
    link.updatedAt = new Date().toISOString();
    db.clicks.unshift(click);
    saveDb(db);
    return { success: true, click, updatedTotalClicks: link.totalClicks };
  },

  getLinkBySlug(slug: string): LinkRecord | undefined {
    const db = loadDb();
    return db.links.find((l) => l.slug.toLowerCase() === slug.toLowerCase().trim());
  },
};
