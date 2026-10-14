/**
 * VTID-05138 — what a member can do with a picture in a chat: download it,
 * copy it to the clipboard, share it, and decide whether a message can be
 * forwarded at all. Shared by the bubble, the full-screen viewer and the
 * forward sheet; every outcome a member sees is a translated toast.
 */
import { notify, notifyError } from '@/lib/i18n-toast';
import { isAppilix, share as appilixShare } from '@/lib/appilix';

export interface ChatAttachmentLike {
  type?: string;
  mime?: string;
  filename?: string;
  name?: string;
  url?: string;
  path?: string;
  size?: number;
  duration?: number;
}

const IMAGE_NAME_RX = /\.(jpe?g|png|gif|webp|svg|heic|heif|bmp|tiff?|avif)$/i;

/**
 * An attachment is a picture when its type or mime says so, or — because
 * Android pickers can deliver an empty mime for screenshots — when its file
 * name ends in an image extension.
 */
export function isImageAttachment(att: ChatAttachmentLike | null | undefined): boolean {
  if (!att) return false;
  const filename = att.filename || att.name || '';
  return att.type === 'image' || (att.mime || '').toLowerCase().startsWith('image/') || IMAGE_NAME_RX.test(filename);
}

export function isAudioAttachment(att: ChatAttachmentLike | null | undefined): boolean {
  if (!att) return false;
  return att.type === 'voice' || att.type === 'audio' || (att.mime || '').toLowerCase().startsWith('audio/');
}

interface MessageLike {
  message_type?: string;
  body?: string;
  content?: string;
  content_data?: { attachments?: unknown; files?: unknown } | null;
}

function attachmentsOf(message: MessageLike): ChatAttachmentLike[] {
  const raw = message?.content_data?.attachments;
  return Array.isArray(raw) ? (raw as ChatAttachmentLike[]) : [];
}

/** Legacy `content_data.files` entries, where `type` holds the mime. */
function legacyFilesOf(message: MessageLike): ChatAttachmentLike[] {
  const raw = message?.content_data?.files;
  if (!Array.isArray(raw)) return [];
  return (raw as Array<{ type?: string; name?: string }>).map((f) => ({
    mime: typeof f?.type === 'string' ? f.type : undefined,
    filename: f?.name,
  }));
}

/** A voice message, by type or by any audio attachment (new or legacy format). */
export function isVoiceMessage(message: MessageLike): boolean {
  if (message?.message_type === 'voice') return true;
  return [...attachmentsOf(message), ...legacyFilesOf(message)].some(isAudioAttachment);
}

// Cards the gateway builds or that carry a live action — forwarding them as
// plain text would send an empty or broken message.
const NON_FORWARDABLE_TYPES = new Set([
  'voice',
  'template',
  'calendar_invite',
  'service_booking',
  'payment_request',
  'exchange_and_send',
  'payment_confirmation',
  'system',
]);

/** Text and attachment messages can be forwarded; voice and cards cannot. */
export function canForwardMessage(message: MessageLike): boolean {
  if (!message) return false;
  if (NON_FORWARDABLE_TYPES.has(message.message_type || '')) return false;
  if (isVoiceMessage(message)) return false;
  const text = (message.body || message.content || '').trim();
  const files = message.content_data?.files;
  return text.length > 0 || attachmentsOf(message).length > 0 || (Array.isArray(files) && files.length > 0);
}

