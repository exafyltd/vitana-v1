/** VTID-04335 — a resolved-ticket notification opens that specific ticket. */
import { describe, it, expect } from 'vitest';
import { NOTIFICATION_TYPES, resolveNotificationRoute, withTicketParam } from './notification-types';

describe('feedback_ticket_resolved deep link', () => {
  it('is registered', () => {
    expect(NOTIFICATION_TYPES.feedback_ticket_resolved).toBeDefined();
  });
  it('appends ?ticket=<id> to the url the gateway sends', () => {
    expect(resolveNotificationRoute('feedback_ticket_resolved', { url: '/comm/talk-to-vitana', ticket_id: 'abc' }))
      .toBe('/comm/talk-to-vitana?ticket=abc');
  });
  it('keeps existing query params and falls back to the registry route', () => {
    expect(withTicketParam('/support?tab=tickets', 'x1')).toBe('/support?tab=tickets&ticket=x1');
    expect(resolveNotificationRoute('feedback_ticket_resolved', { ticket_id: 'z9' })).toBe('/comm/talk-to-vitana?ticket=z9');
  });
  it('still honours a plain url when there is no ticket id', () => {
    expect(resolveNotificationRoute('feedback_ticket_resolved', { url: '/comm/talk-to-vitana' })).toBe('/comm/talk-to-vitana');
  });
});
