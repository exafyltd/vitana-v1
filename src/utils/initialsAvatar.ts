// Premium initials/monogram avatar.
//
// Used as the LAST-resort fallback when there is no uploaded photo, no
// imported avatar, and the Vertex AI generation has not (yet) populated a
// `profile_image_url`. The output is a deterministic data: URL based on the
// user's stable `fallback_seed` so the same user always gets the same colors.

const PALETTES: Array<[string, string]> = [
  ["#0F172A", "#3B82F6"], // graphite -> blue
  ["#7C2D12", "#F59E0B"], // burgundy -> amber
  ["#064E3B", "#10B981"], // forest  -> emerald
  ["#4C1D95", "#A855F7"], // violet  -> purple
  ["#831843", "#F472B6"], // wine    -> rose
  ["#1E3A8A", "#22D3EE"], // navy    -> cyan
  ["#365314", "#84CC16"], // moss    -> lime
  ["#7F1D1D", "#FB923C"], // brick   -> orange
];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function deriveInitials(name: string | null | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface InitialsAvatarOptions {
  size?: number;
  rounded?: boolean;
}

/**
 * Generate a premium gradient initials avatar as a data URL. Deterministic
 * for a given seed, so re-renders are stable and there is no flicker.
 */
export function buildInitialsAvatar(
  name: string | null | undefined,
  seed: string | null | undefined,
  opts: InitialsAvatarOptions = {},
): string {
  const size = opts.size ?? 256;
  const initials = deriveInitials(name);
  const palette = PALETTES[hash(seed ?? name ?? "maxina") % PALETTES.length];
  const angle = (hash((seed ?? "") + ":a") % 360);
  const radius = opts.rounded === false ? 0 : Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.42);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<defs>` +
        `<linearGradient id="g" gradientTransform="rotate(${angle})">` +
          `<stop offset="0%" stop-color="${palette[0]}"/>` +
          `<stop offset="100%" stop-color="${palette[1]}"/>` +
        `</linearGradient>` +
      `</defs>` +
      `<rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#g)"/>` +
      `<text x="50%" y="50%" dy="0.36em" text-anchor="middle" ` +
        `font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" ` +
        `font-weight="700" font-size="${fontSize}" fill="#FFFFFF" fill-opacity="0.95">` +
        `${escapeSvg(initials)}` +
      `</text>` +
    `</svg>`;

  // encodeURIComponent keeps it safe for both browser and Node renderers.
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeSvg(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!)
  );
}
