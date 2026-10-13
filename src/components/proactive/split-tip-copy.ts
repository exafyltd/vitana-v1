/** VTID-05143 — headline/subtext split for the "Did you know" card (DidYouKnowCard). */
/**
 * The server sends one `card_copy` string. Its first sentence becomes the
 * headline and the rest the subtext, so the tip reads like every other card;
 * a single-sentence tip is the headline alone. Works for Latin, CJK and
 * Arabic sentence ends.
 */
export function splitTipCopy(copy: string): { headline: string; subtext: string } {
  const text = copy.trim();
  const m = /^(.+?[.!?。！？؟])\s*(\S[\s\S]*)$/u.exec(text);
  if (!m) return { headline: text, subtext: '' };
  return { headline: m[1], subtext: m[2].trim() };
}
