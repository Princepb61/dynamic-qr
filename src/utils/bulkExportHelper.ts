import JSZip from 'jszip';
import QRCode from 'qrcode';
import { LinkRecord, MockupCategory } from '../types';

export interface ExportProgress {
  current: number;
  total: number;
  stage: string;
}

export const MOCKUP_LABELS: Record<MockupCategory, { label: string; folder: string; color: string; icon: string }> = {
  google_review: {
    label: 'Google Review Stand',
    folder: 'Google_Reviews',
    color: 'amber',
    icon: '⭐',
  },
  digital_menu: {
    label: 'Digital Menu Card',
    folder: 'Digital_Menu',
    color: 'emerald',
    icon: '🍽️',
  },
  whatsapp_order: {
    label: 'WhatsApp Placard',
    folder: 'WhatsApp_Placards',
    color: 'teal',
    icon: '💬',
  },
  instagram_follow: {
    label: 'Instagram Card',
    folder: 'Instagram_Cards',
    color: 'pink',
    icon: '📸',
  },
  facebook_community: {
    label: 'Facebook Stand',
    folder: 'Facebook_Stands',
    color: 'indigo',
    icon: '👥',
  },
  smart_hub: {
    label: 'Multi-Action Smart Hub',
    folder: 'Smart_Hub',
    color: 'purple',
    icon: '🎛️',
  },
  custom: {
    label: 'General Stand',
    folder: 'General_Stands',
    color: 'neutral',
    icon: '🏷️',
  },
};

/**
 * Generate high-resolution transparent 1024x1024 PNG data URL
 */
export async function generateHighResPng(url: string, transparentBg: boolean = true): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 1024,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000000',
      light: transparentBg ? '#00000000' : '#ffffff',
    },
  });
}

/**
 * Generate lossless scalable vector SVG string
 */
export async function generateVectorSvg(url: string, transparentBg: boolean = true): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000000',
      light: transparentBg ? '#00000000' : '#ffffff',
    },
  });
}

/**
 * Convert base64 data URL to raw binary Uint8Array
 */
function dataUrlToBinary(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Build and download production-grade ZIP archive organized by physical mockup category
 */
export async function exportBulkPrintShopZip(
  links: LinkRecord[],
  options: {
    baseUrl?: string;
    includePng?: boolean;
    includeSvg?: boolean;
    includeCsv?: boolean;
    includeProofSheet?: boolean;
    transparentBackground?: boolean;
    onProgress?: (progress: ExportProgress) => void;
  } = {}
): Promise<Blob> {
  const {
    baseUrl = window.location.origin,
    includePng = true,
    includeSvg = true,
    includeCsv = true,
    includeProofSheet = true,
    transparentBackground = true,
    onProgress,
  } = options;

  const zip = new JSZip();
  const total = links.length;

  const csvRows: string[][] = [
    [
      'Sequence',
      'Stand_Or_Table_No',
      'Target_Mockup',
      'Folder_Name',
      'Title',
      'Slug',
      'Short_URL',
      'Real_Destination',
      'Batch_Name',
      'PNG_File',
      'SVG_File',
    ],
  ];

  const proofItems: Array<{
    seq: number;
    stand: string;
    mockup: string;
    folder: string;
    title: string;
    slug: string;
    shortUrl: string;
    qrSvg: string;
  }> = [];

  for (let i = 0; i < total; i++) {
    const link = links[i];
    const seq = i + 1;
    const padSeq = String(seq).padStart(3, '0');
    const stand = link.standNumber?.trim() || `Stand-${padSeq}`;
    const mockupCat: MockupCategory = link.targetMockup || 'google_review';
    const mockupMeta = MOCKUP_LABELS[mockupCat] || MOCKUP_LABELS.google_review;
    const folderName = mockupMeta.folder;

    const shortUrl = `${baseUrl}/r/${link.slug}`;
    const cleanStandSlug = stand.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileBase = `${cleanStandSlug}_[${folderName}]_${link.slug}`;
    const pngName = `${fileBase}.png`;
    const svgName = `${fileBase}.svg`;

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        stage: `Generating QR assets for ${stand} (${folderName})...`,
      });
    }

    const mockupFolder = zip.folder(folderName);

    // 1. Vector SVG
    let svgContent = '';
    if (includeSvg || includeProofSheet) {
      svgContent = await generateVectorSvg(shortUrl, transparentBackground);
      if (includeSvg && mockupFolder) {
        mockupFolder.file(svgName, svgContent);
      }
    }

    // 2. High-Res Transparent PNG
    if (includePng && mockupFolder) {
      const pngDataUrl = await generateHighResPng(shortUrl, transparentBackground);
      const pngBytes = dataUrlToBinary(pngDataUrl);
      mockupFolder.file(pngName, pngBytes);
    }

    // CSV Manifest line
    csvRows.push([
      String(seq),
      `"${stand.replace(/"/g, '""')}"`,
      `"${mockupMeta.label}"`,
      `"${folderName}"`,
      `"${(link.title || '').replace(/"/g, '""')}"`,
      `"${link.slug}"`,
      `"${shortUrl}"`,
      `"${(link.destinationUrl || '').replace(/"/g, '""')}"`,
      `"${(link.batchName || 'General').replace(/"/g, '""')}"`,
      `"${pngName}"`,
      `"${svgName}"`,
    ]);

    if (includeProofSheet) {
      proofItems.push({
        seq,
        stand,
        mockup: mockupMeta.label,
        folder: folderName,
        title: link.title || `QR Code (${link.slug})`,
        slug: link.slug,
        shortUrl,
        qrSvg: svgContent,
      });
    }
  }

  // Add CSV Manifest to root of ZIP
  if (includeCsv) {
    const csvContent = csvRows.map((r) => r.join(',')).join('\r\n');
    zip.file('manifest_print_shop.csv', csvContent);
  }

  // Add Standalone HTML Proofing Sheet
  if (includeProofSheet && proofItems.length > 0) {
    const proofHtml = generateProofingSheetHtml(proofItems);
    zip.file('print_proofing_sheet.html', proofHtml);
  }

  if (onProgress) {
    onProgress({
      current: total,
      total,
      stage: 'Compressing production ZIP archive...',
    });
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return blob;
}

