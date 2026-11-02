/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — the Daily Diary screen
 * (tasks.md diary task 5): health-mode entry list loaded / empty / error,
 * text entry save, photo picker invoked + upload path, entry delete, voice
 * capture → backend STT → saved entry, bugs-mode ticket list loaded / empty /
 * error, report submit, and the `tab` switch health ↔ bugs. Fake gateway,
 * Supabase double, faked picker / recorder; no network.
 */
import '../helpers/no-network';
import { picker, readFile, recorder, audio, router, searchParams } from './mocks';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { DailyDiaryScreen, tabFromParam } from '../../src/screens/diary/DailyDiaryScreen';
import { FAIL, ORIGIN, USER, diaryWrapper, otherUsersEntry, photoEntry, savedEntry, textEntry, ticket, todayIso, voiceEntry, type Req } from './helpers';

afterEach(() => {
  searchParams.current = {};
  __clearToastsForTests();
  jest.clearAllMocks();
  recorder.uri = 'file:///rec.m4a';
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const toastKeys = () => __toastsForTests().map((t) => [t.titleKey, t.descKey]);
const lastToast = () => __toastsForTests().slice(-1)[0];
const posts = (requests: Req[], path: string) => requests.filter((r) => r.method === 'POST' && r.path === path);

describe('health mode (default): entry list', () => {
  it('lists the member’s own entries newest first, grouped by day, from diary_entries with the realtime refetch', async () => {
    const { wrapper, log, channels } = diaryWrapper({}, { entries: [textEntry, photoEntry, voiceEntry, otherUsersEntry] });
    const r = render(<DailyDiaryScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('diary-entries')).toBeTruthy());
    expect(screen.getByTestId('diary-health')).toBeTruthy();
    expect(screen.getAllByTestId('diary-entry')).toHaveLength(3);
    expect(screen.queryByText('Drank two litres of water')).toBeTruthy();
    // A caption-less photo entry shows the translated label; the first photo is the thumbnail with "+1".
    expect(screen.getByText('Photo entry')).toBeTruthy();
    expect(screen.getByText('+1')).toBeTruthy();
    // Date groups: today and a past date.
    expect(screen.getAllByTestId('diary-date-group')).toHaveLength(2);
    expect(screen.getByText('Today')).toBeTruthy();
    const select = log.filter((l) => l.op === 'from.diary_entries.select');
    expect(select[0].args).toEqual([[['user_id', USER]], ['created_at', { ascending: false }], 100]);
    // Realtime: a change refetches; leaving the screen removes the channel.
    expect(channels.map((c) => c.name)).toContain('diary-entries-changes-all');
    await act(async () => channels[0].handler?.());
    await waitFor(() => expect(log.filter((l) => l.op === 'from.diary_entries.select').length).toBeGreaterThan(select.length));
    r.unmount();
    expect(channels.every((c) => c.removed)).toBe(true);
  });

  it('shows the empty card when there are no entries', async () => {
    const { wrapper } = diaryWrapper({}, { entries: [] });
    render(<DailyDiaryScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('diary-entries-empty')).toBeTruthy());
    expect(screen.getByText('Start recording your wellness journey')).toBeTruthy();
  });

  it('shows an error notice with retry when the read fails', async () => {
    const { wrapper, log } = diaryWrapper({}, { entries: FAIL });
    render(<DailyDiaryScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('diary-entries-error')).toBeTruthy());
    const before = log.length;
    fireEvent.press(screen.getByTestId('diary-entries-retry'));
    await waitFor(() => expect(log.length).toBeGreaterThan(before));
  });

  it('shows five entries, then ten more per "Load more"', async () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ ...textEntry, id: `e-${i}`, text: `entry ${i}` }));
    const { wrapper } = diaryWrapper({}, { entries: many });
    render(<DailyDiaryScreen />, { wrapper });
    await waitFor(() => expect(screen.getAllByTestId('diary-entry')).toHaveLength(5));
    expect(screen.getByText(/^Load more \(2/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('diary-entries-more'));
    expect(screen.getAllByTestId('diary-entry')).toHaveLength(7);
    expect(screen.queryByTestId('diary-entries-more')).toBeNull();
  });

  it('opens a photo entry in the viewer', async () => {
    const { wrapper } = diaryWrapper({}, { entries: [photoEntry] });
    render(<DailyDiaryScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('diary-entry-photo')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-entry-photo'));
    await waitFor(() => expect(screen.getByTestId('diary-photo-viewer-count')).toBeTruthy());
    expect(screen.getByText('1 / 2')).toBeTruthy();
  });

  it('deletes an entry after the confirmation: its diary-photos objects, then the entry', async () => {
    const { wrapper, requests, log } = diaryWrapper({ 'DELETE /memory/diary/entries/e-photo': { ok: true } }, { entries: [photoEntry] });
    render(<DailyDiaryScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('diary-entry-delete')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-entry-delete'));
    await waitFor(() => expect(screen.getByTestId('diary-delete-confirm')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-delete-confirm'));
    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE')).toBe(true));
    expect(log.find((l) => l.op === 'storage.diary-photos.remove')?.args).toEqual([[`${USER}/a.jpg`, `${USER}/b.jpg`]]);
    expect(requests.find((r) => r.method === 'DELETE')?.path).toBe('/memory/diary/entries/e-photo');
    await waitFor(() => expect(toastKeys()).toContainEqual(['toasts.diary.entryDeleted', 'toasts.diary.diaryEntryHasRemoved']));
  });

  it('a failed delete shows the error toast', async () => {
    const { wrapper } = diaryWrapper({ 'DELETE /memory/diary/entries/e-text': FAIL }, { entries: [textEntry] });
    render(<DailyDiaryScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('diary-entry-delete')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-entry-delete'));
    await waitFor(() => expect(screen.getByTestId('diary-delete-confirm')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-delete-confirm'));
    await waitFor(() => expect(toastKeys()).toContainEqual(['toasts.diary.error', 'toasts.diary.failedDeleteEntryPleaseTryAgain']));
  });
});

describe('health mode: text entry', () => {
  it('saves through the one diary write path and toasts the Vitana Index move', async () => {
    const index = { entry_date: '2026-11-01', health_features_written: 2, pillars_after: null, index_delta: { total: 7, nutrition: 0, hydration: 5, exercise: 0, sleep: 0, mental: 2 } };
    const { wrapper, requests } = diaryWrapper({ 'POST /memory/diary/entries': savedEntry(index) }, { entries: [] });
    render(<DailyDiaryScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('diary-plus-text'));
    expect(screen.getByTestId('diary-plus-panel-text')).toBeTruthy();
    expect(screen.getByText(/^0 ?characters$/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('diary-text-input'), '  Drank water  ');
    fireEvent.press(screen.getByTestId('diary-text-save'));
    await waitFor(() => expect(posts(requests, '/memory/diary/entries')).toHaveLength(1));
    expect(posts(requests, '/memory/diary/entries')[0].body).toEqual({ text: 'Drank water', source: 'text', tags: ['diary', 'text'] });
    await waitFor(() => expect(screen.queryByTestId('diary-plus-panel-text')).toBeNull());
    const t = lastToast();
    expect([t.titleKey, t.descKey]).toEqual(['diaryNative.indexSaved.title', 'diaryNative.indexSaved.breakdown']);
    expect(t.params).toMatchObject({ n: '7', breakdown: 'Hydration +5 · Mental +2' });
  });

  it('without an Index move shows the plain saved toast; a failure shows the error toast', async () => {
    const { wrapper } = diaryWrapper({ 'POST /memory/diary/entries': savedEntry(null) }, { entries: [] });
    const r = render(<DailyDiaryScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('diary-plus-text'));
    fireEvent.changeText(screen.getByTestId('diary-text-input'), 'x');
    fireEvent.press(screen.getByTestId('diary-text-save'));
    await waitFor(() => expect(toastKeys()).toContainEqual(['toasts.diary.entrySaved', 'toasts.diary.yourDiaryEntryHasSavedSuccessfully']));
    r.unmount();

    const failing = diaryWrapper({ 'POST /memory/diary/entries': FAIL }, { entries: [] });
    render(<DailyDiaryScreen />, { wrapper: failing.wrapper });
    fireEvent.press(screen.getByTestId('diary-plus-text'));
    fireEvent.changeText(screen.getByTestId('diary-text-input'), 'y');
    fireEvent.press(screen.getByTestId('diary-text-save'));
    await waitFor(() => expect(toastKeys()).toContainEqual(['toasts.diary.saveFailed', 'toasts.diary.failedSaveYourEntryPleaseTry']));
    expect(screen.getByTestId('diary-plus-panel-text')).toBeTruthy();
  });

  it('the Text option toggles, and the close button closes the panel', () => {
    const { wrapper } = diaryWrapper({}, { entries: [] });
    render(<DailyDiaryScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('diary-plus-text'));
    expect(screen.getByTestId('diary-plus-panel-text')).toBeTruthy();
    fireEvent.press(screen.getByTestId('diary-plus-close'));
    expect(screen.queryByTestId('diary-plus-panel-text')).toBeNull();
  });
});

describe('health mode: photo entry', () => {
  it('picks from the library through expo-image-picker, uploads to diary-photos and saves a photo entry', async () => {
    const { wrapper, requests, log } = diaryWrapper({ 'POST /memory/diary/entries': savedEntry(null) }, { entries: [] });
    render(<DailyDiaryScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('diary-plus-camera'));
    fireEvent.press(screen.getByTestId('diary-photo-pick'));
    await waitFor(() => expect(screen.getByTestId('diary-photo-source-library')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-photo-source-library'));
    await waitFor(() => expect(screen.getByTestId('diary-photo-thumb-0')).toBeTruthy());
    expect(picker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], base64: true, allowsMultipleSelection: true }));

    // "Add more" from the camera.
    fireEvent.press(screen.getByTestId('diary-photo-add-more'));
    await waitFor(() => expect(screen.getByTestId('diary-photo-source-camera')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-photo-source-camera'));
    await waitFor(() => expect(screen.getByTestId('diary-photo-thumb-1')).toBeTruthy());
    expect(picker.launchCameraAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsMultipleSelection: false }));

    fireEvent.changeText(screen.getByTestId('diary-photo-caption'), ' Lunch salad ');
    fireEvent.press(screen.getByTestId('diary-photo-save'));
    await waitFor(() => expect(posts(requests, '/memory/diary/entries')).toHaveLength(1));
    const uploads = log.filter((l) => l.op === 'storage.diary-photos.upload');
    expect(uploads).toHaveLength(2);
    expect(uploads[0].args[0]).toMatch(new RegExp(`^${USER}/\\d+-[a-z0-9]+\\.jpg$`));
    expect(uploads[0].args[1]).toBe(3); // "QUJD" → 3 bytes
    expect(uploads[0].args[2]).toEqual({ contentType: 'image/jpeg' });
    const body = posts(requests, '/memory/diary/entries')[0].body;
    expect(body).toMatchObject({ text: 'Lunch salad', source: 'photo', tags: ['diary', 'photo'] });
    expect(body.attachments).toEqual(uploads.map((u) => `${ORIGIN}/storage/v1/object/public/diary-photos/${u.args[0]}`));
    await waitFor(() => expect(toastKeys()).toContainEqual(['toasts.diary.photosUploaded', 'toasts.diary.yourPhotoDiaryEntryHasSaved']));
    await waitFor(() => expect(screen.queryByTestId('diary-plus-panel-camera')).toBeNull());
  });

  it('a removed photo is not uploaded; a denied library permission toasts and picks nothing', async () => {
    const { wrapper } = diaryWrapper({}, { entries: [] });
    render(<DailyDiaryScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('diary-plus-camera'));
    fireEvent.press(screen.getByTestId('diary-photo-pick'));
    fireEvent.press(screen.getByTestId('diary-photo-source-library'));
    await waitFor(() => expect(screen.getByTestId('diary-photo-thumb-0')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-photo-thumb-0-remove'));
    expect(screen.queryByTestId('diary-photo-thumb-0')).toBeNull();
    expect(screen.getByTestId('diary-photo-pick')).toBeTruthy();

    picker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });
    fireEvent.press(screen.getByTestId('diary-photo-pick'));
    fireEvent.press(screen.getByTestId('diary-photo-source-library'));
    await waitFor(() => expect(toastKeys()).toContainEqual(['diaryNative.permissions.deniedTitle', 'diaryNative.permissions.deniedPhotos']));
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  });
});

describe('health mode: voice entry', () => {
  it('records with expo-audio, transcribes through the backend STT and saves a voice entry', async () => {
    jest.useFakeTimers();
    try {
      const { wrapper, requests, log } = diaryWrapper({ 'POST /memory/diary/entries': savedEntry(null) }, { entries: [], transcript: 'Walked by the river' }, 'de-DE');
      render(<DailyDiaryScreen />, { wrapper });
      await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
      expect(audio.requestRecordingPermissionsAsync).toHaveBeenCalled();
      expect(recorder.prepareToRecordAsync).toHaveBeenCalled();
      expect(recorder.record).toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.getByTestId('capture-duration').props.children).toBe('0:03');
      await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
      await waitFor(() => expect(screen.getByTestId('capture-transcript').props.value).toBe('Walked by the river'));
      expect(recorder.stop).toHaveBeenCalled();
      expect(readFile).toHaveBeenCalledWith('file:///rec.m4a');
      expect(log.find((l) => l.op === 'functions.transcribe-audio')?.args).toEqual([{ audio: 'QVVESU8=', language: 'de-DE', mimeType: 'audio/mp4' }]);
      await act(async () => fireEvent.press(screen.getByTestId('capture-save')));
      await waitFor(() => expect(posts(requests, '/memory/diary/entries')).toHaveLength(1));
      expect(posts(requests, '/memory/diary/entries')[0].body).toEqual({ text: 'Walked by the river', source: 'voice', tags: ['diary', 'voice'], duration: 3 });
      expect(toastKeys()).toContainEqual(['capture.entrySaved', 'capture.entrySavedDesc']);
    } finally {
      jest.useRealTimers();
    }
  });

  it('a denied microphone toasts and does not record', async () => {
    audio.requestRecordingPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const { wrapper } = diaryWrapper({}, { entries: [] });
    render(<DailyDiaryScreen />, { wrapper });
    await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
    expect(recorder.record).not.toHaveBeenCalled();
    expect(toastKeys()).toContainEqual(['diaryNative.permissions.deniedTitle', 'diaryNative.permissions.deniedMicrophone']);
  });

  it('an empty recording shows the recognition error', async () => {
    recorder.uri = null;
    const { wrapper, log } = diaryWrapper({}, { entries: [] });
    render(<DailyDiaryScreen />, { wrapper });
    await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
    await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
    await waitFor(() => expect(toastKeys()).toContainEqual(['capture.recognitionError', 'capture.recognitionErrorDesc']));
    expect(log.some((l) => l.op === 'functions.transcribe-audio')).toBe(false);
  });
});

describe('bugs mode (?tab=bugs): My reports', () => {
  it('lists the member’s bug / UX tickets with status, kind, severity and timeline', async () => {
    searchParams.current = { tab: 'bugs' };
    const tickets = [ticket(), ticket({ id: 't-2', ticket_number: 'FB-0002', kind: 'support_question' }), ticket({ id: 't-3', ticket_number: 'FB-0003', kind: 'ux_issue', status: 'user_confirmed', answer_md: 'Fixed in 1.2' })];
    const { wrapper, requests } = diaryWrapper({ 'GET /feedback/tickets/mine': { tickets } });
    render(<DailyDiaryScreen />, { wrapper });
    expect(screen.getByTestId('diary-bugs')).toBeTruthy();
    expect(screen.queryByTestId('diary-health')).toBeNull();
    await waitFor(() => expect(screen.getAllByTestId('member-ticket')).toHaveLength(2));
    expect(requests.find((r) => r.path === '/feedback/tickets/mine')?.query.get('limit')).toBe('100');
    const [open, done] = screen.getAllByTestId('member-ticket-status');
    expect(within(open).getByText('Under review')).toBeTruthy();
    expect(within(done).getByText('Fixed')).toBeTruthy();
    expect(screen.getAllByTestId('member-ticket-timeline')).toHaveLength(2);
    expect(screen.getByTestId('ticket-answer')).toBeTruthy();
    expect(screen.getByText('Fixed in 1.2')).toBeTruthy();
    expect(screen.queryByText(/FB-0002/)).toBeNull();
  });

  it('shows the empty state and the error state with retry', async () => {
    searchParams.current = { tab: 'bugs' };
    const empty = diaryWrapper({ 'GET /feedback/tickets/mine': { tickets: [ticket({ kind: 'feedback' })] } });
    const r = render(<DailyDiaryScreen />, { wrapper: empty.wrapper });
    await waitFor(() => expect(screen.getByTestId('diary-reports-empty')).toBeTruthy());
    r.unmount();
    const failing = diaryWrapper({ 'GET /feedback/tickets/mine': FAIL });
    render(<DailyDiaryScreen />, { wrapper: failing.wrapper });
    await waitFor(() => expect(screen.getByTestId('diary-reports-error')).toBeTruthy());
    const before = failing.requests.length;
    fireEvent.press(screen.getByTestId('diary-reports-retry'));
    await waitFor(() => expect(failing.requests.length).toBeGreaterThan(before));
  });

  it('a resolved ticket can be confirmed', async () => {
    searchParams.current = { tab: 'bugs' };
    const { wrapper, requests } = diaryWrapper({ 'GET /feedback/tickets/mine': { tickets: [ticket({ status: 'resolved', resolver_agent: 'devon' })] }, 'POST /feedback/tickets/t-1/confirm': { ok: true } });
    render(<DailyDiaryScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('member-ticket-yes')).toBeTruthy());
    expect(screen.getByText('Devon says this is fixed. Did it work?')).toBeTruthy();
    fireEvent.press(screen.getByTestId('member-ticket-yes'));
    await waitFor(() => expect(posts(requests, '/feedback/tickets/t-1/confirm')).toHaveLength(1));
    await waitFor(() => expect(toastKeys()).toContainEqual(['toasts.community.thanks', 'toasts.community.weLlKeepEyeIt']));
  });

  it('sends a UX report with a screenshot into the feedback_tickets pipeline and shows its number', async () => {
    searchParams.current = { tab: 'bugs' };
    let mine = 0;
    const { wrapper, requests, log } = diaryWrapper(
      {
        'GET /feedback/tickets/mine': () => (mine++, { tickets: [] }),
        'POST /feedback/tickets': { ok: true, ticket_number: 'FB-0042' },
      },
      { transcript: 'The pill is hard to tap' },
    );
    render(<DailyDiaryScreen />, { wrapper });
    await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
    await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
    await waitFor(() => expect(screen.getByTestId('capture-transcript').props.value).toBe('The pill is hard to tap'));
    fireEvent.press(screen.getByTestId('capture-attach'));
    fireEvent.press(screen.getByTestId('capture-photo-source-library'));
    await waitFor(() => expect(screen.getByTestId('capture-attachment-0')).toBeTruthy());
    fireEvent.press(screen.getByTestId('capture-type-ux'));
    await act(async () => fireEvent.press(screen.getByTestId('capture-send')));
    await waitFor(() => expect(screen.getByTestId('created-ticket-number')).toBeTruthy());
    expect(screen.getByText('Your ticket number: FB-0042')).toBeTruthy();
    const upload = log.find((l) => l.op === 'storage.feedback-attachments.upload');
    const sign = log.find((l) => l.op === 'storage.feedback-attachments.sign');
    expect(sign?.args).toEqual([upload?.args[0], 31536000]);
    const body = posts(requests, '/feedback/tickets')[0].body;
    expect(body).toEqual({
      raw_text: 'The pill is hard to tap',
      kind: 'ux_issue',
      screen_path: '/daily-diary',
      screenshot_url: `${ORIGIN}/signed/feedback-attachments/${upload?.args[0]}`,
      structured_fields: { severity: 'medium', attachments: [`${ORIGIN}/signed/feedback-attachments/${upload?.args[0]}`], affected_screen: null, source: 'capture_card' },
    });
    // "My reports" refetches after the submit; "View ticket" opens the Support ticket.
    await waitFor(() => expect(mine).toBeGreaterThan(1));
    fireEvent.press(screen.getByTestId('capture-view-ticket'));
    expect(router.navigate).toHaveBeenCalledWith('/support?tab=tickets&ticket=FB-0042');
    fireEvent.press(screen.getByTestId('capture-send-another'));
    expect(screen.getByTestId('capture-card-bugs')).toBeTruthy();
  });

  it('a failed submit keeps the report and toasts', async () => {
    searchParams.current = { tab: 'bugs' };
    const { wrapper } = diaryWrapper({ 'GET /feedback/tickets/mine': { tickets: [] }, 'POST /feedback/tickets': { ok: false, error: 'nope' } });
    render(<DailyDiaryScreen />, { wrapper });
    await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
    await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
    await waitFor(() => expect(screen.getByTestId('capture-send')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('capture-send')));
    await waitFor(() => expect(toastKeys()).toContainEqual(['capture.sendFailed', 'capture.sendFailedDesc']));
    expect(screen.queryByTestId('capture-confirmation')).toBeNull();
    expect(screen.getByTestId('capture-transcript').props.value).toBe('I walked by the river');
  });
});

describe('tab param and switch', () => {
  it('tabFromParam: only "bugs" selects Bug Reports', () => {
    expect(tabFromParam('bugs')).toBe('bugs');
    expect(tabFromParam('health')).toBe('health');
    expect(tabFromParam(undefined)).toBe('health');
    expect(tabFromParam('nope')).toBe('health');
  });

  it('switches health ↔ bugs through the mode pill', async () => {
    const { wrapper } = diaryWrapper({ 'GET /feedback/tickets/mine': { tickets: [] } }, { entries: [] });
    render(<DailyDiaryScreen />, { wrapper });
    expect(screen.getByTestId('diary-health')).toBeTruthy();
    expect(screen.getByText('Health Diary')).toBeTruthy();
    fireEvent.press(screen.getByTestId('diary-plus-text'));
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-bugs'));
    await waitFor(() => expect(screen.getByTestId('diary-bugs')).toBeTruthy());
    expect(screen.queryByTestId('diary-health')).toBeNull();
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-health'));
    await waitFor(() => expect(screen.getByTestId('diary-health')).toBeTruthy());
    // Switching closes an open Text / Photo option (web setActivePlusOption(null)).
    expect(screen.queryByTestId('diary-plus-panel-text')).toBeNull();
  });

  it('?tab=health opens Health Diary; the entry date of today is grouped under Today', async () => {
    searchParams.current = { tab: 'health' };
    const { wrapper } = diaryWrapper({}, { entries: [{ ...textEntry, created_at: todayIso }] });
    render(<DailyDiaryScreen />, { wrapper });
    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    expect(screen.getByTestId('diary-health')).toBeTruthy();
  });
});
