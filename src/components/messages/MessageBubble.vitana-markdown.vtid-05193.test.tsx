/**
 * VTID-05193 — Vitana's chat replies render a safe Markdown subset (owner
 * report 2026-10-14: raw `**"Did You Know"**` in the Vitana DM). Links and
 * @mentions keep working inside formatted text; members' messages render
 * literally; lists use logical (RTL-safe) classes only.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VITANA_BOT_USER_ID } from '@/lib/vitanaBotIdentity';

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k, t: (k: string) => k }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/hooks/useMessageReactions', () => ({
  useMessageReactions: () => ({ reactionSummary: [], addReaction: vi.fn(), removeReaction: vi.fn() }),
}));
vi.mock('@/hooks/useCardDismiss', () => ({ useCardDismiss: () => ({ isDismissed: false, dismiss: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn(), from: () => ({}) } };
});

import MessageBubble from './MessageBubble';

// The text from the owner's phone screenshot.
const SCREENSHOT = [
  '**"Did You Know"**',
  'Here is what I can do:',
  '- Say **"Show me"** → I open the screen',
  '- Ask *anything* about `events`',
].join('\n');

function renderBubble(senderId: string, body: string, opts: { messageType?: string; dir?: 'rtl' | 'ltr' } = {}) {
  return render(
    <div dir={opts.dir ?? 'ltr'}>
      <MemoryRouter>
        <MessageBubble
          message={{
            id: 'm1',
            sender_id: senderId,
            body,
            content: body,
            message_type: opts.messageType ?? 'text',
            content_data: null,
            created_at: '2026-10-14T08:00:00Z',
            thread_id: senderId,
            sender: { user_id: senderId, display_name: 'Someone' },
          } as never}
          isOwnMessage={false}
        />
      </MemoryRouter>
    </div>,
  );
}

describe('MessageBubble — Vitana replies render Markdown (VTID-05193)', () => {
  it('the screenshot text from Vitana renders bold, list items, no literal **', () => {
    const { container } = renderBubble(VITANA_BOT_USER_ID, SCREENSHOT);
    const strongs = Array.from(container.querySelectorAll('strong')).map((n) => n.textContent);
    expect(strongs).toEqual(['"Did You Know"', '"Show me"']);
    const items = Array.from(container.querySelectorAll('ul > li')).map((n) => n.textContent);
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('Say "Show me" → I open the screen');
    expect(container.querySelector('em')?.textContent).toBe('anything');
    expect(container.querySelector('code')?.textContent).toBe('events');
    expect(container.textContent).not.toContain('**');
    // Lists sit in a <div>, never inside a <p>.
    expect(container.querySelector('p ul, p ol')).toBeNull();
  });

  it('a URL inside formatted text stays a link', () => {
    const { container } = renderBubble(VITANA_BOT_USER_ID, '**Read https://example.com/guide** now');
    const link = container.querySelector('strong a') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('https://example.com/guide');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it.each(['https://example.com/__preview__', 'https://example.com/*draft*'])(
    'a URL containing markers (%s) stays one whole link',
    (url) => {
      const { container } = renderBubble(VITANA_BOT_USER_ID, `Open ${url} please`);
      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(1);
      expect(links[0].getAttribute('href')).toBe(url);
      expect(links[0].textContent).toBe(url);
      expect(container.querySelector('strong, em')).toBeNull();
    },
  );

  it('<script> from Vitana renders as text, never as an element', () => {
    const { container } = renderBubble(VITANA_BOT_USER_ID, '<script>alert(1)</script> **ok**');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('a Vitana template message is rendered with Markdown too', () => {
    const { container } = renderBubble(VITANA_BOT_USER_ID, '**Hi** there', { messageType: 'template' });
    expect(container.querySelector('strong')?.textContent).toBe('Hi');
  });

  it('the same text from a member renders literally (with **)', () => {
    const { container } = renderBubble('member-1', SCREENSHOT);
    expect(container.querySelector('strong')).toBeNull();
    expect(container.querySelector('ul')).toBeNull();
    expect(container.textContent).toContain('**"Did You Know"**');
    expect(container.textContent).toContain('- Say **"Show me"**');
  });

  it('plain text from Vitana is unchanged', () => {
    const plain = 'Guten Morgen!\nWie geht es dir heute?';
    const { container } = renderBubble(VITANA_BOT_USER_ID, plain);
    const md = container.querySelector('[data-testid="vitana-markdown"]') as HTMLElement;
    expect(md.querySelectorAll('p')).toHaveLength(1);
    // The text is exactly the message (the invisible timestamp spacer follows it).
    expect(md.querySelector('p')?.textContent?.startsWith(plain)).toBe(true);
    expect(md.querySelector('strong, em, code, ul, ol')).toBeNull();
  });

  it('in dir="rtl" lists use logical classes only (no left/right)', () => {
    const { container } = renderBubble(VITANA_BOT_USER_ID, '1. eins\n2. zwei\n\n- a\n- b', { dir: 'rtl' });
    const lists = Array.from(container.querySelectorAll('[data-testid="vitana-markdown"] ul, [data-testid="vitana-markdown"] ol'));
    expect(lists).toHaveLength(2);
    for (const list of lists) {
      const cls = list.className;
      expect(cls).toMatch(/\bps-\d/);
      expect(cls).not.toMatch(/(^|\s)-?(pl|pr|ml|mr|left|right)-/);
      expect(cls).not.toMatch(/text-(left|right)/);
    }
    // The whole Markdown tree carries no physical left/right utility.
    const md = container.querySelector('[data-testid="vitana-markdown"]') as HTMLElement;
    const allClasses = Array.from(md.querySelectorAll('*')).map((n) => n.getAttribute('class') ?? '').join(' ');
    expect(allClasses).not.toMatch(/(^|\s)-?(pl|pr|ml|mr|left|right)-/);
  });
});
