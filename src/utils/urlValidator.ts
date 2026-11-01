/**
 * URL Security & HTTPS Validation Layer
 * Enforces valid, secure HTTPS destination links before creating or updating QR link records.
 */

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

/**
 * Validates that a destination URL is a well-formed, secure HTTPS address.
 * 
 * Rules:
 * 1. Must use the 'https:' protocol. Plain 'http://' is explicitly rejected for security.
 * 2. Must be a parseable URL with a valid hostname.
 * 3. Disallows dangerous protocols ('javascript:', 'data:', 'file:', etc.) for standard links.
 * 4. Permits unassigned/empty links only when explicitly allowed (for blank pre-printed stock).
 */
export function validateSecureHttpsUrl(
  input: string,
  options: { allowEmpty?: boolean; allowSpecialSchemes?: boolean } = {}
): UrlValidationResult {
  const { allowEmpty = false, allowSpecialSchemes = false } = options;

  if (!input || !input.trim()) {
    if (allowEmpty) {
      return { isValid: true, sanitizedUrl: '' };
    }
    return {
      isValid: false,
      error: 'Destination URL is required. Please provide a secure HTTPS link.',
    };
  }

  const raw = input.trim();

  // Allow special internal redirect hubs, Wi-Fi payloads or vCard data if specified
  if (allowSpecialSchemes) {
    if (raw.startsWith('/r/') || raw.startsWith('WIFI:') || raw.startsWith('BEGIN:VCARD')) {
      return { isValid: true, sanitizedUrl: raw };
    }
  }

  // Check for explicit insecure HTTP
  if (/^http:\/\//i.test(raw)) {
    return {
      isValid: false,
      error: 'Insecure HTTP links are not permitted. Destination URL must use secure HTTPS (https://...).',
    };
  }

  // Prepend https:// if user entered domain without protocol (e.g. "myrestaurant.com/menu")
  let target = raw;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(target)) {
    target = 'https://' + target;
  }

  try {
    const parsed = new URL(target);

    // Enforce HTTPS
    if (parsed.protocol.toLowerCase() !== 'https:') {
      return {
        isValid: false,
        error: `Insecure protocol "${parsed.protocol}" detected. Only secure HTTPS (https://) links are allowed.`,
      };
    }

    // Enforce valid hostname
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || hostname.length < 3) {
      return {
        isValid: false,
        error: 'Invalid domain name in destination URL.',
      };
    }

    // Must have a dot in hostname or be localhost
    if (!hostname.includes('.') && hostname !== 'localhost') {
      return {
        isValid: false,
        error: 'Destination URL domain is missing a top-level domain (e.g. .com, .org, .in).',
      };
    }

    // Check for invalid trailing dots or spaces
    if (hostname.endsWith('.')) {
      return {
        isValid: false,
        error: 'Invalid domain name in destination URL.',
      };
    }

    return {
      isValid: true,
      sanitizedUrl: parsed.toString(),
    };
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format. Please provide a complete, valid HTTPS link (e.g. https://yourbusiness.com).',
    };
  }
}
