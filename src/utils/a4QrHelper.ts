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
 * Checks if current browser/environment is a smartphone or mobile touch device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
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
 * Initiates browser download of the clean A4 QR image.
 * Safely delays URL revocation so mobile Safari / Android Chrome never cancel downloads.
 */
export async function downloadA4QRImage(options: A4QROptions): Promise<void> {
  const blob = await generateA4QRImageBlob(options);
  const url = URL.createObjectURL(blob);
  const last4 = getLast4Letters(options.slug);
  const filename = `qr-print-${last4.toLowerCase()}-${options.slug}.png`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Keep object URL alive for 60 seconds on mobile devices to prevent download cancellation
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }, 60000);
}

/**
 * Native Mobile Share & AirPrint Sheet (Web Share API)
 * Opens iOS/Android system sheet where user can tap:
 * - "Print" (AirPrint)
 * - "Save Image" / "Save to Files"
 * - "WhatsApp" / "AirDrop"
 */
export async function shareOrSaveA4QR(options: A4QROptions): Promise<'shared' | 'downloaded'> {
  const blob = await generateA4QRImageBlob(options);
  const last4 = getLast4Letters(options.slug);
  const filename = `QR-A4-${last4}.png`;

  if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `QR Code Sheet (${last4})`,
          text: `Printable A4 QR Sheet for /r/${options.slug} [Code: ${last4}]`,
        });
        return 'shared';
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return 'shared'; // User simply cancelled share dialog
      }
      console.warn('Share API failed, falling back to download:', err);
    }
  }

  // Fallback to direct download
  await downloadA4QRImage(options);
  return 'downloaded';
}

/**
 * Mobile-Optimized Clean Print Function
 * On smartphones and desktop alike, creates an isolated print view containing
 * EXCLUSIVELY the A4 sheet with borderless QR and 4-digit code.
 * Bypasses all complex SPA layout issues and AirPrint scaling bugs on mobile browsers.
 */
export async function printA4QRSheet(options: A4QROptions): Promise<void> {
  const last4 = getLast4Letters(options.slug);

  // Generate high-res base64 data URL
  const qrDataUrl = await QRCode.toDataURL(options.fullUrl, {
    width: 1200,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>A4 QR Code Sheet - ${last4}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #ffffff;
      color: #000000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ui-monospace, monospace;
    }
    .sheet-wrapper {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .qr-container {
      width: 80vw;
      max-width: 520px;
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }
    .code-text {
      margin-top: 28px;
      font-size: clamp(32px, 8vw, 56px);
      font-weight: 900;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      letter-spacing: 0.18em;
      color: #000000;
      text-transform: uppercase;
      user-select: all;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
      .sheet-wrapper {
        height: 100% !important;
        padding: 0 !important;
      }
      .qr-container {
        width: 155mm !important;
        max-width: none !important;
      }
      .code-text {
        margin-top: 18mm !important;
        font-size: 44pt !important;
      }
    }
  </style>
</head>
<body>
  <div class="sheet-wrapper">
    <div class="qr-container">
      <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />
    </div>
    <div class="code-text">${last4}</div>
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`;

  // On mobile devices, an isolated hidden iframe or dedicated print window works best
  const isMobile = isMobileDevice();

  if (isMobile) {
    // Open dedicated print tab on mobile browsers
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      return;
    }
  }

  // Fallback / Desktop: Hidden iframe printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(printHtml);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          window.print();
        }
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 3000);
      }, 300);
    };
  } else {
    window.print();
  }
}

/**
 * Generates an A4 size image for Multi-QR batch sheets (e.g. 12, 24, 30 codes on one sheet)
 */
export async function generateMultiQRA4Blob(
  links: Array<{ slug: string; title?: string }>,
  cols: 2 | 3 | 4 = 3
): Promise<Blob> {
  const width = 2480;
  const height = 3508;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const rows = Math.ceil(links.length / cols);

  const paddingX = 140;
  const paddingY = 160;
  const availableWidth = width - paddingX * 2;
  const availableHeight = height - paddingY * 2;

  const cellWidth = Math.floor(availableWidth / cols);
  const cellHeight = Math.floor(availableHeight / rows);
  const qrSize = Math.min(Math.floor(cellWidth * 0.72), Math.floor(cellHeight * 0.65), 520);

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const colIdx = i % cols;
    const rowIdx = Math.floor(i / cols);

    const cellX = paddingX + colIdx * cellWidth;
    const cellY = paddingY + rowIdx * cellHeight;

    const fullUrl = `${baseUrl}/r/${link.slug}`;
    const last4 = getLast4Letters(link.slug);

    // Render single QR
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, fullUrl, {
      width: qrSize,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });

    const qrX = cellX + Math.round((cellWidth - qrSize) / 2);
    const qrY = cellY + Math.round((cellHeight - qrSize - 80) / 2);

    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // 4-Digit Code under each QR
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.font = '900 48px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.letterSpacing = '4px';
    ctx.fillText(last4, cellX + Math.round(cellWidth / 2), qrY + qrSize + 60);

    // Subtle cut guides (dashed lines between cells)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.strokeRect(cellX + 10, cellY + 10, cellWidth - 20, cellHeight - 20);
    ctx.setLineDash([]);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

/**
 * Downloads a complete Multi-QR batch sheet as an A4 PNG image
 */
export async function downloadMultiQRA4Image(
  links: Array<{ slug: string; title?: string }>,
  cols: 2 | 3 | 4 = 3,
  batchName = 'multi-qr-sheet'
): Promise<void> {
  const blob = await generateMultiQRA4Blob(links, cols);
  const url = URL.createObjectURL(blob);
  const filename = `${batchName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-a4.png`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }, 60000);
}

/**
 * Native Mobile Share & AirPrint for Multi-QR Batch Sheets
 */
export async function shareOrSaveMultiQRA4(
  links: Array<{ slug: string; title?: string }>,
  cols: 2 | 3 | 4 = 3,
  batchName = 'multi-qr-sheet'
): Promise<'shared' | 'downloaded'> {
  const blob = await generateMultiQRA4Blob(links, cols);
  const filename = `${batchName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-a4.png`;

  if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Multi-QR Sheet (${links.length} Codes)`,
          text: `A4 Printable Multi-QR Sheet with ${links.length} codes`,
        });
        return 'shared';
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return 'shared';
      }
      console.warn('Share API failed, falling back to download:', err);
    }
  }

  await downloadMultiQRA4Image(links, cols, batchName);
  return 'downloaded';
}

