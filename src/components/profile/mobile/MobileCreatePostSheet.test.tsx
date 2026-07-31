/**
 * Regression tests for the "Etwas ist schiefgelaufen / Upload failed: Load failed"
 * toast that community members saw on posts that had actually gone through
 * (VTID-03466).
 *
 * The composer used to gate its Post button on `createPost.isPending`, which
 * only flips once the *insert* starts — i.e. after the media upload already
 * finished. For the whole multi-second upload the button stayed enabled and
 * showed no spinner, so authors re-tapped it and each tap fired another full
 * concurrent upload of the same file. Storage kept every copy (8 orphaned
 * objects for one reported post), while the saturated uplink made WebKit abort
 * some of the in-flight requests with TypeError "Load failed" *after* the bytes
 * had landed — an error toast on a post that succeeded.
 */
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const uploadMock = vi.fn();
const listMock = vi.fn();
const getUserMock = vi.fn();
const mutateAsyncMock = vi.fn();
const notifyErrorMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => getUserMock(...a) },
    storage: {
      from: () => ({
        upload: (...a: unknown[]) => uploadMock(...a),
        list: (...a: unknown[]) => listMock(...a),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
      }),
    },
  },
}));

vi.mock('@/hooks/useProfilePosts', () => ({
  useProfilePosts: () => ({
    // Mirrors the real hook during the upload leg: the insert has not started,
    // so `isPending` is false — which is precisely why it was the wrong flag
    // to gate the button on.
    createPost: { mutateAsync: mutateAsyncMock, isPending: false },
  }),
}));

vi.mock('@/lib/i18n-toast', () => ({
  notifyError: (...a: unknown[]) => notifyErrorMock(...a),
  t: (k: string) => k,
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ translate: (_k: string, fallback?: string) => fallback ?? _k }),
}));
vi.mock('@/lib/post-backgrounds', () => ({ getPostBackground: () => null }));
vi.mock('@/components/feed/PostBackgroundPicker', () => ({ PostBackgroundPicker: () => null }));
vi.mock('@/components/feed/MentionTextarea', () => ({
  MentionTextarea: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <textarea aria-label={placeholder ?? 'content'} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { MobileCreatePostSheet } from './MobileCreatePostSheet';

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

/** Attach an image and wait for the composer to show its preview. */
async function attachImage(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array(1024)], 'sweet-potato.jpg', { type: 'image/jpeg' });
  fireEvent.change(input, { target: { files: [file] } });
  await screen.findByAltText('screens.profile.preview');
}

const postButton = () => screen.getByRole('button', { name: /Post/i });

beforeEach(() => {
  // resetAllMocks, not clearAllMocks: clear only wipes call history and leaves
  // an unconsumed mockResolvedValueOnce queued for the next test.
  vi.resetAllMocks();
  getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  mutateAsyncMock.mockResolvedValue(undefined);
  listMock.mockResolvedValue({ data: [], error: null });
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:preview', writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, writable: true });
});

describe('MobileCreatePostSheet — duplicate upload guard (VTID-03466)', () => {
  it('fires exactly one upload and one post when the button is tapped repeatedly during the upload', async () => {
    const upload = deferred<{ error: null }>();
    uploadMock.mockReturnValue(upload.promise);

    const { container } = render(<MobileCreatePostSheet open onOpenChange={() => {}} />);
    await attachImage(container);

    // The burst that caused the bug: the author taps Post again and again
    // because nothing on screen acknowledged the first tap. Dispatched inside a
    // single act() so React has not re-rendered (and cannot have disabled the
    // button) between taps — this is the same-tick race that only the
    // synchronous ref lock can catch.
    const btn = postButton();
    await act(async () => {
      for (let i = 0; i < 8; i++) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    upload.resolve({ error: null });

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it('disables the Post button for the whole upload, not just the insert', async () => {
    const upload = deferred<{ error: null }>();
    uploadMock.mockReturnValue(upload.promise);

    const { container } = render(<MobileCreatePostSheet open onOpenChange={() => {}} />);
    await attachImage(container);

    // Hold the node: once submitting, the button renders as a bare spinner with
    // no accessible name, but React keeps the same DOM element.
    const btn = postButton();
    fireEvent.click(btn);

    // While the upload is still in flight — `createPost.isPending` is false here.
    await waitFor(() => expect(uploadMock).toHaveBeenCalled());
    expect(btn).toBeDisabled();

    upload.resolve({ error: null });
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));
  });

  it('reuses one object path across retries instead of orphaning a copy per attempt', async () => {
    uploadMock.mockResolvedValueOnce({ error: { message: 'Load failed' } });
    listMock.mockResolvedValue({ data: [], error: null }); // genuinely did not land
    uploadMock.mockResolvedValueOnce({ error: null });

    const { container } = render(<MobileCreatePostSheet open onOpenChange={() => {}} />);
    await attachImage(container);

    fireEvent.click(postButton());
    await waitFor(() => expect(notifyErrorMock).toHaveBeenCalledWith('toasts.profile.uploadFailed'));

    fireEvent.click(postButton());
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));

    expect(uploadMock).toHaveBeenCalledTimes(2);
    expect(uploadMock.mock.calls[1][0]).toBe(uploadMock.mock.calls[0][0]);
  });
});

describe('MobileCreatePostSheet — lost upload response (VTID-03466)', () => {
  it('still creates the post when the object landed but the response was dropped', async () => {
    uploadMock.mockResolvedValue({ error: { message: 'Load failed' } });
    listMock.mockImplementation((dir: string) =>
      Promise.resolve({ data: [{ name: uploadMock.mock.calls[0][0].slice(dir.length + 1) }], error: null }),
    );

    const { container } = render(<MobileCreatePostSheet open onOpenChange={() => {}} />);
    await attachImage(container);
    // Tag the post with text unique to this test so a stray late call from
    // another test's component can never satisfy the assertion.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'dropped-response-case' } });
    fireEvent.click(postButton());

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'dropped-response-case',
          imageUrl: expect.stringContaining('user-1/posts/'),
        }),
      ),
    );
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it('reports a genuine upload failure and does not create a post', async () => {
    uploadMock.mockResolvedValue({ error: { message: 'Load failed' } });
    listMock.mockResolvedValue({ data: [], error: null });

    const { container } = render(<MobileCreatePostSheet open onOpenChange={() => {}} />);
    await attachImage(container);
    fireEvent.click(postButton());

    await waitFor(() => expect(notifyErrorMock).toHaveBeenCalledWith('toasts.profile.uploadFailed'));
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });
});
