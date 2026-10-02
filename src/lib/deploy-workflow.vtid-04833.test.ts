/**
 * VTID-04833 — DEPLOY.yml (the production deploy the Command Hub PUBLISH button
 * dispatches) deploys AWS only. The GCP Cloud Run job deployed to a project
 * whose billing was disabled 2026-08-16, failed on every run and turned every
 * successful AWS production deploy red. This pins its removal and guards the
 * job that actually ships (aws_prod), so a cleanup can never take it with it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';

const ROOT = join(__dirname, '..', '..');
const raw = readFileSync(join(ROOT, '.github/workflows/DEPLOY.yml'), 'utf8');
const wf = load(raw) as {
  on: { workflow_dispatch: { inputs: Record<string, unknown> } };
  permissions: Record<string, string>;
  jobs: Record<string, { uses?: string; needs?: string; with?: Record<string, string> }>;
};

describe('VTID-04833: DEPLOY.yml deploys production on AWS only', () => {
  it('has exactly the cutover gate and the AWS production job', () => {
    expect(Object.keys(wf.jobs).sort()).toEqual(['aws_prod', 'cutover_gate']);
  });

  it('aws_prod still calls the AWS production workflow with the pinned commit', () => {
    const aws = wf.jobs.aws_prod;
    expect(aws.uses).toBe('./.github/workflows/AWS-PROD-DEPLOY-FRONTEND.yml');
    expect(aws.needs).toBe('cutover_gate');
    expect(aws.with?.commit_sha).toContain('github.event.inputs.commit_sha');
  });

  it('keeps the inputs the PUBLISH button sends (reason, commit_sha)', () => {
    expect(Object.keys(wf.on.workflow_dispatch.inputs).sort()).toEqual(['commit_sha', 'reason']);
  });

  it('runs nothing against GCP (decommissioned) and asks for no OIDC token', () => {
    const code = raw
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n');
    expect(code).not.toMatch(/gcloud|google-github-actions|lovable-vitana-vers1|Cloud Run/);
    expect(wf.permissions).toEqual({ contents: 'read' });
  });
});
