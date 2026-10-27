/**
 * VTID-05321 (messenger-ux-v2/ui-shared-cards, R11) — "Send in message":
 * send a post, event, product or profile to up to five chats or groups.
 *
 * Each target gets one `shared_content` message carrying only `{ kind, id }`
 * (plus an optional caption in the member's own words); the gateway checks the
 * sender may see the item and every recipient's card is resolved with the
 * recipient's own permissions (I6). The target list is the forward sheet's
 * (./forwardTargets). Targets are sent one after another; a failed one stays
 * selected for a retry and the member is told which one failed.
 */
import React, { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { notify, notifyError, t, useI18nLocale } from '@/lib/i18n-toast';
import { sendChatMessage, sendGroupMessage } from '@/hooks/useChatApi';
import { ChatTargetList } from './ForwardMessageSheet';
import { MAX_FORWARD_TARGETS, useChatTargets, useTargetSelection, type ForwardTarget } from './forwardTargets';
import type { SharedRef } from './SharedContentCard';

export const SHARED_CAPTION_MAX = 1000;

const newClientId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : undefined;

/** One shared_content message to one target. */
export async function sendSharedToTarget(target: ForwardTarget, item: SharedRef, caption: string): Promise<void> {
  const opts = {
    messageType: 'shared_content',
    contentData: { kind: item.kind, id: item.id },
    clientMessageId: newClientId(),
  };
  const body = caption.trim().slice(0, SHARED_CAPTION_MAX);
  if (target.kind === 'dm') await sendChatMessage(target.id, body, opts);
  else await sendGroupMessage(target.id, body, opts);
}

export interface SendSharedResult { sent: ForwardTarget[]; failed: ForwardTarget[] }

/** Send to each target in turn; one failure never stops the rest. */
export async function sendSharedToTargets(targets: ForwardTarget[], item: SharedRef, caption: string): Promise<SendSharedResult> {
  const result: SendSharedResult = { sent: [], failed: [] };
  for (const target of targets.slice(0, MAX_FORWARD_TARGETS)) {
    try {
      await sendSharedToTarget(target, item, caption);
      result.sent.push(target);
    } catch (err) {
      const code = String((err as Error)?.message || '');
      console.error('[SendInMessage] failed for target', target.kind, target.id, code);
      // The sender may no longer see the item: no point retrying the others.
      if (code === 'share_not_allowed') {
        notifyError('inbox.shared.notAllowed');
        result.failed.push(...targets.slice(targets.indexOf(target), MAX_FORWARD_TARGETS));
        return result;
      }
      notifyError('screens.messages.forwardFailedFor', undefined, { name: target.name });
      result.failed.push(target);
    }
  }
  return result;
}

interface SendInMessageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SharedRef;
  /** Shown in the description, e.g. the post's or product's title. */
  itemTitle?: string;
}

export function SendInMessageSheet({ open, onOpenChange, item, itemTitle }: SendInMessageSheetProps) {
  useI18nLocale();
  const [query, setQuery] = useState('');
  const [caption, setCaption] = useState('');
  const { picked, setPicked, pickedKeys, toggle, atLimit } = useTargetSelection();
  const { targets, loading, refreshTargets } = useChatTargets(open, query);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setCaption('');
      setPicked([]);
    }
  }, [open, setPicked]);

  const send = async () => {
    if (picked.length === 0 || sending) return;
    setSending(true);
    try {
      const result = await sendSharedToTargets(picked, item, caption);
      if (result.sent.length > 0) {
        notify('inbox.shared.sent');
        refreshTargets();
      }
      if (result.failed.length === 0) onOpenChange(false);
      else setPicked(result.failed);
    } finally {
      setSending(false);
    }
  };

  const kindLabel = t(`inbox.shared.kind.${item.kind}`);

  return (
    <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
      <DialogContent className="flex max-h-screen flex-col gap-4 sm:max-w-md" data-testid="send-in-message-sheet">
        <DialogHeader>
          <DialogTitle>{t('inbox.shared.sheetTitle', { kind: kindLabel })}</DialogTitle>
          <DialogDescription>
            {itemTitle ? `${itemTitle} · ` : ''}
            {t('screens.messages.forwardLimit', { max: MAX_FORWARD_TARGETS })}
          </DialogDescription>
        </DialogHeader>

        <Input
          type="search"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
          placeholder={t('screens.messages.forwardSearch')}
          aria-label={t('screens.messages.forwardSearch')}
          data-testid="send-in-message-search"
        />

        <ChatTargetList
          targets={targets}
          loading={loading}
          pickedKeys={pickedKeys}
          atLimit={atLimit}
          disabled={sending}
          onToggle={toggle}
        />

        <Textarea
          value={caption}
          onChange={(ev) => setCaption(ev.target.value.slice(0, SHARED_CAPTION_MAX))}
          placeholder={t('inbox.shared.captionPlaceholder')}
          aria-label={t('inbox.shared.captionPlaceholder')}
          maxLength={SHARED_CAPTION_MAX}
          rows={2}
          data-testid="send-in-message-caption"
        />

        {/* Wrapped: DialogContent hides its direct child buttons ([&>button]:sr-only). */}
        <div className="shrink-0">
          <Button className="w-full" onClick={send} disabled={picked.length === 0 || sending} data-testid="send-in-message-send">
            {picked.length > 0
              ? t('screens.messages.forwardSendCount', { count: picked.length })
              : t('screens.messages.forwardSend')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * For entry points (post, event, product, profile): `openSendInMessage()` from
 * any button or menu item, and `sendInMessageSheet` rendered next to it. The
 * sheet (and its chat-list queries) mounts only once it is opened, so
 * surfaces without a chat context pay nothing.
 */
export function useSendInMessage(item: SharedRef | null, itemTitle?: string) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const openSendInMessage = () => {
    if (!item) return;
    setMounted(true);
    setOpen(true);
  };
  // Entry points sit inside clickable cards: React bubbles portal events up the
  // component tree, so clicks in the sheet must not reach the card.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const sendInMessageSheet = mounted && item
    ? (
      <span className="contents" onClick={stop} onPointerDown={stop} onKeyDown={stop}>
        <SendInMessageSheet open={open} onOpenChange={setOpen} item={item} itemTitle={itemTitle} />
      </span>
    )
    : null;
  return { openSendInMessage, sendInMessageSheet };
}

/**
 * The signed-in user, or null — also outside an AuthProvider (product
 * surfaces render in public / embedded trees too). useAuth() reads its
 * context unconditionally before it throws, so the hook order is stable.
 */
function useOptionalUser() {
  try {
    return useAuth().user ?? null;
  } catch {
    return null;
  }
}

interface SendInMessageButtonProps {
  item: SharedRef;
  itemTitle?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  className?: string;
}

/** An icon button that opens the sheet; shown to signed-in members only. */
export function SendInMessageButton({ item, itemTitle, variant = 'outline', size = 'icon', className }: SendInMessageButtonProps) {
  const user = useOptionalUser();
  const { openSendInMessage, sendInMessageSheet } = useSendInMessage(user ? item : null, itemTitle);
  if (!user) return null;
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={(e) => { e.stopPropagation(); openSendInMessage(); }}
        aria-label={t('inbox.shared.sendInMessage')}
        title={t('inbox.shared.sendInMessage')}
        data-testid={`${item.kind}-send-in-message`}
      >
        <Send className="h-4 w-4" aria-hidden />
      </Button>
      {sendInMessageSheet}
    </>
  );
}

export default SendInMessageSheet;
