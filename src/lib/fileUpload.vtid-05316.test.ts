/**
 * VTID-05316 (messenger-ux-v2/ui-media-album) — real upload progress: the file
 * goes to a signed upload URL via XMLHttpRequest (same bucket and path rule),
 * progress events reach the caller, a refused PUT is a failure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const createSignedUploadUrl = vi.fn();
const uploadToSignedUrl = vi.fn();
const createSignedUrl = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_PUBLISHABLE_KEY: 'anon-key',
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'me' } }, error: null }) },
    storage: { from: () => ({ createSignedUploadUrl, uploadToSignedUrl, createSignedUrl }) },
  },
}));

import { uploadChatAttachment } from './fileUpload';

type Listener = (e: { lengthComputable: boolean; loaded: number; total: number }) => void;
class FakeXHR {
  static last: FakeXHR | null = null;
  static mode: 'ok' | 'status' | 'network' = 'ok';
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: FormData | null = null;
  upload: { onprogress: Listener | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  open(m: string, u: string) { this.method = m; this.url = u; FakeXHR.last = this; }
  setRequestHeader(k: string, v: string) { this.headers[k] = v; }
  abort() { this.onabort?.(); }
  send(body: FormData) {
    this.body = body;
    setTimeout(() => {
      if (FakeXHR.mode === 'network') { this.onerror?.(); return; }
      this.upload.onprogress?.({ lengthComputable: true, loaded: 40, total: 100 });
      this.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
      this.status = FakeXHR.mode === 'ok' ? 200 : 403;
      this.onload?.();
    }, 0);
  }
}

beforeEach(() => {
  vi.stubGlobal('XMLHttpRequest', FakeXHR);
  FakeXHR.mode = 'ok';
  FakeXHR.last = null;
  createSignedUploadUrl.mockReset().mockImplementation(async (path: string) => ({
    data: { signedUrl: `https://sb.test/storage/v1/object/upload/sign/chat-attachments/${path}?token=tok`, path, token: 'tok' }, error: null,
  }));
  uploadToSignedUrl.mockReset().mockImplementation(async (path: string) => ({ data: { path }, error: null }));
  createSignedUrl.mockReset().mockResolvedValue({ data: { signedUrl: 'https://sb.test/signed/read' }, error: null });
});

const file = () => new File([new Uint8Array(100)], 'photo.jpg', { type: 'image/jpeg' });

describe('uploadChatAttachment (VTID-05316)', () => {
  it('PUTs the file to the signed upload URL (same path rule) and reports real progress', async () => {
    const progress: number[] = [];
    const result = await uploadChatAttachment(file(), (p) => progress.push(p.percentage), 'peer-1');
    const path = createSignedUploadUrl.mock.calls[0][0] as string;
    expect(path).toMatch(/^me\/peer-1\/\d+_[a-z0-9]+\.jpg$/);
    expect(FakeXHR.last!.method).toBe('PUT');
    expect(FakeXHR.last!.url).toContain(`/object/upload/sign/chat-attachments/${path}?token=tok`);
    expect(FakeXHR.last!.headers.apikey).toBe('anon-key');
    expect(FakeXHR.last!.body!.get('')).toBeInstanceOf(File);
    expect(progress).toEqual([40, 99, 100]); // never 100 % before the server answered
    expect(result).toMatchObject({ path, url: 'https://sb.test/signed/read', name: 'photo.jpg', type: 'image/jpeg', size: 100 });
    expect(uploadToSignedUrl).not.toHaveBeenCalled();
  });

  it('a refused PUT (4xx) fails the upload', async () => {
    FakeXHR.mode = 'status';
    await expect(uploadChatAttachment(file(), undefined, 'peer-1')).rejects.toThrow('Upload failed (403)');
    expect(uploadToSignedUrl).not.toHaveBeenCalled();
  });

  it('a network failure of the XHR falls back to the client library (no progress, same result)', async () => {
    FakeXHR.mode = 'network';
    const result = await uploadChatAttachment(file(), undefined, 'peer-1');
    expect(uploadToSignedUrl).toHaveBeenCalledTimes(1);
    expect(result.url).toBe('https://sb.test/signed/read');
  });

  it('cancelling aborts the request', async () => {
    const ctl = new AbortController();
    const p = uploadChatAttachment(file(), undefined, 'peer-1', { signal: ctl.signal });
    await new Promise((r) => setTimeout(r, 0));
    ctl.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });
});
