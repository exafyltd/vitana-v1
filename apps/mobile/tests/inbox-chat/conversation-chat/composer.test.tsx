/**
 * VTID-05458 fix 1 — the composer surfaces the mobile web shows
 * (MessageInput.tsx / AttachmentMenu.tsx / emoji-picker.tsx /
 * voice-recorder.tsx): the emoji picker with per-member recents, the group
 * paperclip → library → signed upload with progress → `attachment` message,
 * a failed upload with Retry, removing an upload deletes it, the voice
 * recorder → upload → `voice` message, the DM attachment menu (calendar
 * invite, Send Funds → process_wallet_transfer + confirmation, Request
 * Payment) and the iOS wallet gate. The device is a fake (picker, upload,
 * recorder); the Supabase double and the gateway fake record every call.
 */
import '../../helpers/no-network';
import './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { registerChatDevice } from '../../../src/ports/chat-device';
import { __clearToastsForTests, __toastsForTests } from '../../../src/ports/ui';
import { MessageInput } from '../../../src/screens/chat/MessageInput';
import { buildCalendarInvite } from '../../../src/screens/chat/AttachmentMenu';
import { __resetRecentEmojiMemoryForTests, recentEmojiKey } from '../../../src/screens/chat/data/emojiRecents';
import { createChatDouble, fakeDevice, makeChatWrapper, ME, PEER } from './helpers';

const originalOS = Platform.OS;
afterEach(() => {
  registerChatDevice(null);
  __clearToastsForTests();
  __resetRecentEmojiMemoryForTests();
  (Platform as { OS: string }).OS = originalOS;
});
afterAll(() => __setSupabaseForTests(null));

const photo = { uri: 'file:///p1.jpg', name: 'p1.jpg', mimeType: 'image/jpeg', size: 2048 };

function setup(props: Partial<Parameters<typeof MessageInput>[0]> = {}, device = fakeDevice(), dOpts: Parameters<typeof createChatDouble>[0] = {}) {
  registerChatDevice(device.device as never);
  const d = createChatDouble(dOpts);
  const onSend = jest.fn(async () => undefined);
  const wrapper = makeChatWrapper({ client: d.client });
  render(<MessageInput placeholder="Message…" onSend={onSend} currentUserId={ME} threadId="g1" conversationType="group" {...props} />, { wrapper });
  return { d, onSend, device };
}

describe('emoji picker', () => {
  it('opens on the smiley, appends the pick to the text and records it as the member\'s recent', async () => {
    const { onSend } = setup();
    fireEvent.press(screen.getByTestId('emoji-picker-button'));
    expect(await screen.findByTestId('emoji-grid-recent')).toBeTruthy();
    fireEvent.press(screen.getByTestId('emoji-tab-food'));
    fireEvent.press(screen.getByTestId('emoji-🍓'));
    expect(screen.getByTestId('message-input-field').props.value).toBe('🍓');
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(recentEmojiKey(ME))) ?? '[]')).toEqual(['🍓']));
    fireEvent.press(screen.getByTestId('message-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('🍓', 'text', null, undefined));
  });

  it('shows the tab names from the catalog', async () => {
    setup();
    fireEvent.press(screen.getByTestId('emoji-picker-button'));
    expect(await screen.findByText('Recent')).toBeTruthy();
    expect(screen.getByText('Smileys')).toBeTruthy();
  });
});

