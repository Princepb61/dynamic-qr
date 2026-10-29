// Dynamic Category Praise Tags mapping and smart generator

export interface CategoryPreset {
  category: string;
  praiseTags: string[];
}

export const CATEGORY_TAGS_MAP: Record<string, string[]> = {
  restaurant: [
    'Delicious Food',
    'Super Fast Service',
    'Warm Ambience',
    'Friendly Waitstaff',
    'Fresh Ingredients',
    'Great Value',
    'Clean Dining Room',
    'Must-Try Specials',
  ],
  cafe: [
    'Artisanal Coffee',
    'Cozy Seating',
    'Quick Takeaway',
    'Fresh Pastries',
    'Polite Barista',
    'Great Music & Vibe',
    'Fast Wi-Fi',
  ],
  salon: [
    'Skilled Stylist',
    'Relaxing Atmosphere',
    'Clean & Hygienic',
    'Precision Haircut',
    'Attentive Service',
    'On-Time Appointment',
    'Premium Products',
  ],
  spa: [
    'Tranquil Ambiance',
    'Therapeutic Massage',
    'Extremely Clean',
    'Soothing Music',
    'Professional Staff',
    'Luxurious Experience',
  ],
  clinic: [
    'Gentle Doctor',
    'Zero Wait Time',
    'Painless Treatment',
    'Clean & Modern',
    'Kind & Patient',
    'Clear Explanations',
    'Professional Team',
  ],
  dental: [
    'Gentle Dentist',
    'Comfortable Visit',
    'Painless Cleaning',
    'Spotless Clinic',
    'Kind Front Desk',
    'Transparent Pricing',
  ],
  auto: [
    'Honest Diagnostics',
    'Fair & Transparent',
    'Quick Turnaround',
    'Skilled Mechanics',
    'No Hidden Charges',
    'Top Workmanship',
    'Clean Waiting Area',
  ],
  detailing: [
    'Showroom Finish',
    'Attention to Detail',
    'Immaculate Interior',
    'Ceramic Coating Pro',
    'Fair Pricing',
    'Timely Delivery',
  ],
  fitness: [
    'Motivating Trainers',
    'Clean Equipment',
    'Energizing Atmosphere',
    'Great Class Variety',
    'Helpful Staff',
    'Spacious Workout Area',
  ],
  retail: [
    'Helpful Staff',
    'Great Selection',
    'Fair Prices',
    'Neat & Organized',
    'Smooth Checkout',
    'Welcoming Environment',
  ],
  hotel: [
    'Spotless Rooms',
    'Comfortable Beds',
    'Welcoming Reception',
    'Delicious Breakfast',
    'Peaceful Stay',
    'Convenient Location',
  ],
  bakery: [
    'Freshly Baked Goods',
    'Warm & Crispy',
    'Friendly Staff',
    'Mouthwatering Cakes',
    'Wonderful Aroma',
    'Custom Orders Done Right',
  ],
};

/**
 * Returns tailored praise tags for any typed or selected category
 */
export function getPraiseTagsForCategory(category: string): string[] {
  const norm = (category || '').toLowerCase().trim();

  if (!norm) {
    return [
      'Outstanding Service',
      'Friendly Staff',
      'Highly Professional',
      'Great Value',
      'Clean & Welcoming',
      'Fast Turnaround',
    ];
  }

  for (const [key, tags] of Object.entries(CATEGORY_TAGS_MAP)) {
    if (norm.includes(key)) {
      return [...tags];
    }
  }

  // Related keyword heuristics
  if (norm.includes('food') || norm.includes('dine') || norm.includes('pizza') || norm.includes('burger') || norm.includes('bar')) {
    return [...CATEGORY_TAGS_MAP.restaurant];
  }
  if (norm.includes('hair') || norm.includes('barber') || norm.includes('nails') || norm.includes('beauty')) {
    return [...CATEGORY_TAGS_MAP.salon];
  }
  if (norm.includes('med') || norm.includes('health') || norm.includes('hospital') || norm.includes('therapy')) {
    return [...CATEGORY_TAGS_MAP.clinic];
  }
  if (norm.includes('car') || norm.includes('mechanic') || norm.includes('tire') || norm.includes('garage')) {
    return [...CATEGORY_TAGS_MAP.auto];
  }
  if (norm.includes('gym') || norm.includes('yoga') || norm.includes('crossfit') || norm.includes('training')) {
    return [...CATEGORY_TAGS_MAP.fitness];
  }
  if (norm.includes('shop') || norm.includes('store') || norm.includes('boutique') || norm.includes('market')) {
    return [...CATEGORY_TAGS_MAP.retail];
  }

  // Generative default for custom business category
  return [
    `Top-Quality ${category}`,
    'Outstanding Service',
    'Helpful & Friendly Team',
    'Fair & Transparent',
    'Smooth & Easy Process',
    'Highly Recommended',
  ];
}
