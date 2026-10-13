/**
 * VTID-05138 — forward a chat message (text and/or pictures/files) to up to
 * five chats or groups.
 *
 * The target list is the same one the calendar invite uses (VTID-04917):
 * real direct chats and the member's groups. Each target gets its own new
 * message, marked `content_data.forwarded = true`. Attachments live in a
 * private bucket whose read access follows the path, so every attachment is
 * first copied into `{me}/{target}/…` for that target; if a copy fails the
 * target is skipped (nothing half-sent) and the member is told which one.
 * Targets are processed one after another.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MessageCircle, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { notify, notifyError, t, useI18nLocale } from '@/lib/i18n-toast';
import { useAuth } from '@/context/AuthProvider';
import { fetchGroups, sendChatMessage, sendGroupMessage } from '@/hooks/useChatApi';
import { buildGlobalThreadsQueryFn } from '@/hooks/useGlobalMessages';
import { chatGroupsQueryKey } from '@/hooks/useChatGroupsAsThreads';
import { dmTargets, type InviteTarget } from '@/components/calendar/vcal/InviteToChatSheet';
import { copyChatAttachmentForThread } from '@/lib/fileUpload';
import { isAudioAttachment, type ChatAttachmentLike } from '@/lib/chatImageActions';

export const MAX_FORWARD_TARGETS = 5;

export type ForwardTarget = InviteTarget;

export interface ForwardPayload {
  body: string;
  attachments: ChatAttachmentLike[];
}

/**
 * Send one forwarded copy to one target. Attachments with a storage path are
 * copied for that target first; any failure throws before anything is sent.
 */
export async function forwardToTarget(target: ForwardTarget, payload: ForwardPayload, userId: string): Promise<void> {
  const attachments: ChatAttachmentLike[] = [];
  for (const att of payload.attachments) {
    if (isAudioAttachment(att)) continue;
    if (att.path) {
      const copy = await copyChatAttachmentForThread(att.path, userId, target.id);
      attachments.push({ ...att, path: copy.path, url: copy.url });
    } else if (att.url) {
      attachments.push({ ...att });
    }
  }

  const body = payload.body.trim();
  const contentData: Record<string, unknown> = { forwarded: true };
  if (attachments.length > 0) contentData.attachments = attachments;
  const messageType = attachments.length > 0 ? 'attachment' : 'text';
  if (!body && attachments.length === 0) throw new Error('empty forward');

  if (target.kind === 'dm') await sendChatMessage(target.id, body, { messageType, contentData });
  else await sendGroupMessage(target.id, body, { messageType, contentData });
}

export interface ForwardResult {
  sent: ForwardTarget[];
  failed: ForwardTarget[];
}

/** Forward to each target in turn; one target's failure never stops the rest. */
export async function forwardToTargets(targets: ForwardTarget[], payload: ForwardPayload, userId: string): Promise<ForwardResult> {
  const result: ForwardResult = { sent: [], failed: [] };
  for (const target of targets.slice(0, MAX_FORWARD_TARGETS)) {
    try {
      await forwardToTarget(target, payload, userId);
      result.sent.push(target);
    } catch (err) {
      console.error('[Forward] failed for target', target.kind, target.id, err);
      notifyError('screens.messages.forwardFailedFor', undefined, { name: target.name });
      result.failed.push(target);
    }
  }
  return result;
}

interface ForwardMessageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: ForwardPayload;
}

const keyOf = (x: ForwardTarget) => `${x.kind}:${x.id}`;

export function ForwardMessageSheet({ open, onOpenChange, payload }: ForwardMessageSheetProps) {
  useI18nLocale();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<ForwardTarget[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setPicked([]);
    }
  }, [open]);

  const threadsKey = ['global-threads', user?.id] as const;
  const threads = useQuery({
    queryKey: threadsKey,
    queryFn: () => buildGlobalThreadsQueryFn(user!.id, queryClient, threadsKey),
    enabled: open && !!user?.id,
    staleTime: 60_000,
  });
  const groups = useQuery({
    queryKey: chatGroupsQueryKey(user?.id),
    queryFn: fetchGroups,
    enabled: open && !!user?.id,
    staleTime: 2 * 60_000,
  });

  const targets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: ForwardTarget[] = [
      ...dmTargets(threads.data),
      ...(groups.data ?? []).map((g) => ({ kind: 'group' as const, id: g.id, name: g.name })),
    ];
    return q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
  }, [threads.data, groups.data, query]);

  const pickedKeys = useMemo(() => new Set(picked.map(keyOf)), [picked]);
  const atLimit = picked.length >= MAX_FORWARD_TARGETS;

  const toggle = (x: ForwardTarget) => {
    setPicked((prev) => {
      if (prev.some((p) => keyOf(p) === keyOf(x))) return prev.filter((p) => keyOf(p) !== keyOf(x));
      if (prev.length >= MAX_FORWARD_TARGETS) return prev;
      return [...prev, x];
    });
  };

  const send = async () => {
    if (!user?.id || picked.length === 0 || sending) return;
    setSending(true);
    try {
      const result = await forwardToTargets(picked, payload, user.id);
      if (result.sent.length > 0) {
        notify('screens.messages.forwardDone');
        queryClient.invalidateQueries({ queryKey: threadsKey });
        queryClient.invalidateQueries({ queryKey: chatGroupsQueryKey(user.id) });
      }
      if (result.failed.length === 0) onOpenChange(false);
      else setPicked(result.failed); // keep only what still needs a retry
    } finally {
      setSending(false);
    }
  };

  const loading = threads.isLoading || groups.isLoading;

  return (
    <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
      <DialogContent className="flex flex-col gap-4 sm:max-w-md" style={{ maxHeight: '85vh' }} data-testid="forward-message-sheet">
        <DialogHeader>
          <DialogTitle>{t('screens.messages.forwardTitle')}</DialogTitle>
          <DialogDescription>{t('screens.messages.forwardLimit', { max: MAX_FORWARD_TARGETS })}</DialogDescription>
        </DialogHeader>

        <Input
          type="search"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
          placeholder={t('screens.messages.forwardSearch')}
          aria-label={t('screens.messages.forwardSearch')}
          data-testid="forward-search"
        />

        <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-1 overflow-y-auto p-0" data-testid="forward-target-list">
          {loading && targets.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">{t('screens.messages.forwardLoading')}</li>
          )}
          {!loading && targets.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground" data-testid="forward-empty">
              {t('screens.messages.forwardEmpty')}
            </li>
          )}
          {targets.map((x) => {
            const selected = pickedKeys.has(keyOf(x));
            const disabled = !selected && atLimit;
            return (
              <li key={keyOf(x)}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled || sending}
                  onClick={() => toggle(x)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start transition-colors',
                    'hover:bg-muted disabled:opacity-50',
                    selected && 'bg-muted',
                  )}
                  data-testid={`forward-target-${x.kind}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {x.kind === 'group' ? <Users className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{x.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {x.kind === 'group' ? t('screens.messages.forwardGroup') : t('screens.messages.forwardChat')}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                    )}
                    aria-hidden
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Wrapped: DialogContent hides its direct child buttons ([&>button]:sr-only). */}
        <div className="shrink-0">
          <Button className="w-full" onClick={send} disabled={picked.length === 0 || sending} data-testid="forward-send">
            {picked.length > 0
              ? t('screens.messages.forwardSendCount', { count: picked.length })
              : t('screens.messages.forwardSend')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ForwardMessageSheet;
