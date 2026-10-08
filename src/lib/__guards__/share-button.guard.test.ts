/**
 * VTID-04993 — recurrence guard: a <Button>/<button> that shows a Share icon
 * must do something when tapped (have an onClick, or wrap a share component).
 * A share button with no handler is a lie. Reviewed exceptions go in
 * share-button.allowlist.json with a reason.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import allowlist from "./share-button.allowlist.json";

const ROOT = process.cwd();
const OPENERS = /<(Button|button|DropdownMenuItem|MenuItem|Link|a)\b/g;

/** The opening tag text starting at `start`, brace-aware (so `=>` inside onClick is fine). */
function openingTag(src: string, start: number): string {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0 && src[i - 1] !== "=") return src.slice(start, i + 1);
  }
  return src.slice(start);
}

export function deadShareButtons(source: string): number[] {
  const bad: number[] = [];
  const icon = /<Share2?\b/g;
  let m: RegExpExecArray | null;
  while ((m = icon.exec(source))) {
    let nearest: { name: string; index: number } | null = null;
    OPENERS.lastIndex = 0;
    let o: RegExpExecArray | null;
    while ((o = OPENERS.exec(source)) && o.index < m.index) nearest = { name: o[1], index: o.index };
    if (!nearest || (nearest.name !== "Button" && nearest.name !== "button")) continue;
    const tag = openingTag(source, nearest.index);
    if (!/\bonClick\s*=/.test(tag) && !/\basChild\b/.test(tag) && !/type=["']submit["']/.test(tag)) {
      bad.push(source.slice(0, m.index).split("\n").length);
    }
  }
  return bad;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx") && !/\.(test|spec)\./.test(p)) out.push(p);
  }
  return out;
}

describe("share buttons do something (VTID-04993)", () => {
  it("the check bites: a share button without a handler is flagged, one with a handler is not", () => {
    const dead = `<Button variant="outline">\n  <Share2 className="h-4 w-4" />\n</Button>`;
    const live = `<Button onClick={() => share({ url })}>\n  <Share2 className="h-4 w-4" />\n</Button>`;
    expect(deadShareButtons(dead)).toEqual([2]);
    expect(deadShareButtons(live)).toEqual([]);
  });

  it("no share button is without a handler, except the reviewed allowlist", () => {
    const allowed = new Set(Object.keys(allowlist));
    const offenders = [...walk(join(ROOT, "src/components")), ...walk(join(ROOT, "src/pages"))]
      .map((f) => relative(ROOT, f).split(sep).join("/"))
      .filter((rel) => !allowed.has(rel))
      .flatMap((rel) => deadShareButtons(readFileSync(join(ROOT, rel), "utf8")).map((line) => `${rel}:${line}`));
    expect(offenders, `A Share button needs an onClick that shares (useShareOrCopy / SocialShareButton), or an entry in src/lib/__guards__/share-button.allowlist.json with a reason:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("the allowlist has no stale entries and every entry has a reason", () => {
    const stale = Object.entries(allowlist).filter(([f, reason]) => {
      let src = "";
      try { src = readFileSync(join(ROOT, f), "utf8"); } catch { return true; }
      return deadShareButtons(src).length === 0 || !String(reason).trim();
    });
    expect(stale.map(([f]) => f)).toEqual([]);
  });
});
