import { describe, it, expect } from 'vitest';
import { isDevServiceAccount } from './devServiceAccounts';

describe('isDevServiceAccount (VTID-03982)', () => {
  it('flags the known claude-code-agent@exafy.io account', () => {
    expect(isDevServiceAccount('887b34cb-9ee9-47dc-ad53-db5be1869846')).toBe(true);
  });

  it('flags the known operator-autopilot@exafy.io account', () => {
    expect(isDevServiceAccount('856c30ed-7136-4bc5-8bfe-86a1e8ea1401')).toBe(true);
  });

  it('does not flag a real community member', () => {
    expect(isDevServiceAccount('a27552a3-0257-4305-8ed0-351a80fd3701')).toBe(false);
  });

  it('does not flag null/undefined/empty ids', () => {
    expect(isDevServiceAccount(null)).toBe(false);
    expect(isDevServiceAccount(undefined)).toBe(false);
    expect(isDevServiceAccount('')).toBe(false);
  });
});
