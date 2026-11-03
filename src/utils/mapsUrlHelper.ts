/**
 * Helper to auto-convert Google Maps URLs, Place IDs, and CIDs into the official
 * Google 5-Star Rate & Review dialog URL (search.google.com/local/writereview).
 */

export interface GoogleReviewNormalizationResult {
  reviewUrl: string;
  placeId?: string;
  cid?: string;
  isConverted: boolean;
  message?: string;
}

/**
 * Extracts Place ID (ChIJ...) if present in a string or URL
 */
export function extractPlaceIdFromUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // 1. Direct Place ID
  if (/^ChIJ[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Query param ?placeid=... or &place_id=...
  const placeIdMatch = url.match(/[?&](?:placeid|place_id)=(ChIJ[a-zA-Z0-9_-]+)/i);
  if (placeIdMatch && placeIdMatch[1]) {
    return placeIdMatch[1];
  }

  // 3. Embedded in Google Maps data string (!1s0x...:0x...)
  const chijMatch = url.match(/(ChIJ[a-zA-Z0-9_-]{20,})/);
  if (chijMatch && chijMatch[1]) {
    return chijMatch[1];
  }

  return null;
}

/**
 * Extracts Google CID (numeric) if present in a URL
 */
export function extractCidFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&]cid=([0-9]+)/i);
  return match && match[1] ? match[1] : null;
}

/**
 * Auto-converts any pasted Google Maps link into the direct Google 5-star rate & review dialog URL.
 */
export async function normalizeToGoogleReviewUrl(input: string): Promise<GoogleReviewNormalizationResult> {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    return { reviewUrl: '', isConverted: false };
  }

  // 1. If already the direct write-review dialog
  if (trimmed.includes('search.google.com/local/writereview') || trimmed.includes('/writereview')) {
    return {
      reviewUrl: trimmed,
      isConverted: true,
      message: 'Direct 5-Star Review Dialog Active',
    };
  }

  // 2. Check for direct Place ID (e.g. ChIJ...)
  const placeId = extractPlaceIdFromUrl(trimmed);
  if (placeId) {
    return {
      reviewUrl: `https://search.google.com/local/writereview?placeid=${placeId}`,
      placeId,
      isConverted: true,
      message: 'Auto-converted Place ID to Direct 5-Star Review Dialog',
    };
  }

  // 3. Check for CID (Customer ID in Google Maps)
  const cid = extractCidFromUrl(trimmed);
  if (cid) {
    return {
      reviewUrl: `https://search.google.com/local/writereview?cid=${cid}`,
      cid,
      isConverted: true,
      message: 'Auto-converted Google CID to Direct 5-Star Review Dialog',
    };
  }

  // 4. If short Google Maps link (maps.app.goo.gl or goo.gl/maps) or full maps.google.com URL
  const isMapsUrl =
    /maps\.app\.goo\.gl/i.test(trimmed) ||
    /goo\.gl\/maps/i.test(trimmed) ||
    /google\.[a-z.]+\/maps/i.test(trimmed) ||
    /maps\.google\.[a-z.]+/i.test(trimmed);

  if (isMapsUrl) {
    try {
      // Call server proxy to follow redirect and extract write-review canonical URL
      const response = await fetch(`/api/resolve-maps-url?url=${encodeURIComponent(trimmed)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.reviewUrl) {
          return {
            reviewUrl: data.reviewUrl,
            placeId: data.placeId,
            cid: data.cid,
            isConverted: true,
            message: 'Auto-resolved Google Maps link to Direct Review Dialog',
          };
        }
      }
    } catch (e) {
      console.warn('Could not resolve Google Maps short link via server:', e);
    }
  }

  // 5. If it is a generic URL or website link, return sanitized
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      reviewUrl: trimmed,
      isConverted: false,
    };
  }

  // 6. If plain business name text, create Google search review query
  return {
    reviewUrl: `https://www.google.com/search?q=${encodeURIComponent(trimmed + ' write a review')}`,
    isConverted: true,
    message: 'Formatted to Google Review Search',
  };
}
