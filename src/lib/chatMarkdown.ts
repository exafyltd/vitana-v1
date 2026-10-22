/**
 * VTID-05193 — a SAFE subset of Markdown for Vitana's chat replies.
 *
 * The gateway text brain answers in Markdown; the Messenger bubble used to show
 * it raw (`**"Did You Know"**`). This pure helper turns a reply into a small
 * token tree that the bubble renders as React nodes — never as HTML, never via
 * `dangerouslySetInnerHTML`.
 *
 * Supported: `**bold**` / `__bold__`, `*italic*` / `_italic_` (word-boundary
 * aware, so `snake_case` and `2*3*4` stay literal), `` `code` ``, line-start
 * `- ` / `* ` / `• ` bullets, `1. ` numbered items and `#`–`###` headings
 * (a bold line). One level of nesting (italic in bold and vice versa); deeper,
 * overlapping, unbalanced or unknown markers stay literal text. No HTML, no
 * `[x](y)` links, no images, no tables.
 *
 * Bare URLs are atomic (R3): they are found first, with the same regex as the
 * bubble's linkify, and each becomes one text leaf the emphasis/code parser
 * never splits, so `https://example.com/__preview__` stays one whole link.
 *
 * No React import — the bubble owns rendering.
 */

export type MdInline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: MdInline[] }
  | { type: 'em'; children: MdInline[] }
  | { type: 'code'; text: string };

export type MdBlock =
  | { type: 'paragraph'; children: MdInline[] }
  | { type: 'heading'; level: 1 | 2 | 3; children: MdInline[] }
  | { type: 'list'; ordered: boolean; start: number; items: MdInline[][] };

/** Same URL regex as `renderLinkedText` in MessageBubble.tsx. */
const URL_REGEX = /https?:\/\/[^\s<]+/gi;
/** Same trailing punctuation the bubble's linkify trims off a URL. */
const TRAILING_PUNCTUATION = '.,!?;:)]}';
const EMPHASIS_CHARS = '*_';
const DELIMITER_CHARS = '*_`';

