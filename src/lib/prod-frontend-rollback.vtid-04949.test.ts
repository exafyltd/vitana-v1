/**
 * VTID-04949 (plan D1/D2) — production safety contracts for the frontend
 * deploy pipeline. These are source contracts on the workflow files: the
 * workflows have no runtime harness, so the tests pin the guarantees a later
 * edit must not silently drop.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const PROD = read('.github/workflows/AWS-PROD-DEPLOY-FRONTEND.yml');

describe('production frontend deploy can always roll back', () => {
  it('captures the live task definition before building, and refuses to deploy without it', () => {
    const capture = PROD.indexOf('id: prev');
    expect(capture).toBeGreaterThan(-1);
    expect(capture).toBeLessThan(PROD.indexOf('- name: Build and push image'));
    expect(PROD).toMatch(/refusing to deploy without a rollback target/);
  });

  it('rolls back on failure to the captured task definition, behind the kill switch', () => {
    expect(PROD).toMatch(/id: rollback/);
    expect(PROD).toMatch(/failure\(\) && steps\.prev\.outputs\.arn != '' && steps\.roll\.outcome != 'skipped' && vars\.PROD_AUTO_ROLLBACK_DISABLED != 'true'/);
    expect(PROD).toMatch(/--task-definition "\$PREV_ARN"/);
  });

  it('proves the new build is what members get: 10 agreeing samples, not the pre-deploy bundle', () => {
    expect(PROD).toMatch(/for i in \$\(seq 1 10\)/);
    expect(PROD).toMatch(/still serves the pre-deploy bundle/);
  });
});

describe('merging never applies SQL to the production database (plan D2)', () => {
  const migrationWorkflows = readdirSync(join(ROOT, '.github/workflows')).filter((f) => /^apply-.*-migration\.yml$/.test(f));

  it('there are migration workflows to check', () => {
    expect(migrationWorkflows.length).toBeGreaterThan(0);
  });

  it.each(migrationWorkflows)('%s runs only on manual dispatch', (wf) => {
    const src = read(`.github/workflows/${wf}`);
    const on = src.slice(src.indexOf('\non:'), src.indexOf('\njobs:'));
    expect(on).toMatch(/workflow_dispatch/);
    expect(on).not.toMatch(/\bpush:/);
    expect(on).not.toMatch(/\bpull_request:/);
  });
});
