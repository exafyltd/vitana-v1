/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — a shared
 * post / event / product / profile in a chat (VTID-05321), native twin of the
 * data part of web `src/components/messages/SharedContentCard.tsx`:
 * `GET /api/v1/chat/shared-preview?kind&id`, resolved for the viewer
 * (available → title, description, image, in-app url; or deleted / restricted).
 */
import { getGateway } from '../../../auth/gateway';

export const SHARED_KINDS = ['post', 'event', 'product', 'profile'] as const;
export type SharedKind = (typeof SHARED_KINDS)[number];
export interface SharedRef {
  kind: SharedKind;
  id: string;
}
export type SharedPreview =
  | { available: true; title: string; description: string; image_url: string | null; url: string }
  | { available: false; reason: 'deleted' | 'restricted' };

export function sharedRefOf(contentData: unknown): SharedRef | null {
  if (!contentData || typeof contentData !== 'object') return null;
  const { kind, id } = contentData as { kind?: unknown; id?: unknown };
  if (typeof kind !== 'string' || !(SHARED_KINDS as readonly string[]).includes(kind)) return null;
  if (typeof id !== 'string' || id.length === 0) return null;
  return { kind: kind as SharedKind, id };
}

export async function fetchSharedPreview(ref: SharedRef): Promise<SharedPreview> {
  const qs = new URLSearchParams({ kind: ref.kind, id: ref.id });
  const res = await getGateway()(`/chat/shared-preview?${qs.toString()}`, {});
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body?.ok === false) throw new Error(typeof body?.error === 'string' ? body.error : `preview_failed_${res.status}`);
  if (body.available === true) {
    return {
      available: true,
      title: String(body.title ?? ''),
      description: String(body.description ?? ''),
      image_url: typeof body.image_url === 'string' && body.image_url ? body.image_url : null,
      url: String(body.url ?? ''),
    };
  }
  return { available: false, reason: body.reason === 'deleted' ? 'deleted' : 'restricted' };
}

export const isInAppPath = (url: string) => url.startsWith('/') && !url.startsWith('//');