/**
 * HTML proofing sheet that opens in any browser for visual layout review and direct physical printing
 */
function generateProofingSheetHtml(
  items: Array<{
    seq: number;
    stand: string;
    mockup: string;
    folder: string;
    title: string;
    slug: string;
    shortUrl: string;
    qrSvg: string;
  }>
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TapLocal Print Shop Proofing Sheet</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; }
    .header { margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header h1 { font-size: 20px; font-weight: 800; }
    .header p { font-size: 12px; color: #64748b; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .card { background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 16px; text-align: center; page-break-inside: avoid; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 9999px; background: #f1f5f9; color: #475569; margin-bottom: 8px; }
    .stand-no { font-size: 15px; font-weight: 800; margin-bottom: 4px; }
    .title { font-size: 12px; color: #334155; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .qr-box { width: 140px; height: 140px; margin: 0 auto 12px auto; display: flex; align-items: center; justify-content: center; }
    .qr-box svg { width: 100%; height: 100%; }
    .url { font-family: monospace; font-size: 10px; color: #64748b; word-break: break-all; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .header { display: none; }
      .grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .card { border: 1px solid #94a3b8; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>TapLocal Bulk Print Shop Proofing Sheet</h1>
      <p>Total QRs: ${items.length} · Formatted for acrylic stands, menu tents, and laser engraving mockups.</p>
    </div>
    <button onclick="window.print()" style="padding: 8px 16px; background: #0f172a; color: #ffffff; font-weight: 600; font-size: 12px; border-radius: 8px; border: none; cursor: pointer;">
      Print Sheet / Save PDF
    </button>
  </div>

  <div class="grid">
    ${items
      .map(
        (it) => `
      <div class="card">
        <span class="badge">${escapeProofHtml(it.mockup)}</span>
        <div class="stand-no">${escapeProofHtml(it.stand)}</div>
        <div class="title">${escapeProofHtml(it.title)}</div>
        <div class="qr-box">${it.qrSvg}</div>
        <div class="url">${escapeProofHtml(it.shortUrl)}</div>
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>`;
}

function escapeProofHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
