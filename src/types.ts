export type LabelPresetType =
  | 'a4_grid'
  | 'square_sticker'
  | 'business_card'
  | 'thermal_2in'
  | 'thermal_3in'
  | 'shelf_tag';

export interface BatchRecord {
  id: string;
  name: string;
  prefix: string;
  count: number;
  labelPreset: LabelPresetType;
  ownerId: string;
  ownerEmail?: string;
  createdAt: string;
  unassignedCount?: number;
  slugs?: string[];
  links?: LinkRecord[];
}

export interface QRSettings {
  colorDark: string;
  colorLight: string;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  margin: number;
  frameStyle?: 'none' | 'bottom_badge' | 'top_badge' | 'rounded_card';
  frameText?: string;
  centerIcon?: 'none' | 'link' | 'wifi' | 'phone' | 'message' | 'star' | 'coffee';
  centerLogoUrl?: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  status: 'approved' | 'pending' | 'rejected';
  company?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface ClientAccount {
  id: string;
  name: string;
  email: string;
  role: 'client';
  status: 'approved' | 'pending' | 'rejected';
  company: string;
  createdAt: string;
  approvedAt?: string;
  linkCount: number;
  totalScans: number;
}

export interface DynamicButtonConfig {
  enabled: boolean;
  text: string;
  subtitle?: string;
  theme: 'indigo' | 'emerald' | 'amber' | 'dark' | 'neon' | 'glass';
  icon?: 'arrow' | 'cart' | 'sparkles' | 'chat' | 'calendar' | 'external' | 'phone' | 'zap';
  shape?: 'pill' | 'rounded' | 'sharp';
  animation?: 'pulse' | 'glow' | 'float' | 'none';
  showQRBadge?: boolean;
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
  qrSettings?: QRSettings;
  dynamicButton?: DynamicButtonConfig;
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

export interface LinkAnalytics {
  link: LinkRecord;
  totalClicks: number;
  devices: { name: string; count: number }[];
  browsers: { name: string; count: number }[];
  os: { name: string; count: number }[];
  countries: { name: string; count: number }[];
  timeline: { date: string; count: number }[];
  recentLogs: ClickRecord[];
}

export interface GlobalOverview {
  totalLinks: number;
  activeLinksCount: number;
  totalClicks: number;
  topLink: LinkRecord | null;
  deviceBreakdown: Record<string, number>;
  timeline: { date: string; count: number }[];
  recentActivity: ClickRecord[];
}
