/**
 * VTID-04313 — Diary reports go into the unified feedback_tickets pipeline,
 * and the Diary list shows them; Talk to Vitana no longer shadows t().
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildFeedbackTicketBody, submitFeedbackTicket, ticketToReport } from './feedback-ticket';

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

describe('ticketToReport', () => {
  it('maps pipeline statuses onto the list vocabulary and marks the row as a ticket', () => {
    const row = { id: 't', kind: 'bug', status: 'resolved', raw_transcript: 'r', structured_fields: { severity: 'critical' as const, attachments: ['a'] }, screen_path: '/p', linked_vtid: 'VTID-09999', created_at: '2026-09-22T00:00:00Z' };
    expect(ticketToReport(row)).toMatchObject({ status: 'fixed', severity: 'critical', vtid: 'VTID-09999', attachments: ['a'], source: 'ticket', report_type: 'bug_report' });
    expect(ticketToReport({ ...row, status: 'spec_ready', structured_fields: null }).status).toBe('under_review');
  });
});

describe('source contracts', () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  it('no Diary recorder posts to the legacy voice-feedback endpoint', () => {
    expect(read('components/feedback/FeedbackRecorder.tsx')).not.toContain('/api/v1/voice-feedback/submit');
    expect(read('components/capture/UnifiedCaptureCard.tsx')).not.toContain('/api/v1/voice-feedback/submit');
  });
  it('Talk to Vitana does not shadow the i18n t() inside the ticket loop', () => {
    const src = read('pages/community/TalkToVitana.tsx');
    expect(src).toContain('ticketsQuery.data?.map(ticket => {');
    expect(src).not.toContain('ticketsQuery.data?.map(t => {');
    expect(src).toContain("t('screens.community.ourAnswer')");
  });
});
