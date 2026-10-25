import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as UAParserModule from 'ua-parser-js';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Interop helper for UAParser across ESM / CJS bundlers
const UAParser = (UAParserModule as any).UAParser || (UAParserModule as any).default || UAParserModule;

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'client';
  status: 'approved' | 'pending' | 'rejected';
  company?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface LinkRecord {
  id: string;
  slug: string;
  title: string;
  destinationUrl: string;
  description?: string;
  isActive: boolean;
  contentType?: 'url' | 'whatsapp' | 'vcard' | 'wifi' | 'text' | 'button';
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  totalClicks: number;
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
  isAssigned?: boolean;
  batchId?: string;
  batchName?: string;
  batchIndex?: number;
  qrSettings?: {
    colorDark?: string;
    colorLight?: string;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    frameStyle?: string;
    frameText?: string;
    centerIcon?: string;
  };
  dynamicButton?: {
    enabled: boolean;
    text: string;
    subtitle?: string;
    theme?: string;
    icon?: string;
    shape?: string;
    animation?: string;
    showQRBadge?: boolean;
  };
  presentationMode?: 'instant_redirect' | 'button_page';
}

export interface ClickRecord {
  id: string;
  linkId: string;
  slug: string;
  timestamp: string;
  referrer: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browser: string;
  os: string;
  ip: string;
  country: string;
  city?: string;
  userAgent: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  links: LinkRecord[];
  clicks: ClickRecord[];
}

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'redirects.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getDefaultUsers(): UserRecord[] {
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

  return [
    {
      id: 'usr_admin_1',
      name: 'System Administrator',
      email: 'p0667500@gmail.com',
      password: 'P4prince.com',
      role: 'admin',
      status: 'approved',
      company: 'DynamicQR Admin Team',
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
}

function getInitialData(): DatabaseSchema {
  const now = new Date();
  const daysAgo = (days: number, hoursOffset: number = 0) => {
    const d = new Date(now.getTime() - days * 86400000 - hoursOffset * 3600000);
    return d.toISOString();
  };

  const initialLinks: LinkRecord[] = [
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
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        errorCorrectionLevel: 'H',
        margin: 2,
      },
    },
    {
      id: 'link_2',
      slug: 'user-guide',
      title: 'Smart Sensor v2 Digital Documentation',
      destinationUrl: 'https://developer.mozilla.org',
      description: 'Quick-start QR code on physical product packaging and box sleeve',
      isActive: true,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(3),
      tags: ['Hardware', 'Packaging', 'Docs'],
      totalClicks: 326,
      ownerId: 'usr_client_sarah',
      ownerEmail: 'client@company.com',
      ownerName: 'Sarah Jenkins',
      qrSettings: {
        colorDark: '#1e3a8a',
        colorLight: '#ffffff',
        errorCorrectionLevel: 'Q',
        margin: 2,
      },
    },
    {
      id: 'link_3',
      slug: 'vip-menu',
      title: 'Executive Summit Digital Food & Wine Menu',
      destinationUrl: 'https://archive.org',
      description: 'Table tent acrylic stand QR codes in the grand banquet hall',
      isActive: true,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(2),
      tags: ['Event', 'Hospitality'],
      totalClicks: 94,
      ownerId: 'usr_admin_1',
      ownerEmail: 'p0667500@gmail.com',
      ownerName: 'System Administrator',
      qrSettings: {
        colorDark: '#064e3b',
        colorLight: '#ffffff',
        errorCorrectionLevel: 'H',
        margin: 2,
      },
    },
    {
      id: 'link_4',
      slug: 'survey-feedback',
      title: 'Customer Experience Instant Feedback',
      destinationUrl: 'https://news.ycombinator.com',
      description: 'Printed at the bottom of register receipts for quarterly CSAT review',
      isActive: true,
      createdAt: daysAgo(18),
      updatedAt: daysAgo(4),
      tags: ['CSAT', 'Receipts'],
      totalClicks: 112,
      ownerId: 'usr_client_sarah',
      ownerEmail: 'client@company.com',
      ownerName: 'Sarah Jenkins',
      qrSettings: {
        colorDark: '#312e81',
        colorLight: '#ffffff',
        errorCorrectionLevel: 'M',
        margin: 2,
      },
    },
    {
      id: 'link_pre_1',
      slug: 'stock-table-01',
      title: 'Pre-Printed Acrylic Stand #01',
      destinationUrl: '',
      description: 'Pre-printed acrylic stand on dining table 1, waiting for campaign menu link',
      isActive: true,
      isAssigned: false,
      batchId: 'batch_seed_1',
      batchName: 'Dining Table Stands',
      batchIndex: 1,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
      tags: ['Pre-Printed', 'Dining Tables'],
      totalClicks: 0,
      ownerId: 'usr_admin_1',
      ownerEmail: 'p0667500@gmail.com',
      ownerName: 'System Administrator',
      qrSettings: {
        colorDark: '#0f172a',
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
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        errorCorrectionLevel: 'H',
        margin: 2,
      },
    },
    {
      id: 'link_pre_3',
      slug: 'stock-sticker-101',
      title: 'Pre-Printed Box Sticker #101',
      destinationUrl: '',
      description: 'Adhesive packaging sticker in warehouse stock',
      isActive: true,
      isAssigned: false,
      batchId: 'batch_seed_2',
      batchName: 'Warehouse Stickers',
      batchIndex: 1,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
      tags: ['Pre-Printed', 'Packaging'],
      totalClicks: 0,
      ownerId: 'usr_admin_1',
      ownerEmail: 'p0667500@gmail.com',
      ownerName: 'System Administrator',
      qrSettings: {
        colorDark: '#1e3a8a',
        colorLight: '#ffffff',
        errorCorrectionLevel: 'H',
        margin: 2,
      },
    },
  ];

  const clickSamples: ClickRecord[] = [];
  const devices: Array<'mobile' | 'desktop' | 'tablet'> = ['mobile', 'mobile', 'mobile', 'desktop', 'tablet'];
  const browsers = ['Mobile Safari', 'Chrome Mobile', 'Safari', 'Chrome', 'Firefox', 'Samsung Internet'];
  const osList = ['iOS 18.1', 'iOS 17.5', 'Android 15', 'Android 14', 'macOS 15.1', 'Windows 11'];
  const countries = ['United States', 'Germany', 'United Kingdom', 'Japan', 'France', 'Canada', 'Singapore'];

  initialLinks.forEach((l) => {
    for (let i = 0; i < Math.min(l.totalClicks, 35); i++) {
      const dayOffset = Math.floor(Math.random() * 7);
      const hourOffset = Math.floor(Math.random() * 24);
      const dev = devices[Math.floor(Math.random() * devices.length)];
      const browser = browsers[Math.floor(Math.random() * browsers.length)];
      const os = osList[Math.floor(Math.random() * osList.length)];
      const country = countries[Math.floor(Math.random() * countries.length)];

      clickSamples.push({
        id: `click_${l.id}_${i}`,
        linkId: l.id,
        slug: l.slug,
        timestamp: daysAgo(dayOffset, hourOffset),
        referrer: Math.random() > 0.4 ? 'Camera QR Scan' : 'Direct / App Scanner',
        deviceType: dev,
        browser,
        os,
        ip: `192.168.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`,
        country,
        userAgent: `Mozilla/5.0 (${dev}; ${os}) AppleWebKit/537.36`,
      });
    }
  });

  return { users: getDefaultUsers(), links: initialLinks, clicks: clickSamples };
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);

      // Ensure users array and admin user exist
      if (!data.users || !Array.isArray(data.users)) {
        data.users = getDefaultUsers();
      }

      // Check required admin account
      const adminUser = data.users.find((u: UserRecord) => u.email.toLowerCase() === 'p0667500@gmail.com');
      if (!adminUser) {
        data.users.unshift({
          id: 'usr_admin_1',
          name: 'System Administrator',
          email: 'p0667500@gmail.com',
          password: 'P4prince.com',
          role: 'admin',
          status: 'approved',
          company: 'DynamicQR Admin Team',
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
        });
      } else {
        // Enforce the requested credentials
        adminUser.password = 'P4prince.com';
        adminUser.role = 'admin';
        adminUser.status = 'approved';
      }

      // Ensure links array exists
      if (!data.links || !Array.isArray(data.links)) {
        data.links = [];
      }
      if (!data.clicks || !Array.isArray(data.clicks)) {
        data.clicks = [];
      }

      return data;
    }
  } catch (err) {
    console.error('Error reading database file, resetting to defaults:', err);
  }

  const defaults = getInitialData();
  saveDatabase(defaults);
  return defaults;
}

