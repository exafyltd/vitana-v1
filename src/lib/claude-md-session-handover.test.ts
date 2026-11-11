// VTID-05696 (plan session-handover-gitlab): CLAUDE.md carries the standing rule that every session handover is pushed to GitLab.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const text = readFileSync(resolve(__dirname, '../../CLAUDE.md'), 'utf8');
const start = text.indexOf('## 📦 SESSION HANDOVER: STRAIGHT TO GITLAB');
const end = start < 0 ? -1 : text.indexOf('\n## ', start + 4);
const section = start < 0 ? '' : text.slice(start, end < 0 ? undefined : end);

describe('CLAUDE.md session handover rule', () => {
  it('follows the collaboration section', () => {
    expect(start).toBeGreaterThan(0);
    expect(text.indexOf('## 🤝 CLAUDE CODE ↔ KIRO COLLABORATION')).toBeLessThan(start);
  });

  it('names the GitLab handover file, the sandbox fact and the push check', () => {
    expect(section).toMatch(/19-EXECUTION-PROGRAMME\/SESSION-HANDOVER\.md/);
    expect(section).toMatch(/vitana\/vitanaland-strategy/);
    expect(section).toMatch(/fresh sandbox/);
    expect(section).toMatch(/git ls-remote origin <branch>/);
    expect(section).toMatch(/a handover exists only once it is pushed to GitLab/);
  });
});