import { LabelPresetType } from '../types';

export interface LabelPresetDefinition {
  id: LabelPresetType;
  name: string;
  badge: string;
  dimensions: string;
  description: string;
  pageCss: string;
  itemCss: string;
  qrSize: number;
}

export const LABEL_PRESETS: Record<LabelPresetType, LabelPresetDefinition> = {
  a4_grid: {
    id: 'a4_grid',
    name: 'A4 Multi-Sticker Sheet',
    badge: 'Standard',
    dimensions: '210 × 297 mm (Sheet Grid)',
    description: 'Print 12, 24, or 30 peel-off QR stickers on a standard A4 sticker paper sheet.',
    pageCss: '@page { size: A4 portrait; margin: 8mm; }',
    itemCss: 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6px;',
    qrSize: 180,
  },
  square_sticker: {
    id: 'square_sticker',
    name: 'Square Sticker Label',
    badge: 'Retail & Jars',
    dimensions: '50 × 50 mm (2" × 2")',
    description: 'Square adhesive sticker for food containers, product tags, retail packages, or table corners.',
    pageCss: '@page { size: 50mm 50mm; margin: 0; }',
    itemCss: 'width: 50mm; height: 50mm; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; padding: 3mm;',
    qrSize: 140,
  },
  business_card: {
    id: 'business_card',
    name: 'Table Standee / Card',
    badge: 'Restaurants',
    dimensions: '89 × 51 mm (3.5" × 2")',
    description: 'Standard business card size for acrylic table stands, counter inserts, and bill presentation cards.',
    pageCss: '@page { size: 89mm 51mm landscape; margin: 0; }',
    itemCss: 'width: 89mm; height: 51mm; page-break-after: always; display: flex; flex-direction: row; align-items: center; justify-content: space-around; box-sizing: border-box; padding: 4mm;',
    qrSize: 130,
  },
  thermal_2in: {
    id: 'thermal_2in',
    name: '2" Thermal Receipt (58mm)',
    badge: 'POS Thermal',
    dimensions: '58 mm Roll Continuous',
    description: 'Direct thermal roll for ESC/POS 58mm mobile Bluetooth and counter printers. High contrast black & white.',
    pageCss: '@page { size: 58mm auto; margin: 0; }',
    itemCss: 'width: 54mm; margin: 0 auto 6mm auto; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3mm 0;',
    qrSize: 150,
  },
  thermal_3in: {
    id: 'thermal_3in',
    name: '3" Thermal Receipt (80mm)',
    badge: 'POS Thermal',
    dimensions: '80 mm Roll Continuous',
    description: 'Standard 80mm commercial thermal printers (Epson, Star, Sunmi, Xprinter) with high scan clarity.',
    pageCss: '@page { size: 80mm auto; margin: 0; }',
    itemCss: 'width: 72mm; margin: 0 auto 8mm auto; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4mm 0;',
    qrSize: 190,
  },
  shelf_tag: {
    id: 'shelf_tag',
    name: 'Mini Shelf / Asset Tag',
    badge: 'Compact',
    dimensions: '30 × 20 mm',
    description: 'Miniature label for shelf edges, electronic asset tags, product barcodes, and small item standees.',
    pageCss: '@page { size: 30mm 20mm landscape; margin: 0; }',
    itemCss: 'width: 30mm; height: 20mm; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; padding: 1mm;',
    qrSize: 55,
  },
};

