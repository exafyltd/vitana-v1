/** VTID-05100 — a Vitana companion message opens the member's Vitana DM. */
import { describe, it, expect } from 'vitest';
import { NOTIFICATION_TYPES, getNotificationCategory, resolveNotificationRoute } from './notification-types';
import { VITANA_BOT_USER_ID } from './vitanaBotIdentity';

describe('vitana_companion_message notification type', () => {
  it('is registered in the chat category', () => {
    expect(NOTIFICATION_TYPES.vitana_companion_message).toBeDefined();
    expect(getNotificationCategory('vitana_companion_message')).toBe('chat');
  });

  it('routes to the Vitana DM', () => {
    expect(resolveNotificationRoute('vitana_companion_message', {})).toBe(`/inbox/u/${VITANA_BOT_USER_ID}`);
    expect(resolveNotificationRoute('vitana_companion_message')).toBe(`/inbox/u/${VITANA_BOT_USER_ID}`);
  });

  it('still honours an explicit url from the push payload', () => {
    expect(resolveNotificationRoute('vitana_companion_message', { url: '/inbox/u/x/msg/y' })).toBe('/inbox/u/x/msg/y');
  });
});
