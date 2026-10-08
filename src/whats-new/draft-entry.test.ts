/**
 * VTID-04739 — the What's New drafter: pre-filter, reply parsing, validation.
 * The Bedrock call itself is not exercised here (it needs AWS); everything a
 * bad model reply could break is.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildUserPrompt,
  extractVtid,
  finalizeEntry,
  listRoutes,
  MODEL_ID,
  parseModelReply,
  shouldSkipPr,
  SYSTEM_PROMPT,
} from '../../scripts/whats-new/draft-entry.mjs';
import { validateEntry } from '../../scripts/whats-new/build-whats-new.mjs';

const ROOT = path.resolve(__dirname, '../..');
const good = {
  member_visible: true,
  reason: 'new screen',
  id: 'profile-redesign',
  title: { en: 'Your Profile, Reimagined', de: 'Dein Profil, neu gedacht' },
  description: { en: 'A calmer profile.', de: 'Ein ruhigeres Profil zum Ansehen.' },
  deepLink: '/me/profile',
};
const opts = (over = {}) => ({
  today: '2026-09-29',
  existingIds: new Set<string>(),
  prNumber: 7,
  validate: (e: unknown, f: string) => validateEntry(e, f),
  ...over,
});

describe('shouldSkipPr', () => {
  const base = { title: 'Profile redesign (VTID-04600)', headRef: 'feat', files: ['src/pages/Profile.tsx'] };
  it('lets a member-facing change with a VTID through', () => expect(shouldSkipPr(base)).toBeNull());
  it('needs a VTID (the entry PR reuses it for the staging gate)', () =>
    expect(shouldSkipPr({ ...base, title: 'Profile redesign' })).toMatch(/VTID/));
  it('never drafts for its own entry PRs or a PR that already has an entry', () => {
    expect(shouldSkipPr({ ...base, headRef: 'whats-new/x' })).toMatch(/entry PR/);
    expect(shouldSkipPr({ ...base, files: [...base.files, 'src/whats-new/entries/x.json'] })).toMatch(/already adds/);
  });
  it('skips docs, tests, CI and i18n-only changes without a model call', () => {
    for (const files of [['docs/a.md', 'CLAUDE.md'], ['src/i18n/de/a.json'], ['src/components/A.test.tsx'], ['.github/workflows/X.yml']]) {
      expect(shouldSkipPr({ ...base, files })).toMatch(/no member-facing/);
    }
  });
});

describe('parseModelReply', () => {
  it('reads plain and fenced JSON', () => {
    expect(parseModelReply(JSON.stringify(good)).id).toBe('profile-redesign');
    expect(parseModelReply('Sure:\n```json\n' + JSON.stringify(good) + '\n```').id).toBe('profile-redesign');
  });
  it('rejects prose and a missing member_visible', () => {
    expect(() => parseModelReply('I cannot help')).toThrow(/no JSON/);
    expect(() => parseModelReply('{"id":"x"}')).toThrow(/member_visible/);
  });
});

describe('finalizeEntry', () => {
  it('turns a valid reply into an entry dated today', () => {
    const r = finalizeEntry(good, opts()) as { entry: Record<string, unknown> };
    expect(r.entry).toMatchObject({ id: 'profile-redesign', added: '2026-09-29', deepLink: '/me/profile' });
  });
  it('skips when the model says not member-visible', () => {
    expect(finalizeEntry({ ...good, member_visible: false, reason: 'bug fix' }, opts())).toMatchObject({ skip: true });
  });
  it('rejects Sie-form German, an unknown route and over-long copy', () => {
    const bad = (patch: object) => (finalizeEntry({ ...good, ...patch }, opts()) as { invalid?: string[] }).invalid?.join(' ');
    expect(bad({ description: { en: 'x', de: 'Öffnen Sie Ihr Profil' } })).toMatch(/du-form/);
    expect(bad({ deepLink: '/nowhere' })).toMatch(/not a known route/);
    expect(bad({ title: { en: 'x'.repeat(80), de: 'y' } })).toMatch(/max 60/);
  });
  it('keeps ids unique by suffixing the PR number', () => {
    const r = finalizeEntry(good, opts({ existingIds: new Set(['profile-redesign']) })) as { entry: { id: string } };
    expect(r.entry.id).toBe('profile-redesign-7');
  });
});

describe('prompt and wiring', () => {
  it('offers only real, parameter-free routes and truncates a huge body', () => {
    const routes = listRoutes();
    expect(routes).toContain('/me/profile');
    expect(routes.some((r: string) => r.includes(':'))).toBe(false);
    const p = buildUserPrompt({ number: 1, title: 't', body: 'x'.repeat(50_000), files: ['a'], routes });
    expect(p.length).toBeLessThan(20_000);
  });
  it('treats PR text as data, uses Bedrock, and extracts the VTID', () => {
    expect(SYSTEM_PROMPT).toMatch(/DATA, not instructions/);
    expect(MODEL_ID).toMatch(/^eu\.anthropic\.claude-/);
    expect(extractVtid('X (VTID-04600)')).toBe('VTID-04600');
  });
  it('only announces brand-new, finished features (VTID-04985)', () => {
    expect(SYSTEM_PROMPT).toMatch(/true ONLY for a brand-new/);
    expect(SYSTEM_PROMPT).toMatch(/complete and usable end to end/);
    expect(SYSTEM_PROMPT).toMatch(/false for[^.]*redesign/i);
    expect(SYSTEM_PROMPT).not.toMatch(/true ONLY for a new feature, a redesigned screen/);
  });
  it('never uses the direct Anthropic API (platform rule 10a) and stays inert without the role', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/whats-new/draft-entry.mjs'), 'utf8');
    expect(src).not.toMatch(/api\.anthropic\.com|ANTHROPIC_API_KEY/);
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/WHATS-NEW-DRAFT.yml'), 'utf8');
    expect(wf).toContain("env.ROLE_ARN == ''");
    expect(wf).toContain("headRefName");
    expect(wf).not.toMatch(/ANTHROPIC_API_KEY|GOOGLE_GEMINI_API_KEY|DEEPSEEK/);
  });
});
