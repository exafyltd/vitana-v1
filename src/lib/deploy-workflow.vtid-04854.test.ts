/**
 * VTID-04854 — the frontend deploy workflows clone the previous task
 * definition forward. It carried a ref to the Aurora-managed secret
 * rds!cluster-…, which no longer exists, so every new task failed with
 * ResourceInitializationError (ResourceNotFoundException) and the staging
 * deploy of #1213 never stabilised. Both workflows must drop such refs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('VTID-04854: frontend deploys never clone forward an Aurora-managed secret ref', () => {
  it.each(['.github/workflows/AWS-STAGE-DEPLOY-FRONTEND.yml', '.github/workflows/AWS-PROD-DEPLOY-FRONTEND.yml'])(
    '%s drops secrets whose valueFrom is an rds! managed secret, before registering',
    (wf) => {
      const src = read(wf);
      const filter = src.indexOf('test(":secret:rds!") | not');
      expect(filter).toBeGreaterThan(-1);
      expect(filter).toBeLessThan(src.indexOf('aws ecs register-task-definition --cli-input-json "$NEW_DEF"'));
      expect(src).toContain('(if (.secrets | length) == 0 then del(.secrets) else . end)');
      expect(src).toContain('Secrets on the new revision:');
    },
  );
});
