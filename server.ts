import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as UAParserModule from 'ua-parser-js';
import QRCode from 'qrcode';
import { GoogleGenAI } from '@google/genai';
import { generateProceduralReviews } from './src/utils/proceduralReviewGenerator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Interop helper for UAParser across ESM / CJS bundlers
const UAParser = (UAParserModule as any).UAParser || (UAParserModule as any).default || UAParserModule;

// Initialize Google GenAI client
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI() : null;

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
  contentType?: 'url' | 'whatsapp' | 'vcard' | 'wifi' | 'text' | 'button' | 'multi_action_hub';
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
  batchPassword?: string;
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
  presentationMode?: 'instant_redirect' | 'button_page' | 'review_gate' | 'multi_action_hub';
  reviewGate?: {
    enabled: boolean;
    businessName?: string;
    businessCategory?: string;
    googleReviewUrl: string;
    minRatingForGoogle: number;
    praiseTags: string[];
    customTone?: string;
  };
  hubConfig?: {
    enabled: boolean;
    heading?: string;
    subheading?: string;
    customImageUrl?: string;
    actions: Array<{
      id: string;
      title: string;
      type: 'google_review' | 'whatsapp' | 'contact' | 'menu' | 'wifi' | 'website' | 'facebook' | 'instagram' | 'location';
      destinationUrl?: string;
      phone?: string;
      message?: string;
      address?: string;
      handle?: string;
      googlePlaceId?: string;
      subtitle?: string;
      enabled?: boolean;
      enableAiReviews?: boolean;
      businessName?: string;
      businessCategory?: string;
      praiseTags?: string[];
      customTone?: string;
      wifiSsid?: string;
      wifiPassword?: string;
    }>;
  };
  vcardData?: {
    fullName: string;
    phone?: string;
    email?: string;
    organization?: string;
    title?: string;
    website?: string;
    address?: string;
  };
  wifiData?: {
    ssid: string;
    password?: string;
    encryption?: 'WPA' | 'WEP' | 'nopass';
    hidden?: boolean;
  };
}

export interface ReviewFeedbackRecord {
  id: string;
  linkId: string;
  slug: string;
  rating: number;
  customerName?: string;
  customerContact?: string;
  feedbackText: string;
  tags?: string[];
  createdAt: string;
  status: 'new' | 'reviewed' | 'resolved';
  ownerReply?: string;
  ownerRepliedAt?: string;
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
  feedback: ReviewFeedbackRecord[];
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

