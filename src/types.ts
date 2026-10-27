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

export type QREyeShape = 'square' | 'rounded' | 'circle' | 'leaf';

export interface QRSettings {
  colorDark: string;
  colorLight: string;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  margin: number;
  frameStyle?: 'none' | 'bottom_badge' | 'top_badge' | 'rounded_card' | 'speech_bubble' | 'sleek_border';
  frameText?: string;
  centerIcon?: 'none' | 'link' | 'wifi' | 'phone' | 'message' | 'star' | 'coffee' | 'heart' | 'utensils';
  centerLogoUrl?: string;
  // Visual Studio Upgrades
  gradientEnabled?: boolean;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientDirection?: 'to-r' | 'to-br' | 'to-b' | 'to-bl';
  eyeShape?: QREyeShape;
  eyeColor?: string;
  dotsColor?: string;
  logoPadding?: number;
  logoBorder?: boolean;
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

export interface ReviewGateConfig {
  enabled: boolean;
  businessName?: string;
  businessCategory?: string;
  googleReviewUrl: string;
  minRatingForGoogle: number; // typically 4 or 5
  praiseTags: string[];
  customTone?: 'enthusiastic' | 'friendly' | 'professional' | 'short_and_sweet';
  privateFeedbackEmail?: string;
  privateFeedbackPhone?: string;
  allowCustomNote?: boolean;
}

export interface ReviewFeedbackRecord {
  id: string;
  linkId: string;
  slug: string;
  rating: number; // 1 to 5
  customerName?: string;
  customerContact?: string;
  feedbackText: string;
  tags?: string[];
  createdAt: string;
  status: 'new' | 'reviewed' | 'resolved';
  ownerReply?: string;
  ownerRepliedAt?: string;
}

export interface ConditionalRule {
  id: string;
  label: string;
  type: 'time' | 'device_os';
  // Time conditions (e.g. 06:00 to 11:30 for Breakfast)
  timeStart?: string;
  timeEnd?: string;
  daysOfWeek?: number[]; // [0,1,2,3,4,5,6] (0=Sun, 6=Sat)
  // Device OS conditions
  targetOs?: 'ios' | 'android' | 'desktop' | 'other';
  destinationUrl: string;
}

export interface ConditionalRoutingConfig {
  enabled: boolean;
  rules: ConditionalRule[];
  fallbackUrl?: string;
}

export interface VCardData {
  fullName: string;
  phone: string;
  email?: string;
  organization?: string;
  title?: string;
  website?: string;
  address?: string;
  note?: string;
}

export interface WifiData {
  ssid: string;
  password?: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export interface LinkRecord {
  id: string;
  slug: string;
  title: string;
  destinationUrl: string;
  description?: string;
  isActive: boolean;
  contentType?: 'url' | 'whatsapp' | 'vcard' | 'wifi' | 'text' | 'button' | 'google_review' | 'instagram' | 'facebook';
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
  presentationMode?: 'instant_redirect' | 'button_page' | 'review_gate' | 'wifi_card' | 'vcard_profile';
  reviewGate?: ReviewGateConfig;
  conditionalRouting?: ConditionalRoutingConfig;
  vcardData?: VCardData;
  wifiData?: WifiData;
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
