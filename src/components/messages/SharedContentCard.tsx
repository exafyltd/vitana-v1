/**
 * VTID-05321 (messenger-ux-v2/ui-shared-cards, R11) — a shared post, event,
 * product or profile in a chat.
 *
 * The message stores only `{ kind, id }` (gateway VTID-05311). The card is
 * resolved for the VIEWER with the viewer's own permissions
 * (`GET /api/v1/chat/shared-preview`), so a recipient who cannot see the item
 * gets an explanation — removed, or not visible to them — never someone
 * else's view of it. States: loading skeleton, the card (tap opens the item's
 * page), unavailable, and "could not load" with a retry.
 */
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, EyeOff, FileText, RotateCw, ShoppingBag, Trash2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GATEWAY_API_URL } from '@/lib/gateway-base';
import { t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthProvider';

export const SHARED_KINDS = ['post', 'event', 'product', 'profile'] as const;
export type SharedKind = (typeof SHARED_KINDS)[number];
export interface SharedRef { kind: SharedKind; id: string }

export type SharedPreview =
  | { available: true; title: string; description: string; image_url: string | null; url: string }
  | { available: false; reason: 'deleted' | 'restricted' };

/** `{ kind, id }` of a shared_content message, or null when it is not one. */
export function sharedRefOf(contentData: unknown): SharedRef | null {
  if (!contentData || typeof contentData !== 'object') return null;
  const { kind, id } = contentData as { kind?: unknown; id?: unknown };
  if (typeof kind !== 'string' || !(SHARED_KINDS as readonly string[]).includes(kind)) return null;
  if (typeof id !== 'string' || id.length === 0) return null;
  return { kind: kind as SharedKind, id };
}

/** Per viewer: a preview is what THIS member may see (I6), so an account switch never reuses it. */
export const sharedPreviewKey = (ref: SharedRef, viewerId: string | null) => ['chat-shared-preview', viewerId, ref.kind, ref.id] as const;

/**
 * The signed-in user, or null — also outside an AuthProvider (tests, embedded
 * trees). useAuth() reads its context unconditionally before it throws, so
 * the hook order is stable.
 */
export function useOptionalUser() {
  try {
    return useAuth().user ?? null;
  } catch {
    return null;
  }
}

export async function fetchSharedPreview(ref: SharedRef): Promise<SharedPreview> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('not_signed_in');
  const qs = new URLSearchParams({ kind: ref.kind, id: ref.id });
  const res = await fetch(`${GATEWAY_API_URL}/chat/shared-preview?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false) throw new Error(body?.error || `preview_failed_${res.status}`);
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

/** Only in-app paths are opened from a card. */
const isInAppPath = (url: string) => url.startsWith('/') && !url.startsWith('//');

const KIND_ICON = { post: FileText, event: CalendarDays, product: ShoppingBag, profile: User } as const;

interface SharedContentCardProps {
  sharedRef: SharedRef;
  isOwnMessage?: boolean;
}

export function SharedContentCard({ sharedRef, isOwnMessage = false }: SharedContentCardProps) {
  const navigate = useNavigate();
  const viewerId = useOptionalUser()?.id ?? null;
  const preview = useQuery({
    queryKey: sharedPreviewKey(sharedRef, viewerId),
    queryFn: () => fetchSharedPreview(sharedRef),
    staleTime: 60_000,
    retry: false,
  });
  const Icon = KIND_ICON[sharedRef.kind];
  const kindLabel = t(`inbox.shared.kind.${sharedRef.kind}`);
  const frame = cn('w-64 max-w-full overflow-hidden rounded-xl border bg-card text-card-foreground', isOwnMessage && 'border-primary/30');

  if (preview.isLoading) {
    return (
      <div className={cn(frame, 'p-3')} role="status" aria-label={t('inbox.shared.loading')} data-testid="shared-card-loading">
        <Skeleton className="mb-2 h-28 w-full" />
        <Skeleton className="mb-1 h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    );
  }

  if (preview.isError || !preview.data) {
    return (
      <div className={cn(frame, 'flex items-center gap-2 p-3 text-sm text-muted-foreground')} data-testid="shared-card-error">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="flex-1">{t('inbox.shared.loadFailed')}</span>
        <button
          type="button"
          onClick={() => void preview.refetch()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"
          aria-label={t('inbox.shared.retry')}
          data-testid="shared-card-retry"
        >
          <RotateCw className="h-4 w-4" aria-hidden />
        </button>
      </div>
    );
  }

  const p = preview.data;
  if (p.available === false) {
    const { reason } = p as Extract<SharedPreview, { available: false }>;
    const Gone = reason === 'deleted' ? Trash2 : EyeOff;
    return (
      <div className={cn(frame, 'flex items-start gap-2 p-3')} data-testid="shared-card-unavailable" data-reason={reason}>
        <Gone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="m-0 text-sm font-medium">{t(`inbox.shared.unavailable.${reason}.title`, { kind: kindLabel })}</p>
          <p className="m-0 text-xs text-muted-foreground">{t(`inbox.shared.unavailable.${reason}.body`)}</p>
        </div>
      </div>
    );
  }

  const card = p as Extract<SharedPreview, { available: true }>;
  const open = () => { if (isInAppPath(card.url)) navigate(card.url); };
  const round = sharedRef.kind === 'profile';
  return (
    <button
      type="button"
      onClick={open}
      disabled={!isInAppPath(card.url)}
      className={cn(frame, 'block text-start transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
      aria-label={t('inbox.shared.open', { kind: kindLabel, title: card.title })}
      data-testid="shared-card"
      data-kind={sharedRef.kind}
    >
      {card.image_url && !round && (
        <img src={card.image_url} alt="" loading="lazy" className="h-32 w-full bg-muted object-cover" />
      )}
      <div className="flex items-start gap-3 p-3">
        {card.image_url && round && <img src={card.image_url} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-full object-cover" />}
        <div className="min-w-0 flex-1">
          <p className="m-0 flex items-center gap-1 text-xs text-muted-foreground">
            <Icon className="h-3 w-3" aria-hidden />
            {kindLabel}
          </p>
          <p className="m-0 line-clamp-2 text-sm font-semibold">{card.title || kindLabel}</p>
          {card.description && <p className="m-0 line-clamp-2 text-xs text-muted-foreground">{card.description}</p>}
        </div>
      </div>
    </button>
  );
}

export default SharedContentCard;
