export interface DestinationTemplate {
  id: string;
  name: string;
  category: 'restaurant' | 'retail' | 'social' | 'contact' | 'utility';
  icon: string;
  badge: string;
  description: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    type?: 'text' | 'tel' | 'password';
    defaultValue?: string;
  }[];
  buildUrl: (values: Record<string, string>) => string;
}

export const DESTINATION_TEMPLATES: DestinationTemplate[] = [
  {
    id: 'google_review',
    name: 'Google 5-Star Review',
    category: 'restaurant',
    icon: 'star',
    badge: 'Popular',
    description: 'Directs customer phones straight to the Google review submission popup to collect 5-star reviews on tables or counters.',
    fields: [
      {
        key: 'placeOrSearch',
        label: 'Business Name or Google Place ID',
        placeholder: 'e.g. Blue Lagoon Cafe Mumbai or ChIJN1t_tDeuEmsRUsoyG83frY4',
        defaultValue: 'TapLocal Cafe',
      },
    ],
    buildUrl: (values) => {
      const q = (values.placeOrSearch || '').trim();
      if (!q) return 'https://search.google.com/local/writereview';
      if (q.startsWith('ChIJ')) {
        return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(q)}`;
      }
      return `https://www.google.com/search?q=${encodeURIComponent(q + ' reviews')}`;
    },
  },
  {
    id: 'whatsapp_chat',
    name: 'WhatsApp Direct Chat',
    category: 'retail',
    icon: 'message',
    badge: 'High Conversion',
    description: 'Opens customer WhatsApp instantly with your business phone number and a pre-typed inquiry message.',
    fields: [
      {
        key: 'phone',
        label: 'WhatsApp Phone (with Country Code)',
        placeholder: 'e.g. 919876543210 (do not include + or spaces)',
        type: 'tel',
        defaultValue: '919876543210',
      },
      {
        key: 'message',
        label: 'Pre-filled Welcome Message',
        placeholder: 'e.g. Hi! I would like to book a table / inquire about products.',
        defaultValue: 'Hello, I saw your QR code and would like more details!',
      },
    ],
    buildUrl: (values) => {
      const phone = (values.phone || '').replace(/[^0-9]/g, '');
      const text = encodeURIComponent(values.message || 'Hello!');
      return `https://wa.me/${phone}?text=${text}`;
    },
  },
  {
    id: 'instagram_profile',
    name: 'Instagram Follow & Story',
    category: 'social',
    icon: 'instagram',
    badge: 'Viral Growth',
    description: 'Takes customers directly to your Instagram profile or brand page to grow local followers.',
    fields: [
      {
        key: 'handle',
        label: 'Instagram Username',
        placeholder: 'e.g. taplocal.in (without @)',
        defaultValue: 'taplocal.in',
      },
    ],
    buildUrl: (values) => {
      const handle = (values.handle || '').replace(/^@/, '').trim();
      return `https://instagram.com/${handle}`;
    },
  },
  {
    id: 'digital_menu',
    name: 'Digital Food & Drinks Menu',
    category: 'restaurant',
    icon: 'coffee',
    badge: 'Touchless',
    description: 'Directs table guests to your contactless digital menu (PDF, Canva, Zomato, or website menu).',
    fields: [
      {
        key: 'menuUrl',
        label: 'Menu Web Link or PDF URL',
        placeholder: 'e.g. https://yourrestaurant.com/menu.pdf',
        defaultValue: 'https://taplocal.in/demo-menu',
      },
    ],
    buildUrl: (values) => {
      let target = (values.menuUrl || '').trim();
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = 'https://' + target;
      }
      return target;
    },
  },
  {
    id: 'google_maps',
    name: 'Google Maps Directions',
    category: 'retail',
    icon: 'map',
    badge: 'Foot Traffic',
    description: 'Opens GPS turn-by-turn navigation directly to your physical storefront or venue.',
    fields: [
      {
        key: 'address',
        label: 'Store Address or Landmark',
        placeholder: 'e.g. 124 High Street, Indiranagar, Bengaluru',
        defaultValue: 'TapLocal Retail Store, Main Market',
      },
    ],
    buildUrl: (values) => {
      const address = encodeURIComponent((values.address || '').trim());
      return `https://www.google.com/maps/search/?api=1&query=${address}`;
    },
  },
  {
    id: 'upi_pay',
    name: 'UPI / Direct Pay Link',
    category: 'retail',
    icon: 'zap',
    badge: 'Fast Checkout',
    description: 'Triggers GPay, PhonePe, Paytm, or BHIM directly on customer phones with your VPA.',
    fields: [
      {
        key: 'vpa',
        label: 'UPI ID (VPA)',
        placeholder: 'e.g. businessname@okaxis or 9876543210@paytm',
        defaultValue: 'merchant@upi',
      },
      {
        key: 'name',
        label: 'Merchant / Payee Name',
        placeholder: 'e.g. Royal Bakes & Cafe',
        defaultValue: 'TapLocal Store',
      },
    ],
    buildUrl: (values) => {
      const vpa = (values.vpa || '').trim();
      const name = encodeURIComponent((values.name || 'Merchant').trim());
      return `upi://pay?pa=${vpa}&pn=${name}&cu=INR`;
    },
  },
];
