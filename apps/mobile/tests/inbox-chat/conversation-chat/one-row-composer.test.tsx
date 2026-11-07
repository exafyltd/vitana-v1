/**
 * Chat screen layout fixes on the device:
 *  - the group composer is never more than one row, whatever the group name is
 *    (the placeholder "Nachricht an {group}…" used to wrap and grow the field);
 *  - the group name in that placeholder is cut short, and a DM keeps its own
 *    placeholder and its full-height field;
 *  - on Android the chat frame adds no safe-area padding of its own (the Modal's
 *    window already sits between the system bars: the white bands above the
 *    header and below the composer were the second inset).
 */
import '../../helpers/no-network';
import './mocks';
import { render, screen } from '@testing-library/react-native';
import { Platform, StyleSheet, Text } from 'react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { registerChatDevice } from '../../../src/ports/chat-device';
import { MessageInput } from '../../../src/screens/chat/MessageInput';
import { ChatFrame } from '../../../src/screens/chat/ChatFrame';
import { composerPlaceholder } from '../../../src/screens/chat/data/thread';
import { createChatDouble, makeChatWrapper, ME } from './helpers';

const originalOS = Platform.OS;
afterEach(() => {
  registerChatDevice(null);
  (Platform as { OS: string }).OS = originalOS;
});
afterAll(() => __setSupabaseForTests(null));

function renderComposer(conversationType: 'group' | 'direct') {
  const d = createChatDouble({});
  const wrapper = makeChatWrapper({ client: d.client });
  render(
    <MessageInput placeholder="Nachricht…" onSend={jest.fn(async () => undefined)} currentUserId={ME} threadId="t1" conversationType={conversationType} />,
    { wrapper },
  );
  return StyleSheet.flatten(screen.getByTestId('message-input-field').props.style);
}

describe('composer is one row', () => {
  it('a group composer caps the field at one row', () => {
    const style = renderComposer('group');
    expect(style.maxHeight).toBe(40);
    expect(style.minHeight).toBe(40);
  });

  it('a DM composer keeps the multi-row field', () => {
    const style = renderComposer('direct');
    expect(style.maxHeight).toBe(120);
  });
});

describe('group placeholder', () => {
  const t = (key: string, params?: Record<string, string | number>) => `${key}:${params?.name ?? ''}`;
  const group = (name: string) => ({ type: 'group', name }) as never;

  it('cuts a long group name short so the placeholder stays on one row', () => {
    const out = composerPlaceholder(group('Köln - Maxina Joggen für Kinder und Familien'), ME, t);
    expect(out).toBe('screens.messages.messageGroupPlaceholder:Köln - Maxina');
    expect(out.split(':')[1].length).toBeLessThanOrEqual(14);
  });

  it('a short group name is passed through unchanged', () => {
    expect(composerPlaceholder(group('Alle Beisammen'), ME, t)).toBe('screens.messages.messageGroupPlaceholder:Alle Beisammen');
  });
});

describe('chat frame insets', () => {
  it('on Android it adds no top or bottom padding of its own', () => {
    (Platform as { OS: string }).OS = 'android';
    const d = createChatDouble({});
    render(
      <ChatFrame onBack={jest.fn()} testID="frame">
        <Text>body</Text>
      </ChatFrame>,
      { wrapper: makeChatWrapper({ client: d.client }) },
    );
    const style = StyleSheet.flatten(screen.getByTestId('frame').props.style);
    expect(style.paddingTop).toBe(0);
    expect(style.paddingBottom).toBe(0);
  });
});
