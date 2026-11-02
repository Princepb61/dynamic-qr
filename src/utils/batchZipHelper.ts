import JSZip from 'jszip';
import QRCode from 'qrcode';
import { LinkRecord } from '../types';
import { getLast4Letters } from './a4QrHelper';

export interface BatchZipProgress {
  percent: number;
  current: number;
  total: number;
  statusText: string;
}

/**
 * Renders a crisp 1024x1140 PNG image of the QR code with only the bold link code printed underneath.
 * NOTE: As requested by the user, NO short link or URL is printed on the canvas.
 */
export async function renderQRCardBlob(link: LinkRecord, originUrl: string): Promise<Blob> {
  const code = getLast4Letters(link.slug).toUpperCase();
  const targetUrl = `${originUrl}/r/${link.slug}`;

  // Generate high-resolution QR code image
  const qrDataUrl = await QRCode.toDataURL(targetUrl, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 880,
    color: {
      dark: link.qrSettings?.colorDark || '#0f172a',
      light: '#ffffff',
    },
  });

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1140;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context'));
          return;
        }

        // 1. Crisp white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Draw QR code centered in the upper section
        const qrSize = 880;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 60;
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        // 3. Subtle separator divider line
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(120, qrY + qrSize + 24);
        ctx.lineTo(canvas.width - 120, qrY + qrSize + 24);
        ctx.stroke();

        // 4. Print prominent Link Code only (NO URL, as requested)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Primary bold link code
        ctx.font = 'bold 56px ui-monospace, "SF Mono", "JetBrains Mono", Consolas, monospace';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(`CODE: #${code}`, canvas.width / 2, 1030);

        // Optional subtle title/label if assigned
        if (link.title && !link.title.toLowerCase().startsWith('dynamic qr') && !link.title.toLowerCase().startsWith('reserved qr')) {
          ctx.font = '600 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#64748b';
          const truncated = link.title.length > 36 ? link.title.slice(0, 36) + '...' : link.title;
          ctx.fillText(truncated, canvas.width / 2, 1086);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob conversion failed'));
          }
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = qrDataUrl;
  });
}

/**
 * Packages an entire batch of QR codes into a ZIP archive with individual PNG files.
 * Each PNG is named [LINK-CODE]_[TITLE].png (e.g. A1B2_Table_01.png).
 */
export async function exportBatchQRsAsZip(
  batchName: string,
  links: LinkRecord[],
  onProgress?: (progress: BatchZipProgress) => void
): Promise<void> {
  if (!links || links.length === 0) {
    throw new Error('No QR links found in this batch to export.');
  }

  const zip = new JSZip();
  const total = links.length;
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://taplocal.in';

  // Sanitized folder/zip name
  const cleanBatchName = (batchName || 'Batch')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');

  const folder = zip.folder(cleanBatchName) || zip;

  for (let i = 0; i < total; i++) {
    const link = links[i];
    const code = getLast4Letters(link.slug).toUpperCase();

    if (onProgress) {
      onProgress({
        percent: Math.round(((i + 0.2) / total) * 100),
        current: i + 1,
        total,
        statusText: `Rendering QR ${i + 1} of ${total} (#${code})...`,
      });
    }

    const blob = await renderQRCardBlob(link, originUrl);

    // Sanitize title for filename
    const cleanTitle = (link.title || 'QR')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 40);

    const filename = `${code}_${cleanTitle}.png`;
    folder.file(filename, blob);

    if (onProgress) {
      onProgress({
        percent: Math.round(((i + 1) / total) * 100),
        current: i + 1,
        total,
        statusText: `Rendered ${i + 1} of ${total} (#${code})`,
      });
    }
  }

  if (onProgress) {
    onProgress({
      percent: 99,
      current: total,
      total,
      statusText: 'Compressing PNGs into ZIP archive...',
    });
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Trigger browser download
  const downloadUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${cleanBatchName}_QR_Codes.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up object URL after a short delay
  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 10000);

  if (onProgress) {
    onProgress({
      percent: 100,
      current: total,
      total,
      statusText: `Downloaded ${cleanBatchName}_QR_Codes.zip (${total} PNGs)`,
    });
  }
}
