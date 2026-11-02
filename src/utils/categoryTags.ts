// Dynamic Category Praise Tags mapping and smart generator

export interface BusinessCategoryOption {
  id: string;
  name: string;
  icon: string;
  defaultTags: string[];
}

export const BUSINESS_CATEGORIES: BusinessCategoryOption[] = [
  {
    id: 'restaurant',
    name: 'Restaurant & Cafe',
    icon: '🍽️',
    defaultTags: [
      'Delicious Food',
      'Super Fast Service',
      'Warm Ambience',
      'Friendly Waitstaff',
      'Fresh Ingredients',
      'Great Value for Money',
      'Clean Dining Area',
      'Must-Try Specials',
    ],
  },
  {
    id: 'bakery',
    name: 'Bakery, Sweets & Mithai',
    icon: '🧁',
    defaultTags: [
      'Freshly Baked Goods',
      'Mouthwatering Cakes',
      'Pure & Hygienic Sweets',
      'Warm & Crispy',
      'Friendly Staff',
      'Wonderful Aroma',
      'Custom Orders Done Right',
      'Great Presentation',
    ],
  },
  {
    id: 'salon',
    name: 'Salon, Barber & Grooming',
    icon: '✂️',
    defaultTags: [
      'Skilled Stylist',
      'Precision Haircut',
      'Relaxing Atmosphere',
      'Clean & Hygienic Tools',
      'Attentive Service',
      'On-Time Appointment',
      'Premium Products',
      'Flawless Grooming',
    ],
  },
  {
    id: 'spa',
    name: 'Spa, Massage & Wellness',
    icon: '🧖',
    defaultTags: [
      'Tranquil Ambiance',
      'Therapeutic Massage',
      'Extremely Clean',
      'Soothing Music & Aromas',
      'Professional Therapists',
      'Deep Relaxation',
      'Luxurious Experience',
      'Rejuvenating Visit',
    ],
  },
  {
    id: 'clinic',
    name: 'Clinic, Doctor & Healthcare',
    icon: '🩺',
    defaultTags: [
      'Caring Doctor',
      'Zero Wait Time',
      'Thorough Checkup',
      'Clear Explanations',
      'Clean & Modern Facility',
      'Kind & Patient Staff',
      'Effective Treatment',
      'Highly Professional',
    ],
  },
  {
    id: 'dental',
    name: 'Dental Care & Orthodontics',
    icon: '🦷',
    defaultTags: [
      'Gentle Dentist',
      'Completely Painless',
      'Comfortable Visit',
      'Spotless Clinic',
      'Kind Front Desk',
      'Transparent Pricing',
      'State-of-the-Art Tech',
      'Beautiful Results',
    ],
  },
  {
    id: 'auto',
    name: 'Auto Repair, Garage & Detailing',
    icon: '🚗',
    defaultTags: [
      'Honest Diagnostics',
      'Fair & Transparent',
      'Quick Turnaround',
      'Skilled Mechanics',
      'No Hidden Charges',
      'Showroom Detailing Finish',
      'Top Workmanship',
      'Clean Waiting Area',
    ],
  },
  {
    id: 'fitness',
    name: 'Gym, Yoga & Fitness Studio',
    icon: '💪',
    defaultTags: [
      'Motivating Trainers',
      'Clean Equipment',
      'Energizing Atmosphere',
      'Great Workout Music',
      'Helpful Staff',
      'Spacious Workout Floor',
      'Visible Results',
      'Friendly Community',
    ],
  },
  {
    id: 'retail',
    name: 'Retail Store, Boutique & Fashion',
    icon: '🛍️',
    defaultTags: [
      'Helpful Staff',
      'Great Quality & Selection',
      'Fair Pricing',
      'Neat & Well-Organized',
      'Smooth Checkout',
      'Welcoming Atmosphere',
      'Trendy Collection',
      'Highly Recommended',
    ],
  },
  {
    id: 'hotel',
    name: 'Hotel, Resort & Homestay',
    icon: '🏨',
    defaultTags: [
      'Spotless Rooms',
      'Super Comfortable Beds',
      'Welcoming Reception',
      'Delicious Breakfast',
      'Peaceful Stay',
      'Convenient Location',
      'Prompt Room Service',
      'Exceptional Hospitality',
    ],
  },
  {
    id: 'coaching',
    name: 'Coaching, School & Academy',
    icon: '📚',
    defaultTags: [
      'Inspiring Teachers',
      'Clear Concept Explanations',
      'Personal Attention',
      'Great Study Material',
      'Disciplined Environment',
      'Encouraging Mentors',
      'Excellent Results',
      'Modern Classrooms',
    ],
  },
  {
    id: 'jewellery',
    name: 'Jewellery & Watch Store',
    icon: '💍',
    defaultTags: [
      'Exquisite Designs',
      'Certified Purity',
      'Courteous Staff',
      'Transparent Pricing',
      'Custom Design Crafting',
      'Trustworthy Experience',
      'Luxurious Ambience',
    ],
  },
  {
    id: 'professional',
    name: 'Legal, Accounts & Real Estate',
    icon: '⚖️',
    defaultTags: [
      'Prompt Consultation',
      'In-Depth Expertise',
      'Transparent Fees',
      'Smooth Documentation',
      'Trustworthy Advice',
      'Responsive Communication',
      'Complete Peace of Mind',
    ],
  },
  {
    id: 'custom',
    name: 'Other / Custom Business',
    icon: '🏢',
    defaultTags: [
      'Outstanding Service',
      'Friendly & Helpful Staff',
      'Highly Professional',
      'Great Value & Pricing',
      'Fast Turnaround',
      'Clean & Welcoming',
      'Reliable Experience',
      'Will Recommend to Friends',
    ],
  },
];

