// Procedural Organic Google Review Generator
// Generates completely distinct, category-grounded 5-star reviews with zero repetitive phrasing

export interface ProceduralReviewParams {
  businessName: string;
  businessCategory?: string;
  praiseTags?: string[];
  customNotes?: string;
  tone?: 'enthusiastic' | 'friendly' | 'professional' | 'short_and_sweet' | string;
  iteration?: number;
  requestedCount?: number;
}

export interface GeneratedReview {
  id: number;
  title: string;
  text: string;
}

interface CategoryTemplates {
  nouns: string[];
  actions: string[];
  openers: string[];
  closers: string[];
  highlights: string[];
}

const CATEGORY_DICTIONARY: Record<string, CategoryTemplates> = {
  restaurant: {
    nouns: ['food', 'dishes', 'flavors', 'chef specials', 'portions', 'drinks', 'atmosphere'],
    actions: ['served hot and fresh', 'bursting with flavor', 'cooked to absolute perfection', 'generously portioned'],
    openers: [
      'Hands down one of the best dining experiences we have had recently.',
      'Stopped in for a bite today and was thoroughly blown away.',
      'A true standout neighborhood gem! Everything we ordered was extraordinary.',
      'From the moment we sat down, we felt completely taken care of.',
      'Cannot stop thinking about our incredible meal here.',
      'If you appreciate authentic quality and wonderful hospitality, do not miss this place.',
      'Our first visit here and it completely exceeded our high expectations.',
      'Such a vibrant, cozy dining atmosphere with stellar culinary craftsmanship.',
    ],
    closers: [
      'Will definitely be returning again very soon with friends.',
      '10/10 - easily one of our new regular favorites!',
      'Already telling our family they have to try this place.',
      'Do yourself a favor and check them out. You will not regret it.',
      'Huge kudos to the kitchen and waitstaff for such a memorable visit.',
    ],
    highlights: [
      'The seasoning and presentation were spot on.',
      'Food arrived promptly with zero delays.',
      'Every single plate was empty by the end of the meal.',
      'Remarkable balance of high quality and fair value.',
    ],
  },
  cafe: {
    nouns: ['coffee', 'espresso', 'pastries', 'vibe', 'barista craft', 'music', 'seating'],
    actions: ['brewed to perfection', 'freshly baked', 'inviting and cozy', 'super refreshing'],
    openers: [
      'My new favorite morning ritual spot in town!',
      'Such a charming, aesthetic cafe with delicious artisanal coffee.',
      'Great energy, cozy seating, and genuinely wonderful drinks.',
      'Walked in for a quick takeaway and ended up staying for an hour.',
      'Top-tier coffee crafted by people who clearly take pride in their craft.',
    ],
    closers: [
      'Can already tell I will be a daily regular here.',
      'The perfect spot to work, relax, or catch up with a friend.',
      'Five enthusiastic stars for the team!',
      'Do not sleep on this cafe—worth every penny.',
    ],
    highlights: [
      'The espresso pull was velvety smooth with zero bitterness.',
      'Great ambiance for reading or catching up on work.',
      'The baked goods were warm, flaky, and fresh.',
    ],
  },
  salon: {
    nouns: ['styling', 'haircut', 'results', 'salon aesthetic', 'hair wash', 'technique', 'treatment'],
    actions: ['executed with precision', 'so relaxing', 'tailored exactly to what I wanted', 'healthy and vibrant'],
    openers: [
      'Walked out feeling like a million bucks!',
      'Finding someone who genuinely listens to your vision is rare, but they nailed it.',
      'Such a spotless, calming, and upscale salon environment.',
      'Hands down the best styling experience I have had in years.',
      'My hair has never looked or felt healthier.',
    ],
    closers: [
      'Already booked my next appointment before leaving the door!',
      'Cannot recommend this salon highly enough.',
      'Received so many compliments within hours of leaving.',
      'You are in trustworthy, expert hands here.',
    ],
    highlights: [
      'The stylist took time to explain styling tips for home maintenance.',
      'Appointment began promptly with zero waiting around.',
      'Top notch products that smell incredible and leave hair silky.',
    ],
  },
  dental: {
    nouns: ['care', 'treatment', 'hygiene', 'equipment', 'bedside manner', 'painless experience'],
    actions: ['gentle and thorough', 'virtually painless', 'handled with utmost care', 'clearly explained'],
    openers: [
      'I usually have dental anxiety, but the team here made me feel completely at ease.',
      'Extremely modern, immaculate clinic with wonderful staff from reception to doctor.',
      'By far the most comfortable and gentle appointment I have ever had.',
      'Transparent explanations, zero rush, and genuine patient care.',
    ],
    closers: [
      'Found our family dental home for good!',
      'High praises for the entire professional staff.',
      'Recommend to anyone seeking gentle and honest dental care.',
    ],
    highlights: [
      'Doctor walked me through every step before doing anything.',
      'State-of-the-art instruments and pristine sanitation.',
      'Virtually zero wait time in the lobby.',
    ],
  },
  auto: {
    nouns: ['repair', 'diagnostics', 'mechanics', 'turnaround', 'pricing', 'workmanship'],
    actions: ['honest and transparent', 'running like new', 'completed ahead of schedule', 'fair and honest'],
    openers: [
      'Finding an auto shop you can genuinely trust is tough, but these guys are the real deal.',
      'They diagnosed the issue quickly and had my vehicle running smoothly again.',
      'Transparent pricing with zero high-pressure sales tactics or hidden charges.',
      'Prompt, polite, and skilled automotive craftsmanship.',
    ],
    closers: [
      'Will bring all our family vehicles here from now on.',
      'Honest mechanics you can trust with your car.',
      '10/10 service—could not be more satisfied!',
    ],
    highlights: [
      'Gave a clear upfront quote and stuck right to it.',
      'Explained what needed immediate attention vs what could wait.',
      'Car was ready earlier than expected.',
    ],
  },
  fitness: {
    nouns: ['trainers', 'equipment', 'workout environment', 'classes', 'coaching', 'energy'],
    actions: ['motivating and supportive', 'spotlessly maintained', 'engaging and energizing'],
    openers: [
      'The community energy here is contagious and so motivating!',
      'Spotless gym with modern, top-tier equipment and ample workout space.',
      'The trainers push you while keeping safety and proper form front and center.',
      'Best decision I made for my health and fitness journey.',
    ],
    closers: [
      'Look forward to every single workout here.',
      'Highly recommend to anyone regardless of fitness level!',
      'Five stars all the way!',
    ],
    highlights: [
      'Equipment is always sanitized and in pristine condition.',
      'Supportive community with zero intimidation.',
    ],
  },
  retail: {
    nouns: ['selection', 'staff assistance', 'inventory', 'pricing', 'checkout experience'],
    actions: ['helpful and knowledgeable', 'organized and clean', 'fairly priced'],
    openers: [
      'Such a pleasant, hassle-free shopping experience!',
      'Found exactly what I was searching for with the help of their kind staff.',
      'Great selection, fair prices, and very neat presentation.',
    ],
    closers: [
      'Will definitely shop here again soon.',
      'Supporting this local business is a no-brainer.',
      'A wonderful shopping destination!',
    ],
    highlights: [
      'Staff gave thoughtful recommendations without hovering.',
      'Smooth, fast checkout experience.',
    ],
  },
  hotel: {
    nouns: ['rooms', 'bed comfort', 'reception', 'quiet stay', 'breakfast', 'cleanliness'],
    actions: ['immaculately clean', 'restful and peaceful', 'warm and accommodating'],
    openers: [
      'Had an exceptionally peaceful and comfortable stay.',
      'Spotless rooms, plush bedding, and welcoming reception right from check-in.',
      'Everything you want in a hotel stay—clean, quiet, and friendly.',
    ],
    closers: [
      'Will definitely book again on our next trip!',
      'A five-star experience from arrival to departure.',
    ],
    highlights: [
      'Bed was wonderfully comfortable for a deep night of sleep.',
      'Front desk team went above and beyond to assist us.',
    ],
  },
};

