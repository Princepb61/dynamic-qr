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

  const links: LinkRecord[] = [
    {
      id: 'link_1',
      slug: 'summer-promo',
      title: 'Summer Seasonal Campaign Flyer',
      destinationUrl: 'https://en.wikipedia.org/wiki/Summer',
      description: 'Printed on outdoor banners and promotional flyers across retail stores',
      isActive: true,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(1),
      tags: ['Marketing', 'Print', 'Flyer'],
      totalClicks: 184,
      ownerId: 'usr_admin_1',
      ownerEmail: 'p0667500@gmail.com',
      ownerName: 'System Administrator',
      qrSettings: {
        colorDark: '#000000',
        colorLight: '#ffffff',
        errorCorrectionLevel: 'H',
        margin: 2,
      },
      dynamicButton: {
        enabled: true,
        text: 'Claim Summer Discount',
        subtitle: 'Limited-time seasonal promotion',
        theme: 'indigo',
        icon: 'zap',
        shape: 'rounded',
        animation: 'pulse',
        showQRBadge: true,
      },
      presentationMode: 'instant_redirect',
    },
    {
      id: 'link_2',
      slug: 'menu-main',
      title: 'Dining Room Digital Menu Card',
      destinationUrl: 'https://en.wikipedia.org/wiki/Menu',
      description: 'Laminated stickers placed on all dining room tables',
      isActive: true,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(3),
      tags: ['Hospitality', 'Tables', 'Menu'],
      totalClicks: 421,
      ownerId: 'usr_admin_1',
      ownerEmail: 'p0667500@gmail.com',
      ownerName: 'System Administrator',
      qrSettings: {
        colorDark: '#000000',
        colorLight: '#ffffff',
        errorCorrectionLevel: 'H',
        margin: 2,
      },
      dynamicButton: {
        enabled: true,
        text: 'View Seasonal Menu',
        subtitle: 'Fresh farm-to-table selections',
        theme: 'emerald',
        icon: 'sparkles',
        shape: 'rounded',
        animation: 'none',
        showQRBadge: true,
      },
      presentationMode: 'instant_redirect',
    },
    {
      id: 'link_pre_1',
      slug: 'stock-table-01',
      title: 'Pre-Printed Acrylic Stand #01',
      destinationUrl: 'https://google.com',
      description: 'Pre-printed acrylic stand on dining table 1',
      isActive: true,
      isAssigned: true,
      batchId: 'batch_seed_1',
      batchName: 'Dining Table Stands',
      batchIndex: 1,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
      tags: ['Pre-Printed', 'Dining Tables'],
      totalClicks: 15,
      ownerId: 'usr_admin_1',
      ownerEmail: 'p0667500@gmail.com',
      ownerName: 'System Administrator',
      qrSettings: {
        colorDark: '#000000',
        colorLight: '#ffffff',
        errorCorrectionLevel: 'H',
        margin: 2,
      },
    },
    {
      id: 'link_pre_2',
      slug: 'stock-table-02',
      title: 'Pre-Printed Acrylic Stand #02',
      destinationUrl: '',
      description: 'Pre-printed acrylic stand on dining table 2, waiting for campaign menu link',
      isActive: true,
      isAssigned: false,
      batchId: 'batch_seed_1',
      batchName: 'Dining Table Stands',
      batchIndex: 2,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
      tags: ['Pre-Printed', 'Dining Tables'],
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
    },
  ];

  const clicks: ClickRecord[] = [];
  const devices: Array<'mobile' | 'desktop' | 'tablet'> = ['mobile', 'mobile', 'mobile', 'desktop', 'tablet'];
  const browsers = ['Mobile Safari', 'Chrome Mobile', 'Safari', 'Chrome'];
  const osList = ['iOS 18.1', 'Android 15', 'macOS 15.1', 'Windows 11'];
  const countries = ['United States', 'Germany', 'United Kingdom', 'Canada'];

  links.forEach((l) => {
    for (let i = 0; i < Math.min(l.totalClicks, 20); i++) {
      clicks.push({
        id: `clk_${l.id}_${i}`,
        linkId: l.id,
        slug: l.slug,
        timestamp: daysAgo(Math.floor(Math.random() * 7), Math.floor(Math.random() * 24)),
        referrer: 'Camera QR Scan',
        deviceType: devices[Math.floor(Math.random() * devices.length)],
        browser: browsers[Math.floor(Math.random() * browsers.length)],
        os: osList[Math.floor(Math.random() * osList.length)],
        ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        country: countries[Math.floor(Math.random() * countries.length)],
        userAgent: 'Mobile Scanner',
      });
    }
  });

  return { users, links, clicks };
}

