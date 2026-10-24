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
  title: string;
  fullUrl: string;
  brandName?: string;
  subcaption?: string;
}

/**
 * Generates an A4 size image (2480 x 3508 pixels at 300 DPI)
 * featuring a simple, high-contrast QR code with the last 4 letters
 * prominently printed directly underneath the QR.
 */
export async function generateA4QRImageBlob(options: A4QROptions): Promise<Blob> {
  const { slug, title, fullUrl, brandName = 'taplocalin', subcaption = 'Scan with smartphone camera to open' } = options;
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

  // 2. Subtle Outer Safe-Zone Margin Border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(100, 100, width - 200, height - 200);

  // 3. Top Header Section
  ctx.textAlign = 'center';

  // Brand Name
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText(brandName.toUpperCase(), width / 2, 280);

  // Main Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 84px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '-1px';
  const displayTitle = title.length > 38 ? `${title.substring(0, 38)}...` : title;
  ctx.fillText(displayTitle, width / 2, 410);

  // Subtitle / Instruction
  ctx.fillStyle = '#475569';
  ctx.font = '500 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '0px';
  ctx.fillText(subcaption, width / 2, 500);

  // Decorative divider
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 240, 560);
  ctx.lineTo(width / 2 + 240, 560);
  ctx.stroke();

  // 4. Generate Simple High-Contrast QR Code
  // Size: 1360 x 1360 px
  const qrSize = 1360;
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

  const qrX = (width - qrSize) / 2;
  const qrY = 660;

  // Draw QR (No outline border around QR)
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // 5. DIRECTLY UNDER THE QR: Mention ONLY the batch code (No outline border, no "last 4" label)
  const badgeY = qrY + qrSize + 70;

  // Render ONLY batch code in bold clean monospace typography
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 84px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.letterSpacing = '6px';
  ctx.fillText(last4, width / 2, badgeY + 40);

  // 6. Short Link / URL Details
  const urlY = badgeY + 140;
  ctx.fillStyle = '#1e293b';
  ctx.font = '600 48px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.fillText(fullUrl, width / 2, urlY);

  // Slug identification
  ctx.fillStyle = '#64748b';
  ctx.font = '500 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Endpoint ID: /r/${slug}`, width / 2, urlY + 70);

  // 7. Footer Information
  const footerY = height - 200;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(300, footerY - 50);
  ctx.lineTo(width - 300, footerY - 50);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('A4 Standard Print Format (210 × 297 mm) · Dynamic QR Persistence', width / 2, footerY);

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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Downloads the generated A4 QR image directly as a PNG file.
 */
export async function downloadA4QRImage(options: A4QROptions): Promise<void> {
  const blob = await generateA4QRImageBlob(options);
  const url = URL.createObjectURL(blob);
  const last4 = getLast4Letters(options.slug);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.slug}-A4-print-${last4}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
