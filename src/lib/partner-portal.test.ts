/**
 * VTID-03882. The point of these tests is exhaustiveness: the portal draws a
 * four-step track from an eleven-value server enum, and the failure mode is a
 * state nobody mapped rendering as step 1 — telling a merchant their REVOKED
 * connection is at the start of the journey.
 */
import { describe, expect, it } from 'vitest';
import {
  CONNECTION_STATES,
  CONNECTION_STEPS,
  connectionStepIndex,
  isConnectionLive,
  isConnectionOffTrack,
  stateBadgeVariant,
} from './partner-portal';

describe('CONNECTION_STATES', () => {
  it('mirrors the gateway enum exactly, in order', () => {
    // Source of truth: vitana-platform
    // services/gateway/src/routes/vcaop-portal.ts CONNECTION_STATES.
    expect([...CONNECTION_STATES]).toEqual([
      'discovered',
      'authorization_required',
      'mapping',
      'testing',
      'approval_required',
      'certified',
      'active',
      'degraded',
      'suspended',
      'revoked',
      'failed',
    ]);
  });
});

describe('connectionStepIndex', () => {
  it('resolves every server state to a step or to off-track', () => {
    for (const state of CONNECTION_STATES) {
      const idx = connectionStepIndex(state);
      if (idx !== null) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(CONNECTION_STEPS.length);
      }
    }
  });

  it('places the happy path in ascending order', () => {
    const happyPath = ['authorization_required', 'mapping', 'testing', 'certified'] as const;
    const indices = happyPath.map((s) => connectionStepIndex(s));
    expect(indices).toEqual([0, 1, 2, 3]);
  });

  it('treats discovered and authorization_required as the same first step', () => {
    expect(connectionStepIndex('discovered')).toBe(connectionStepIndex('authorization_required'));
  });

  it('keeps approval_required on the checks step, not on live', () => {
    expect(connectionStepIndex('approval_required')).toBe(2);
  });

  it('puts certified on the final step even though it is not yet active', () => {
    expect(connectionStepIndex('certified')).toBe(3);
    expect(isConnectionLive('certified')).toBe(false);
    expect(isConnectionLive('active')).toBe(true);
  });

  it('refuses to place a problem state on the track', () => {
    for (const state of ['degraded', 'suspended', 'revoked', 'failed']) {
      expect(connectionStepIndex(state)).toBeNull();
      expect(isConnectionOffTrack(state)).toBe(true);
    }
  });

  it('treats an unknown state as off-track rather than as step 1', () => {
    expect(connectionStepIndex('something_the_gateway_added_later')).toBeNull();
  });
});

describe('stateBadgeVariant', () => {
  it('keeps its pre-existing mapping', () => {
    expect(stateBadgeVariant('active')).toBe('default');
    expect(stateBadgeVariant('certified')).toBe('default');
    expect(stateBadgeVariant('revoked')).toBe('destructive');
    expect(stateBadgeVariant('failed')).toBe('destructive');
    expect(stateBadgeVariant('approval_required')).toBe('outline');
    expect(stateBadgeVariant('authorization_required')).toBe('outline');
    expect(stateBadgeVariant('mapping')).toBe('secondary');
  });
});
