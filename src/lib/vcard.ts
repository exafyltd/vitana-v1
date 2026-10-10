/**
 * VTID-05058 — read a contacts file (.vcf) exported from a phone.
 *
 * iPhone (Contacts → Lists → All Contacts → Export) and Android (Contacts →
 * Fix & manage → Export to file) both write vCard 3.0; older Android and
 * feature phones write 2.1 with QUOTED-PRINTABLE names. Only the name, the
 * e-mail addresses and the phone numbers are kept — nothing else leaves the
 * phone.
 */

import type { DeviceContact } from "@/lib/connected-apps-client";

/** Largest file we read (a 5,000-contact export with photos stripped is ~2 MB). */
export const MAX_VCF_BYTES = 10 * 1024 * 1024;

/** Joins folded lines (RFC 6350 §3.2) and 2.1 quoted-printable soft breaks. */
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else if (out.length > 0 && /ENCODING=QUOTED-PRINTABLE/i.test(out[out.length - 1]) && out[out.length - 1].endsWith("=")) {
      out[out.length - 1] = out[out.length - 1].slice(0, -1) + line;
    } else {
      out.push(line);
    }
  }
  return out;
}

function decodeQuotedPrintable(value: string, charset: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "=" && /^[0-9A-Fa-f]{2}$/.test(value.slice(i + 1, i + 3))) {
      bytes.push(parseInt(value.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...new TextEncoder().encode(ch));
    }
  }
  try {
    return new TextDecoder(charset || "utf-8").decode(new Uint8Array(bytes));
  } catch {
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  }
}

function unescapeText(value: string): string {
  return value.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

interface Property {
  name: string;
  params: string;
  value: string;
}

function parseLine(line: string): Property | null {
  const colon = line.indexOf(":");
  if (colon <= 0) return null;
  const head = line.slice(0, colon);
  const [rawName, ...params] = head.split(";");
  // "item1.TEL" → "TEL" (Apple groups a number with its custom label).
  const name = rawName.split(".").pop()!.toUpperCase();
  const paramStr = params.join(";");
  let value = line.slice(colon + 1);
  if (/ENCODING=QUOTED-PRINTABLE/i.test(paramStr)) {
    const charset = /CHARSET=([^;:]+)/i.exec(paramStr)?.[1] ?? "utf-8";
    value = decodeQuotedPrintable(value, charset);
  }
  return { name, params: paramStr, value };
}

/** Every contact in a .vcf file that has a name, an e-mail or a phone number. */
export function parseVCards(text: string): DeviceContact[] {
  const contacts: DeviceContact[] = [];
  let current: { fn: string; n: string; emails: string[]; phones: string[] } | null = null;
  for (const line of unfold(text)) {
    const prop = parseLine(line.trim());
    if (!prop) continue;
    if (prop.name === "BEGIN" && /^VCARD$/i.test(prop.value.trim())) {
      current = { fn: "", n: "", emails: [], phones: [] };
      continue;
    }
    if (!current) continue;
    switch (prop.name) {
      case "FN":
        current.fn = unescapeText(prop.value);
        break;
      case "N": {
        // N:Family;Given;Middle;Prefix;Suffix
        const [family = "", given = "", middle = ""] = prop.value.split(/(?<!\\);/).map(unescapeText);
        current.n = [given, middle, family].filter(Boolean).join(" ");
        break;
      }
      case "TEL": {
        const v = prop.value.replace(/^tel:/i, "").trim();
        if (v) current.phones.push(v);
        break;
      }
      case "EMAIL": {
        const v = prop.value.replace(/^mailto:/i, "").trim();
        if (v) current.emails.push(v);
        break;
      }
      case "END":
        if (/^VCARD$/i.test(prop.value.trim())) {
          const name = current.fn || current.n;
          if (name || current.emails.length || current.phones.length) {
            contacts.push({
              name: name || current.emails[0] || current.phones[0],
              emails: Array.from(new Set(current.emails)),
              phones: Array.from(new Set(current.phones)),
            });
          }
          current = null;
        }
        break;
    }
  }
  return contacts;
}