export async function fetchImageBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image ${res.status}`);
  return res.blob();
}

/** The clipboard only takes PNG everywhere; re-encode anything else on a canvas. */
export async function toPngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode failed'));
      el.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('encode failed'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function canCopyImages(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.clipboard &&
    typeof navigator.clipboard.write === 'function' &&
    typeof (globalThis as { ClipboardItem?: unknown }).ClipboardItem === 'function'
  );
}

export type CopyImageResult = 'copied' | 'unsupported' | 'failed';

/**
 * Copy the picture itself (not its link). The ClipboardItem gets a promise
 * so Safari keeps the user gesture while the picture is fetched.
 */
export async function copyImageToClipboard(url: string): Promise<CopyImageResult> {
  if (!url || !canCopyImages()) return 'unsupported';
  try {
    const png = fetchImageBlob(url).then(toPngBlob);
    const Item = (globalThis as unknown as { ClipboardItem: typeof ClipboardItem }).ClipboardItem;
    await navigator.clipboard.write([new Item({ 'image/png': png })]);
    return 'copied';
  } catch (err) {
    console.warn('[chatImageActions] copy failed', err);
    return 'failed';
  }
}

/** Copy and tell the member what happened — never a silent no-op. */
export async function copyImageAndNotify(url: string): Promise<CopyImageResult> {
  const result = await copyImageToClipboard(url);
  if (result === 'copied') notify('screens.messages.imageCopied');
  else if (result === 'unsupported') notifyError('screens.messages.imageCopyUnsupported');
  else notifyError('screens.messages.imageCopyFailed');
  return result;
}

function triggerAnchorDownload(href: string, filename: string, newTab = false) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  if (newTab) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download through a blob so the browser saves the file under its own name
 * (the `download` attribute is ignored for a cross-origin signed URL). If the
 * fetch fails, open the link instead so the member still gets the picture.
 */
export async function downloadChatFile(url: string, filename: string): Promise<void> {
  if (!url) {
    notifyError('screens.messages.imageDownloadFailed');
    return;
  }
  try {
    const blob = await fetchImageBlob(url);
    const objectUrl = URL.createObjectURL(blob);
    try {
      triggerAnchorDownload(objectUrl, filename || 'image');
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  } catch (err) {
    console.warn('[chatImageActions] blob download failed, opening link', err);
    triggerAnchorDownload(url, filename || 'image', true);
  }
}

/** True when the device can share a picture file (Web Share Level 2). */
export function canShareImageFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') {
    return false;
  }
  try {
    return navigator.canShare({ files: [new File([new Blob()], 'image.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

export type ShareImageResult = 'shared' | 'cancelled' | 'unsupported' | 'failed';

export async function shareImage(url: string, filename: string): Promise<ShareImageResult> {
  if (!url || !canShareImageFiles()) return 'unsupported';
  try {
    const blob = await fetchImageBlob(url);
    const file = new File([blob], filename || 'image.png', { type: blob.type || 'image/png' });
    if (!navigator.canShare({ files: [file] })) return 'unsupported';
    await navigator.share({ files: [file] });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    console.warn('[chatImageActions] share failed', err);
    return 'failed';
  }
}

export async function shareImageAndNotify(url: string, filename: string): Promise<ShareImageResult> {
  const result = await shareImage(url, filename);
  if (result === 'failed' || result === 'unsupported') notifyError('screens.messages.imageShareFailed');
  return result;
}

/**
 * VTID-05138 A1 — how long a "share via other apps" link to a chat picture
 * works. Only used when the device cannot share the file itself; the bucket
 * stays private and nothing is written. One constant, owner's call.
 */
// Owner decision 2026-10-14: longer than the proposed 24 h — 7 days. The
// member-facing strings say "{days} days", written for a whole number of days
// of 2 or more; change the strings' plurals before setting this below 2 days.
export const FORWARD_SHARE_LINK_TTL_DAYS = 7;
export const FORWARD_SHARE_LINK_TTL_S = FORWARD_SHARE_LINK_TTL_DAYS * 24 * 60 * 60;

export interface ShareOutsideInput {
  /** The message text (may be empty). */
  text: string;
  /** The message's pictures with a fresh URL, for sharing as files. */
  images: { url: string; filename: string }[];
  /** True when the message has attachments that are not pictures. */
  hasOtherFiles: boolean;
  /** Creates the time-limited links; called only when files cannot be shared. */
  getLinks: () => Promise<string[]>;
}

export type ShareOutsideResult = 'shared_files' | 'shared' | 'cancelled' | 'copied' | 'failed';

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

async function tryShareFiles(input: ShareOutsideInput): Promise<ShareOutsideResult | null> {
  if (input.images.length === 0 || input.hasOtherFiles || !canShareImageFiles()) return null;
  try {
    const files = await Promise.all(
      input.images.map(async (img, i) => {
        const blob = await fetchImageBlob(img.url);
        return new File([blob], img.filename || `image-${i + 1}.png`, { type: blob.type || 'image/png' });
      }),
    );
    if (!navigator.canShare({ files })) return null;
    const text = input.text.trim();
    await navigator.share(text ? { files, text } : { files });
    return 'shared_files';
  } catch (err) {
    if (isAbort(err)) return 'cancelled';
    console.warn('[chatImageActions] file share failed, falling back to a link', err);
    return null;
  }
}

/**
 * Open the device's own share drawer for a chat message, in this order:
 * 1. the pictures themselves as files (Web Share Level 2);
 * 2. `navigator.share` with the text and time-limited links;
 * 3. the Appilix app shell's share bridge with the same text;
 * 4. copy the text/links to the clipboard and say so.
 */
export async function shareMessageOutside(input: ShareOutsideInput): Promise<ShareOutsideResult> {
  const fileResult = await tryShareFiles(input);
  if (fileResult) return fileResult;

  const hasFiles = input.images.length > 0 || input.hasOtherFiles;
  let links: string[] = [];
  if (hasFiles) {
    try {
      links = (await input.getLinks()).filter(Boolean);
    } catch (err) {
      console.warn('[chatImageActions] could not create share links', err);
    }
    if (links.length === 0) return 'failed';
  }
  const shareText = [input.text.trim(), ...links].filter(Boolean).join('\n');
  if (!shareText) return 'failed';

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: shareText });
      return 'shared';
    } catch (err) {
      if (isAbort(err)) return 'cancelled';
      console.warn('[chatImageActions] navigator.share failed', err);
    }
  }

  if (isAppilix() && appilixShare(shareText)) return 'shared';

  try {
    await navigator.clipboard.writeText(shareText);
    return 'copied';
  } catch (err) {
    console.warn('[chatImageActions] clipboard fallback failed', err);
    return 'failed';
  }
}

/** Share outside MAXINA and tell the member what happened. */
export async function shareMessageOutsideAndNotify(input: ShareOutsideInput): Promise<ShareOutsideResult> {
  const result = await shareMessageOutside(input);
  const hasFiles = input.images.length > 0 || input.hasOtherFiles;
  if (result === 'copied') {
    if (hasFiles) notify('screens.messages.forwardLinkCopied', undefined, { days: FORWARD_SHARE_LINK_TTL_DAYS });
    else notify('screens.messages.forwardTextCopied');
  } else if (result === 'failed') {
    notifyError('screens.messages.imageShareFailed');
  }
  return result;
}