const DEFAULT_TEMPLATES: CategoryTemplates = {
  nouns: ['service', 'team', 'experience', 'quality', 'visit', 'communication'],
  actions: ['handled seamlessly', 'top tier quality', 'friendly and attentive', 'thorough and reliable'],
  openers: [
    'Really impressed with the quality and friendliness at',
    'Outstanding experience from start to finish with',
    'Such a breath of fresh air to deal with a team that genuinely cares at',
    'Professional, courteous, and efficient experience at',
    'Cannot recommend this business highly enough—',
    'Five stars all around! Everything went flawlessly at',
    'Such high standards of service and customer care at',
    'They went above and beyond for us at',
  ],
  closers: [
    'Will definitely be a returning customer.',
    'Highly recommended to anyone looking for honest, top-notch quality!',
    'Glad to have found such a reliable local business.',
    '10/10 experience all around.',
    'Already recommending them to friends and colleagues.',
  ],
  highlights: [
    'Communication was crystal clear throughout.',
    'Team was warm, attentive, and very professional.',
    'Great value for the exceptional quality delivered.',
  ],
};

function pickCategoryTemplates(category: string): CategoryTemplates {
  const c = (category || '').toLowerCase();
  if (c.includes('food') || c.includes('restaurant') || c.includes('pizza') || c.includes('diner') || c.includes('bistro') || c.includes('bar') || c.includes('bakery')) {
    return CATEGORY_DICTIONARY.restaurant;
  }
  if (c.includes('cafe') || c.includes('coffee') || c.includes('tea')) {
    return CATEGORY_DICTIONARY.cafe;
  }
  if (c.includes('salon') || c.includes('barber') || c.includes('hair') || c.includes('nail') || c.includes('spa') || c.includes('beauty')) {
    return CATEGORY_DICTIONARY.salon;
  }
  if (c.includes('dent') || c.includes('clinic') || c.includes('doctor') || c.includes('health') || c.includes('physio') || c.includes('med')) {
    return CATEGORY_DICTIONARY.dental;
  }
  if (c.includes('auto') || c.includes('car') || c.includes('mechanic') || c.includes('tire') || c.includes('repair') || c.includes('detailing')) {
    return CATEGORY_DICTIONARY.auto;
  }
  if (c.includes('gym') || c.includes('fitness') || c.includes('yoga') || c.includes('trainer')) {
    return CATEGORY_DICTIONARY.fitness;
  }
  if (c.includes('shop') || c.includes('retail') || c.includes('store') || c.includes('boutique')) {
    return CATEGORY_DICTIONARY.retail;
  }
  if (c.includes('hotel') || c.includes('resort') || c.includes('inn') || c.includes('stay') || c.includes('hostel')) {
    return CATEGORY_DICTIONARY.hotel;
  }
  return DEFAULT_TEMPLATES;
}