const BULLET_LINE = /^\s*[-*•]\s+(.*)$/;
const NUMBERED_LINE = /^\s*(\d{1,9})\.\s+(.*)$/;
const HEADING_LINE = /^\s{0,3}(#{1,3})\s+(.*?)\s*#*\s*$/;

const isWordChar = (ch: string | undefined): boolean => !!ch && /[\p{L}\p{N}]/u.test(ch);
const isSpace = (ch: string | undefined): boolean => ch === undefined || /\s/.test(ch);

/**
 * A URL match greedily swallows markers that close around it
 * (`**https://x.com**`). Peel a trailing run of `*`/`_`/`` ` `` off the URL —
 * but only when the URL itself does not use that character, so
 * `https://example.com/*draft*` and `/__preview__` stay whole.
 */
function urlLength(raw: string): number {
  let p = raw.length;
  while (p > 0 && TRAILING_PUNCTUATION.includes(raw[p - 1])) p--;
  let d = p;
  while (d > 0 && DELIMITER_CHARS.includes(raw[d - 1])) {
    const c = raw[d - 1];
    let runStart = d;
    while (runStart > 0 && raw[runStart - 1] === c) runStart--;
    if (raw.slice(0, runStart).includes(c)) break;
    d = runStart;
  }
  return d === p ? raw.length : d;
}

/** `[start, end)` ranges of the bare URLs in a line. */
function findUrlRanges(line: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const re = new RegExp(URL_REGEX.source, URL_REGEX.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const len = urlLength(m[0]);
    if (len > 0) ranges.push([m.index, m.index + len]);
  }
  return ranges;
}

type Kind = 'strong' | 'em';

interface Ctx {
  s: string;
  /** For each index, the end of the URL range it starts, or -1. */
  urlEndAt: Int32Array;
  /** True for every index inside a URL range. */
  inUrl: Uint8Array;
}

function runLength(ctx: Ctx, i: number, to: number): number {
  const c = ctx.s[i];
  let j = i;
  while (j < to && ctx.s[j] === c && !ctx.inUrl[j]) j++;
  return j - i;
}

/** Find the closing delimiter for an opener of `len` × `c` at `from`. */
function findClose(ctx: Ctx, c: string, len: number, from: number, to: number): number {
  const { s } = ctx;
  let j = from;
  while (j < to) {
    if (ctx.inUrl[j]) {
      j++;
      continue;
    }
    if (s[j] === '`') {
      // Skip a code span so a marker inside code never closes emphasis.
      const close = findCodeClose(ctx, j + 1, to);
      if (close > j + 1) {
        j = close + 1;
        continue;
      }
    }
    if (s[j] === c) {
      const run = runLength(ctx, j, to);
      if (run === len && !isSpace(s[j - 1]) && !isWordChar(s[j + len])) {
        return j;
      }
      j += run;
      continue;
    }
    j++;
  }
  return -1;
}

function findCodeClose(ctx: Ctx, from: number, to: number): number {
  for (let j = from; j < to; j++) {
    if (ctx.s[j] === '`' && !ctx.inUrl[j]) return j;
  }
  return -1;
}

function parseInline(ctx: Ctx, from: number, to: number, allowed: Kind[]): MdInline[] {
  const { s } = ctx;
  const out: MdInline[] = [];
  let buf = '';
  const flush = () => {
    if (buf) {
      out.push({ type: 'text', text: buf });
      buf = '';
    }
  };

  let i = from;
  while (i < to) {
    const urlEnd = ctx.urlEndAt[i];
    if (urlEnd >= 0) {
      // Atomic URL leaf (R3) — emphasis never splits it.
      flush();
      const end = Math.min(urlEnd, to);
      out.push({ type: 'text', text: s.slice(i, end) });
      i = end;
      continue;
    }
    const ch = s[i];

    if (ch === '`') {
      const close = findCodeClose(ctx, i + 1, to);
      if (close > i + 1) {
        flush();
        out.push({ type: 'code', text: s.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
      buf += ch;
      i++;
      continue;
    }

    if (EMPHASIS_CHARS.includes(ch)) {
      const run = runLength(ctx, i, to);
      const kind: Kind | null = run === 2 ? 'strong' : run === 1 ? 'em' : null;
      const canOpen =
        kind !== null &&
        allowed.includes(kind) &&
        !isWordChar(s[i - 1]) &&
        !isSpace(s[i + run]);
      if (canOpen) {
        const close = findClose(ctx, ch, run, i + run, to);
        if (close > i + run) {
          flush();
          // One level of nesting: inside bold only italic, inside italic only bold.
          const inner = allowed.filter((k) => k !== kind);
          const children = parseInline(ctx, i + run, close, inner);
          out.push({ type: kind as Kind, children });
          i = close + run;
          continue;
        }
      }
      // Unbalanced, unknown (`***`) or not at a word boundary: literal.
      buf += s.slice(i, i + run);
      i += run;
      continue;
    }

    buf += ch;
    i++;
  }
  flush();
  return out;
}

/** Parse one line of text into inline tokens. */
export function parseChatInline(line: string): MdInline[] {
  if (!line) return [];
  const urlEndAt = new Int32Array(line.length).fill(-1);
  const inUrl = new Uint8Array(line.length);
  for (const [start, end] of findUrlRanges(line)) {
    urlEndAt[start] = end;
    for (let k = start; k < end; k++) inUrl[k] = 1;
  }
  return parseInline({ s: line, urlEndAt, inUrl }, 0, line.length, ['strong', 'em']);
}

/** Parse a whole message into blocks. Empty input → no blocks. */
export function parseChatMarkdown(text: string | null | undefined): MdBlock[] {
  if (!text) return [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MdBlock[] = [];
  let para: string[] = [];

  const flushPara = () => {
    // Blank lines next to a list/heading only separate blocks.
    let a = 0;
    let b = para.length;
    while (a < b && para[a].trim() === '') a++;
    while (b > a && para[b - 1].trim() === '') b--;
    if (a < b) {
      const children: MdInline[] = [];
      para.slice(a, b).forEach((line, idx) => {
        if (idx > 0) children.push({ type: 'text', text: '\n' });
        children.push(...parseChatInline(line));
      });
      blocks.push({ type: 'paragraph', children });
    }
    para = [];
  };

  for (const line of lines) {
    const heading = HEADING_LINE.exec(line);
    if (heading && heading[2]) {
      flushPara();
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        children: parseChatInline(heading[2]),
      });
      continue;
    }
    const bullet = BULLET_LINE.exec(line);
    const numbered = bullet ? null : NUMBERED_LINE.exec(line);
    if ((bullet && bullet[1]) || (numbered && numbered[2])) {
      flushPara();
      const ordered = !!numbered;
      const content = bullet ? bullet[1] : (numbered as RegExpExecArray)[2];
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'list' && last.ordered === ordered) {
        last.items.push(parseChatInline(content));
      } else {
        blocks.push({
          type: 'list',
          ordered,
          start: ordered ? Number((numbered as RegExpExecArray)[1]) : 1,
          items: [parseChatInline(content)],
        });
      }
      continue;
    }
    para.push(line);
  }
  flushPara();
  return blocks;
}
