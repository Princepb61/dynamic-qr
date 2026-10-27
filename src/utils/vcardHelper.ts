import { VCardData, WifiData } from '../types';

/**
 * Generate standard vCard 3.0 string
 */
export function generateVCardString(data: VCardData): string {
  const nameParts = data.fullName.trim().split(' ');
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : data.fullName.trim();

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${data.fullName.trim()}`,
  ];

  if (data.organization?.trim()) {
    lines.push(`ORG:${data.organization.trim()}`);
  }
  if (data.title?.trim()) {
    lines.push(`TITLE:${data.title.trim()}`);
  }
  if (data.phone?.trim()) {
    lines.push(`TEL;TYPE=CELL,VOICE:${data.phone.trim()}`);
  }
  if (data.email?.trim()) {
    lines.push(`EMAIL;TYPE=INTERNET,PREF:${data.email.trim()}`);
  }
  if (data.website?.trim()) {
    let site = data.website.trim();
    if (!site.startsWith('http://') && !site.startsWith('https://')) {
      site = 'https://' + site;
    }
    lines.push(`URL:${site}`);
  }
  if (data.address?.trim()) {
    lines.push(`ADR;TYPE=WORK:;;${data.address.trim()};;;;`);
  }
  if (data.note?.trim()) {
    lines.push(`NOTE:${data.note.trim()}`);
  } else {
    lines.push('NOTE:Saved via TapLocal Dynamic QR Contact');
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

/**
 * Trigger immediate client-side download of a .vcf file
 */
export function downloadVCard(data: VCardData, filename = 'contact.vcf') {
  const vcf = generateVCardString(data);
  const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.vcf') ? filename : `${filename}.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format WiFi QR standard payload
 * Standard syntax: WIFI:S:<ssid>;T:<WPA|WEP|nopass>;P:<password>;H:<true|false>;;
 */
export function generateWifiString(data: WifiData): string {
  const ssid = (data.ssid || '').trim();
  const type = data.encryption || 'WPA';
  const pass = data.password || '';
  const hidden = data.hidden ? 'true' : 'false';

  // Escape special chars according to spec (\, ;, :, ")
  const escapeWifi = (str: string) => str.replace(/([\\;,:"])/g, '\\$1');

  if (type === 'nopass') {
    return `WIFI:S:${escapeWifi(ssid)};T:nopass;H:${hidden};;`;
  }
  return `WIFI:S:${escapeWifi(ssid)};T:${type};P:${escapeWifi(pass)};H:${hidden};;`;
}
