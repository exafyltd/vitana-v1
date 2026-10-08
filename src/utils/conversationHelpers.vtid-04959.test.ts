// VTID-04959 — the message box said "Message Stefan..." in a group (one
// member's name, hardcoded English). It now names the group, from i18n.
import { describe, it, expect } from 'vitest';
import { composerPlaceholder, PLACEHOLDER_GROUP_NAME_MAX } from './conversationHelpers';

const t = (key: string, p?: Record<string, string | number>) => `${key}|${p?.name ?? ''}`;

describe('composerPlaceholder', () => {
  it('names the group, not one member', () => {
    const thread = { id: 'g', type: 'group', name: 'Lauftreff', participants: [{ user_id: 'me' }, { user_id: 's', display_name: 'Stefan Ehlke' }] };
    expect(composerPlaceholder(thread, 'me', t)).toBe('screens.messages.messageGroupPlaceholder|Lauftreff');
  });

  it('cuts long auto-generated group names at 30 characters', () => {
    const name = 'Husam Katiela, Stefan Ehlke, Mariia Maksina, Jovana Tadić';
    const out = composerPlaceholder({ id: 'g', type: 'group', name }, 'me', t);
    const shown = out.split('|')[1];
    expect(shown.length).toBeLessThanOrEqual(PLACEHOLDER_GROUP_NAME_MAX);
    expect(shown.endsWith('…')).toBe(false); // the catalog string adds the one ellipsis
    expect(name.startsWith(shown)).toBe(true);
  });

  it('uses the other person\'s first name in a direct chat', () => {
    const thread = { id: 'd', type: 'direct', participants: [{ user_id: 'me' }, { user_id: 'x', display_name: 'Husam Katiela' }] };
    expect(composerPlaceholder(thread, 'me', t)).toBe('screens.messages.messagePersonPlaceholder|Husam');
  });
});
