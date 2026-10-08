/**
 * VTID-04992 — recurrence guard: a screen that shows a member's avatar next to
 * a member id must link to the profile (ClickableAvatar / MemberLink), or be
 * on the reviewed allowlist with a reason. A new unlinked file fails here.
 *
 * Scope is deliberately narrow (files that render <Avatar AND reference a
 * member id field) so the allowlist stays reviewable, not 100 entries long.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import allowlist from "./member-link.allowlist.json";

const ROOT = process.cwd();
const SKIP = ["ui/avatar.tsx", "ui/clickable-avatar.tsx", "ui/member-link.tsx"];

export function isUnlinkedMemberAvatarFile(path: string, source: string): boolean {
  if (SKIP.some((s) => path.endsWith(s))) return false;
  if (!/<Avatar\b/.test(source)) return false;
  if (!/\b(userId|user_id|author_id|sender_id)\b/.test(source)) return false;
  return !/import\s*\{[^}]*\b(ClickableAvatar|MemberLink)\b/.test(source);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx") && !/\.(test|spec)\./.test(p)) out.push(p);
  }
  return out;
}

describe("member avatars link to profiles (VTID-04992)", () => {
  it("the check bites: an unlinked member avatar is flagged, a linked one is not", () => {
    const bad = `import { Avatar } from "@/components/ui/avatar";\nexport const X = ({ userId }) => <Avatar />;`;
    const good = `import { ClickableAvatar } from "@/components/ui/clickable-avatar";\nexport const X = ({ userId }) => <ClickableAvatar userId={userId} fallback="A" />;`;
    expect(isUnlinkedMemberAvatarFile("src/components/X.tsx", bad)).toBe(true);
    expect(isUnlinkedMemberAvatarFile("src/components/X.tsx", good)).toBe(false);
    expect(isUnlinkedMemberAvatarFile("src/components/X.tsx", `<Avatar />`)).toBe(false); // no member id: not a member avatar
  });

  it("every unlinked member-avatar file is on the reviewed allowlist", () => {
    const files = [...walk(join(ROOT, "src/components")), ...walk(join(ROOT, "src/pages"))];
    const flagged = files
      .map((f) => relative(ROOT, f).split(sep).join("/"))
      .filter((rel) => isUnlinkedMemberAvatarFile(rel, readFileSync(join(ROOT, rel), "utf8")));
    const allowed = new Set(Object.keys(allowlist));
    const unlisted = flagged.filter((f) => !allowed.has(f));
    expect(unlisted, `Link the avatar with ClickableAvatar/MemberLink, or add the file to src/lib/__guards__/member-link.allowlist.json with a reason:\n${unlisted.join("\n")}`).toEqual([]);
  });

  it("the allowlist has no stale entries and every entry has a reason", () => {
    const stale = Object.entries(allowlist).filter(([f, reason]) => {
      let src = "";
      try { src = readFileSync(join(ROOT, f), "utf8"); } catch { return true; }
      return !isUnlinkedMemberAvatarFile(f, src) || !String(reason).trim();
    });
    expect(stale.map(([f]) => f)).toEqual([]);
  });
});
