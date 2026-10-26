import QRCode from 'qrcode';

/**
 * Extracts the last 4 characters/letters of a QR slug.
 * Example: '2-24-b8ix' -> 'B8IX', 'summer-promo' -> 'ROMO'
 */
export function getLast4Letters(slug: string): string {
  if (!slug) return '----';
  const clean = slug.trim().replace(/\/+$/, '');
  return clean.slice(-4).toUpperCase();
}

export const getBatchCode = getLast4Letters;

export interface A4QROptions {
  slug: string;
  title?: string;
  fullUrl: string;
  brandName?: string;
  subcaption?: string;
}

/**
 * Generates an A4 size image (2480 x 3508 pixels at 300 DPI)
 * featuring ONLY the QR code and the 4-digit/character code directly beneath it.
 * All headers, brand names, titles, URLs, and footers are omitted as requested.
 */
export async function generateA4QRImageBlob(options: A4QROptions): Promise<Blob> {
  const { slug, fullUrl } = options;
  const last4 = getLast4Letters(slug);

  // A4 dimensions at 300 DPI: 2480 x 3508 px
  const width = 2480;
  const height = 3508;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create canvas context');
  }

  // 1. Pure White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. Centered High-Contrast Borderless QR Code
  // Sized proportionally for standard A4 visibility
  const qrSize = 1600;
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, fullUrl, {
    width: qrSize,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  const qrX = Math.round((width - qrSize) / 2);
  const qrY = Math.round((height - qrSize - 260) / 2);

  // Draw pure QR (No outline border)
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // 3. Mention ONLY the 4 digits/characters directly under the QR
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.font = '900 140px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.letterSpacing = '8px';
  ctx.fillText(last4, width / 2, qrY + qrSize + 180);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas toBlob failed'));
      }
    }, 'image/png');
  });
}

/**
 * Initiates browser download of the clean A4 QR image
 */
export async function downloadA4QRImage(options: A4QROptions): Promise<void> {
  const blob = await generateA4QRImageBlob(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const last4 = getLast4Letters(options.slug);
  a.href = url;
  a.download = `qr-print-${last4.toLowerCase()}-${options.slug}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
