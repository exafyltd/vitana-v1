/**
 * VTID-05314 (messenger-ux-v2 / ui-compact-grouping, R1/R2): consecutive
 * messages of one sender form a visual group — one avatar and name (first
 * bubble), a tail on the last, a small gap inside the group and the time on
 * the group's last bubble.
 *
 * Pure: no React, no dates beyond `created_at`. A new group starts when
 *  - it is the first message,
 *  - the sender changes,
 *  - more than five minutes passed since the previous message,
 *  - the calendar day changes (a day divider sits between them),
 *  - either message is a system notice,
 *  - the caller puts a divider before the message (e.g. "Unread messages").
 * A reply does not break a group.
 */

export type GroupPosition = 'single' | 'first' | 'middle' | 'last';

export interface GroupableMessage {
  id?: string;
  sender_id?: string | null;
  created_at: string;
  message_type?: string | null;
}

export const GROUP_WINDOW_MS = 5 * 60 * 1000;

function senderOf(message: GroupableMessage & { sender?: { user_id?: string | null } | null }): string | null {
  return message.sender_id ?? message.sender?.user_id ?? null;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** True when `current` cannot continue the group of `previous`. */
export function startsNewGroup(previous: GroupableMessage | null | undefined, current: GroupableMessage): boolean {
  if (!previous) return true;
  if (previous.message_type === 'system' || current.message_type === 'system') return true;
  const prevSender = senderOf(previous);
  const curSender = senderOf(current);
  if (!prevSender || !curSender || prevSender !== curSender) return true;
  const prevAt = new Date(previous.created_at);
  const curAt = new Date(current.created_at);
  const prevMs = prevAt.getTime();
  const curMs = curAt.getTime();
  if (!Number.isFinite(prevMs) || !Number.isFinite(curMs)) return true;
  if (Math.abs(curMs - prevMs) > GROUP_WINDOW_MS) return true;
  return !sameLocalDay(prevAt, curAt);
}

export interface GroupPositionOptions<T> {
  /** A divider the caller renders before this message also starts a new group. */
  breakBefore?: (message: T, index: number) => boolean;
}

/** One position per message, in the same order (messages oldest first). */
export function groupPositions<T extends GroupableMessage>(
  messages: readonly T[],
  options: GroupPositionOptions<T> = {},
): GroupPosition[] {
  const starts = messages.map(
    (message, index) =>
      startsNewGroup(index > 0 ? messages[index - 1] : null, message) ||
      (options.breakBefore?.(message, index) ?? false),
  );
  return messages.map((_, index) => {
    const isStart = starts[index];
    const isEnd = index === messages.length - 1 || starts[index + 1];
    if (isStart && isEnd) return 'single';
    if (isStart) return 'first';
    if (isEnd) return 'last';
    return 'middle';
  });
}

/** The first bubble of a group shows the avatar and the sender's name. */
export function isGroupStart(position: GroupPosition | undefined): boolean {
  return position === undefined || position === 'single' || position === 'first';
}

/** The last bubble of a group carries the tail and the time. */
export function isGroupEnd(position: GroupPosition | undefined): boolean {
  return position === undefined || position === 'single' || position === 'last';
}