describe('attachments (group paperclip → library → upload)', () => {
  it('uploads to chat-attachments {me}/{thread}/… with progress and sends an attachment message', async () => {
    const dev = fakeDevice({ pick: { status: 'picked', files: [photo] } });
    const { d, onSend } = setup({}, dev);
    fireEvent.press(screen.getByTestId('attach-paperclip'));
    fireEvent.press(await screen.findByTestId('attach-source-library'));
    await waitFor(() => expect(screen.getByTestId('attachment-chip')).toBeTruthy());
    expect(dev.log.picked).toEqual(['library']);
    const upload = d.storageOps.find((o) => o.op === 'createSignedUploadUrl');
    expect(upload?.bucket).toBe('chat-attachments');
    expect(upload?.path).toMatch(new RegExp(`^${ME}/g1/\\d+_[a-z0-9]+\\.jpg$`));
    expect(dev.log.puts[0].url).toContain('https://upload.test/chat-attachments/');
    expect(dev.log.puts[0].headers['x-upsert']).toBe('false');
    expect(screen.queryByTestId('message-mic')).toBeNull();
    fireEvent.press(screen.getByTestId('message-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalled());
    const [body, type, data] = (onSend.mock.calls[0] as unknown) as [string, string, { attachments: Array<Record<string, unknown>> }];
    expect(body).toBe('');
    expect(type).toBe('attachment');
    expect(data.attachments[0]).toMatchObject({ type: 'image', name: 'p1.jpg', filename: 'p1.jpg', size: 2048, mime: 'image/jpeg', path: upload?.path });
  });

  it('a failed upload stays as a chip with Retry, blocks sending, and Retry uploads again', async () => {
    const dev = fakeDevice({ pick: { status: 'picked', files: [photo] }, failPut: true });
    setup({}, dev);
    fireEvent.press(screen.getByTestId('attach-paperclip'));
    fireEvent.press(await screen.findByTestId('attach-source-camera'));
    expect(await screen.findByTestId('upload-failed')).toBeTruthy();
    expect(__toastsForTests().some((x) => x.titleKey === 'toasts.messages.uploadFailed')).toBe(true);
    fireEvent.changeText(screen.getByTestId('message-input-field'), 'caption');
    expect(screen.queryByTestId('message-send')).toBeNull();
    fireEvent.press(screen.getByTestId('upload-retry'));
    await waitFor(() => expect(dev.log.puts).toHaveLength(2));
  });

  it('removing an uploaded file deletes it from storage', async () => {
    const dev = fakeDevice({ pick: { status: 'picked', files: [photo] } });
    const { d } = setup({}, dev);
    fireEvent.press(screen.getByTestId('attach-paperclip'));
    fireEvent.press(await screen.findByTestId('attach-source-library'));
    await waitFor(() => expect(screen.getByTestId('attachment-chip')).toBeTruthy());
    fireEvent.press(screen.getByTestId('attachment-remove-0'));
    await waitFor(() => expect(d.storageOps.some((o) => o.op === 'remove')).toBe(true));
    expect(screen.queryByTestId('attachment-chip')).toBeNull();
  });

  it('a file type the web refuses is not uploaded ("File not allowed")', async () => {
    const dev = fakeDevice({ pick: { status: 'picked', files: [{ ...photo, mimeType: 'application/x-msdownload', name: 'x.exe' }] } });
    setup({}, dev);
    fireEvent.press(screen.getByTestId('attach-paperclip'));
    fireEvent.press(await screen.findByTestId('attach-source-files'));
    await waitFor(() => expect(__toastsForTests().some((x) => x.titleKey === 'toasts.messages.fileNotAllowed')).toBe(true));
    expect(dev.log.puts).toHaveLength(0);
  });
});

describe('voice recorder', () => {
  it('mic → recording → stop → send uploads the take and sends a voice message', async () => {
    const dev = fakeDevice();
    const { d, onSend } = setup({}, dev);
    fireEvent.press(screen.getByTestId('message-mic'));
    expect(await screen.findByTestId('voice-recorder-recording')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('voice-recorder-stop'));
    });
    expect(await screen.findByTestId('voice-recorder-review')).toBeTruthy();
    fireEvent.press(screen.getByTestId('voice-recorder-play'));
    expect(dev.log.players[0].source).toBe('file:///voice.m4a');
    expect(dev.log.players[0].played).toBe(1);
    fireEvent.press(screen.getByTestId('voice-recorder-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalled());
    const [body, type, data] = (onSend.mock.calls[0] as unknown) as [string, string, { attachments: Array<Record<string, unknown>> }];
    expect(body).toMatch(/^🎤 Voice message \(\d+s\)$/);
    expect(type).toBe('voice');
    expect(data.attachments[0]).toMatchObject({ type: 'voice' });
    expect(d.storageOps.find((o) => o.op === 'createSignedUploadUrl')?.path).toMatch(new RegExp(`^${ME}/draft/\\d+_[a-z0-9]+\\.m4a$`));
    expect(dev.log.puts[0].name).toMatch(/^voice_\d+_[a-z0-9]+\.m4a$/);
  });

  it('a refused microphone shows "Microphone access denied"', async () => {
    setup({}, fakeDevice({ recordResult: 'denied' }));
    fireEvent.press(screen.getByTestId('message-mic'));
    expect(await screen.findByTestId('voice-recorder-denied')).toBeTruthy();
  });

  it('discard throws the recording away and brings the composer back', async () => {
    const dev = fakeDevice();
    const { onSend } = setup({}, dev);
    fireEvent.press(screen.getByTestId('message-mic'));
    await screen.findByTestId('voice-recorder-recording');
    fireEvent.press(screen.getByTestId('voice-recorder-discard'));
    expect(await screen.findByTestId('message-input-field')).toBeTruthy();
    expect(dev.log.recorder.cancelled).toBeGreaterThan(0);
    expect(onSend).not.toHaveBeenCalled();
  });
});

describe('DM attachment menu', () => {
  const recipient = { id: PEER, name: 'Petra Peer', avatar: null };

  it('Calendar invite builds the web\'s calendar_invite message with Accept / Decline / Maybe', async () => {
    const { onSend } = setup({ conversationType: 'direct', recipient });
    fireEvent.press(screen.getByTestId('attachment-menu-button'));
    fireEvent.press(await screen.findByTestId('attach-calendar'));
    fireEvent.changeText(await screen.findByTestId('calendar-invite-title'), 'Laufen');
    fireEvent.press(screen.getByTestId('calendar-invite-datetime'));
    fireEvent.changeText(screen.getByTestId('calendar-invite-location'), 'Park');
    fireEvent.press(screen.getByTestId('calendar-invite-submit'));
    await waitFor(() => expect(onSend).toHaveBeenCalled());
    const [body, type, data, , buttons] = (onSend.mock.calls[0] as unknown) as [string, string, Record<string, unknown>, undefined, Array<{ action: string }>];
    expect(body).toBe('Calendar invite: Laufen at 18:30 on 2026-11-20 at Park');
    expect(type).toBe('calendar_invite');
    expect(data).toMatchObject({ title: 'Laufen', date: '2026-11-20', time: '18:30', endTime: '19:30', location: 'Park', type: 'meeting' });
    expect(buttons.map((b) => b.action)).toEqual(['calendar_accept', 'calendar_decline', 'calendar_maybe']);
  });

  it('buildCalendarInvite: 60 minutes long, ISO start/end from the local day and time', () => {
    const inv = buildCalendarInvite('Yoga', '2026-11-20', '23:30', '', '');
    expect(inv.eventData.endTime).toBe('00:30');
    expect(new Date(inv.eventData.end_time).getTime() - new Date(inv.eventData.start_time).getTime()).toBe(60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  });

  it('Android: Send Funds transfers with process_wallet_transfer and posts the payment confirmation', async () => {
    (Platform as { OS: string }).OS = 'android';
    const rpc = {
      process_wallet_transfer: () => ({ data: [{ transaction_id: 'tx-1', from_balance: 70, to_balance: 30 }], error: null }),
    };
    const { d, onSend } = setup({ conversationType: 'direct', recipient }, fakeDevice(), { tables: { user_wallets: [{ user_id: ME, currency_type: 'USD', balance: 100 }] }, rpc });
    fireEvent.press(screen.getByTestId('attachment-menu-button'));
    fireEvent.press(await screen.findByTestId('attach-send-funds'));
    await waitFor(() => expect(screen.getByTestId('send-funds-balance').props.children.join('')).toContain('100'));
    fireEvent.changeText(screen.getByTestId('send-funds-amount'), '30');
    fireEvent.changeText(screen.getByTestId('send-funds-description'), 'Pizza');
    fireEvent.press(screen.getByTestId('send-funds-submit'));
    await waitFor(() => expect(onSend).toHaveBeenCalled());
    expect(d.calls.find((c) => c.fn === 'rpc.process_wallet_transfer')?.args[0]).toEqual({ p_from_user_id: ME, p_to_user_id: PEER, p_currency: 'USD', p_amount: 30 });
    const [body, type, data] = (onSend.mock.calls[0] as unknown) as [string, string, Record<string, unknown>];
    expect(body).toBe('✅ Payment completed: 30 USD - Pizza');
    expect(type).toBe('payment_confirmation');
    expect(data).toMatchObject({ amount: 30, currency: 'USD', status: 'completed', transactionId: 'tx-1' });
  });

  it('Android: Request Payment sends a pending payment_request', async () => {
    (Platform as { OS: string }).OS = 'android';
    const { onSend } = setup({ conversationType: 'direct', recipient });
    fireEvent.press(screen.getByTestId('attachment-menu-button'));
    fireEvent.press(await screen.findByTestId('attach-request-payment'));
    fireEvent.changeText(await screen.findByTestId('payment-request-amount'), '12');
    fireEvent.changeText(screen.getByTestId('payment-request-description'), 'Tickets');
    fireEvent.press(screen.getByTestId('payment-request-submit'));
    await waitFor(() => expect(onSend).toHaveBeenCalled());
    const [body, type, data] = (onSend.mock.calls[0] as unknown) as [string, string, Record<string, unknown>];
    expect(body).toBe('💰 Payment Request: 12 CREDITS - Tickets');
    expect(type).toBe('payment_request');
    expect(data).toMatchObject({ amount: 12, currency: 'CREDITS', description: 'Tickets', status: 'pending', recipientId: PEER });
  });

  it('iOS: the wallet items stay hidden (the drawer\'s iapRestricted gate); invite + file remain', async () => {
    (Platform as { OS: string }).OS = 'ios';
    setup({ conversationType: 'direct', recipient });
    fireEvent.press(screen.getByTestId('attachment-menu-button'));
    expect(await screen.findByTestId('attach-calendar')).toBeTruthy();
    expect(screen.getByTestId('attach-file')).toBeTruthy();
    expect(screen.queryByTestId('attach-send-funds')).toBeNull();
    expect(screen.queryByTestId('attach-request-payment')).toBeNull();
  });

  it('Attach file opens the phone chooser (library / camera / files); a document uploads as a file attachment', async () => {
    const pdf = { uri: 'file:///cache/plan.pdf', name: 'plan.pdf', mimeType: 'application/pdf', size: 4096 };
    const dev = fakeDevice({ pick: { status: 'picked', files: [pdf] } });
    const { onSend } = setup({ conversationType: 'direct', recipient, threadId: PEER }, dev);
    fireEvent.press(screen.getByTestId('attachment-menu-button'));
    fireEvent.press(await screen.findByTestId('attach-file'));
    expect(await screen.findByTestId('attach-source-library')).toBeTruthy();
    expect(screen.getByTestId('attach-source-camera')).toBeTruthy();
    fireEvent.press(screen.getByTestId('attach-source-files'));
    await waitFor(() => expect(screen.getByTestId('attachment-chip')).toBeTruthy());
    expect(dev.log.picked).toEqual(['files']);
    fireEvent.press(screen.getByTestId('message-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalled());
    const [, type, data] = (onSend.mock.calls[0] as unknown) as [string, string, { attachments: Array<Record<string, unknown>> }];
    expect(type).toBe('attachment');
    expect(data.attachments[0]).toMatchObject({ type: 'file', name: 'plan.pdf', mime: 'application/pdf', size: 4096 });
  });

  it('Request Payment due date comes from the date picker as YYYY-MM-DD', async () => {
    (Platform as { OS: string }).OS = 'android';
    const { onSend } = setup({ conversationType: 'direct', recipient }, fakeDevice({ pickDate: new Date(2026, 11, 24, 9, 0) }));
    fireEvent.press(screen.getByTestId('attachment-menu-button'));
    fireEvent.press(await screen.findByTestId('attach-request-payment'));
    fireEvent.changeText(await screen.findByTestId('payment-request-amount'), '3');
    fireEvent.changeText(screen.getByTestId('payment-request-description'), 'Kaffee');
    fireEvent.press(screen.getByTestId('payment-request-due'));
    fireEvent.press(screen.getByTestId('payment-request-submit'));
    await waitFor(() => expect(onSend).toHaveBeenCalled());
    expect(((onSend.mock.calls[0] as unknown) as [string, string, Record<string, unknown>])[2].dueDate).toBe('2026-12-24');
  });
});