export function generateProceduralReviews(params: ProceduralReviewParams): GeneratedReview[] {
  const {
    businessName = 'Local Business',
    businessCategory = 'Local Business',
    praiseTags = [],
    customNotes = '',
    tone = 'enthusiastic',
    iteration = 0,
    requestedCount,
  } = params;

  // Determine dynamic count (3, 4, or 5) rotating across regenerations if unspecified
  const count = requestedCount && requestedCount >= 3 && requestedCount <= 5
    ? requestedCount
    : 3 + ((Math.abs(iteration) + 1) % 3); // 3, 4, or 5

  const templates = pickCategoryTemplates(businessCategory);
  const cleanTags = praiseTags.map((t) => t.replace(/^[^\w\s]+/, '').trim()).filter(Boolean);
  const tagListStr = cleanTags.length > 0 ? cleanTags.join(', ') : '';

  // Seed offset based on iteration and current timestamp to guarantee fresh sets
  const seed = (iteration * 17 + Math.floor(Math.random() * 100)) % 1000;

  const reviews: GeneratedReview[] = [];

  // REVIEW 1: Short, Punchy & Enthusiastic
  const r1Openers = [
    `Quick shoutout to the team at ${businessName}—absolutely top-notch!`,
    `Five stars for ${businessName}! The ${templates.nouns[seed % templates.nouns.length]} was ${templates.actions[seed % templates.actions.length]}.`,
    `Such an awesome experience at ${businessName} today.`,
    `Super impressed with ${businessName}. Everything was fast, clean, and seamless.`,
    `Hands down a 10/10 experience at ${businessName}.`,
  ];
  const r1Text = `${r1Openers[seed % r1Openers.length]} ${
    tagListStr ? `Especially loved the ${cleanTags[0] || 'great service'}. ` : ''
  }${templates.closers[(seed + 1) % templates.closers.length]}`;

  reviews.push({
    id: 1,
    title: '⚡ Punchy & Enthusiastic',
    text: r1Text.trim(),
  });

  // REVIEW 2: Experience & Category Highlights
  const r2Openers = templates.openers;
  const opener2 = r2Openers[(seed + 2) % r2Openers.length];
  const highlight2 = templates.highlights[(seed + 2) % templates.highlights.length];
  const closer2 = templates.closers[(seed + 3) % templates.closers.length];
  const customMention = customNotes.trim() ? ` ${customNotes.trim()}.` : '';

  let r2Body = '';
  if (cleanTags.length >= 2) {
    r2Body = `The ${cleanTags[0]} and ${cleanTags[1]} really stood out during our visit.${customMention} ${highlight2}`;
  } else if (cleanTags.length === 1) {
    r2Body = `The ${cleanTags[0]} made a huge positive impression.${customMention} ${highlight2}`;
  } else {
    r2Body = `The attention to detail and warm atmosphere were noticeable from start to finish.${customMention} ${highlight2}`;
  }

  reviews.push({
    id: 2,
    title: '🌟 Detailed Experience',
    text: `${opener2} ${r2Body} ${closer2}`.trim(),
  });

  // REVIEW 3: Personal Warmth & Staff Shoutout
  const staffPhrases = [
    `The staff at ${businessName} are genuinely welcoming and attentive.`,
    `What really sets ${businessName} apart is how kind and professional the whole crew is.`,
    `Felt so well taken care of from the moment I arrived at ${businessName}.`,
    `Warm hospitality and genuine care at ${businessName} that you rarely find elsewhere.`,
  ];
  const staffOpener = staffPhrases[(seed + 4) % staffPhrases.length];
  const midTag = cleanTags.length > 2 ? `Loved the ${cleanTags[2]} as well! ` : '';
  const closer3 = templates.closers[(seed + 4) % templates.closers.length];

  reviews.push({
    id: 3,
    title: '😊 Warm & Personal',
    text: `${staffOpener} ${midTag}${templates.highlights[(seed + 3) % templates.highlights.length]} ${closer3}`.trim(),
  });

  // OPTIONAL REVIEW 4: Regular Customer / Long-term Recommendation
  if (count >= 4) {
    const regularOpeners = [
      `I visit ${businessName} frequently and they deliver consistent excellence every single time.`,
      `Whenever friends ask for recommendations in this area, ${businessName} is the very first place I mention.`,
      `We have been coming to ${businessName} for a while now and the standard never drops.`,
    ];
    const regOpener = regularOpeners[(seed + 5) % regularOpeners.length];
    const regCloser = `Reliable, honest, and truly standout quality. Can't recommend them enough!`;
    const regTag = cleanTags.length > 0 ? `Consistent ${cleanTags[seed % cleanTags.length]} and great vibes. ` : '';

    reviews.push({
      id: 4,
      title: '🏆 Loyal Recommendation',
      text: `${regOpener} ${regTag}${regCloser}`.trim(),
    });
  }

  // OPTIONAL REVIEW 5: Value & Craftsmanship
  if (count >= 5) {
    const valOpeners = [
      `Fantastic value for the exceptional level of care and quality provided by ${businessName}.`,
      `You can tell the team at ${businessName} takes genuine pride in their craft and their customers.`,
      `From initial greeting to finish, ${businessName} was prompt, courteous, and thoroughly impressive.`,
    ];
    const valOpener = valOpeners[(seed + 6) % valOpeners.length];
    const valCloser = templates.closers[(seed + 6) % templates.closers.length];

    reviews.push({
      id: 5,
      title: '💎 Quality & Value',
      text: `${valOpener} ${templates.actions[(seed + 4) % templates.actions.length]}. ${valCloser}`.trim(),
    });
  }

  return reviews;
}