export const CATEGORY_TAGS_MAP: Record<string, string[]> = Object.fromEntries(
  BUSINESS_CATEGORIES.map((c) => [c.id, c.defaultTags])
);

/**
 * Returns tailored praise tags for any category string
 */
export function getPraiseTagsForCategory(category: string): string[] {
  const norm = (category || '').toLowerCase().trim();

  if (!norm) {
    return [...BUSINESS_CATEGORIES[0].defaultTags];
  }

  // Exact ID or Name match
  const direct = BUSINESS_CATEGORIES.find(
    (c) => c.id === norm || c.name.toLowerCase() === norm
  );
  if (direct) {
    return [...direct.defaultTags];
  }

  // Keyword match
  if (norm.includes('rest') || norm.includes('cafe') || norm.includes('food') || norm.includes('dine') || norm.includes('pizza') || norm.includes('burger')) {
    return [...CATEGORY_TAGS_MAP.restaurant];
  }
  if (norm.includes('bake') || norm.includes('sweet') || norm.includes('mithai') || norm.includes('cake') || norm.includes('pastry')) {
    return [...CATEGORY_TAGS_MAP.bakery];
  }
  if (norm.includes('salon') || norm.includes('barber') || norm.includes('hair') || norm.includes('beauty') || norm.includes('nails')) {
    return [...CATEGORY_TAGS_MAP.salon];
  }
  if (norm.includes('spa') || norm.includes('massage') || norm.includes('wellness') || norm.includes('therapy')) {
    return [...CATEGORY_TAGS_MAP.spa];
  }
  if (norm.includes('dent') || norm.includes('tooth') || norm.includes('teeth')) {
    return [...CATEGORY_TAGS_MAP.dental];
  }
  if (norm.includes('clinic') || norm.includes('doc') || norm.includes('med') || norm.includes('health') || norm.includes('hospital')) {
    return [...CATEGORY_TAGS_MAP.clinic];
  }
  if (norm.includes('auto') || norm.includes('car') || norm.includes('garage') || norm.includes('mechanic') || norm.includes('detailing')) {
    return [...CATEGORY_TAGS_MAP.auto];
  }
  if (norm.includes('gym') || norm.includes('fitness') || norm.includes('yoga') || norm.includes('crossfit') || norm.includes('workout')) {
    return [...CATEGORY_TAGS_MAP.fitness];
  }
  if (norm.includes('retail') || norm.includes('shop') || norm.includes('store') || norm.includes('boutique') || norm.includes('clothing')) {
    return [...CATEGORY_TAGS_MAP.retail];
  }
  if (norm.includes('hotel') || norm.includes('resort') || norm.includes('stay') || norm.includes('room')) {
    return [...CATEGORY_TAGS_MAP.hotel];
  }
  if (norm.includes('coach') || norm.includes('school') || norm.includes('class') || norm.includes('academy') || norm.includes('tutor')) {
    return [...CATEGORY_TAGS_MAP.coaching];
  }
  if (norm.includes('jewel') || norm.includes('gold') || norm.includes('diamond') || norm.includes('watch')) {
    return [...CATEGORY_TAGS_MAP.jewellery];
  }
  if (norm.includes('law') || norm.includes('legal') || norm.includes('account') || norm.includes('ca') || norm.includes('tax') || norm.includes('consult')) {
    return [...CATEGORY_TAGS_MAP.professional];
  }

  // Generative fallback for specific typed custom business category
  return [
    `Top-Quality ${category}`,
    'Outstanding Service',
    'Helpful & Friendly Team',
    'Fair & Transparent Pricing',
    'Smooth & Quick Experience',
    'Highly Recommended',
  ];
}