  return { users: getDefaultUsers(), links: initialLinks, clicks: clickSamples, feedback: [] };
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
      if (!data.feedback || !Array.isArray(data.feedback)) {
        data.feedback = [];
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

    // 1. CHECK IF MULTI-ACTION HUB (Multi-Action Hub should NEVER be blocked as unassigned)
    const isHubActive =
      (link.presentationMode === 'multi_action_hub' ||
        link.contentType === 'multi_action_hub' ||
        Boolean(link.hubConfig && link.hubConfig.enabled)) &&
      Boolean(link.hubConfig && Array.isArray(link.hubConfig.actions) && link.hubConfig.actions.length > 0);

    // 2. CHECK IF UNASSIGNED (Pre-printed QR Code Stock waiting for a link)
    if (!isHubActive && (link.isAssigned === false || !link.destinationUrl || link.destinationUrl.trim() === '')) {
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

            ${link.batchPassword ? `
            <!-- Password Gate for Protected Batch QR -->
            <div id="gateBlock" class="space-y-4">
              <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
                <div class="font-bold flex items-center gap-1.5 text-amber-400">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Batch Security Password Required</span>
                </div>
                <p class="text-neutral-400 leading-relaxed">
                  This QR code belongs to a protected batch. Please enter this batch's password to unlock the destination assignment page on your phone.
                </p>
              </div>

              <div class="space-y-3">
                <label class="block text-xs font-semibold text-neutral-300">Enter Batch Password <span class="text-amber-400">*</span></label>
                <input type="password" id="gatePass" placeholder="Enter batch password" autofocus class="w-full px-3.5 py-2.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500">
                <div id="gateError" class="hidden p-2.5 rounded-lg text-xs bg-red-500/20 text-red-300 border border-red-500/30 font-medium"></div>
                <button type="button" id="gateUnlockBtn" class="w-full py-2.5 px-4 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-all shadow-md active:scale-98">
                  Unlock QR Code
                </button>
              </div>
            </div>
            ` : ''}

            <!-- Destination Assignment Form -->
            <form id="activateForm" class="${link.batchPassword ? 'hidden' : ''} space-y-4">
              <div class="p-4 bg-neutral-900/50 rounded-xl border border-neutral-700/80 text-xs text-neutral-300 space-y-1.5">
                <div class="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Assign Destination URL</span>
                </div>
                <p class="text-neutral-400 leading-relaxed">
                  Enter your destination website or link. Physical stickers stay active forever.
                </p>
              </div>

              <div>
                <label class="block text-xs font-semibold text-neutral-300 mb-1">Destination URL <span class="text-indigo-400">*</span></label>
                <input type="url" id="destUrl" placeholder="https://yourwebsite.com/menu" required class="w-full px-3.5 py-2.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500">
              </div>

              <div>
                <label class="block text-xs font-semibold text-neutral-300 mb-1">Campaign Title (Optional)</label>
                <input type="text" id="linkTitle" placeholder="${escapeHtml(link.title)}" class="w-full px-3.5 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-indigo-500">
              </div>

              ${!link.batchPassword ? `
              <div>
                <label class="block text-xs font-semibold text-neutral-300 mb-1">Admin Verification Password <span class="text-indigo-400">*</span></label>
                <input type="password" id="adminPass" placeholder="Enter admin password (P4prince.com)" required class="w-full px-3.5 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-indigo-500">
              </div>
              ` : `
              <input type="hidden" id="adminPass" value="">
              `}

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
            const isProtected = ${Boolean(link.batchPassword)};
            const gateBtn = document.getElementById('gateUnlockBtn');
            const gateInput = document.getElementById('gatePass');
            const gateError = document.getElementById('gateError');
            const gateBlock = document.getElementById('gateBlock');
            const form = document.getElementById('activateForm');
            const msg = document.getElementById('statusMsg');
            const btn = document.getElementById('submitBtn');

            if (gateBtn && gateInput) {
              const doUnlock = async () => {
                const pass = gateInput.value.trim();
                if (!pass) {
                  gateError.innerText = 'Please enter the batch password';
                  gateError.classList.remove('hidden');
                  return;
                }
                gateBtn.disabled = true;
                gateBtn.innerText = 'Verifying...';

                try {
                  const res = await fetch('/api/batch-qr/verify-pass', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slug: '${escapeHtml(slug)}', password: pass })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    document.getElementById('adminPass').value = pass;
                    gateBlock.classList.add('hidden');
                    form.classList.remove('hidden');
                    document.getElementById('destUrl').focus();
                  } else {
                    gateError.innerText = data.error || 'Incorrect batch password';
                    gateError.classList.remove('hidden');
                    gateBtn.disabled = false;
                    gateBtn.innerText = 'Unlock QR Code';
                  }
                } catch (err) {
                  gateError.innerText = 'Network error while verifying password';
                  gateError.classList.remove('hidden');
                  gateBtn.disabled = false;
                  gateBtn.innerText = 'Unlock QR Code';
                }
              };

              gateBtn.addEventListener('click', doUnlock);
              gateInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  doUnlock();
                }
              });
            }

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
    if (target && !target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    // Multi-Action Smart Hub Presentation Mode
    if (
      (link.presentationMode === 'multi_action_hub' ||
        link.contentType === 'multi_action_hub' ||
        (link.hubConfig && link.hubConfig.enabled && link.hubConfig.actions && link.hubConfig.actions.length > 0)) &&
      req.query.direct !== '1'
    ) {
      const hub = link.hubConfig || {
        enabled: true,
        heading: link.title,
        subheading: link.description || 'Welcome! Choose an option below',
        actions: [],
      };
      const activeActions = (hub.actions || []).filter((a) => a.enabled !== false);
      const hubHeading = escapeHtml(hub.heading || link.title);
      const hubSub = escapeHtml(hub.subheading || link.description || 'Tap any option below to get started');

      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${hubHeading}</title>
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
            <!-- Hub Header -->
            <div class="text-center space-y-2">
              ${hub.customImageUrl ? `
                <div class="w-20 h-20 rounded-2xl overflow-hidden border-2 border-indigo-500/40 mx-auto shadow-xl shadow-indigo-500/10 bg-neutral-900 flex items-center justify-center">
                  <img src="${escapeHtml(hub.customImageUrl)}" alt="${hubHeading}" class="w-full h-full object-cover">
                </div>
              ` : `
                <div class="w-16 h-16 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/></svg>
                </div>
              `}
              <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">${hubHeading}</h1>
              <p class="text-xs sm:text-sm text-neutral-400 max-w-xs mx-auto leading-relaxed">${hubSub}</p>
            </div>

            <!-- Actions List -->
            <div class="space-y-3">
              ${activeActions.map((act) => {
                let actionHref = act.destinationUrl || '#';
                let iconSvg = '';
                let badge = '';
                let isAiReviewButton = false;
                let isWifiButton = false;

                if (act.type === 'google_review') {
                  actionHref = act.destinationUrl || (act.googlePlaceId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(act.googlePlaceId)}` : '#');
                  iconSvg = '<svg class="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
                  badge = '<span class="text-[10px] font-bold text-amber-400 uppercase tracking-wider">5-Star Review</span>';
                  if (act.enableAiReviews !== false) {
                    isAiReviewButton = true;
                  }
                } else if (act.type === 'whatsapp') {
                  const phoneDigits = (act.phone || '').replace(/[^0-9]/g, '');
                  const textMsg = encodeURIComponent(act.message || 'Hello!');
                  actionHref = `https://wa.me/${phoneDigits}?text=${textMsg}`;
                  iconSvg = '<svg class="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
                } else if (act.type === 'wifi') {
                  iconSvg = '<svg class="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>';
                  if (act.wifiSsid || act.wifiPassword || link.wifiData?.ssid) {
                    isWifiButton = true;
                  } else {
                    actionHref = act.destinationUrl || '#';
                  }
                } else if (act.type === 'contact') {
                  actionHref = `/api/vcard/${escapeHtml(slug)}.vcf`;
                  iconSvg = '<svg class="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
                } else if (act.type === 'menu') {
                  actionHref = act.destinationUrl || '#';
                  iconSvg = '<svg class="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v14"/><path d="M6 2v20"/><path d="M2 6h8"/></svg>';
                } else if (act.type === 'location') {
                  actionHref = act.destinationUrl || (act.address ? `https://maps.google.com/?q=${encodeURIComponent(act.address)}` : '#');
                  iconSvg = '<svg class="w-5 h-5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
                } else if (act.type === 'facebook') {
                  actionHref = act.destinationUrl || `https://facebook.com/${act.handle || ''}`;
                  iconSvg = '<svg class="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>';
                } else if (act.type === 'instagram') {
                  actionHref = act.destinationUrl || `https://instagram.com/${(act.handle || '').replace(/^@/, '')}`;
                  iconSvg = '<svg class="w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>';
                } else {
                  actionHref = act.destinationUrl || '#';
                  iconSvg = '<svg class="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
                }

                if (isAiReviewButton) {
                  const bName = escapeHtml(act.businessName || hubHeading);
                  const bCat = escapeHtml(act.businessCategory || 'Local Business');
                  const tagsParam = escapeHtml((act.praiseTags || []).join('||'));
                  return `
                    <button type="button" onclick="openReviewModal('${bName}', '${bCat}', '${escapeHtml(actionHref)}', '${tagsParam}')" class="w-full text-left group block p-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-2xl transition-all shadow-md active:scale-[0.98]">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3.5">
                          <div class="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            ${iconSvg}
                          </div>
                          <div class="text-left">
                            <span class="text-sm font-bold text-white block group-hover:text-amber-300 transition-colors">${escapeHtml(act.title)}</span>
                            ${act.subtitle ? `<span class="text-[11px] text-neutral-400 block">${escapeHtml(act.subtitle)}</span>` : badge}
                          </div>
                        </div>
                        <svg class="w-4 h-4 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </button>
                  `;
                }

                if (isWifiButton) {
                  const ssid = escapeHtml(act.wifiSsid || link.wifiData?.ssid || 'Guest Wi-Fi');
                  const pass = escapeHtml(act.wifiPassword || link.wifiData?.password || '');
                  return `
                    <button type="button" onclick="openWifiModal('${ssid}', '${pass}')" class="w-full text-left group block p-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-2xl transition-all shadow-md active:scale-[0.98]">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3.5">
                          <div class="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            ${iconSvg}
                          </div>
                          <div class="text-left">
                            <span class="text-sm font-bold text-white block group-hover:text-cyan-300 transition-colors">${escapeHtml(act.title)}</span>
                            <span class="text-[11px] text-neutral-400 block">${escapeHtml(act.subtitle || 'Connect to guest internet')}</span>
                          </div>
                        </div>
                        <svg class="w-4 h-4 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </button>
                  `;
                }

                return `
                  <a href="${escapeHtml(actionHref)}" class="group block p-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-2xl transition-all shadow-md active:scale-[0.98]">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3.5">
                        <div class="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          ${iconSvg}
                        </div>
                        <div class="text-left">
                          <span class="text-sm font-bold text-white block group-hover:text-indigo-300 transition-colors">${escapeHtml(act.title)}</span>
                          ${act.subtitle ? `<span class="text-[11px] text-neutral-400 block">${escapeHtml(act.subtitle)}</span>` : badge}
                        </div>
                      </div>
                      <svg class="w-4 h-4 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </a>
                `;
              }).join('')}
            </div>

            <!-- Footer Badge -->
            <div class="text-center text-[11px] text-neutral-600 font-mono">
              /r/${escapeHtml(slug)} · TAPLOCAL.IN
            </div>
          </div>

          <!-- Interactive AI Review Modal -->
          <div id="reviewModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <div class="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </div>
                  <div>
                    <h3 id="modalBizName" class="text-sm font-bold text-white">Share Your 5-Star Experience</h3>
                    <p id="modalBizCategory" class="text-[11px] text-neutral-400">Local Business</p>
                  </div>
                </div>
                <button type="button" onclick="closeReviewModal()" class="text-neutral-400 hover:text-white p-1 text-lg leading-none">&times;</button>
              </div>

              <div>
                <label class="block text-xs font-semibold text-neutral-300 mb-2">What did you love most? (Tap to select)</label>
                <div id="tagsContainer" class="flex flex-wrap gap-1.5"></div>
              </div>

              <button type="button" id="generateBtn" onclick="generateReviews()" class="w-full py-2.5 px-4 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md active:scale-98">
                Generate 5-Star Review Drafts
              </button>

              <div id="reviewsList" class="space-y-2.5 pt-1 hidden"></div>

              <div class="pt-2 border-t border-neutral-800 text-center">
                <a id="skipDirectLink" href="#" target="_blank" class="text-xs text-neutral-400 hover:text-white hover:underline">
                  Or write your own review directly on Google &rarr;
                </a>
              </div>
            </div>
          </div>

          <!-- Interactive Wi-Fi Card Modal -->
          <div id="wifiModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div class="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
              <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">Connect to Guest Wi-Fi</h3>
                <p class="text-xs text-neutral-400 mt-0.5">Use the credentials below to connect</p>
              </div>

              <div class="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-left space-y-2.5">
                <div>
                  <span class="text-[10px] uppercase font-mono text-neutral-500 block">Network (SSID)</span>
                  <span id="wifiSsidDisplay" class="text-sm font-bold text-white font-mono"></span>
                </div>
                <div>
                  <span class="text-[10px] uppercase font-mono text-neutral-500 block">Password</span>
                  <span id="wifiPassDisplay" class="text-sm font-bold text-cyan-400 font-mono"></span>
                </div>
              </div>

              <button type="button" id="copyWifiBtn" onclick="copyWifiPassword()" class="w-full py-2.5 px-4 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-all shadow-md active:scale-98">
                Copy Password to Clipboard
              </button>

              <button type="button" onclick="closeWifiModal()" class="w-full py-2 text-xs text-neutral-400 hover:text-white transition-colors">
                Close
              </button>
            </div>
          </div>

          <script>
            let currentBizName = '';
            let currentBizCat = '';
            let currentGoogleUrl = '';
            let selectedPraiseTags = [];
            let currentWifiPass = '';

            function openReviewModal(bName, bCat, gUrl, tagsStr) {
              currentBizName = bName;
              currentBizCat = bCat;
              currentGoogleUrl = gUrl;
              selectedPraiseTags = [];

              document.getElementById('modalBizName').innerText = bName;
              document.getElementById('modalBizCategory').innerText = bCat;
              document.getElementById('skipDirectLink').href = gUrl;

              const rawTags = tagsStr ? tagsStr.split('||').filter(Boolean) : [];
              const fallbackTags = ['Outstanding Service', 'Friendly Staff', 'Great Quality', 'Super Fast', 'Clean & Welcoming', 'Highly Recommended'];
              const displayTags = rawTags.length > 0 ? rawTags : fallbackTags;

              const container = document.getElementById('tagsContainer');
              container.innerHTML = displayTags.map((tag) => {
                return '<button type="button" onclick="toggleTag(this, \\'' + tag.replace(/'/g, "\\\\'") + '\\')" class="tag-btn px-2.5 py-1 text-xs rounded-xl border border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500 transition-colors">' + tag + '</button>';
              }).join('');

              document.getElementById('reviewsList').innerHTML = '';
              document.getElementById('reviewsList').classList.add('hidden');
              document.getElementById('reviewModal').classList.remove('hidden');
            }

            function closeReviewModal() {
              document.getElementById('reviewModal').classList.add('hidden');
            }

            function toggleTag(btn, tag) {
              const idx = selectedPraiseTags.indexOf(tag);
              if (idx > -1) {
                selectedPraiseTags.splice(idx, 1);
                btn.className = 'tag-btn px-2.5 py-1 text-xs rounded-xl border border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500 transition-colors';
              } else {
                selectedPraiseTags.push(tag);
                btn.className = 'tag-btn px-2.5 py-1 text-xs rounded-xl border border-amber-500 bg-amber-500/20 text-amber-300 font-semibold transition-colors';
              }
            }

            async function generateReviews() {
              const genBtn = document.getElementById('generateBtn');
              const list = document.getElementById('reviewsList');
              genBtn.disabled = true;
              genBtn.innerText = 'Drafting Unique Reviews...';

              try {
                const res = await fetch('/api/ai/generate-review', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    businessName: currentBizName,
                    businessCategory: currentBizCat,
                    praiseTags: selectedPraiseTags,
                  })
                });
                const data = await res.json();
                const reviews = data.reviews || [];

                if (reviews.length > 0) {
                  list.innerHTML = reviews.map((r) => {
                    const cleanText = r.text.replace(/"/g, '&quot;');
                    return '<div class="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl text-left space-y-2">' +
                      '<div class="flex items-center justify-between text-[11px] font-bold text-amber-400 font-mono">' +
                        '<span>' + (r.title || 'Review Option') + '</span>' +
                        '<span>★★★★★</span>' +
                      '</div>' +
                      '<p class="text-xs text-neutral-300 leading-relaxed font-normal">' + r.text + '</p>' +
                      '<button type="button" onclick="copyAndOpenGoogle(\\'' + cleanText.replace(/'/g, "\\\\'") + '\\')" class="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-98">' +
                        '<span>1-Tap Copy & Open Google</span>' +
                      '</button>' +
                    '</div>';
                  }).join('');
                  list.classList.remove('hidden');
                }
              } catch (e) {
                console.error('Error generating reviews', e);
              } finally {
                genBtn.disabled = false;
                genBtn.innerText = 'Generate Fresh Review Drafts';
              }
            }

            function copyAndOpenGoogle(text) {
              navigator.clipboard.writeText(text);
              const toast = document.createElement('div');
              toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-500 text-neutral-950 font-bold rounded-xl text-xs shadow-lg z-50 animate-in fade-in';
              toast.innerText = 'Copied to clipboard! Opening Google Reviews...';
              document.body.appendChild(toast);
              setTimeout(() => {
                toast.remove();
                window.open(currentGoogleUrl, '_blank');
              }, 600);
            }

            function openWifiModal(ssid, pass) {
              currentWifiPass = pass;
              document.getElementById('wifiSsidDisplay').innerText = ssid;
              document.getElementById('wifiPassDisplay').innerText = pass || '(No password required)';
              document.getElementById('wifiModal').classList.remove('hidden');
            }

            function closeWifiModal() {
              document.getElementById('wifiModal').classList.add('hidden');
            }

            function copyWifiPassword() {
              if (currentWifiPass) {
                navigator.clipboard.writeText(currentWifiPass);
                const btn = document.getElementById('copyWifiBtn');
                btn.innerText = 'Password Copied!';
                btn.className = 'w-full py-2.5 px-4 text-xs font-bold text-neutral-950 bg-emerald-400 rounded-xl transition-all shadow-md';
                setTimeout(() => {
                  btn.innerText = 'Copy Password to Clipboard';
                  btn.className = 'w-full py-2.5 px-4 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-all shadow-md active:scale-98';
                }, 2000);
              }
            }
          </script>
        </body>
        </html>
      `);
    }

    // Preserve any search parameters passed to the short link (e.g. ?utm_campaign=xyz)
    try {
      const incomingUrl = new URL(req.originalUrl, `http://${req.headers.host || 'localhost'}`);
      const targetUrlObj = new URL(target || 'https://taplocal.in');
      incomingUrl.searchParams.forEach((value, key) => {
        if (key !== 'slug') {
          targetUrlObj.searchParams.set(key, value);
        }
      });
      target = targetUrlObj.toString();
    } catch (e) {
      // Ignore query merge errors and use target as is
    }

    // If Review Gatekeeper presentation mode is enabled
    if ((link.presentationMode === 'review_gate' || link.reviewGate?.enabled) && req.query.direct !== '1') {
      const reviewGate = link.reviewGate || {
        enabled: true,
        businessName: link.title,
        businessCategory: 'Local Business',
        googleReviewUrl: target,
        minRatingForGoogle: 4,
        praiseTags: ['⚡ Fast Service', '😊 Friendly Staff', '✨ Clean & Welcoming', '💎 Great Value'],
      };

      const bName = escapeHtml(reviewGate.businessName || link.title);
      const bCat = escapeHtml(reviewGate.businessCategory || 'Local Business');
      const gUrl = escapeHtml(reviewGate.googleReviewUrl || target);
      const tagsJson = JSON.stringify(reviewGate.praiseTags || []);

      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${bName} - Experience Review</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; }
            .font-mono { font-family: 'JetBrains Mono', monospace; }
            .star-btn svg { transition: transform 0.2s, fill 0.2s, color 0.2s; }
            .star-btn:hover svg, .star-btn.active svg { transform: scale(1.15); }
          </style>
        </head>
        <body class="bg-neutral-950 text-neutral-100 min-h-screen flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-amber-500 selection:text-neutral-950">
          <div class="max-w-md w-full mx-auto my-auto space-y-6">
            <!-- Brand Header -->
            <div class="text-center space-y-2">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <span>Verified Customer Experience</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">${bName}</h1>
              <p class="text-xs sm:text-sm text-neutral-400">How was your visit with us today?</p>
            </div>

            <!-- Main Interactive Rating Card -->
            <div class="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
              <!-- Star selector -->
              <div id="starContainer" class="flex justify-center items-center gap-2 sm:gap-3 py-2">
                ${[1, 2, 3, 4, 5].map(s => `
                  <button type="button" data-star="${s}" class="star-btn p-1 focus:outline-none transition-transform active:scale-90" aria-label="Rate ${s} stars">
                    <svg class="w-9 h-9 sm:w-11 sm:h-11 text-neutral-700 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </button>
                `).join('')}
              </div>
              <p id="starPrompt" class="text-xs text-neutral-500 font-medium">Tap a star above to rate your experience</p>

              <!-- HIGH RATING (4-5 STARS) -> AI GOOGLE REVIEW GENERATOR -->
              <div id="highRatingSection" class="hidden pt-2 border-t border-neutral-800/80 space-y-5 text-left">
                <div class="text-center space-y-1">
                  <span class="text-2xl">🌟</span>
                  <h3 class="text-base font-bold text-white">We're so glad you had a great experience!</h3>
                  <p class="text-xs text-neutral-400">Select what you enjoyed, and our AI will generate a personalized 5-star Google review draft for you in 1 second.</p>
                </div>

                <!-- Tags -->
                <div class="space-y-2">
                  <label class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">What stood out to you?</label>
                  <div id="praiseTagsContainer" class="flex flex-wrap gap-1.5"></div>
                </div>

                <!-- Specific note input -->
                <div class="space-y-1.5">
                  <label class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex justify-between">
                    <span>Anything special you'd like to mention?</span>
                    <span class="text-neutral-500 lowercase">(optional)</span>
                  </label>
                  <input id="customNoteInput" type="text" placeholder="e.g. coffee quality, prompt seating, friendly server..." class="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500" />
                </div>

                <!-- Generate with AI Button -->
                <button id="generateReviewBtn" type="button" class="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
                  <span>Generate 5-Star Review with AI</span>
                </button>

                <!-- Drafts Container -->
                <div id="draftsContainer" class="space-y-3 hidden"></div>

                <!-- Direct bypass -->
                <div class="pt-2 text-center">
                  <a href="${gUrl}" target="_blank" class="text-xs text-neutral-400 hover:text-white underline underline-offset-4">
                    Or write your own review directly on Google ↗
                  </a>
                </div>
              </div>

              <!-- FEEDBACK / HONEST REVIEW SECTION -->
              <div id="lowRatingSection" class="hidden pt-2 border-t border-neutral-800/80 space-y-4 text-left">
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5 text-neutral-400 text-xs font-semibold">
                    <svg class="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span>Direct Feedback for ${bName}</span>
                  </div>
                  <h3 class="text-base font-bold text-white">We appreciate your honest feedback.</h3>
                  <p class="text-xs text-neutral-400">Please share your experience so the team can improve, or post your review directly to Google.</p>
                </div>

                <div class="space-y-1.5">
                  <label class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">How can we improve? *</label>
                  <textarea id="complaintInput" rows="3" placeholder="Tell us about the wait time, service, or quality..." class="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"></textarea>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs">
                  <input id="custNameInput" type="text" placeholder="Your Name (optional)" class="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs placeholder-neutral-600" />
                  <input id="custContactInput" type="text" placeholder="Email or Phone" class="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs placeholder-neutral-600" />
                </div>

                <div class="space-y-2 pt-1">
                  <button id="sendFeedbackBtn" type="button" class="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-950 font-bold text-xs shadow-lg transition-all">
                    Send Feedback to Team
                  </button>
                  <a href="${gUrl}" target="_blank" class="block w-full py-2.5 px-4 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white text-center font-semibold text-xs transition-colors">
                    Or Post Directly on Google Reviews ↗
                  </a>
                </div>

                <div id="feedbackThanks" class="hidden p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
                  <p class="text-xs text-emerald-300 font-bold">Thank you for sharing your feedback!</p>
                  <p class="text-[11px] text-neutral-400">Your comments have been received and help us continually improve.</p>
                </div>
              </div>
            </div>

            <div class="text-center text-[11px] text-neutral-600">
              Powered by <span class="text-neutral-400 font-semibold">TapLocal</span>
            </div>
          </div>

          <script>
            const praiseTags = ${tagsJson};
            const businessName = ${JSON.stringify(reviewGate.businessName || link.title)};
            const businessCategory = ${JSON.stringify(reviewGate.businessCategory || 'Local Business')};
            const googleUrl = ${JSON.stringify(reviewGate.googleReviewUrl || target)};
            const slug = ${JSON.stringify(link.slug)};

            let currentRating = 0;
            let selectedTags = praiseTags.slice(0, 2);

            // Render tags
            const tagsCont = document.getElementById('praiseTagsContainer');
            praiseTags.forEach(t => {
              const b = document.createElement('button');
              b.type = 'button';
              b.className = 'text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ' +
                (selectedTags.includes(t) ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-neutral-800/60 text-neutral-400 border-neutral-700/60');
              b.innerText = t;
              b.onclick = () => {
                if (selectedTags.includes(t)) {
                  selectedTags = selectedTags.filter(item => item !== t);
                  b.className = 'text-xs px-3 py-1.5 rounded-full font-medium border bg-neutral-800/60 text-neutral-400 border-neutral-700/60';
                } else {
                  selectedTags.push(t);
                  b.className = 'text-xs px-3 py-1.5 rounded-full font-medium border bg-amber-500/20 text-amber-300 border-amber-500/50';
                }
              };
              tagsCont.appendChild(b);
            });

            // Star clicks
            const starBtns = document.querySelectorAll('.star-btn');
            starBtns.forEach(btn => {
              btn.onclick = () => {
                const s = parseInt(btn.getAttribute('data-star'), 10);
                currentRating = s;
                starBtns.forEach(b => {
                  const val = parseInt(b.getAttribute('data-star'), 10);
                  const svg = b.querySelector('svg');
                  if (val <= s) {
                    svg.setAttribute('class', 'w-9 h-9 sm:w-11 sm:h-11 text-amber-400 fill-amber-400');
                  } else {
                    svg.setAttribute('class', 'w-9 h-9 sm:w-11 sm:h-11 text-neutral-700 fill-transparent');
                  }
                });

                document.getElementById('starPrompt').classList.add('hidden');
                if (s >= 4) {
                  document.getElementById('highRatingSection').classList.remove('hidden');
                  document.getElementById('lowRatingSection').classList.add('hidden');
                } else {
                  document.getElementById('lowRatingSection').classList.remove('hidden');
                  document.getElementById('highRatingSection').classList.add('hidden');
                }
              };
            });

            // AI Review Generation
            const genBtn = document.getElementById('generateReviewBtn');
            const draftsCont = document.getElementById('draftsContainer');
            genBtn.onclick = async () => {
              genBtn.disabled = true;
              genBtn.innerHTML = '<span>Gemini AI is generating 3 drafts...</span>';
              try {
                const res = await fetch('/api/ai/generate-review', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    businessName,
                    businessCategory,
                    praiseTags: selectedTags,
                    customNotes: document.getElementById('customNoteInput').value,
                  })
                });
                const data = await res.json();
                const reviews = data.reviews || [];
                draftsCont.innerHTML = '';
                reviews.forEach(draft => {
                  const card = document.createElement('div');
                  card.className = 'p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2.5 text-left';
                  card.innerHTML = \`
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold uppercase tracking-wider text-amber-400">\${draft.title}</span>
                      <span class="text-amber-400 text-xs">★★★★★</span>
                    </div>
                    <p class="text-xs text-neutral-300 italic">"\${draft.text}"</p>
                    <button type="button" class="copy-btn w-full py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-neutral-700">
                      <span>Copy & Post on Google Reviews ↗</span>
                    </button>
                  \`;
                  const copyBtn = card.querySelector('.copy-btn');
                  copyBtn.onclick = async () => {
                    await navigator.clipboard.writeText(draft.text);
                    copyBtn.className = 'w-full py-2.5 px-3 rounded-xl bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors';
                    copyBtn.innerText = 'Copied! Opening Google Reviews in 1s...';
                    setTimeout(() => {
                      window.location.href = googleUrl;
                    }, 1200);
                  };
                  draftsCont.appendChild(card);
                });
                draftsCont.classList.remove('hidden');
              } catch (e) {
                alert('Review drafts generated. Opening Google Reviews.');
                window.location.href = googleUrl;
              } finally {
                genBtn.disabled = false;
                genBtn.innerHTML = '<span>Generate 5-Star Review with AI</span>';
              }
            };

            // Low rating submission
            const sendBtn = document.getElementById('sendFeedbackBtn');
            sendBtn.onclick = async () => {
              const text = document.getElementById('complaintInput').value.trim();
              if (!text) {
                alert('Please let us know what went wrong.');
                return;
              }
              sendBtn.disabled = true;
              sendBtn.innerText = 'Sending to management...';
              try {
                await fetch('/api/feedback/submit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    slug,
                    rating: currentRating,
                    customerName: document.getElementById('custNameInput').value.trim(),
                    customerContact: document.getElementById('custContactInput').value.trim(),
                    feedbackText: text,
                    tags: selectedTags,
                  })
                });
                document.getElementById('feedbackThanks').classList.remove('hidden');
                sendBtn.classList.add('hidden');
              } catch (e) {
                document.getElementById('feedbackThanks').classList.remove('hidden');
              }
            };
          </script>
        </body>
        </html>
      `);
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
    const { batchName = 'Batch QR Stock', prefix = 'qr', count = 12, ownerId, ownerEmail, ownerName, batchPassword } = req.body;
    const num = Math.min(Math.max(parseInt(count, 10) || 12, 1), 250);

    const db = loadDatabase();
    const batchId = `batch_${Date.now()}`;
    const cleanPrefix = (prefix || 'qr').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-|-$/g, '') || 'qr';
    const cleanBatchPassword = batchPassword && typeof batchPassword === 'string' && batchPassword.trim().length > 0 ? batchPassword.trim() : undefined;

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
        batchPassword: cleanBatchPassword,
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
      batchPassword: cleanBatchPassword,
      count: newLinks.length,
      links: newLinks,
    });
  });

  // Verify batch password or admin password for unassigned QR codes
  app.post('/api/batch-qr/verify-pass', (req: Request, res: Response) => {
    const { slug, password } = req.body;
    const db = loadDatabase();
    const clean = (slug || '').trim().toLowerCase().replace(/^\/r\//, '').replace(/^\//, '');
    const link = db.links.find((l) => l.slug.toLowerCase() === clean);

    if (!link) {
      return res.status(404).json({ error: 'QR Code not found.' });
    }

    const provided = (password || '').trim();
    const isAuthorized = link.batchPassword
      ? (provided === link.batchPassword || provided === 'P4prince.com')
      : (provided === 'P4prince.com');

    if (!isAuthorized) {
      return res.status(401).json({
        error: link.batchPassword
          ? 'Incorrect batch password. Please enter the password configured for this QR batch.'
          : 'Incorrect admin verification password. Please use P4prince.com'
      });
    }

    return res.json({ success: true, message: 'Password verified successfully.' });
  });

  // 2. Direct Mobile Activation (Used when scanning unassigned QR code with phone)
  app.post('/api/batch-qr/direct-activate', (req: Request, res: Response) => {
    let {
      slug,
      destinationUrl,
      title,
      adminPassword,
      batchPassword,
      contentType,
      presentationMode,
      vcardData,
      wifiData,
      reviewGate,
      hubConfig,
    } = req.body;

    const db = loadDatabase();
    const link = db.links.find((l) => l.slug.toLowerCase() === (slug || '').toLowerCase());

    if (!link) {
      return res.status(404).json({ error: 'QR Code not found.' });
    }

    const providedPassword = (adminPassword || batchPassword || '').trim();
    const isAuthorized = link.batchPassword
      ? (providedPassword === link.batchPassword || providedPassword === 'P4prince.com')
      : (providedPassword === 'P4prince.com');

    if (!isAuthorized) {
      return res.status(401).json({
        error: link.batchPassword
          ? 'Invalid batch password. Please enter the password assigned to this QR batch.'
          : 'Invalid admin verification password. Please use P4prince.com'
      });
    }

    let target = (destinationUrl || '').trim();
    if (target && !target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('data:') && !target.startsWith('WIFI:')) {
      target = 'https://' + target;
    }

    link.destinationUrl = target;
    link.isAssigned = true;
    link.isActive = true;
    if (title && title.trim()) link.title = title.trim();
    if (contentType) link.contentType = contentType;
    if (presentationMode) link.presentationMode = presentationMode;
    if (vcardData) link.vcardData = vcardData;
    if (wifiData) link.wifiData = wifiData;
    if (reviewGate) link.reviewGate = reviewGate;
    if (hubConfig) link.hubConfig = hubConfig;
    link.updatedAt = new Date().toISOString();

    saveDatabase(db);
    res.json({ success: true, message: 'QR Code linked and activated!', link });
  });

  // 3. Assign Link via Admin Panel or Scan
  app.put('/api/batch-qr/:id/assign', (req: Request, res: Response) => {
    const { id } = req.params;
    let {
      destinationUrl,
      title,
      description,
      contentType,
      presentationMode,
      vcardData,
      wifiData,
      reviewGate,
      hubConfig,
      batchPassword,
    } = req.body;

    let target = (destinationUrl || '').trim();
    if (target && !target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('data:') && !target.startsWith('WIFI:')) {
      target = 'https://' + target;
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
        destinationUrl: target,
        description: description?.trim() || 'Assigned via mobile scan',
        isActive: true,
        isAssigned: true,
        contentType: contentType || 'url',
        presentationMode: presentationMode || 'instant_redirect',
        vcardData,
        wifiData,
        reviewGate,
        hubConfig,
        batchPassword,
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
      link.destinationUrl = target;
      link.isAssigned = true;
      link.isActive = true;
      if (title && title.trim()) link.title = title.trim();
      if (description && description.trim()) link.description = description.trim();
      if (contentType) link.contentType = contentType;
      if (presentationMode) link.presentationMode = presentationMode;
      if (vcardData) link.vcardData = vcardData;
      if (wifiData) link.wifiData = wifiData;
      if (reviewGate) link.reviewGate = reviewGate;
      if (hubConfig) link.hubConfig = hubConfig;
      if (batchPassword !== undefined) link.batchPassword = batchPassword;
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

  // 2. Create new dynamic link(s) (supports custom quantity and unassigned reservation)
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
      vcardData,
      wifiData,
      reviewGate,
      hubConfig,
      batchPassword,
      quantity = 1,
    } = req.body;

    const count = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 250);
    const db = loadDatabase();

    let target = (destinationUrl || '').trim();
    const hasTarget = Boolean(target);
    if (hasTarget) {
      if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('data:') && !target.startsWith('WIFI:')) {
        target = 'https://' + target;
      }
      try {
        if (!target.startsWith('data:') && !target.startsWith('WIFI:')) {
          new URL(target);
        }
      } catch {
        return res.status(400).json({ error: 'Please enter a valid destination URL (e.g., https://example.com).' });
      }
    }

    const createdRecords: LinkRecord[] = [];
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';

    for (let i = 1; i <= count; i++) {
      let slug = '';
      if (count === 1 && customSlug) {
        slug = customSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (slug.length < 2) {
          return res.status(400).json({ error: 'Custom slug must be at least 2 characters long.' });
        }
        if (db.links.some((l) => l.slug.toLowerCase() === slug.toLowerCase())) {
          return res.status(409).json({ error: `The slug "${slug}" is already in use. Please pick another one.` });
        }
      } else if (count > 1 && customSlug) {
        const baseSlug = customSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        slug = `${baseSlug}-${i}-${Math.random().toString(36).substring(2, 5)}`;
      } else {
        let attempts = 0;
        do {
          slug = '';
          for (let j = 0; j < 6; j++) {
            slug += alphabet[Math.floor(Math.random() * alphabet.length)];
          }
          attempts++;
        } while (db.links.some((l) => l.slug === slug) && attempts < 20);
      }

      const itemTitle = count > 1
        ? `${title?.trim() || 'Dynamic QR'} #${i}`
        : title?.trim() || (hasTarget ? `Link /r/${slug}` : `Reserved QR #${slug.toUpperCase()}`);

      const recordTags = Array.isArray(tags) ? [...tags] : [];
      if (!hasTarget && !recordTags.includes('Unassigned')) {
        recordTags.push('Unassigned');
      }

      const newRecord: LinkRecord = {
        id: `link_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        slug,
        title: itemTitle,
        destinationUrl: target,
        description: description?.trim() || (!hasTarget ? 'Reserved unassigned QR code' : ''),
        isActive: true,
        isAssigned: hasTarget,
        contentType: contentType || (hasTarget ? 'url' : 'url'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: recordTags,
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
        presentationMode: presentationMode || (reviewGate?.enabled ? 'review_gate' : 'instant_redirect'),
        vcardData,
        wifiData,
        reviewGate,
        hubConfig: hubConfig && typeof hubConfig === 'object' ? hubConfig : undefined,
        batchPassword: batchPassword && typeof batchPassword === 'string' ? batchPassword.trim() : undefined,
      };

      createdRecords.push(newRecord);
      db.links.unshift(newRecord);
    }

    saveDatabase(db);

    if (count === 1) {
      res.status(201).json(createdRecords[0]);
    } else {
      res.status(201).json({
        success: true,
        message: `Successfully created ${createdRecords.length} dynamic QR codes.`,
        links: createdRecords,
        count: createdRecords.length,
      });
    }
  });

  // vCard direct .vcf download route
  app.get('/api/vcard/:slug.vcf', (req: Request, res: Response) => {
    const { slug } = req.params;
    const db = loadDatabase();
    const clean = slug.replace(/\.vcf$/i, '').toLowerCase();
    const link = db.links.find((l) => l.slug.toLowerCase() === clean);

    if (!link || !link.vcardData) {
      return res.status(404).send('vCard not found');
    }

    const d = link.vcardData;
    const nameParts = (d.fullName || link.title).trim().split(' ');
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : (d.fullName || link.title).trim();

    const vcfLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${lastName};${firstName};;;`,
      `FN:${d.fullName || link.title}`,
    ];
    if (d.organization) vcfLines.push(`ORG:${d.organization}`);
    if (d.title) vcfLines.push(`TITLE:${d.title}`);
    if (d.phone) vcfLines.push(`TEL;TYPE=CELL,VOICE:${d.phone}`);
    if (d.email) vcfLines.push(`EMAIL;TYPE=INTERNET,PREF:${d.email}`);
    if (d.website) vcfLines.push(`URL:${d.website}`);
    if (d.address) vcfLines.push(`ADR;TYPE=WORK:;;${d.address};;;;`);
    vcfLines.push('NOTE:Saved via TapLocal Dynamic QR Contact');
    vcfLines.push('END:VCARD');

    const vcfContent = vcfLines.join('\r\n');
    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${clean}-contact.vcf"`);
    res.send(vcfContent);
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
      vcardData,
      wifiData,
      reviewGate,
      hubConfig,
      batchPassword,
    } = req.body;

    const db = loadDatabase();
    const linkIndex = db.links.findIndex((l) => l.id === id);

    if (linkIndex === -1) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const current = db.links[linkIndex];

    if (destinationUrl !== undefined) {
      let dest = (destinationUrl || '').trim();
      if (dest && !dest.startsWith('http://') && !dest.startsWith('https://') && !dest.startsWith('data:') && !dest.startsWith('WIFI:')) {
        dest = 'https://' + dest;
      }
      current.destinationUrl = dest;
      current.isAssigned = Boolean(dest); // Mark batch stock as activated once assigned
    }

    if (typeof title === 'string') current.title = title.trim();
    if (typeof description === 'string') current.description = description.trim();
    if (typeof isActive === 'boolean') current.isActive = isActive;
    if (Array.isArray(tags)) current.tags = tags;
    if (contentType) current.contentType = contentType;
    if (dynamicButton !== undefined) current.dynamicButton = dynamicButton;
    if (presentationMode) current.presentationMode = presentationMode;
    if (vcardData !== undefined) current.vcardData = vcardData;
    if (wifiData !== undefined) current.wifiData = wifiData;
    if (reviewGate !== undefined) current.reviewGate = reviewGate;
    if (hubConfig !== undefined) current.hubConfig = hubConfig;
    if (batchPassword !== undefined) current.batchPassword = batchPassword;

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
    const cleanId = id.trim().toLowerCase().replace(/^\/r\//, '').replace(/^\//, '');
    const db = loadDatabase();

    db.links = db.links.filter(
      (l) => l.id !== id && l.id.toLowerCase() !== cleanId && l.slug.toLowerCase() !== cleanId && l.slug.toLowerCase() !== id.toLowerCase()
    );
    db.clicks = db.clicks.filter(
      (c) => c.linkId !== id && c.slug.toLowerCase() !== cleanId
    );

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
  // AI CUSTOM GOOGLE REVIEWS & FEEDBACK INTERCEPT ENDPOINTS
  // -------------------------------------------------------------

  // 1. AI 5-Star Google Review Generator (Powered by Gemini + Logic-Based Procedural Generator)
  app.post('/api/ai/generate-review', async (req: Request, res: Response) => {
    const {
      businessName = 'Local Business',
      businessCategory = 'Local Business',
      praiseTags = [],
      customNotes = '',
      tone = 'friendly',
      iteration = 0,
      requestedCount,
    } = req.body;

    const iterNum = parseInt(iteration, 10) || Date.now();
    // Dynamically vary count between 3 and 5 if not explicitly requested
    const targetCount = Math.min(
      Math.max(parseInt(requestedCount, 10) || 3 + ((Math.abs(iterNum) + 1) % 3), 3),
      5
    );

    const tagsText = Array.isArray(praiseTags) && praiseTags.length > 0 ? praiseTags.join(', ') : 'great service, friendly staff';

    const fallbackReviews = generateProceduralReviews({
      businessName,
      businessCategory,
      praiseTags,
      customNotes,
      tone,
      iteration: iterNum,
      requestedCount: targetCount,
    });

    if (!process.env.GEMINI_API_KEY || !ai) {
      return res.json({ reviews: fallbackReviews });
    }

    try {
      const prompt = `You are an authentic, everyday human customer writing a real 5-star Google review on a smartphone for "${businessName}", which is a "${businessCategory}".
Selected highlights from this visit: ${tagsText}.
Optional customer note: ${customNotes || 'none'}.
Desired tone: ${tone}.
Iteration seed: ${iterNum}.

CRITICAL INSTRUCTIONS FOR 100% ORGANIC & VARIED REVIEWS:
1. Generate EXACTLY ${targetCount} DISTINCT reviews (count: ${targetCount}).
2. Every single review must sound like it was written by a completely different individual with their own voice and vocabulary.
3. NEVER repeat sentence structures, openings, or phrases between options.
4. ABSOLUTELY FORBIDDEN: Promotional AI buzzwords such as "testament to excellence", "delve", "orchestrated", "par excellence", "game-changer", "plethora", "beacon of quality", "nestled", "tapestry", "seamlessly blends", "culinary journey".
5. Ground each review in believable details authentic to a "${businessCategory}" (e.g. food taste, wait time, haircut technique, bedside manner, fair pricing, clean workspace).
6. Provide distinct perspectives:
   - Option 1: Short & punchy (2 sentences)
   - Option 2: Detailed highlight of specific experience (${tagsText}) (3-4 sentences)
   - Option 3: Warm personal shoutout to the staff & atmosphere (2-3 sentences)
   ${targetCount >= 4 ? '- Option 4: Repeat customer or strong recommendation to friends (2-3 sentences)' : ''}
   ${targetCount >= 5 ? '- Option 5: Honest praise on value, speed, or quality (2-3 sentences)' : ''}

Respond ONLY with valid JSON in this exact structure:
{
  "reviews": [
    { "id": 1, "title": "Short Label", "text": "..." }
  ]
}`;

      const aiResponse = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 1.1,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI generation timed out')), 12000)
        ),
      ]);

      const responseText = aiResponse.text?.trim() || '';
      try {
        const parsed = JSON.parse(responseText);
        if (parsed.reviews && Array.isArray(parsed.reviews) && parsed.reviews.length >= 3) {
          return res.json(parsed);
        }
      } catch (err) {
        console.warn('Failed to parse Gemini JSON output, using procedural fallback:', err);
      }

      return res.json({ reviews: fallbackReviews });
    } catch (err: any) {
      console.warn('Gemini generate review error/timeout, using procedural fallback:', err?.message || err);
      return res.json({ reviews: fallbackReviews });
    }
  });

  // 2. AI Owner Reply Assistant (Empathetic De-escalation & Resolution)
  app.post('/api/ai/draft-reply', async (req: Request, res: Response) => {
    const { customerFeedback, customerName = 'Guest', rating = 2, tone = 'compassionate' } = req.body;

    const fallbackReply = `Dear ${customerName},\n\nThank you for reaching out and sharing your honest feedback with us. I am truly sorry to hear that your recent experience fell short of the high standards we pride ourselves on. We take your comments seriously and are already addressing this with our team. I would love the opportunity to connect with you directly to make this right. Please feel free to call or reply so we can ensure your next visit is nothing short of exceptional.\n\nWarm regards,\nManagement Team`;

    if (!process.env.GEMINI_API_KEY || !ai) {
      return res.json({ reply: fallbackReply });
    }

    try {
      const prompt = `You are the caring owner or general manager of a local business.
A customer gave a ${rating}-star private rating with the following feedback:
"${customerFeedback || 'Customer had an issue with service and timing.'}"
Customer Name: ${customerName}.
Desired tone: ${tone} (empathetic, professional, accountable, de-escalating, offering direct personal resolution).

Draft a heartfelt, professional owner response that acknowledges their frustration sincerely, apologizes without sounding defensive, explains that their feedback was shared with leadership, and invites them to contact management directly to make things right.`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const replyText = aiResponse.text?.trim() || fallbackReply;
      return res.json({ reply: replyText });
    } catch (err: any) {
      console.error('Gemini draft reply error:', err);
      return res.json({ reply: fallbackReply });
    }
  });

  // 3. Submit Customer Feedback
  app.post('/api/feedback/submit', (req: Request, res: Response) => {
    const { slug, rating, customerName, customerContact, feedbackText, tags } = req.body;

    if (!feedbackText || !feedbackText.trim()) {
      return res.status(400).json({ error: 'Feedback text is required.' });
    }

    const db = loadDatabase();
    const link = db.links.find((l) => l.slug.toLowerCase() === (slug || '').toLowerCase());

    const newFeedback: ReviewFeedbackRecord = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      linkId: link?.id || 'unknown',
      slug: slug || 'general',
      rating: Number(rating) || 3,
      customerName: customerName?.trim() || '',
      customerContact: customerContact?.trim() || '',
      feedbackText: feedbackText.trim(),
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString(),
      status: 'new',
    };

    if (!db.feedback) db.feedback = [];
    db.feedback.unshift(newFeedback);
    saveDatabase(db);

    res.status(201).json({ success: true, feedback: newFeedback });
  });

  // 4. List Feedback Records
  app.get('/api/feedback/list', (req: Request, res: Response) => {
    const db = loadDatabase();
    res.json({ feedbacks: db.feedback || [] });
  });

  // 5. Save Owner Reply to Feedback
  app.post('/api/feedback/reply', (req: Request, res: Response) => {
    const { id, ownerReply, status = 'resolved' } = req.body;

    if (!id) return res.status(400).json({ error: 'Feedback ID is required.' });

    const db = loadDatabase();
    const record = (db.feedback || []).find((f) => f.id === id);

    if (!record) {
      return res.status(404).json({ error: 'Feedback record not found.' });
    }

    record.ownerReply = ownerReply?.trim() || '';
    record.status = status as any;
    record.ownerRepliedAt = new Date().toISOString();

    saveDatabase(db);
    res.json({ success: true, feedback: record });
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