/**
 * Clean Print engine supporting custom label sizes and thermal receipt rolls
 */
export async function printLabelPresetBatch(
  links: Array<{ slug: string; title?: string }>,
  presetType: LabelPresetType = 'a4_grid',
  batchName: string = 'batch'
): Promise<void> {
  const preset = LABEL_PRESETS[presetType] || LABEL_PRESETS.a4_grid;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Generate data URLs for all QRs in the batch
  const qrDataUrls: Array<{ slug: string; last4: string; dataUrl: string }> = [];
  for (const link of links) {
    const fullUrl = `${baseUrl}/r/${link.slug}`;
    const dataUrl = await QRCode.toDataURL(fullUrl, {
      width: preset.qrSize * 2,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
    qrDataUrls.push({
      slug: link.slug,
      last4: getLast4Letters(link.slug),
      dataUrl,
    });
  }

  let htmlItems = '';
  if (presetType === 'business_card') {
    htmlItems = qrDataUrls
      .map(
        (item) => `
      <div class="label-item">
        <img src="${item.dataUrl}" style="width: ${preset.qrSize}px; height: ${preset.qrSize}px;" />
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="font-size: 11px; text-transform: uppercase; font-family: sans-serif; letter-spacing: 1px; color: #555;">Scan to Connect</div>
          <div style="font-size: 26px; font-weight: 900; font-family: monospace; letter-spacing: 3px; color: #000; margin-top: 4px;">${item.last4}</div>
          <div style="font-size: 9px; font-family: monospace; color: #888; margin-top: 2px;">/r/${item.slug}</div>
        </div>
      </div>
    `
      )
      .join('');
  } else if (presetType === 'shelf_tag') {
    htmlItems = qrDataUrls
      .map(
        (item) => `
      <div class="label-item">
        <img src="${item.dataUrl}" style="width: ${preset.qrSize}px; height: ${preset.qrSize}px;" />
        <div style="font-size: 10px; font-weight: 900; font-family: monospace; letter-spacing: 1px; color: #000;">${item.last4}</div>
      </div>
    `
      )
      .join('');
  } else if (presetType === 'a4_grid') {
    htmlItems = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12mm 8mm; width: 100%;">
        ${qrDataUrls
          .map(
            (item) => `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed #cbd5e1; padding: 8px 4px; border-radius: 8px; box-sizing: border-box;">
            <img src="${item.dataUrl}" style="width: 140px; height: 140px; display: block;" />
            <div style="font-size: 18px; font-weight: 900; font-family: monospace; letter-spacing: 2px; color: #000; margin-top: 4px;">${item.last4}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  } else {
    // Thermal roll & Square sticker
    htmlItems = qrDataUrls
      .map(
        (item) => `
      <div class="label-item">
        <img src="${item.dataUrl}" style="width: ${preset.qrSize}px; height: ${preset.qrSize}px; display: block;" />
        <div style="font-size: 20px; font-weight: 900; font-family: monospace; letter-spacing: 2px; color: #000; margin-top: 4px;">${item.last4}</div>
      </div>
    `
      )
      .join('');
  }

  const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print - ${batchName} (${preset.name})</title>
  <style>
    ${preset.pageCss}
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .label-item {
      ${preset.itemCss}
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  ${htmlItems}
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(printHtml);
    doc.close();
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 3000);
      }, 300);
    };
  } else {
    window.print();
  }
}
