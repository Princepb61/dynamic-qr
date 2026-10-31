// Procedural Organic Google Review Generator
// Generates completely distinct, category-grounded 5-star reviews with zero repetitive phrasing
// Supports English, Hindi (हिन्दी), and Punjabi (ਪੰਜਾਬੀ), with Short, Mid, and Long length variants

export type ReviewLanguage = 'en' | 'hi' | 'pa';
export type ReviewLength = 'short' | 'mid' | 'long';

export interface ProceduralReviewParams {
  businessName: string;
  businessCategory?: string;
  praiseTags?: string[];
  customNotes?: string;
  keywords?: string;
  tone?: 'enthusiastic' | 'friendly' | 'professional' | 'short_and_sweet' | string;
  language?: 'all' | ReviewLanguage;
  length?: 'all' | ReviewLength;
  iteration?: number;
  requestedCount?: number;
}

export interface GeneratedReview {
  id: number;
  title: string;
  text: string;
  language: ReviewLanguage;
  length: ReviewLength;
  badge?: string;
}

interface CategoryTemplates {
  nouns: string[];
  actions: string[];
  openers: string[];
  closers: string[];
  highlights: string[];
  keywords: string[];
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
    keywords: ['delicious food', 'fresh ingredients', 'warm hospitality', 'authentic taste', 'quick service'],
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
    keywords: ['artisan coffee', 'cozy ambience', 'fresh bakery', 'friendly baristas', 'calm environment'],
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
    keywords: ['expert styling', 'gentle care', 'flawless haircut', 'relaxing spa', 'hygienic salon'],
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
    keywords: ['painless treatment', 'modern clinic', 'caring doctor', 'clear diagnosis', 'gentle procedure'],
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
    keywords: ['honest mechanics', 'quick turnaround', 'fair pricing', 'reliable repair', 'clear quote'],
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
    keywords: ['great collection', 'polite staff', 'genuine rates', 'neat display', 'fast billing'],
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
  keywords: ['top quality', 'reliable team', 'fair rates', 'polite communication', 'prompt service'],
};

// Auto-infer keywords from business name and category
export function autoInferKeywords(businessName: string, businessCategory: string): string[] {
  const text = `${businessName} ${businessCategory}`.toLowerCase();
  const inferred: string[] = [];

  if (text.includes('dhaba') || text.includes('rest') || text.includes('food') || text.includes('kitchen') || text.includes('dine')) {
    inferred.push('taste', 'fresh food', 'quick serving', 'clean ambience');
  }
  if (text.includes('sweet') || text.includes('mithai') || text.includes('bakery') || text.includes('cake')) {
    inferred.push('fresh sweets', 'pure desi ghee', 'hygienic preparation', 'great taste');
  }
  if (text.includes('salon') || text.includes('beauty') || text.includes('hair') || text.includes('barber')) {
    inferred.push('experienced staff', 'modern styling', 'relaxing vibe', 'clean tools');
  }
  if (text.includes('dent') || text.includes('clinic') || text.includes('hospital') || text.includes('dr')) {
    inferred.push('gentle treatment', 'hygienic clinic', 'experienced doctor', 'fair advice');
  }
  if (text.includes('gym') || text.includes('fit') || text.includes('health')) {
    inferred.push('latest machines', 'supportive trainer', 'energetic environment', 'clean floor');
  }
  if (text.includes('auto') || text.includes('car') || text.includes('motor') || text.includes('repair')) {
    inferred.push('genuine parts', 'honest mechanic', 'prompt delivery', 'transparent billing');
  }

  return inferred.length > 0 ? inferred : ['quality service', 'friendly staff', 'fair pricing', 'great experience'];
}

