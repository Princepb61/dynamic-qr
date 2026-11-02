/**
 * Standard URL Sanitizer & Helper
 * Formats URLs smoothly without strict protocol or hostname blocking.
 */

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

export function validateSecureHttpsUrl(
  input: string,
  options: { allowEmpty?: boolean; allowSpecialSchemes?: boolean } = {}
): UrlValidationResult {
  const { allowEmpty = false } = options;

  if (!input || !input.trim()) {
    if (allowEmpty) {
      return { isValid: true, sanitizedUrl: '' };
    }
    return {
      isValid: false,
      error: 'Please enter a destination URL.',
    };
  }

  const raw = input.trim();

  // If already has protocol or special scheme, return directly
  if (
    raw.startsWith('/r/') ||
    raw.startsWith('WIFI:') ||
    raw.startsWith('BEGIN:VCARD') ||
    /^[a-zA-Z0-9+.-]+:\/\//i.test(raw) ||
    /^(mailto|tel|sms|geo|whatsapp):/i.test(raw)
  ) {
    return { isValid: true, sanitizedUrl: raw };
  }

  // Prepend https:// by default for user convenience
  const withProtocol = `https://${raw}`;
  return {
    isValid: true,
    sanitizedUrl: withProtocol,
  };
}
