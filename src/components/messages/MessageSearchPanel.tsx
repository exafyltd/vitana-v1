/**
 * VTID-05317 (messenger-ux-v2/ui-message-search, R12) — search messages.
 *
 * Global (inbox, scope "all"): results from every DM and group of the member,
 * each with its conversation, snippet and time; a result opens that
 * conversation at the message. In a conversation (scope "dm:<peer>" /
 * "group:<id>"): the same, plus ↑/↓ to step through the hits in place.
 * Filters: attachment type and date range. Keyboard: ↑/↓ move through the
 * results, Enter opens the selected one, Esc closes.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Search, SearchX } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';
import { formatDate } from '@/lib/locale-format';
import { useMessageSearch, SEARCH_MIN_CHARS, type MessageSearchResult, type SearchType } from '@/hooks/useMessageSearch';

const TYPES: SearchType[] = ['any', 'image', 'video', 'file', 'voice', 'link'];

interface MessageSearchPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'all' (inbox) or the open conversation's key. */
  scope: string;
  /** Called with the chosen result; the panel closes for scope "all". */
  onSelect: (result: MessageSearchResult) => void;
  /** Name of a conversation for a result's conversation_key (global search). */
  conversationLabel?: (conversationKey: string) => string | undefined;
}

/** The snippet with the query marked (case-insensitive, literal). */
export function highlight(snippet: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return snippet;
  const lower = snippet.toLowerCase();
  const needle = q.toLowerCase();
  const out: React.ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(needle, from);
  while (at >= 0) {
    if (at > from) out.push(snippet.slice(from, at));
    out.push(<mark key={at} className="rounded-sm bg-primary/20 text-foreground">{snippet.slice(at, at + q.length)}</mark>);
    from = at + q.length;
    at = lower.indexOf(needle, from);
  }
  if (from < snippet.length) out.push(snippet.slice(from));
  return out;
}

const MessageSearchPanel: React.FC<MessageSearchPanelProps> = ({ open, onOpenChange, scope, onSelect, conversationLabel }) => {
  const inConversation = scope !== 'all';
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>('any');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const filters = useMemo(() => ({ scope, type, from: from || null, to: to || null }), [scope, type, from, to]);
  const { results, status, error, hasMore, loadMore, tooShort } = useMessageSearch(query, filters, open);

  useEffect(() => { setActive(-1); }, [results]);
  useEffect(() => {
    if (!open) { setQuery(''); setActive(-1); }
  }, [open]);

  const choose = (index: number) => {
    const r = results[index];
    if (!r) return;
    setActive(index);
    onSelect(r);
    if (!inConversation) onOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(active);
    }
  };

  useEffect(() => {
    if (active < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  // In a conversation, ↑ goes to an older hit, ↓ to a newer one (results are newest first).
  const step = (dir: 1 | -1) => {
    if (results.length === 0) return;
    const next = active < 0 ? 0 : Math.max(0, Math.min(results.length - 1, active + dir));
    choose(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-3 p-4" data-testid="message-search-panel">
        <DialogHeader>
          <DialogTitle>{inConversation ? t('inbox.search.titleConversation') : t('inbox.search.title')}</DialogTitle>
          <DialogDescription className="sr-only">{t('inbox.search.hint', { min: SEARCH_MIN_CHARS })}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('inbox.search.placeholder')}
              aria-label={t('inbox.search.placeholder')}
              aria-controls="message-search-results"
              aria-activedescendant={active >= 0 ? `message-search-result-${active}` : undefined}
              className="ps-9"
              data-testid="message-search-input"
            />
          </div>
          {inConversation && (
            <div className="flex">
              <Button type="button" variant="ghost" size="icon" onClick={() => step(1)} disabled={results.length === 0}
                aria-label={t('inbox.search.olderHit')} data-testid="message-search-older">
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => step(-1)} disabled={results.length === 0}
                aria-label={t('inbox.search.newerHit')} data-testid="message-search-newer">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">{t('inbox.search.type')}</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SearchType)}
              className="h-9 rounded-md border bg-background px-2"
              data-testid="message-search-type"
            >
              {TYPES.map((v) => <option key={v} value={v}>{t(`inbox.search.types.${v}`)}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">{t('inbox.search.from')}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border bg-background px-2" data-testid="message-search-from" />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">{t('inbox.search.to')}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border bg-background px-2" data-testid="message-search-to" />
          </label>
        </div>

        <div className="max-h-[50vh] min-h-24 overflow-y-auto" aria-live="polite">
          {tooShort && <p className="py-6 text-center text-sm text-muted-foreground" data-testid="message-search-too-short">{t('inbox.search.hint', { min: SEARCH_MIN_CHARS })}</p>}
          {status === 'loading' && results.length === 0 && (
            <div className="flex justify-center py-6" role="status" aria-label={t('inbox.search.searching')}>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {status === 'error' && (
            <p className="py-6 text-center text-sm text-destructive" data-testid="message-search-error">{t('inbox.search.error')}</p>
          )}
          {status === 'done' && results.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground" data-testid="message-search-empty">
              <SearchX className="h-6 w-6" aria-hidden />
              {t('inbox.search.empty')}
            </div>
          )}
          {results.length > 0 && (
            <ul id="message-search-results" ref={listRef} role="listbox" aria-label={t('inbox.search.results')} className="divide-y">
              {results.map((r, i) => {
                const label = conversationLabel?.(r.conversation_key);
                return (
                  <li
                    key={r.message_id}
                    id={`message-search-result-${i}`}
                    role="option"
                    aria-selected={i === active}
                    data-index={i}
                    data-testid="message-search-result"
                    onClick={() => choose(i)}
                    className={cn('cursor-pointer px-2 py-2 hover:bg-muted', i === active && 'bg-muted')}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{label ?? (inConversation ? '' : t('inbox.search.conversation'))}</span>
                      <time className="shrink-0 text-xs text-muted-foreground tabular-nums" dateTime={r.created_at}>
                        {formatDate(new Date(r.created_at), 'PPp')}
                      </time>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{highlight(r.snippet, query)}</p>
                  </li>
                );
              })}
            </ul>
          )}
          {hasMore && (
            <div className="flex justify-center py-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => void loadMore()} disabled={status === 'loading'} data-testid="message-search-more">
                {t('inbox.search.more')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageSearchPanel;
