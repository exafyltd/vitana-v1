/**
 * VTID-05137 — WhatsApp-style chat pushes on the web.
 *
 * The gateway now stamps every chat push with data.tag = "chat:<conversation>".
 * The service worker must use it as the notification tag, so a new message
 * REPLACES the conversation's card (and still alerts), while two different
 * messages of one conversation are never dropped as "duplicates". A group
 * push is titled by the group. Non-chat pushes keep the old tag order.
 *
 * Runs the real public/firebase-messaging-sw.js in a sandbox with a fake
 * `self` and `firebase`.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const SW_SOURCE = readFileSync(join(__dirname, '../../public/firebase-messaging-sw.js'), 'utf8');

type Shown = { title: string; options: Record<string, any> };

function loadServiceWorker() {
  const listeners: Record<string, (event: any) => void> = {};
  const shown: Shown[] = [];
  const self = {
    addEventListener: (type: string, fn: (event: any) => void) => {
      listeners[type] = fn;
    },
    skipWaiting: () => undefined,
    clients: { claim: () => Promise.resolve() },
    registration: {
      showNotification: (title: string, options: Record<string, any>) => {
        shown.push({ title, options });
        return Promise.resolve();
      },
    },
  };
  const firebase = {
    initializeApp: () => undefined,
    messaging: () => ({ onBackgroundMessage: () => undefined }),
  };
  const context = vm.createContext({
    self,
    firebase,
    importScripts: () => undefined,
    clients: self.clients,
    console: { log: () => undefined, warn: () => undefined },
    setTimeout: () => 0,
  });
  vm.runInContext(SW_SOURCE, context);

  const push = (payload: unknown) => {
    listeners.push({
      data: { json: () => payload },
      stopImmediatePropagation: () => undefined,
      waitUntil: () => undefined,
    });
  };
  return { push, shown };
}

const dmPush = (messageId: string, body: string) => ({
  notification: { title: 'Dragan Alexander', body },
  data: {
    type: 'new_chat_message',
    sender_id: 'sender-1',
    sender_name: 'Dragan Alexander',
    message_id: messageId,
    thread_id: 'sender-1',
    url: '/inbox/u/sender-1',
    conversation_key: 'dm:sender-1',
    tag: 'chat:dm:sender-1',
  },
});

describe('firebase-messaging-sw — chat tag (VTID-05137)', () => {
  let sw: ReturnType<typeof loadServiceWorker>;
  beforeEach(() => {
    sw = loadServiceWorker();
  });

  it('three messages of one conversation share one card that still alerts', () => {
    sw.push(dmPush('m1', 'Lets try to move our Business Chat'));
    sw.push(dmPush('m2', 'This should replace Google Chat completely'));
    sw.push(dmPush('m3', '2 new messages · Especially thinking about…'));

    expect(sw.shown).toHaveLength(3);
    expect(new Set(sw.shown.map((s) => s.options.tag))).toEqual(new Set(['chat:dm:sender-1']));
    expect(sw.shown.every((s) => s.options.renotify === true)).toBe(true);
    expect(sw.shown[2].options.body).toBe('2 new messages · Especially thinking about…');
    expect(sw.shown[2].options.data.url).toBe('/inbox/u/sender-1');
  });

  it('the same message delivered twice is still shown once', () => {
    sw.push(dmPush('m1', 'hi'));
    sw.push(dmPush('m1', 'hi'));
    expect(sw.shown).toHaveLength(1);
  });

  it('a group push is titled by the group', () => {
    sw.push({
      notification: { title: 'Alle Beisammen', body: 'Anna: hello all' },
      data: {
        type: 'new_group_message',
        group_id: 'g1',
        sender_name: 'Anna',
        message_id: 'm9',
        url: '/inbox/g/g1/msg/m9',
        tag: 'chat:group:g1',
      },
    });
    expect(sw.shown[0].title).toBe('Alle Beisammen');
    expect(sw.shown[0].options.tag).toBe('chat:group:g1');
  });

  it('a non-chat push keeps the old tag order and does not re-alert', () => {
    sw.push({
      notification: { title: 'Someone liked your post', body: '' },
      data: { type: 'post_like', message_id: 'x1', tag: 'post_like:p1', url: '/p/p1' },
    });
    expect(sw.shown[0].options.tag).toBe('x1');
    expect(sw.shown[0].options.renotify).toBe(false);
  });
});
