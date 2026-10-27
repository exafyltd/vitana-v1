'use strict';
// VTID-05059 — self-test for the Kiro steering guard. Run: node --test scripts/ci/kiro-steering/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { check } = require('./guard.cjs');

function repo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kiro-steer-'));
  for (const [p, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    fs.writeFileSync(path.join(root, p), c);
  }
  return root;
}
const RULE = '---\npaths:\n  - src/**\n  - "**/Dockerfile*"\n---\n# r\n';
const ALWAYS = '---\ninclusion: always\n---\n#[[file:CLAUDE.md]]\n';
const TWIN = '---\ninclusion: fileMatch\nfileMatchPattern:\n  - "**/Dockerfile*"\n  - "src/**"\n---\n#[[file:.claude/rules/b.md]]\n';

test('a matching layout passes', () => {
  assert.deepStrictEqual(check(repo({ 'CLAUDE.md': 'x', '.claude/rules/b.md': RULE, '.kiro/steering/a.md': ALWAYS, '.kiro/steering/b.md': TWIN })), []);
});
test('a rules file without a twin fails', () => {
  const e = check(repo({ 'CLAUDE.md': 'x', '.claude/rules/b.md': RULE, '.kiro/steering/a.md': ALWAYS }));
  assert.match(e.join('\n'), /has no \.kiro\/steering twin/);
});
test('globs that differ from paths fail', () => {
  const e = check(repo({ 'CLAUDE.md': 'x', '.claude/rules/b.md': RULE, '.kiro/steering/a.md': ALWAYS, '.kiro/steering/b.md': TWIN.replace('src/**', 'lib/**') }));
  assert.match(e.join('\n'), /fileMatchPattern/);
});
test('a link to a missing file fails', () => {
  const e = check(repo({ 'CLAUDE.md': 'x', '.kiro/steering/a.md': ALWAYS + '#[[file:gone.md]]\n' }));
  assert.match(e.join('\n'), /gone\.md\]\] does not exist/);
});
test('no always file linking CLAUDE.md fails', () => {
  const e = check(repo({ 'CLAUDE.md': 'x', '.kiro/steering/a.md': '---\ninclusion: manual\n---\n#[[file:CLAUDE.md]]\n' }));
  assert.match(e.join('\n'), /always-included/);
});
test('the twin must be fileMatch', () => {
  const e = check(repo({ 'CLAUDE.md': 'x', '.claude/rules/b.md': RULE, '.kiro/steering/a.md': ALWAYS, '.kiro/steering/b.md': TWIN.replace('inclusion: fileMatch', 'inclusion: always') }));
  assert.match(e.join('\n'), /not fileMatch/);
});
test('this repository passes', () => {
  assert.deepStrictEqual(check(path.resolve(__dirname, '..', '..', '..')), []);
});
test('the Kiro notes say plan sparring is never skipped and how to load context', () => {
  const notes = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', '.kiro', 'steering', 'vitana-kiro-notes.md'), 'utf8');
  assert.match(notes, /^---\ninclusion: always\n---/);
  assert.match(notes, /Plan sparring is never skipped/);
  assert.match(notes, /resume-vtid\.sh/);
});

// Plan owner-autonomy: the standing owner instruction and its stop table stay in place.
{
  const { checkOwnerAutonomy } = require('./guard.cjs');
  const REAL = fs.readFileSync(path.join(__dirname, '..', '..', '..', '.kiro', 'steering', 'vitana-owner-autonomy.md'), 'utf8');
  const PIPE = '# pipeline\nSee `vitana-owner-autonomy.md`.\n';
  const withRule = (rule, pipe = PIPE) => repo({ '.kiro/steering/vitana-pipeline.md': pipe, ...(rule === null ? {} : { '.kiro/steering/vitana-owner-autonomy.md': rule }) });

  test('owner-autonomy: the shipped rule file passes', () => {
    assert.deepStrictEqual(checkOwnerAutonomy(withRule(REAL)), []);
  });
  test('owner-autonomy: a missing rule file fails', () => {
    assert.match(checkOwnerAutonomy(withRule(null)).join('\n'), /vitana-owner-autonomy\.md missing/);
  });
  const { OWNER_AUTONOMY_ANCHORS } = require('./guard.cjs');
  test('owner-autonomy: one anchor per stop row (12) plus end point, stop message and no-trailing-question rule', () => {
    assert.strictEqual(OWNER_AUTONOMY_ANCHORS.length, 15);
  });
  for (const [anchor] of OWNER_AUTONOMY_ANCHORS) {
    test(`owner-autonomy: dropping "${anchor}" fails`, () => {
      const e = checkOwnerAutonomy(withRule(REAL.split(anchor).join('x'))).join('\n');
      assert.ok(e.includes(`no longer names ${anchor}`), e);
    });
  }
  test('owner-autonomy: a rule file that is not always-included fails', () => {
    assert.match(checkOwnerAutonomy(withRule(REAL.replace('inclusion: always', 'inclusion: manual'))).join('\n'), /inclusion must be always/);
  });
  test('owner-autonomy: vitana-pipeline.md without the pointer fails', () => {
    assert.match(checkOwnerAutonomy(withRule(REAL, '# pipeline\n')).join('\n'), /must point to vitana-owner-autonomy\.md/);
  });
  test('owner-autonomy: a repo without the pipeline steering is not checked (fixtures stay green)', () => {
    assert.deepStrictEqual(checkOwnerAutonomy(repo({ 'CLAUDE.md': 'x' })), []);
  });
  test('owner-autonomy: check() runs it', () => {
    const e = check(repo({ 'CLAUDE.md': 'x', '.kiro/steering/a.md': ALWAYS, '.kiro/steering/vitana-pipeline.md': '# p\n' }));
    assert.match(e.join('\n'), /vitana-owner-autonomy\.md missing/);
  });
}
