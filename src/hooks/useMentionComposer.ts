/**
 * VTID-04926: @mention state for any text field — group chat composer, post
 * composer, comment input. The host keeps its own value; this hook watches the
 * caret, finds the active `@token`, resolves candidates (a local roster or the
 * community search), and handles picking by touch, mouse or keyboard.
 *
 * Wire-up:
 *   const mc = useMentionComposer({ value, onChange, inputRef, mentions, onMentionsChange, localCandidates });
 *   <textarea onChange={(e) => { onChange(e.target.value); mc.sync(); }}
 *             onKeyDown={(e) => { if (mc.onKeyDown(e)) return; ...host keys... }}
 *             onKeyUp={mc.sync} onClick={mc.sync} onBlur={mc.closeSoon} />
 *   <MentionSuggestions {...mc.suggestionProps} />
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { useMentionCandidates, type MentionCandidate } from "@/hooks/useMentionCandidates";
import {
  addMention,
  filterLocalCandidates,
  findActiveMentionToken,
  insertMention,
  isPickedMentionToken,
  shouldKeepOpen,
  type Mention,
  type MentionToken,
} from "@/lib/mentions";

export interface UseMentionComposerOptions {
  value: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | HTMLInputElement>;
  mentions: Mention[];
  onMentionsChange: (mentions: Mention[]) => void;
  /** A fixed list to pick from (group roster). Omit to search the community. */
  localCandidates?: MentionCandidate[];
  /** Turn the whole thing off (e.g. a DM composer). */
  disabled?: boolean;
  /** Called with the caret position after a token is detected (popover placement). */
  onTokenCaret?: (caret: number) => void;
}

export function useMentionComposer({
  value,
  onChange,
  inputRef,
  mentions,
  onMentionsChange,
  localCandidates,
  disabled = false,
  onTokenCaret,
}: UseMentionComposerOptions) {
  const [token, setToken] = useState<MentionToken | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();

  const useLocal = localCandidates !== undefined;
  const query = token?.query ?? "";
  const remote = useMentionCandidates(query, !disabled && !useLocal && token !== null);

  const candidates: MentionCandidate[] = useMemo(() => {
    if (!token) return [];
    if (useLocal) return filterLocalCandidates(localCandidates ?? [], token.query);
    return remote.data ?? [];
  }, [token, useLocal, localCandidates, remote.data]);
  const isLoading = !useLocal && remote.isLoading && remote.fetchStatus !== "idle";

  const open = !disabled && shouldKeepOpen(token, candidates.length, isLoading);

  // Keep the highlighted row inside the list as it shrinks.
  useEffect(() => {
    setActiveIndex((i) => (i >= candidates.length ? 0 : i));
  }, [candidates.length]);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const sync = useCallback(() => {
    if (disabled) return;
    const el = inputRef.current;
    if (!el) return;
    clearTimeout(blurTimer.current);
    const caret = el.selectionStart ?? el.value.length;
    const next = findActiveMentionToken(el.value, caret);
    if (next && isPickedMentionToken(next, mentions)) {
      setToken(null);
      return;
    }
    setToken((prev) => {
      if (!next) return null;
      if (prev && prev.start === next.start && prev.query === next.query) return prev;
      return next;
    });
    if (next) onTokenCaret?.(caret);
  }, [disabled, inputRef, mentions, onTokenCaret]);

  const close = useCallback(() => {
    clearTimeout(blurTimer.current);
    setToken(null);
  }, []);

  /** Close after a short delay so a tap on a suggestion still registers. */
  const closeSoon = useCallback(() => {
    clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setToken(null), 200);
  }, []);

  const select = useCallback(
    (c: MentionCandidate) => {
      const el = inputRef.current;
      if (!token) return;
      const caret = el?.selectionStart ?? value.length;
      const { text, caret: pos } = insertMention(value, token, Math.max(caret, token.start + 1), c);
      onChange(text);
      onMentionsChange(addMention(mentions, c));
      setToken(null);
      requestAnimationFrame(() => {
        const node = inputRef.current;
        if (!node) return;
        node.focus();
        node.setSelectionRange(pos, pos);
      });
    },
    [inputRef, token, value, onChange, onMentionsChange, mentions],
  );

  /**
   * Keyboard handling while the list is open. Returns true when the key was
   * consumed, so the host must NOT also treat Enter as "send".
   */
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>): boolean => {
      if (!open) return false;
      if (e.key === "ArrowDown" && candidates.length > 0) {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % candidates.length);
        return true;
      }
      if (e.key === "ArrowUp" && candidates.length > 0) {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + candidates.length) % candidates.length);
        return true;
      }
      if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey && candidates.length > 0) {
        e.preventDefault();
        select(candidates[Math.min(activeIndex, candidates.length - 1)]);
        return true;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return true;
      }
      return false;
    },
    [open, candidates, activeIndex, select, close],
  );

  return {
    open,
    token,
    candidates,
    isLoading,
    activeIndex,
    sync,
    close,
    closeSoon,
    select,
    onKeyDown,
    suggestionProps: {
      open,
      candidates,
      isLoading,
      activeIndex,
      onHover: setActiveIndex,
      onSelect: select,
    },
  };
}