function saveDatabase(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

async function startServer() {
  const app = express();
  // AI Studio environment requires dev server on port 3000
  const PORT = 3000;

  app.use(express.json());

  // Enable CORS for all incoming requests (enables Netlify & mobile cross-origin access)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // -------------------------------------------------------------
  // DYNAMIC REDIRECT ENGINE (/r/:slug)
  // -------------------------------------------------------------
  app.get('/r/:slug', (req: Request, res: Response) => {
    const { slug } = req.params;
    const db = loadDatabase();
    const link = db.links.find((l) => l.slug.toLowerCase() === slug.toLowerCase());

    if (!link) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>404 - Link Not Found</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-neutral-900 text-neutral-100 flex items-center justify-center min-h-screen p-6 font-sans">
          <div class="max-w-md w-full bg-neutral-800 border border-neutral-700 rounded-2xl p-8 text-center shadow-2xl">
            <div class="w-16 h-16 bg-neutral-700/60 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h1 class="text-xl font-bold mb-2">Dynamic Link Not Found</h1>
            <p class="text-neutral-400 text-sm mb-6">The requested short link <code class="bg-neutral-900 px-2 py-1 rounded text-neutral-300 font-mono">/r/${escapeHtml(slug)}</code> does not exist or may have been removed.</p>
            <a href="/" class="inline-block bg-neutral-100 text-neutral-900 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-white transition-colors">Return to Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }

    if (!link.isActive) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Inactive</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-neutral-900 text-neutral-100 flex items-center justify-center min-h-screen p-6 font-sans">
          <div class="max-w-md w-full bg-neutral-800 border border-amber-500/30 rounded-2xl p-8 text-center shadow-2xl">
            <div class="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h1 class="text-xl font-bold mb-2">Link Temporarily Paused</h1>
            <p class="text-neutral-400 text-sm mb-6">The administrator of this dynamic link has temporarily paused incoming redirects for <span class="text-neutral-200 font-medium">${escapeHtml(link.title)}</span>.</p>
            <a href="/" class="inline-block bg-neutral-700 text-neutral-200 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-neutral-600 transition-colors">Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }

    // CHECK IF UNASSIGNED (Pre-printed QR Code Stock waiting for a link)
    if (link.isAssigned === false || !link.destinationUrl || link.destinationUrl.trim() === '') {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pre-Printed QR Code - Assign Link</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-neutral-900 text-neutral-100 min-h-screen flex items-center justify-center p-4 font-sans antialiased">
          <div class="max-w-md w-full bg-neutral-800 border border-neutral-700 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div class="text-center space-y-2">
              <div class="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20 shadow-xs">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/></svg>
              </div>
              <span class="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">Pre-Printed Dynamic QR Code</span>
              <h1 class="text-xl font-bold text-white">${escapeHtml(link.title)}</h1>
              <div class="text-xs font-mono text-neutral-400 bg-neutral-900/80 px-3 py-1.5 rounded-lg border border-neutral-700/60 inline-block">
                /r/${escapeHtml(slug)}
              </div>
            </div>

            <div class="p-4 bg-neutral-900/50 rounded-xl border border-neutral-700/80 text-xs text-neutral-300 space-y-1.5">
              <div class="font-semibold text-amber-400 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Awaiting Destination URL Assignment</span>
              </div>
              <p class="text-neutral-400 leading-relaxed">
                This QR code was pre-printed in bulk and scanned before a destination was linked. You can activate it now below or assign it from the Admin Panel.
              </p>
            </div>

            <!-- Instant Phone Activation Form -->
            <form id="activateForm" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-neutral-300 mb-1">Destination URL <span class="text-indigo-400">*</span></label>
                <input type="url" id="destUrl" placeholder="https://yourwebsite.com/menu" required class="w-full px-3.5 py-2.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500">
              </div>

              <div>
                <label class="block text-xs font-semibold text-neutral-300 mb-1">Campaign Title (Optional)</label>
                <input type="text" id="linkTitle" placeholder="${escapeHtml(link.title)}" class="w-full px-3.5 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-indigo-500">
              </div>

              <div>
                <label class="block text-xs font-semibold text-neutral-300 mb-1">Admin Verification Password</label>
                <input type="password" id="adminPass" placeholder="Enter Admin Password" required class="w-full px-3.5 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-indigo-500">
              </div>

              <div id="statusMsg" class="hidden p-2.5 rounded-lg text-xs"></div>

              <button type="submit" id="submitBtn" class="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs">
                Activate & Link QR Code Now
              </button>
            </form>

            <div class="pt-2 border-t border-neutral-700/60 text-center text-xs text-neutral-500">
              <span>Or manage in </span>
              <a href="/" class="text-neutral-300 hover:underline font-semibold">Admin Panel</a>
            </div>
          </div>

          <script>
            const form = document.getElementById('activateForm');
            const msg = document.getElementById('statusMsg');
            const btn = document.getElementById('submitBtn');

            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              const dest = document.getElementById('destUrl').value;
              const title = document.getElementById('linkTitle').value;
              const pass = document.getElementById('adminPass').value;

              btn.disabled = true;
              btn.innerText = 'Linking...';

              try {
                const res = await fetch('/api/batch-qr/direct-activate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    slug: '${escapeHtml(slug)}',
                    destinationUrl: dest,
                    title: title || undefined,
                    adminPassword: pass
                  })
                });

                const data = await res.json();
                if (res.ok) {
                  msg.className = 'p-3 rounded-lg text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                  msg.innerText = 'Linked successfully! Redirecting now...';
                  msg.classList.remove('hidden');
                  setTimeout(() => {
                    window.location.reload();
                  }, 1200);
                } else {
                  msg.className = 'p-3 rounded-lg text-xs bg-red-500/20 text-red-300 border border-red-500/30';
                  msg.innerText = data.error || 'Activation failed';
                  msg.classList.remove('hidden');
                  btn.disabled = false;
                  btn.innerText = 'Activate & Link QR Code Now';
                }
              } catch (err) {
                msg.className = 'p-3 rounded-lg text-xs bg-red-500/20 text-red-300 border border-red-500/30';
                msg.innerText = 'Network error during activation';
                msg.classList.remove('hidden');
                btn.disabled = false;
                btn.innerText = 'Activate & Link QR Code Now';
              }
            });
          </script>
        </body>
        </html>
      `);
    }

    // Parse analytics
    const uaString = req.headers['user-agent'] || '';
    let parsed: any = {};
    try {
      const parser = new UAParser(uaString);
      parsed = parser.getResult();
    } catch (e) {
      parsed = {};
    }

    let devType: 'mobile' | 'tablet' | 'desktop' | 'unknown' = 'desktop';
    if (parsed.device?.type === 'mobile') devType = 'mobile';
    else if (parsed.device?.type === 'tablet') devType = 'tablet';
    else if (/Mobi|Android/i.test(uaString)) devType = 'mobile';

    const browser = parsed.browser?.name || (uaString.includes('Safari') ? 'Safari' : 'Browser');
    const os = parsed.os?.name ? `${parsed.os.name} ${parsed.os.version || ''}`.trim() : 'Unknown OS';
    const rawReferrer = req.headers['referer'] || (req.query.ref as string) || 'Camera QR Scan';
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    const country = (req.headers['cf-ipcountry'] as string) || (req.headers['x-country-code'] as string) || 'United States';

    // Record click
    const newClick: ClickRecord = {
      id: `clk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      linkId: link.id,
      slug: link.slug,
      timestamp: new Date().toISOString(),
      referrer: rawReferrer,
      deviceType: devType,
      browser,
      os,
      ip,
      country,
      userAgent: uaString,
    };

    link.totalClicks = (link.totalClicks || 0) + 1;
    link.updatedAt = new Date().toISOString();
    db.clicks.unshift(newClick);

    // Keep database capped at recent 2000 clicks
    if (db.clicks.length > 2000) {
      db.clicks = db.clicks.slice(0, 2000);
    }

    saveDatabase(db);

    // Determine target URL and handle query pass-through
    let target = link.destinationUrl;
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    // Preserve any search parameters passed to the short link (e.g. ?utm_campaign=xyz)
    try {
      const incomingUrl = new URL(req.originalUrl, `http://${req.headers.host || 'localhost'}`);
      const targetUrlObj = new URL(target);
      incomingUrl.searchParams.forEach((value, key) => {
        if (key !== 'slug') {
          targetUrlObj.searchParams.set(key, value);
        }
      });
      target = targetUrlObj.toString();
    } catch (e) {
      // Ignore query merge errors and use target as is
    }

    // If Dynamic Button Page presentation mode is enabled (and not bypassed by ?direct=1)
    if (link.presentationMode === 'button_page' && req.query.direct !== '1') {
      const btn = link.dynamicButton || {
        enabled: true,
        text: 'Continue to Destination',
        subtitle: 'Tap to visit dynamic link',
        theme: 'indigo',
        icon: 'sparkles',
        shape: 'pill',
        animation: 'pulse',
        showQRBadge: true,
      };

      const btnText = escapeHtml(btn.text || 'Continue to Destination');
      const btnSubtitle = btn.subtitle ? escapeHtml(btn.subtitle) : '';
      
      let themeClass = 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:opacity-95';
      if (btn.theme === 'emerald') themeClass = 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:opacity-95';
      if (btn.theme === 'amber') themeClass = 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:opacity-95';
      if (btn.theme === 'dark') themeClass = 'bg-neutral-900 text-white border border-neutral-700 hover:bg-neutral-800';
      if (btn.theme === 'neon') themeClass = 'bg-cyan-400 text-neutral-950 font-black shadow-lg shadow-cyan-400/30 hover:bg-cyan-300';
      if (btn.theme === 'glass') themeClass = 'bg-white/10 text-white border border-white/20 backdrop-blur-md hover:bg-white/20';

      let shapeClass = 'rounded-2xl';
      if (btn.shape === 'pill') shapeClass = 'rounded-full';
      if (btn.shape === 'sharp') shapeClass = 'rounded-lg';

      let animClass = '';
      if (btn.animation === 'pulse') animClass = 'animate-pulse';
      if (btn.animation === 'float') animClass = 'hover:-translate-y-0.5 transition-transform';

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${escapeHtml(link.title)} · taplocalin</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; }
            .font-mono { font-family: 'JetBrains Mono', monospace; }
          </style>
        </head>
        <body class="bg-neutral-950 text-neutral-100 min-h-screen flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-indigo-500 selection:text-white">
          <div class="max-w-md w-full mx-auto my-auto space-y-6">
            <!-- App Header -->
            <div class="flex items-center justify-center gap-2 text-neutral-400 text-xs font-semibold uppercase tracking-wider">
              <div class="w-6 h-6 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-indigo-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/></svg>
              </div>
              <span class="tracking-widest">taplocalin dynamic action</span>
            </div>

            <!-- Main Card -->
            <div class="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 text-center">
              <div>
                <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">${escapeHtml(link.title)}</h1>
                ${link.description ? `<p class="mt-2 text-xs sm:text-sm text-neutral-400 leading-relaxed">${escapeHtml(link.description)}</p>` : ''}
              </div>

              <!-- DYNAMIC ACTION BUTTON -->
              <div class="pt-2">
                <a
                  href="${escapeHtml(target)}"
                  class="group block w-full py-4 px-6 ${themeClass} ${shapeClass} ${animClass} transition-all duration-200 transform active:scale-95 focus:outline-none"
                >
                  <div class="flex items-center justify-center gap-2.5">
                    <span class="text-base sm:text-lg font-extrabold tracking-tight">${btnText}</span>
                    <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </div>
                  ${btnSubtitle ? `<div class="mt-1 text-xs opacity-90 font-medium">${btnSubtitle}</div>` : ''}
                </a>
              </div>

              <!-- Sub details / Direct bypass link -->
              <div class="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                <span>/r/${escapeHtml(slug)}</span>
                <a href="${escapeHtml(target)}" class="hover:text-neutral-300 underline underline-offset-2">
                  Direct Target ↗
                </a>
              </div>
            </div>

            <!-- Footer Badge -->
            <div class="text-center text-[11px] text-neutral-600">
              Powered by <span class="text-neutral-400 font-semibold">taplocalin</span> Dynamic Redirect Infrastructure
            </div>
          </div>
        </body>
        </html>
      `);
    }

    // HTTP 307: Crucial for dynamic redirects. Instructs browsers to never cache permanently!
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.redirect(307, target);
  });

  // -------------------------------------------------------------
  // AUTHENTICATION & CLIENT PORTAL ROUTES
  // -------------------------------------------------------------

  // 1. Unified Login (Supports Admin & Client)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password, portalType } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = loadDatabase();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // If client portal login requested for admin, or vice versa
    if (portalType === 'admin' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: This account does not have administrator privileges.' });
    }

    // If user is a client, enforce approval rule
    if (user.role === 'client') {
      if (user.status === 'pending') {
        return res.status(403).json({
          code: 'PENDING_APPROVAL',
          error: 'Your client account is currently awaiting administrator approval. You will be able to log in once an admin approves your profile in the Admin Panel.',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            company: user.company,
          },
        });
      }

      if (user.status === 'rejected') {
        return res.status(403).json({
          code: 'ACCOUNT_REJECTED',
          error: 'Your client registration request was rejected or suspended by the administrator. Contact p0667500@gmail.com for details.',
        });
      }
    }

    const token = `token_${user.id}_${Date.now()}`;

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        company: user.company,
        createdAt: user.createdAt,
      },
    });
  });

  // 2. Client Self-Registration (Creates Client with 'pending' status)
  app.post('/api/auth/register-client', (req: Request, res: Response) => {
    const { name, email, password, company } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = loadDatabase();

    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const newUser: UserRecord = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: cleanEmail,
      password: password.trim(),
      role: 'client',
      status: 'pending', // MUST BE APPROVED FROM ADMIN PANEL!
      company: company?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDatabase(db);

    res.status(201).json({
      message: 'Registration successful! Your client account has been submitted and is pending administrator approval.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        company: newUser.company,
        createdAt: newUser.createdAt,
      },
    });
  });

  // 3. Admin: List All Clients & Approval Requests
  app.get('/api/admin/clients', (req: Request, res: Response) => {
    const db = loadDatabase();
    const clients = db.users
      .filter((u) => u.role === 'client')
      .map((c) => {
        const linkCount = db.links.filter((l) => l.ownerId === c.id || l.ownerEmail === c.email).length;
        const totalScans = db.links
          .filter((l) => l.ownerId === c.id || l.ownerEmail === c.email)
          .reduce((sum, l) => sum + (l.totalClicks || 0), 0);

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          role: c.role,
          status: c.status,
          company: c.company || 'Direct Client',
          createdAt: c.createdAt,
          approvedAt: c.approvedAt,
          linkCount,
          totalScans,
        };
      });

    res.json({
      clients,
      pendingCount: clients.filter((c) => c.status === 'pending').length,
      approvedCount: clients.filter((c) => c.status === 'approved').length,
    });
  });

  // 4. Admin: Update Client Status (Approve, Reject, or Set Pending)
  app.put('/api/admin/clients/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved, rejected, or pending.' });
    }

    const db = loadDatabase();
    const userIndex = db.users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const client = db.users[userIndex];
    client.status = status;
    if (status === 'approved') {
      client.approvedAt = new Date().toISOString();
    }

    db.users[userIndex] = client;
    saveDatabase(db);

    res.json({
      success: true,
      message: `Client ${client.name} has been ${status === 'approved' ? 'approved' : status}.`,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        status: client.status,
        approvedAt: client.approvedAt,
      },
    });
  });

  // 5. Admin: Delete Client
  app.delete('/api/admin/clients/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = loadDatabase();

    const client = db.users.find((u) => u.id === id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    if (client.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete primary administrator.' });
    }

    db.users = db.users.filter((u) => u.id !== id);
    saveDatabase(db);

    res.json({ success: true, message: 'Client account deleted.' });
  });

  // -------------------------------------------------------------
  // BATCH PRE-PRINTED QR STOCK & ACTIVATION API
  // -------------------------------------------------------------

  // 1. Generate Batch of Pre-Printed / Unassigned QR Codes
  app.post('/api/batch-qr/generate', (req: Request, res: Response) => {
    const { batchName = 'Batch QR Stock', prefix = 'qr', count = 12, ownerId, ownerEmail, ownerName } = req.body;
    const num = Math.min(Math.max(parseInt(count, 10) || 12, 1), 60);

    const db = loadDatabase();
    const batchId = `batch_${Date.now()}`;
    const cleanPrefix = (prefix || 'qr').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-|-$/g, '') || 'qr';

    const newLinks: LinkRecord[] = [];
    const now = new Date().toISOString();

    for (let i = 1; i <= num; i++) {
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const slug = `${cleanPrefix}-${String(i).padStart(2, '0')}-${randomSuffix}`;

      const record: LinkRecord = {
        id: `link_${batchId}_${i}`,
        slug,
        title: `${batchName} #${String(i).padStart(2, '0')}`,
        destinationUrl: '', // Unassigned!
        description: `Pre-printed QR stock (${batchName})`,
        isActive: true,
        isAssigned: false,
        batchId,
        batchName,
        batchIndex: i,
        createdAt: now,
        updatedAt: now,
        tags: ['Pre-Printed', 'Batch Stock'],
        totalClicks: 0,
        ownerId: ownerId || 'usr_admin_1',
        ownerEmail: ownerEmail || 'p0667500@gmail.com',
        ownerName: ownerName || 'Administrator',
        qrSettings: {
          colorDark: '#0f172a',
          colorLight: '#ffffff',
          errorCorrectionLevel: 'H',
          margin: 2,
        },
      };

      newLinks.push(record);
      db.links.unshift(record);
    }

    saveDatabase(db);
    res.status(201).json({
      success: true,
      batchId,
      batchName,
      count: newLinks.length,
      links: newLinks,
    });
  });

  // 2. Direct Mobile Activation (Used when scanning unassigned QR code with phone)
  app.post('/api/batch-qr/direct-activate', (req: Request, res: Response) => {
    let { slug, destinationUrl, title, adminPassword } = req.body;

    if (!adminPassword || adminPassword !== 'P4prince.com') {
      return res.status(401).json({ error: 'Invalid admin verification password. Please use P4prince.com' });
    }

    if (!destinationUrl || typeof destinationUrl !== 'string') {
      return res.status(400).json({ error: 'Valid destination URL is required.' });
    }

    destinationUrl = destinationUrl.trim();
    if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
      destinationUrl = 'https://' + destinationUrl;
    }

    try {
      new URL(destinationUrl);
    } catch {
      return res.status(400).json({ error: 'Please enter a valid web URL (e.g. https://example.com).' });
    }

    const db = loadDatabase();
    const link = db.links.find((l) => l.slug.toLowerCase() === slug.toLowerCase());

    if (!link) {
      return res.status(404).json({ error: 'QR Code not found.' });
    }

    link.destinationUrl = destinationUrl;
    link.isAssigned = true;
    link.isActive = true;
    if (title && title.trim()) link.title = title.trim();
    link.updatedAt = new Date().toISOString();

    saveDatabase(db);
    res.json({ success: true, message: 'QR Code linked and activated!', link });
  });

  // 3. Assign Link via Admin Panel or Scan
  app.put('/api/batch-qr/:id/assign', (req: Request, res: Response) => {
    const { id } = req.params;
    let { destinationUrl, title, description } = req.body;

    if (!destinationUrl || typeof destinationUrl !== 'string') {
      return res.status(400).json({ error: 'Destination URL is required.' });
    }

    destinationUrl = destinationUrl.trim();
    if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
      destinationUrl = 'https://' + destinationUrl;
    }

    try {
      new URL(destinationUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format.' });
    }

    const db = loadDatabase();
    const cleanKey = id.trim().toLowerCase().replace('/r/', '').replace('/', '');
    let link = db.links.find((l) => l.id === id || l.slug.toLowerCase() === cleanKey);

    if (!link) {
      // Auto-create/upsert link if created on client or scanned fresh
      link = {
        id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        slug: cleanKey,
        title: title?.trim() || `QR Code (${cleanKey})`,
        destinationUrl,
        description: description?.trim() || 'Assigned via mobile scan',
        isActive: true,
        isAssigned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['Assigned', 'Mobile Scan'],
        totalClicks: 0,
        ownerId: 'usr_admin_1',
        ownerEmail: 'p0667500@gmail.com',
        ownerName: 'System Administrator',
      };
      db.links.unshift(link);
    } else {
      link.destinationUrl = destinationUrl;
      link.isAssigned = true;
      link.isActive = true;
      if (title && title.trim()) link.title = title.trim();
      if (description && description.trim()) link.description = description.trim();
      link.updatedAt = new Date().toISOString();
    }

    saveDatabase(db);
    res.json({ success: true, message: `QR Code /r/${link.slug} is now linked and active!`, link });
  });

  // 4. Two-Way Device Synchronization Endpoint (Syncs PC & Phone)
  app.post('/api/sync', (req: Request, res: Response) => {
    const { links: clientLinks } = req.body;
    const db = loadDatabase();

    if (Array.isArray(clientLinks)) {
      clientLinks.forEach((cLink: LinkRecord) => {
        if (!cLink || !cLink.slug) return;
        const existingIdx = db.links.findIndex((l) => l.id === cLink.id || l.slug.toLowerCase() === cLink.slug.toLowerCase());
        if (existingIdx !== -1) {
          // Keep newest updatedAt or preserve assignment
          const serverItem = db.links[existingIdx];
          const serverTime = new Date(serverItem.updatedAt || 0).getTime();
          const clientTime = new Date(cLink.updatedAt || 0).getTime();
          if (clientTime >= serverTime || (cLink.isAssigned && !serverItem.isAssigned)) {
            db.links[existingIdx] = { ...serverItem, ...cLink, isAssigned: true };
          }
        } else {
          db.links.unshift(cLink);
        }
      });
      saveDatabase(db);
    }

    res.json({
      success: true,
      links: db.links,
      count: db.links.length,
      timestamp: new Date().toISOString(),
    });
  });

  // -------------------------------------------------------------
  // DYNAMIC LINKS API
  // -------------------------------------------------------------

  // 1. Get all dynamic links (filtered by client if ownerId provided)
  app.get('/api/links', (req: Request, res: Response) => {
    const { ownerId } = req.query;
    const db = loadDatabase();

    let links = db.links;
    if (ownerId && typeof ownerId === 'string') {
      links = links.filter((l) => l.ownerId === ownerId);
    }

    res.json({
      links,
      totalLinks: links.length,
      totalClicks: links.reduce((acc, l) => acc + (l.totalClicks || 0), 0),
    });
  });

  // 2. Create new dynamic link
  app.post('/api/links', (req: Request, res: Response) => {
    let {
      title,
      destinationUrl,
      customSlug,
      description,
      tags,
      qrSettings,
      ownerId,
      ownerEmail,
      ownerName,
      contentType,
      dynamicButton,
      presentationMode,
    } = req.body;

    if (!destinationUrl || typeof destinationUrl !== 'string') {
      return res.status(400).json({ error: 'Valid destination URL is required.' });
    }

    destinationUrl = destinationUrl.trim();
    if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
      destinationUrl = 'https://' + destinationUrl;
    }

    try {
      new URL(destinationUrl);
    } catch {
      return res.status(400).json({ error: 'Please enter a valid destination URL (e.g., https://example.com).' });
    }

    const db = loadDatabase();

    let slug = customSlug ? customSlug.trim().toLowerCase() : '';
    if (slug) {
      slug = slug.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (slug.length < 2) {
        return res.status(400).json({ error: 'Custom slug must be at least 2 characters long.' });
      }
      if (db.links.some((l) => l.slug.toLowerCase() === slug.toLowerCase())) {
        return res.status(409).json({ error: `The slug "${slug}" is already in use. Please pick another one.` });
      }
    } else {
      const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
      let candidate = '';
      let attempts = 0;
      do {
        candidate = '';
        for (let i = 0; i < 6; i++) {
          candidate += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        attempts++;
      } while (db.links.some((l) => l.slug === candidate) && attempts < 20);
      slug = candidate;
    }

    const newRecord: LinkRecord = {
      id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      slug,
      title: title?.trim() || `Link /r/${slug}`,
      destinationUrl,
      description: description?.trim() || '',
      isActive: true,
      contentType: contentType || 'url',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: Array.isArray(tags) ? tags : [],
      totalClicks: 0,
      ownerId: ownerId || 'usr_admin_1',
      ownerEmail: ownerEmail || 'p0667500@gmail.com',
      ownerName: ownerName || 'Administrator',
      qrSettings: {
        colorDark: qrSettings?.colorDark || '#0f172a',
        colorLight: qrSettings?.colorLight || '#ffffff',
        errorCorrectionLevel: qrSettings?.errorCorrectionLevel || 'H',
        margin: typeof qrSettings?.margin === 'number' ? qrSettings.margin : 2,
        frameStyle: qrSettings?.frameStyle,
        frameText: qrSettings?.frameText,
        centerIcon: qrSettings?.centerIcon,
      },
      dynamicButton: dynamicButton && typeof dynamicButton === 'object' ? dynamicButton : undefined,
      presentationMode: presentationMode === 'button_page' ? 'button_page' : 'instant_redirect',
    };

    db.links.unshift(newRecord);
    saveDatabase(db);

    res.status(201).json(newRecord);
  });

  // 3. Edit dynamic link destination
  app.put('/api/links/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    let {
      destinationUrl,
      title,
      description,
      isActive,
      tags,
      qrSettings,
      contentType,
      dynamicButton,
      presentationMode,
    } = req.body;

    const db = loadDatabase();
    const linkIndex = db.links.findIndex((l) => l.id === id);

    if (linkIndex === -1) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const current = db.links[linkIndex];

    if (destinationUrl) {
      destinationUrl = destinationUrl.trim();
      if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
        destinationUrl = 'https://' + destinationUrl;
      }
      try {
        new URL(destinationUrl);
      } catch {
        return res.status(400).json({ error: 'Please enter a valid destination URL.' });
      }
      current.destinationUrl = destinationUrl;
      current.isAssigned = true; // Mark batch stock as activated once assigned
    }

    if (typeof title === 'string') current.title = title.trim();
    if (typeof description === 'string') current.description = description.trim();
    if (typeof isActive === 'boolean') current.isActive = isActive;
    if (Array.isArray(tags)) current.tags = tags;
    if (contentType) current.contentType = contentType;
    if (dynamicButton !== undefined) current.dynamicButton = dynamicButton;
    if (presentationMode) current.presentationMode = presentationMode;

    if (qrSettings && typeof qrSettings === 'object') {
      current.qrSettings = {
        ...current.qrSettings,
        ...qrSettings,
      };
    }

    current.updatedAt = new Date().toISOString();
    db.links[linkIndex] = current;
    saveDatabase(db);

    res.json({
      success: true,
      message: 'Dynamic link updated successfully. QR code will route to the new destination immediately.',
      link: current,
    });
  });

  // 4. Delete link
  app.delete('/api/links/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = loadDatabase();
    const initialLen = db.links.length;

    db.links = db.links.filter((l) => l.id !== id);
    db.clicks = db.clicks.filter((c) => c.linkId !== id);

    if (db.links.length === initialLen) {
      return res.status(404).json({ error: 'Link not found.' });
    }

    saveDatabase(db);
    res.json({ success: true, message: 'Link and analytics deleted.' });
  });

  // 5. Get analytics for a specific link
  app.get('/api/links/:id/analytics', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = loadDatabase();
    const link = db.links.find((l) => l.id === id);

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const clicks = db.clicks.filter((c) => c.linkId === id);

    const devicesMap: Record<string, number> = {};
    const browsersMap: Record<string, number> = {};
    const osMap: Record<string, number> = {};
    const countriesMap: Record<string, number> = {};
    const timelineMap: Record<string, number> = {};

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateKey = d.toISOString().split('T')[0];
      timelineMap[dateKey] = 0;
    }

    clicks.forEach((c) => {
      devicesMap[c.deviceType] = (devicesMap[c.deviceType] || 0) + 1;
      browsersMap[c.browser] = (browsersMap[c.browser] || 0) + 1;
      osMap[c.os] = (osMap[c.os] || 0) + 1;
      countriesMap[c.country] = (countriesMap[c.country] || 0) + 1;
      const dateKey = c.timestamp.split('T')[0];
      if (timelineMap[dateKey] !== undefined) {
        timelineMap[dateKey] += 1;
      }
    });

    const recentLogs = clicks.slice(0, 30);

    res.json({
      link,
      totalClicks: clicks.length,
      devices: Object.entries(devicesMap).map(([name, count]) => ({ name, count })),
      browsers: Object.entries(browsersMap).map(([name, count]) => ({ name, count })),
      os: Object.entries(osMap).map(([name, count]) => ({ name, count })),
      countries: Object.entries(countriesMap).map(([name, count]) => ({ name, count })),
      timeline: Object.entries(timelineMap).map(([date, count]) => ({ date, count })),
      recentLogs,
    });
  });

  // 6. Global analytics overview across all links
  app.get('/api/analytics/overview', (req: Request, res: Response) => {
    const { ownerId } = req.query;
    const db = loadDatabase();

    let links = db.links;
    if (ownerId && typeof ownerId === 'string') {
      links = links.filter((l) => l.ownerId === ownerId);
    }

    const linkIds = new Set(links.map((l) => l.id));
    const clicks = db.clicks.filter((c) => linkIds.has(c.linkId));

    const totalClicks = links.reduce((acc, l) => acc + (l.totalClicks || 0), 0);
    const activeLinksCount = links.filter((l) => l.isActive).length;

    const timelineMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateKey = d.toISOString().split('T')[0];
      timelineMap[dateKey] = 0;
    }

    const deviceMap: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    clicks.forEach((c) => {
      const dateKey = c.timestamp.split('T')[0];
      if (timelineMap[dateKey] !== undefined) {
        timelineMap[dateKey] += 1;
      }
      if (deviceMap[c.deviceType] !== undefined) {
        deviceMap[c.deviceType] += 1;
      } else {
        deviceMap[c.deviceType] = 1;
      }
    });

    const topLink = [...links].sort((a, b) => (b.totalClicks || 0) - (a.totalClicks || 0))[0] || null;

    res.json({
      totalLinks: links.length,
      activeLinksCount,
      totalClicks,
      topLink,
      deviceBreakdown: deviceMap,
      timeline: Object.entries(timelineMap).map(([date, count]) => ({ date, count })),
      recentActivity: clicks.slice(0, 15),
    });
  });

  // 7. Live Scan Simulator Endpoint
  app.post('/api/simulate-scan', (req: Request, res: Response) => {
    const { linkId, deviceType = 'mobile', location = 'New York, US' } = req.body;
    const db = loadDatabase();
    const link = db.links.find((l) => l.id === linkId);

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const browsers = deviceType === 'mobile' ? ['Mobile Safari', 'Chrome Mobile'] : ['Chrome', 'Safari'];
    const chosenBrowser = browsers[Math.floor(Math.random() * browsers.length)];
    const chosenOS = deviceType === 'mobile' ? 'iOS 18.1' : 'macOS 15.1';

    const simulatedClick: ClickRecord = {
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      linkId: link.id,
      slug: link.slug,
      timestamp: new Date().toISOString(),
      referrer: 'Camera QR Scan (Simulator)',
      deviceType: deviceType as any,
      browser: chosenBrowser,
      os: chosenOS,
      ip: '172.56.21.84',
      country: location.split(',')[1]?.trim() || 'United States',
      city: location.split(',')[0]?.trim() || 'Simulated City',
      userAgent: `Simulated/${deviceType} (${chosenOS}; ${chosenBrowser})`,
    };

    link.totalClicks = (link.totalClicks || 0) + 1;
    link.updatedAt = new Date().toISOString();
    db.clicks.unshift(simulatedClick);

    saveDatabase(db);

    res.json({
      success: true,
      message: `Simulated scan recorded for /r/${link.slug}`,
      click: simulatedClick,
      updatedTotalClicks: link.totalClicks,
    });
  });

  // 8. Server-side QR Code SVG / DataURL helper
  app.get('/api/qr', async (req: Request, res: Response) => {
    const { text, dark = '#000000', light = '#ffffff', level = 'H', margin = '2', format = 'svg' } = req.query;

    if (!text || typeof text !== 'string') {
      return res.status(400).send('Text parameter required.');
    }

    try {
      const options = {
        errorCorrectionLevel: (['L', 'M', 'Q', 'H'].includes(level as string) ? level : 'H') as any,
        margin: parseInt(margin as string, 10) || 2,
        color: {
          dark: (dark as string).startsWith('#') ? (dark as string) : `#${dark}`,
          light: (light as string).startsWith('#') ? (light as string) : `#${light}`,
        },
      };

      if (format === 'svg') {
        const svgString = await QRCode.toString(text, { ...options, type: 'svg' });
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.send(svgString);
      } else {
        const dataUrl = await QRCode.toDataURL(text, options);
        return res.json({ dataUrl });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'QR generation error' });
    }
  });

  // -------------------------------------------------------------
  // VITE DEV SERVER INTEGRATION & STATIC SERVING
  // -------------------------------------------------------------
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DynamicQR] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[DynamicQR] Admin login configured: p0667500@gmail.com`);
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
