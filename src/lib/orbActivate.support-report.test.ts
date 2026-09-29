/**
 * VTID-04395 — Support "report by voice" opens the ORB as a support intake.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { activateOrbForSupportReport } from './orbActivate';

afterEach(() => { delete (window as unknown as { VitanaOrb?: unknown }).VitanaOrb; });

describe('activateOrbForSupportReport', () => {
  it('uses the widget support-report open when available', () => {
    const startSupportReport = vi.fn();
    const show = vi.fn();
    (window as unknown as { VitanaOrb: unknown }).VitanaOrb = { startSupportReport, show };
    expect(activateOrbForSupportReport()).toBe(true);
    expect(startSupportReport).toHaveBeenCalledTimes(1);
    expect(show).not.toHaveBeenCalled();
  });

  it('falls back to a plain open on an older widget', () => {
    const show = vi.fn();
    (window as unknown as { VitanaOrb: unknown }).VitanaOrb = { show };
    expect(activateOrbForSupportReport()).toBe(true);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('reports failure when there is no ORB at all', () => {
    expect(activateOrbForSupportReport()).toBe(false);
  });

  it('is what the Support page voice button calls', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'pages/settings/Support.tsx'), 'utf8');
    expect(src).toContain('activateOrbForSupportReport()');
    expect(src).not.toMatch(/\bactivateOrb\(\)/);
  });
  it('is what the mobile Support voice tile calls', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'pages/MobileSupport.tsx'), 'utf8');
    expect(src).toContain('onClick={handleVoiceReport}');
    expect(src).toContain('if (!activateOrbForSupportReport()) notifyError("supportTickets.orbUnavailable");');
  });
});
