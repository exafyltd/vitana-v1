/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — read a contacts
 * file (.vcf), MIRRORED from the web `src/lib/vcard.ts` (VTID-05058): vCard
 * 3.0 (iPhone, Android) and 2.1 with QUOTED-PRINTABLE names; only the name,
 * the e-mail addresses and the phone numbers are kept. The web module types
 * its result with `connected-apps-client` (class B), so it is mirrored here,
 * not moved into core. Hermes has `TextEncoder` and `atob` but no
 * `TextDecoder`, so UTF-8 / Latin-1 bytes are decoded by hand.
 */
import type { PhoneContact } from '../../../ports/inbox';

/** Largest file read (a 5,000-contact export with photos stripped is ~2 MB). */
export const MAX_VCF_BYTES = 10 * 1024 * 1024;

/** UTF-8 bytes → string (invalid sequences become U+FFFD). */
export function utf8Decode(bytes: ArrayLike<number>): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let cp = 0xfffd;
    let n = 1;
    if (b < 0x80) cp = b;
    else if (b >= 0xc2 && b < 0xe0 && i + 1 < bytes.length) {
      cp = ((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
      n = 2;
    } else if (b >= 0xe0 && b < 0xf0 && i + 2 < bytes.length) {
      cp = ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f);
      n = 3;
    } else if (b >= 0xf0 && b < 0xf5 && i + 3 < bytes.length) {
      cp = ((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f);
      n = 4;
    }
    out += String.fromCodePoint(cp);
    i += n;
  }
  return out;
}

/** A picked file's base64 → its text (UTF-8, a leading BOM dropped). */
export function base64Text(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return utf8Decode(bytes).replace(/^\uFEFF/, '');
}

function unfold(text: string): string[] {
  const raw = text.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else if (out.length > 0 && /ENCODING=QUOTED-PRINTABLE/i.test(out[out.length - 1]) && out[out.length - 1].endsWith('=')) {
      out[out.length - 1] = out[out.length - 1].slice(0, -1) + line;
    } else {
      out.push(line);
    }
  }
  return out;
}

function decodeQuotedPrintable(value: string, charset: string): string {
  const bytes: number[] = [];
  const enc = new TextEncoder();
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '=' && /^[0-9A-Fa-f]{2}$/.test(value.slice(i + 1, i + 3))) {
      bytes.push(parseInt(value.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...enc.encode(ch));
    }
  }
  if (/^(iso-8859-1|latin1|windows-1252)$/i.test(charset)) return String.fromCharCode(...bytes);
  return utf8Decode(bytes);
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\([,;\\])/g, '$1')
    .trim();
}

function parseLine(line: string): { name: string; params: string; value: string } | null {
  const colon = line.indexOf(':');
  if (colon <= 0) return null;
  const [rawName, ...params] = line.slice(0, colon).split(';');
  const name = (rawName.split('.').pop() as string).toUpperCase();
  const paramStr = params.join(';');
  let value = line.slice(colon + 1);
  if (/ENCODING=QUOTED-PRINTABLE/i.test(paramStr)) value = decodeQuotedPrintable(value, /CHARSET=([^;:]+)/i.exec(paramStr)?.[1] ?? 'utf-8');
  return { name, params: paramStr, value };
}

/** Every contact in a .vcf file that has a name, an e-mail or a phone number. */
export function parseVCards(text: string): PhoneContact[] {
  const contacts: PhoneContact[] = [];
  let current: { fn: string; n: string; emails: string[]; phones: string[] } | null = null;
  for (const line of unfold(text)) {
    const prop = parseLine(line.trim());
    if (!prop) continue;
    if (prop.name === 'BEGIN' && /^VCARD$/i.test(prop.value.trim())) {
      current = { fn: '', n: '', emails: [], phones: [] };
      continue;
    }
    if (!current) continue;
    switch (prop.name) {
      case 'FN':
        current.fn = unescapeText(prop.value);
        break;
      case 'N': {
        const [family = '', given = '', middle = ''] = prop.value.split(/(?<!\\);/).map(unescapeText);
        current.n = [given, middle, family].filter(Boolean).join(' ');
        break;
      }
      case 'TEL': {
        const v = prop.value.replace(/^tel:/i, '').trim();
        if (v) current.phones.push(v);
        break;
      }
      case 'EMAIL': {
        const v = prop.value.replace(/^mailto:/i, '').trim();
        if (v) current.emails.push(v);
        break;
      }
      case 'END':
        if (/^VCARD$/i.test(prop.value.trim())) {
          const name = current.fn || current.n;
          if (name || current.emails.length || current.phones.length) {
            contacts.push({ name: name || current.emails[0] || current.phones[0], emails: Array.from(new Set(current.emails)), phones: Array.from(new Set(current.phones)) });
          }
          current = null;
        }
        break;
      default:
        break;
    }
  }
  return contacts;
}