function loadDb(): LocalDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
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

  async login(payload: { email: string; password: string; portalType?: 'admin' | 'client' }): Promise<{ token: string; user: UserRecord }> {
    const db = loadDb();
    const user = db.users.find((u) => u.email.toLowerCase() === payload.email.toLowerCase().trim());
    if (!user || user.password !== payload.password) {
      throw new Error('Invalid email or password credentials.');
    }
    if (payload.portalType === 'admin' && user.role !== 'admin') {
      throw new Error('This account does not have administrator privileges.');
    }
    if (user.status === 'pending') {
      const err: any = new Error('Your client account is pending administrator approval.');
      err.code = 'ACCOUNT_PENDING_APPROVAL';
      err.user = user;
      throw err;
    }
    if (user.status === 'rejected') {
      throw new Error('Your client account application was declined.');
    }
    const { password, ...safeUser } = user;
    return { token: `local_token_${user.id}`, user: safeUser };
  },

  async registerClient(payload: { name: string; email: string; password: string; company?: string }) {
    const db = loadDb();
    const existing = db.users.find((u) => u.email.toLowerCase() === payload.email.toLowerCase().trim());
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }
    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: payload.name.trim(),
      email: payload.email.toLowerCase().trim(),
      password: payload.password,
      role: 'client',
      status: 'pending',
      company: payload.company?.trim(),
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDb(db);
    const { password, ...safeUser } = newUser;
    return {
      message: 'Account registered successfully. Awaiting admin approval.',
      user: safeUser,
    };
  },

  async getClients(): Promise<{ clients: ClientAccount[]; pendingCount: number; approvedCount: number }> {
    const db = loadDb();
    const clients: ClientAccount[] = db.users
      .filter((u) => u.role === 'client')
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: 'client' as const,
        company: u.company || 'Direct Client',
        status: u.status,
        createdAt: u.createdAt,
        approvedAt: u.approvedAt,
        linkCount: db.links.filter((l) => l.ownerId === u.id).length,
        totalScans: db.links.filter((l) => l.ownerId === u.id).reduce((sum, l) => sum + (l.totalClicks || 0), 0),
      }));
    const pendingCount = clients.filter((c) => c.status === 'pending').length;
    const approvedCount = clients.filter((c) => c.status === 'approved').length;
    return { clients, pendingCount, approvedCount };
  },

  async updateClientStatus(id: string, status: 'approved' | 'rejected' | 'pending') {
    const db = loadDb();
    const client = db.users.find((u) => u.id === id);
    if (!client) throw new Error('Client not found');
    client.status = status;
    if (status === 'approved') client.approvedAt = new Date().toISOString();
    saveDb(db);
    return { success: true, message: `Client status updated to ${status}`, client };
  },

  async deleteClient(id: string) {
    const db = loadDb();
    db.users = db.users.filter((u) => u.id !== id);
    saveDb(db);
    return true;
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
    const link = db.links.find((l) => l.id === id);
    if (!link) throw new Error('Link not found');
    if (payload.destinationUrl !== undefined) link.destinationUrl = payload.destinationUrl;
    if (payload.title !== undefined) link.title = payload.title;
    if (payload.description !== undefined) link.description = payload.description;
    if (payload.isActive !== undefined) link.isActive = payload.isActive;
    if (payload.tags !== undefined) link.tags = payload.tags;
    if (payload.qrSettings !== undefined) link.qrSettings = payload.qrSettings;
    if (payload.dynamicButton !== undefined) link.dynamicButton = payload.dynamicButton;
    if (payload.presentationMode !== undefined) link.presentationMode = payload.presentationMode;
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

  async assignBatchLink(id: string, payload: { destinationUrl: string; title?: string }) {
    const db = loadDb();
    const link = db.links.find((l) => l.id === id);
    if (!link) throw new Error('QR code not found');
    link.destinationUrl = payload.destinationUrl;
    if (payload.title) link.title = payload.title;
    link.isAssigned = true;
    link.updatedAt = new Date().toISOString();
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
