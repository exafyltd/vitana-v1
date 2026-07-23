/**
 * Composer textarea with inline @mention autocomplete and an optional coloured
 * background preview.
 *
 * Typing `@` followed by a name (no spaces) opens a small suggestion popover of
 * community members; picking one inserts `@DisplayName ` into the body and
 * records the mention so the renderer can later link it. When a `background`
 * preset is supplied, the field renders the text large and centred on the
 * gradient — a live Facebook-style preview of how the post will look.
 */
import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n-toast";
import { useMentionCandidates, type MentionCandidate } from "@/hooks/useMentionCandidates";
import type { PostMention } from "@/lib/news-feed-ranker";
import type { PostBackground } from "@/lib/post-backgrounds";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  mentions: PostMention[];
  onMentionsChange: (mentions: PostMention[]) => void;
  placeholder?: string;
  className?: string;
  background?: PostBackground | null;
  autoFocus?: boolean;
  maxLength?: number;
}

// Computed style properties that affect text layout/wrapping — copied onto the
// mirror element so its line breaks (and therefore the caret's line position)
// match the real textarea exactly.
const MIRROR_STYLE_PROPS = [
  "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight",
  "textAlign", "textTransform", "textIndent", "wordSpacing",
] as const;

/**
 * Pixel offset (top) of the line containing `caret`, measured relative to the
 * textarea's own box, plus that line's height. `top-full` positions the
 * popover below the *entire* textarea (which has a tall min-height even when
 * mostly empty) rather than below the line the user is actually typing on —
 * this mirror-div measurement gets the real line position so the popover can
 * sit right under the cursor instead.
 */
function getCaretLineMetrics(el: HTMLTextAreaElement, caret: number): { top: number; lineHeight: number } {
  const style = window.getComputedStyle(el);
  const mirror = document.createElement("div");
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.height = "auto";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  for (const prop of MIRROR_STYLE_PROPS) {
    mirror.style[prop] = style[prop];
  }

  mirror.textContent = el.value.slice(0, caret);
  const marker = document.createElement("span");
  marker.textContent = "​"; // zero-width space so the marker is always a measurable node
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const top = marker.offsetTop;
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
  document.body.removeChild(mirror);
  return { top, lineHeight };
}

/** Find the active "@token" immediately before the caret (token has no spaces). */
function activeToken(text: string, caret: number): { query: string; start: number } | null {
  let i = caret - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === "@") {
      const prev = text[i - 1];
      // Trigger on any non-word boundary (space, emoji, punctuation, start of
      // string) — only reject when @ is glued to a letter/digit/underscore,
      // which is the actual "email/handle" case (e.g. user@example.com) this
      // guard exists to avoid. A plain `\s` check missed emoji and punctuation.
      if (i === 0 || !/[\p{L}\p{N}_]/u.test(prev)) return { query: text.slice(i + 1, caret), start: i };
      return null;
    }
    if (/\s/.test(ch)) return null;
    i -= 1;
  }
  return null;
}

export function MentionTextarea({
  value,
  onChange,
  mentions,
  onMentionsChange,
  placeholder,
  className,
  background = null,
  autoFocus,
  maxLength,
}: MentionTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [token, setToken] = useState<{ query: string; start: number } | null>(null);
  const [popoverTop, setPopoverTop] = useState(0);
  const { data: candidates = [], isLoading } = useMentionCandidates(token?.query ?? "");
  const open = token !== null && token.query.length >= 1;

  const syncToken = () => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart ?? el.value.length;
    const nextToken = activeToken(el.value, caret);
    setToken(nextToken);
    if (nextToken) {
      const { top, lineHeight } = getCaretLineMetrics(el, caret);
      setPopoverTop(top + lineHeight);
    }
  };

  const handleSelect = (c: MentionCandidate) => {
    const el = ref.current;
    if (!el || !token) return;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, token.start);
    const after = value.slice(caret);
    const insert = `@${c.display_name} `;
    const next = before + insert + after;
    onChange(next);
    if (!mentions.some((m) => m.user_id === c.user_id)) {
      onMentionsChange([...mentions, { user_id: c.user_id, display_name: c.display_name }]);
    }
    setToken(null);
    // Restore the caret just after the inserted mention.
    const pos = before.length + insert.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const onSurface = !!background;

  return (
    <div className={cn("relative", onSurface && cn("rounded-2xl", background.fillClass))}>
      <textarea
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          syncToken();
        }}
        onKeyUp={syncToken}
        onClick={syncToken}
        onBlur={() => {
          // Let a suggestion click register before the popover unmounts.
          setTimeout(() => setToken(null), 150);
        }}
        className={cn(
          "w-full resize-none border-0 bg-transparent outline-none focus-visible:ring-0 placeholder:opacity-70",
          onSurface
            ? cn(
                "min-h-[200px] px-6 py-10 text-center text-2xl font-semibold leading-snug",
                background.textClass,
                "placeholder:text-current",
              )
            : "min-h-[160px] p-0 text-base text-foreground placeholder:text-muted-foreground",
          className,
        )}
      />

      {open && (
        <div
          className="absolute left-2 right-2 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg"
          style={{ top: popoverTop }}
        >
          {isLoading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{t("profilePosts.searchingPeople")}</p>
          ) : candidates.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{t("profilePosts.noPeopleFound")}</p>
          ) : (
            candidates.map((c) => (
              <button
                key={c.user_id}
                type="button"
                // onMouseDown (not onClick) so it fires before the textarea blur.
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(c);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  {c.avatar_url && <AvatarImage src={c.avatar_url} alt="" />}
                  <AvatarFallback className="text-xs">
                    {(c.display_name || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm text-foreground">{c.display_name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
