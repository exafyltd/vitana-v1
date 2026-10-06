/**
 * VTID-04926: the one @mention engine every composer and renderer shares —
 * group chat, posts and post comments.
 *
 * A mention is stored next to the text as `{ user_id, display_name }`; the text
 * itself carries `@DisplayName`. Everything here is pure string logic so the
 * three surfaces behave identically and can be unit-tested without a DOM.
 */

export interface Mention {
  user_id: string;
  display_name: string;
}

export interface MentionToken {
  /** What the member typed after the `@` (may hold one inner space). */
  query: string;
  /** Index of the `@` in the text. */
  start: number;
}

/** Longest query we keep the picker open for. */
export const MAX_MENTION_QUERY = 40;
/** Hard cap on mentions attached to one message / post / comment. */
export const MAX_MENTIONS = 20;

const WORD_CHAR = /[\p{L}\p{N}_]/u;

/**
 * The `@token` the caret is currently inside, or null.
 *
 * Rules (plan VTID-04926, F3):
 *  - the `@` must sit at the start of the text or after a non-word character
 *    (space, emoji, punctuation) — `anna@example.com` never triggers;
 *  - the query may hold ONE inner space, so "@Stefan Eh" keeps matching a
 *    two-word name; a second space, a newline or more than 40 characters ends it;
 *  - the caller additionally closes the picker when a spaced query has no
 *    candidates (see `shouldKeepOpen`).
 */
export function findActiveMentionToken(text: string, caret: number): MentionToken | null {
  let spaces = 0;
  for (let i = caret - 1; i >= 0 && caret - i <= MAX_MENTION_QUERY + 1; i -= 1) {
    const ch = text[i];
    if (ch === "@") {
      const prev = i > 0 ? text[i - 1] : "";
      if (i > 0 && WORD_CHAR.test(prev)) return null;
      const query = text.slice(i + 1, caret);
      // "@" followed by a space is not a mention start.
      if (query.startsWith(" ")) return null;
      return { query, start: i };
    }
    if (ch === "\n" || ch === "\r") return null;
    if (/\s/.test(ch)) {
      spaces += 1;
      if (spaces > 1) return null;
    }
  }
  return null;
}

/**
 * Whether the picker should stay open for this token and candidate list.
 * A query that already contains a space but matches nobody is ordinary text
 * ("@Stefan hallo") — close instead of showing "no people found" forever.
 */
export function shouldKeepOpen(token: MentionToken | null, candidateCount: number, isLoading: boolean): boolean {
  if (!token || token.query.length < 1) return false;
  if (token.query.includes(" ") && !isLoading && candidateCount === 0) return false;
  return true;
}

/**
 * True when the token is just an already-picked mention (plus the space we
 * inserted after it) — the picker must not re-open on "@Anna |".
 */
export function isPickedMentionToken(token: MentionToken, mentions: Mention[]): boolean {
  return mentions.some((m) => {
    const name = m.display_name.trim();
    return token.query === name || token.query.startsWith(`${name} `);
  });
}

/** Replace the active token with `@Name ` and return the new text + caret. */
export function insertMention(
  text: string,
  token: MentionToken,
  caret: number,
  candidate: Mention,
): { text: string; caret: number } {
  const before = text.slice(0, token.start);
  const after = text.slice(caret);
  const insert = `@${candidate.display_name} `;
  // Don't double the space if the member had already typed one after the token.
  const rest = after.startsWith(" ") ? after.slice(1) : after;
  return { text: before + insert + rest, caret: before.length + insert.length };
}

/** Add a mention once (by user_id). */
export function addMention(mentions: Mention[], candidate: Mention): Mention[] {
  if (mentions.some((m) => m.user_id === candidate.user_id)) return mentions;
  return [...mentions, { user_id: candidate.user_id, display_name: candidate.display_name }];
}

/**
 * Keep only well-formed mentions whose `@display_name` still appears in the
 * text, deduped by user_id and capped. Deleting a tagged name from the text
 * therefore also un-tags (and never notifies) that member.
 */
export function pruneMentions(text: string, mentions: Mention[] | null | undefined): Mention[] {
  const out: Mention[] = [];
  const seen = new Set<string>();
  for (const m of mentions ?? []) {
    if (!m || typeof m.user_id !== "string" || typeof m.display_name !== "string") continue;
    const name = m.display_name.trim();
    if (!m.user_id || !name || seen.has(m.user_id)) continue;
    if (!text.includes(`@${name}`)) continue;
    seen.add(m.user_id);
    out.push({ user_id: m.user_id, display_name: name });
    if (out.length >= MAX_MENTIONS) break;
  }
  return out;
}

export type MentionSegment =
  | { type: "text"; text: string }
  | { type: "mention"; text: string; mention: Mention };

/**
 * Split text into plain and mention segments. Longest name first so
 * "@Anna Maria" wins over "@Anna"; a name only matches when it is not glued
 * to further letters ("@Annabel" is not "@Anna").
 */
export function splitMentionSegments(text: string, mentions: Mention[] | null | undefined): MentionSegment[] {
  if (!text) return [];
  const valid = (mentions ?? []).filter(
    (m) => m && typeof m.user_id === "string" && m.user_id && typeof m.display_name === "string" && m.display_name.trim(),
  );
  if (valid.length === 0) return [{ type: "text", text }];
  const sorted = [...valid].sort((a, b) => b.display_name.length - a.display_name.length);

  const segments: MentionSegment[] = [];
  let buf = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "@" && (i === 0 || !WORD_CHAR.test(text[i - 1]))) {
      const match = sorted.find((m) => {
        const token = `@${m.display_name.trim()}`;
        if (!text.startsWith(token, i)) return false;
        const next = text[i + token.length];
        return next === undefined || !WORD_CHAR.test(next);
      });
      if (match) {
        if (buf) {
          segments.push({ type: "text", text: buf });
          buf = "";
        }
        const name = match.display_name.trim();
        segments.push({ type: "mention", text: `@${name}`, mention: { user_id: match.user_id, display_name: name } });
        i += 1 + name.length;
        continue;
      }
    }
    buf += text[i];
    i += 1;
  }
  if (buf) segments.push({ type: "text", text: buf });
  return segments;
}

/** Case- and accent-insensitive form used to filter a local roster. */
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Filter a local candidate list (a group roster) for a query: a candidate
 * matches when any word of its name — or the whole name — starts with the
 * query. "ste" finds "Stefan Ehlke"; "ehl" finds him too.
 */
export function filterLocalCandidates<T extends Mention>(candidates: T[], query: string, limit = 8): T[] {
  const q = fold(query.trim());
  if (!q) return [];
  const starts: T[] = [];
  const wordStarts: T[] = [];
  for (const c of candidates) {
    const name = fold(c.display_name || "");
    if (!name) continue;
    if (name.startsWith(q)) starts.push(c);
    else if (name.split(/\s+/).some((w) => w.startsWith(q))) wordStarts.push(c);
  }
  return [...starts, ...wordStarts].slice(0, limit);
}