function pickCategoryTemplates(category: string): CategoryTemplates {
  const c = (category || '').toLowerCase();
  if (c.includes('food') || c.includes('restaurant') || c.includes('pizza') || c.includes('diner') || c.includes('bistro') || c.includes('bar') || c.includes('bakery') || c.includes('dhaba')) {
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
  return DEFAULT_TEMPLATES;
}

// -------------------------------------------------------------
// MULTILINGUAL BANK: HINDI (हिन्दी) & PUNJABI (ਪੰਜਾਬੀ)
// -------------------------------------------------------------

interface MultilingualBank {
  short: string[];
  mid: string[];
  long: string[];
}

const HINDI_BANK: MultilingualBank = {
  short: [
    'यहाँ की सर्विस और क्वालिटी वाकई में बहुत ही शानदार है। पूरे 5 स्टार!',
    'बहुत ही बढ़िया अनुभव रहा! स्टाफ का स्वभाव बहुत विनम्र है और काम एकदम समय पर हुआ।',
    'पैसा वसूल सेवा! बहुत ही साफ-सुथरी जगह और बेहतरीन क्वालिटी।',
    'पहली बार आए थे और सच में दिल खुश हो गया। बहुत-बहुत धन्यवाद!',
    'शानदार काम और बहुत ही वाजिब दाम। सभी को यहाँ जरूर आना चाहिए।',
    'क्वालिटी और ईमानदारी दोनों में नंबर वन। 10/10 रेटिंग!',
  ],
  mid: [
    '${businessName} में हमारा अनुभव बहुत ही सुखद और यादगार रहा। स्टाफ बहुत ही मिलनसार है और हर बात को बहुत ध्यान से सुनता है। काम में पूरी सफाई और प्रोफेशनलिज्म देखने को मिला। ${extra} जरूर विजिट करें!',
    'अगर आप बढ़िया क्वालिटी और बिना किसी झंझट के बेहतरीन सर्विस ढूंढ रहे हैं, तो ${businessName} सबसे सही जगह है। यहाँ की व्यवस्था और टाइमिंग बहुत अच्छी है। ${extra} हम दोबारा जरूर आएंगे।',
    '${businessName} की जितनी तारीफ की जाए कम है। बहुत ही शांत और साफ-सुथरा माहौल है। रेट्स भी बिल्कुल सही हैं और काम में कोई कमी नहीं छोड़ी। ${extra} 5 स्टार सर्विस!',
    'आज यहाँ पहली बार आना हुआ और सचमुच उम्मीद से कई गुना बेहतर अनुभव मिला। स्टाफ ने बहुत प्यार से डील किया। ${extra} हमारी तरफ से पूरे 5 स्टार!',
  ],
  long: [
    'आज मैं अपने परिवार के साथ ${businessName} गया था और हम सब यहाँ की सर्विस से बेहद प्रभावित हुए। रिसेप्शन से लेकर आखिरी तक हर किसी का व्यवहार बहुत ही आदरपूर्ण था। यहाँ की साफ-सफाई और अनुशासन देखकर बहुत अच्छा लगा। ${extra} काम की क्वालिटी में कोई समझौता नहीं है और रेट्स भी बेहद वाजिब हैं। ऐसे ईमानदार और मेहनती बिजनेस को सपोर्ट करना हमारा फर्ज है। हम अपने सभी दोस्तों और रिश्तेदारों को यहाँ आने की सलाह देंगे!',
    'काफी समय से एक भरोसेमंद जगह की तलाश थी, और ${businessName} ने हमारी उम्मीदों को पूरी तरह सही साबित किया। स्टाफ ने बहुत धैर्यपूर्वक हमारी सारी जरूरतें समझीं और बेहतरीन रिजल्ट दिया। ${extra} वातावरण बहुत ही पॉजिटिव और व्यवस्थित है। जब सर्विस इतनी अच्छी हो तो 5 स्टार देना तो बनता ही है। हम निश्चित रूप से बार-बार यहाँ आते रहेंगे!',
  ],
};

const PUNJABI_BANK: MultilingualBank = {
  short: [
    'ਬਹੁਤ ਹੀ ਵਧੀਆ ਸਰਵਿਸ ਤੇ ਟਾਪ ਕਲਾਸ ਕੁਆਲਿਟੀ! ਪੂਰੇ 5 ਸਟਾਰ।',
    'ਸੱਚਮੁੱਚ ਬਹੁਤ ਹੀ ਸ਼ਾਨਦਾਰ ਤਜ਼ਰਬਾ ਰਿਹਾ, ਸਟਾਫ ਬਹੁਤ ਮਿਲਣਸਾਰ ਤੇ ਨਿਮਰ ਹੈ।',
    'ਇੱਕ ਨੰਬਰ ਕੰਮ! ਬਹੁਤ ਹੀ ਸਾਫ਼-ਸੁਥਰਾ ਮਾਹੌਲ ਤੇ ਸਮੇਂ ਸਿਰ ਕੰਮ ਕੀਤਾ।',
    'ਪੈਸਾ ਵਸੂਲ ਕੁਆਲਿਟੀ! ਇੱਥੇ ਆ ਕੇ ਮਨ ਖੁਸ਼ ਹੋ ਗਿਆ। ਬਹੁਤ-ਬਹੁਤ ਧੰਨਵਾਦ।',
    'ਵਧੀਆ ਰੇਟ ਤੇ ਇਮਾਨਦਾਰੀ ਵਾਲਾ ਕੰਮ। ਸਾਰੇ ਭੈਣ-ਭਰਾਵਾਂ ਨੂੰ ਜ਼ਰੂਰ ਆਉਣਾ ਚਾਹੀਦਾ ਹੈ।',
    'ਕੁਆਲਿਟੀ ਵਿੱਚ ਕੋਈ ਕਮੀ ਨਹੀਂ! 10 ਵਿੱਚੋਂ 10 ਨੰਬਰ।',
  ],
  mid: [
    '${businessName} ਵਿਖੇ ਸਾਡਾ ਤਜ਼ਰਬਾ ਬਹੁਤ ਹੀ ਵਧੀਆ ਤੇ ਯਾਦਗਾਰ ਰਿਹਾ। ਸਟਾਫ ਦਾ ਬੋਲਚਾਲ ਬਹੁਤ ਹੀ ਪਿਆਰ ਭਰਿਆ ਸੀ। ਕੰਮ ਵਿੱਚ ਪੂਰੀ ਸਫ਼ਾਈ ਤੇ ਮਿਹਨਤ ਦਿਖੀ। ${extra} ਅਸੀਂ ਜ਼ਰੂਰ ਦੁਬਾਰਾ ਆਵਾਂਗੇ!',
    'ਜੇਕਰ ਤੁਸੀਂ ਵਧੀਆ ਕੁਆਲਿਟੀ ਅਤੇ ਸੱਚੀ ਸੁੱਚੀ ਸਰਵਿਸ ਭਾਲ ਰਹੇ ਹੋ ਤਾਂ ${businessName} ਬਿਲਕੁਲ ਸਹੀ ਥਾਂ ਹੈ। ਹਰ ਕੰਮ ਬਹੁਤ ਹੀ ਜ਼ਿੰਮੇਵਾਰੀ ਨਾਲ ਸੰਭਾਲਿਆ ਗਿਆ। ${extra} ਸਾਡੇ ਵੱਲੋਂ ਪੂਰੇ 5 ਸਟਾਰ!',
    '${businessName} ਦੀ ਸਰਵਿਸ ਬਹੁਤ ਹੀ ਲਾਜਵਾਬ ਹੈ। ਮਾਹੌਲ ਬਹੁਤ ਸਾਫ਼ ਤੇ ਸ਼ਾਂਤ ਹੈ। ਰੇਟ ਵੀ ਬਿਲਕੁਲ ਜਾਇਜ਼ ਹਨ ਤੇ ਕੁਆਲਿਟੀ ਇੱਕ ਨੰਬਰ। ${extra} ਸਾਰਿਆਂ ਨੂੰ ਇੱਥੇ ਜ਼ਰੂਰ ਫੇਰੀ ਪਾਉਣੀ ਚਾਹੀਦੀ ਹੈ।',
    'ਅੱਜ ਪਹਿਲੀ ਵਾਰ ਇੱਥੇ ਆਉਣਾ ਹੋਇਆ ਤੇ ਦਿਲ ਬਾਗੋ-ਬਾਗ ਹੋ ਗਿਆ। ਬਹੁਤ ਹੀ ਵਧੀਆ ਪ੍ਰਬੰਧ ਤੇ ਪਿਆਰ ਵਾਲਾ ਸਟਾਫ। ${extra} ਪੰਜ ਸਟਾਰ ਰੇਟਿੰਗ!',
  ],
  long: [
    'ਅੱਜ ਮੈਂ ਆਪਣੇ ਪਰਿਵਾਰ ਨਾਲ ${businessName} ਆਇਆ ਸੀ ਅਤੇ ਸੱਚਮੁੱਚ ਸਾਡਾ ਤਜ਼ਰਬਾ ਉਮੀਦ ਤੋਂ ਕਿਤੇ ਜ਼ਿਆਦਾ ਸ਼ਾਨਦਾਰ ਰਿਹਾ। ਅੰਦਰ ਵੜਦਿਆਂ ਹੀ ਬਹੁਤ ਹੀ ਸਤਿਕਾਰ ਨਾਲ ਗੱਲਬਾਤ ਕੀਤੀ ਗਈ। ਮਾਹੌਲ ਬਹੁਤ ਹੀ ਸਾਫ਼-ਸੁਥਰਾ ਤੇ ਸਕੂਨ ਵਾਲਾ ਸੀ। ${extra} ਕੁਆਲਿਟੀ ਪੱਖੋਂ ਕੋਈ ਸਮਝੌਤਾ ਨਹੀਂ ਹੈ ਅਤੇ ਰੇਟ ਵੀ ਬਿਲਕੁਲ ਜਾਇਜ਼ ਹਨ। ਅੱਜ ਦੇ ਸਮੇਂ ਵਿੱਚ ਅਜਿਹੇ ਇਮਾਨਦਾਰ ਅਦਾਰੇ ਬਹੁਤ ਘੱਟ ਮਿਲਦੇ ਹਨ। ਅਸੀਂ ਆਪਣੇ ਸਾਰੇ ਦੋਸਤਾਂ ਤੇ ਰਿਸ਼ਤੇਦਾਰਾਂ ਨੂੰ ਇੱਥੇ ਆਉਣ ਦੀ ਪੁਰਜ਼ੋਰ ਸਿਫਾਰਸ਼ ਕਰਦੇ ਹਾਂ!',
    'ਕਾਫੀ ਚਿਰ ਤੋਂ ਇੱਕ ਵਧੀਆ ਤੇ ਭਰੋਸੇਮੰਦ ਜਗ੍ਹਾ ਲੱਭ ਰਹੇ ਸੀ, ਤੇ ${businessName} ਨੇ ਬਿਲਕੁਲ ਨਿਰਾਸ਼ ਨਹੀਂ ਕੀਤਾ। ਸਟਾਫ ਨੇ ਬਹੁਤ ਹੀ ਤਸੱਲੀ ਨਾਲ ਸਾਡੀ ਗੱਲ ਸੁਣੀ ਤੇ ਬਿਹਤਰੀਨ ਸੇਵਾ ਦਿੱਤੀ। ${extra} ਮਾਹੌਲ ਵਿੱਚ ਬਹੁਤ ਹੀ ਸਕਾਰਾਤਮਕ ਊਰਜਾ ਹੈ। ਪੂਰੀ ਤਰ੍ਹਾਂ ਸੰਤੁਸ਼ਟ ਹਾਂ ਅਤੇ 5 ਸਟਾਰ ਦਿੰਦਿਆਂ ਮਾਣ ਮਹਿਸੂਸ ਹੋ ਰਿਹਾ ਹੈ!',
  ],
};

export function generateProceduralReviews(params: ProceduralReviewParams): GeneratedReview[] {
  const {
    businessName = 'Local Business',
    businessCategory = 'Local Business',
    praiseTags = [],
    customNotes = '',
    keywords = '',
    tone = 'enthusiastic',
    language = 'all',
    length = 'all',
    iteration = 0,
    requestedCount,
  } = params;

  // Auto infer keywords and merge with provided keywords and tags
  const inferred = autoInferKeywords(businessName, businessCategory);
  const userKeywords = keywords ? keywords.split(/[,;\n]+/).map(k => k.trim()).filter(Boolean) : [];
  const cleanTags = praiseTags.map((t) => t.replace(/^[^\w\s]+/, '').trim()).filter(Boolean);
  const allKeywords = Array.from(new Set([...userKeywords, ...cleanTags, ...inferred])).filter(Boolean);

  const templates = pickCategoryTemplates(businessCategory);
  const count = requestedCount && requestedCount >= 3 && requestedCount <= 6
    ? requestedCount
    : 4;

  const seed = (iteration * 19 + Math.floor(Math.random() * 97)) % 1000;
  const reviews: GeneratedReview[] = [];

  // Determine what languages to include
  const languagesToUse: ReviewLanguage[] = [];
  if (language === 'all') {
    // Balanced mix: English, Hindi, Punjabi
    languagesToUse.push('en', 'hi', 'pa');
    if (count >= 4) languagesToUse.push('en');
    if (count >= 5) languagesToUse.push('hi');
    if (count >= 6) languagesToUse.push('pa');
  } else {
    for (let i = 0; i < count; i++) {
      languagesToUse.push(language as ReviewLanguage);
    }
  }

  // Determine lengths to use
  const lengthsToUse: ReviewLength[] = [];
  if (length === 'all') {
    // Mix short, mid, long
    lengthsToUse.push('short', 'mid', 'long', 'mid', 'short', 'long');
  } else {
    for (let i = 0; i < count; i++) {
      lengthsToUse.push(length as ReviewLength);
    }
  }

  // Build each review
  for (let i = 0; i < count; i++) {
    const currentLang = languagesToUse[i % languagesToUse.length];
    const currentLen = lengthsToUse[i % lengthsToUse.length];
    const itemSeed = (seed + i * 7) % 500;

    let reviewText = '';
    let reviewTitle = '';

    const kw = allKeywords[itemSeed % allKeywords.length] || 'great service';
    const kw2 = allKeywords[(itemSeed + 1) % allKeywords.length] || 'friendly staff';
    const noteSnippet = customNotes.trim() ? ` ${customNotes.trim()}` : '';

    if (currentLang === 'hi') {
      const bank = HINDI_BANK[currentLen];
      const raw = bank[itemSeed % bank.length];
      const extra = `${kw} और ${kw2} विशेष रूप से बहुत पसंद आया।${noteSnippet}`;
      reviewText = raw.replace(/\$\{businessName\}/g, businessName).replace(/\$\{extra\}/g, extra);

      reviewTitle = currentLen === 'short'
        ? '⚡ संक्षिप्त हिन्दी (Short)'
        : currentLen === 'mid'
        ? '📝 मध्यम हिन्दी (Mid)'
        : '📖 विस्तृत हिन्दी (Detailed)';
    } else if (currentLang === 'pa') {
      const bank = PUNJABI_BANK[currentLen];
      const raw = bank[itemSeed % bank.length];
      const extra = `${kw} ਅਤੇ ${kw2} ਖਾਸ ਤੌਰ 'ਤੇ ਬਹੁਤ ਪਸੰਦ ਆਇਆ।${noteSnippet}`;
      reviewText = raw.replace(/\$\{businessName\}/g, businessName).replace(/\$\{extra\}/g, extra);

      reviewTitle = currentLen === 'short'
        ? '⚡ ਸੰਖੇਪ ਪੰਜਾਬੀ (Short)'
        : currentLen === 'mid'
        ? '📝 ਦਰਮਿਆਨੀ ਪੰਜਾਬੀ (Mid)'
        : '📖 ਵਿਸਤ੍ਰਿਤ ਪੰਜਾਬੀ (Detailed)';
    } else {
      // English
      if (currentLen === 'short') {
        const shortOpeners = [
          `Quick shoutout to ${businessName}—absolutely top-notch!`,
          `Five stars for ${businessName}! The ${templates.nouns[itemSeed % templates.nouns.length]} was ${templates.actions[itemSeed % templates.actions.length]}.`,
          `Awesome experience at ${businessName} today. Fast, clean, and seamless.`,
          `Hands down a 10/10 experience at ${businessName}.`,
          `Great ${kw} and super friendly people at ${businessName}.`,
        ];
        reviewText = `${shortOpeners[itemSeed % shortOpeners.length]} ${templates.closers[(itemSeed + 1) % templates.closers.length]}`;
        reviewTitle = '⚡ Short & Punchy';
      } else if (currentLen === 'mid') {
        const opener = templates.openers[itemSeed % templates.openers.length];
        const highlight = templates.highlights[itemSeed % templates.highlights.length];
        const closer = templates.closers[(itemSeed + 2) % templates.closers.length];
        reviewText = `${opener} ${businessName}. The ${kw} and ${kw2} were outstanding.${noteSnippet} ${highlight} ${closer}`;
        reviewTitle = '📝 Balanced Experience';
      } else {
        // Long / Narrative
        const longIntro = `Visited ${businessName} recently and it completely exceeded our expectations from start to finish.`;
        const longDetail = `The attention to detail regarding ${kw} and ${kw2} was noticeable right away.${noteSnippet} Everything was handled with genuine care and true professionalism.`;
        const highlight = templates.highlights[itemSeed % templates.highlights.length];
        const closer = `Such high standards are hard to come by these days. We will definitely be regular customers and strongly recommend them to anyone in the area!`;
        reviewText = `${longIntro} ${longDetail} ${highlight} ${closer}`;
        reviewTitle = '📖 Detailed Customer Story';
      }
    }

    reviews.push({
      id: i + 1,
      title: reviewTitle,
      text: reviewText.trim(),
      language: currentLang,
      length: currentLen,
      badge: currentLang === 'hi' ? 'हिन्दी' : currentLang === 'pa' ? 'ਪੰਜਾਬੀ' : 'English',
    });
  }

  return reviews;
}
