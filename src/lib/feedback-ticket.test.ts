/**
 * VTID-04313 — Diary reports go into the unified feedback_tickets pipeline,
 * and the Diary list shows them; Talk to Vitana no longer shadows t().
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildFeedbackTicketBody, submitFeedbackTicket, buildSupportContactBody,
  memberTicketStatus, TICKET_STATUS_MAP, timelineStep, ticketAnswer, matchesTicketRef,
} from './feedback-ticket';

describe('buildFeedbackTicketBody', () => {
  it('maps a bug report onto the unified ticket shape', () => {
    const body = buildFeedbackTicketBody({
      transcript: '  The save button does nothing  ', reportType: 'bug_report', severity: 'high',
      affectedScreen: '/diary', attachments: ['https://x/a.png', 'https://x/b.png'], source: 'diary_recorder',
    }, '/memory/diary');
    expect(body).toEqual({
      raw_text: 'The save button does nothing',
      kind: 'bug',
      screen_path: '/diary',
      screenshot_url: 'https://x/a.png',
      structured_fields: { severity: 'high', attachments: ['https://x/a.png', 'https://x/b.png'], affected_screen: '/diary', source: 'diary_recorder' },
    });
  });

  it('maps a UX improvement and falls back to the current path', () => {
    const body = buildFeedbackTicketBody({ transcript: 'x', reportType: 'ux_improvement', severity: 'low', source: 'capture_card' }, '/diary');
    expect(body.kind).toBe('ux_issue');
    expect(body.screen_path).toBe('/diary');
    expect('screenshot_url' in body).toBe(false);
  });
});

describe('submitFeedbackTicket', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('posts to /api/v1/feedback/tickets, never the legacy endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ ok: true, ticket_number: 'FB-9' }) });
    vi.stubGlobal('fetch', fetchMock);
    const r = await submitFeedbackTicket({ gatewayUrl: 'https://gw', accessToken: 'tok', transcript: 'x', reportType: 'bug_report', severity: 'medium', source: 'diary_recorder' });
    expect(r).toEqual({ ok: true, ticket_number: 'FB-9' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://gw/api/v1/feedback/tickets');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });
  it('surfaces the gateway error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ ok: false, error: 'VALIDATION_FAILED', details: 'raw_text: too short' }) }));
    const r = await submitFeedbackTicket({ gatewayUrl: 'https://gw', accessToken: 'tok', transcript: 'x', reportType: 'bug_report', severity: 'medium', source: 'capture_card' });
    expect(r).toEqual({ ok: false, error: 'raw_text: too short' });
  });
});

describe('member status vocabulary (VTID-04335)', () => {
  it('maps every pipeline status onto one of six member statuses', () => {
    const allowed = new Set(['received', 'under_review', 'in_progress', 'fixed', 'wont_fix', 'duplicate']);
    for (const v of Object.values(TICKET_STATUS_MAP)) expect(allowed.has(v)).toBe(true);
    expect(memberTicketStatus('new')).toBe('received');
    expect(memberTicketStatus('spec_ready')).toBe('under_review');
    expect(memberTicketStatus('needs_more_info')).toBe('under_review');
    expect(memberTicketStatus('reopened')).toBe('under_review');
    expect(memberTicketStatus('approved')).toBe('in_progress');
    expect(memberTicketStatus('in_progress')).toBe('in_progress');
    expect(memberTicketStatus('resolved')).toBe('fixed');
    expect(memberTicketStatus('user_confirmed')).toBe('fixed');
    expect(memberTicketStatus('rejected')).toBe('wont_fix');
    expect(memberTicketStatus('duplicate')).toBe('duplicate');
  });
  it('never leaks an unknown internal status', () => {
    expect(memberTicketStatus('some_future_state')).toBe('received');
    expect(memberTicketStatus(null)).toBe('received');
  });
  it('places statuses on the received → under review → being fixed → fixed timeline', () => {
    expect(timelineStep('received')).toBe(0);
    expect(timelineStep('in_progress')).toBe(2);
    expect(timelineStep('fixed')).toBe(3);
    expect(timelineStep('wont_fix')).toBe(-1);
  });
  it('shows an answer only once resolved, never a draft', () => {
    expect(ticketAnswer({ status: 'resolved', answer_md: 'A', resolution_md: 'R' })).toBe('A');
    expect(ticketAnswer({ status: 'user_confirmed', answer_md: null, resolution_md: 'R' })).toBe('R');
    expect(ticketAnswer({ status: 'answer_ready', answer_md: 'draft', resolution_md: null })).toBeNull();
  });
  it('matches a ?ticket= ref by id or by FB number', () => {
    const tk = { id: 'uuid-1', ticket_number: 'FB-2026-09-000123' };
    expect(matchesTicketRef(tk, 'uuid-1')).toBe(true);
    expect(matchesTicketRef(tk, 'fb-2026-09-000123')).toBe(true);
    expect(matchesTicketRef(tk, 'uuid-2')).toBe(false);
    expect(matchesTicketRef(tk, null)).toBe(false);
  });
});

describe('buildSupportContactBody (VTID-04335)', () => {
  it('pins the support surface and maps the category to a kind', () => {
    expect(buildSupportContactBody({ message: '  help  ', category: 'technical', entryMethod: 'voice', attachments: ['u'] })).toEqual({
      raw_text: 'help', kind: 'bug', surface: 'support', screen_path: 'support/contact:technical', screenshot_url: 'u',
      structured_fields: { source: 'support_contact', category: 'technical', entry_method: 'voice', attachments: ['u'] },
    });
    const b = buildSupportContactBody({ message: 'x', category: '', entryMethod: 'text' });
    expect(b.kind).toBe('support_question');
    expect(b.screen_path).toBe('support/contact');
  });
});

describe('source contracts', () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  it('no Diary recorder posts to the legacy voice-feedback endpoint', () => {
    expect(read('components/feedback/FeedbackRecorder.tsx')).not.toContain('/api/v1/voice-feedback/submit');
    expect(read('components/capture/UnifiedCaptureCard.tsx')).not.toContain('/api/v1/voice-feedback/submit');
  });
  it('Talk to Vitana uses the shared ticket list and no hardcoded English', () => {
    const src = read('pages/community/TalkToVitana.tsx');
    expect(src).toContain('<MyTicketsList');
    expect(src).not.toMatch(/STATUS_PILL|KIND_OPTIONS|timeAgo|"Send to Vitana"|says this is fixed/);
    expect(src).not.toContain('activeId=');
  });
  it('the Diary list no longer reads or deletes user_feedback_reports', () => {
    const src = read('components/feedback/FeedbackReportList.tsx');
    expect(src).not.toContain('from("user_feedback_reports"');
    expect(src).not.toContain('.delete()');
    expect(src).toContain('MyTicketsList');
  });
  it('no support/feedback screen falls back to the dead GCP gateway', () => {
    for (const f of ['pages/MobileSupport.tsx', 'components/feedback/FeedbackRecorder.tsx', 'components/capture/UnifiedCaptureCard.tsx', 'lib/community-gateway.ts']) {
      expect(read(f)).not.toContain('run.app');
    }
  });
  it('the desktop Support page has no mock tickets and a real submit', () => {
    const src = read('pages/settings/Support.tsx');
    expect(src).not.toContain('NewTicketPopup');
    expect(src).not.toMatch(/Fitbit|submittedDec102024|2,847/);
    expect(src).toContain('buildSupportContactBody');
    expect(src).toContain('activateOrb');
  });
});
