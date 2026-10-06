/**
 * Composer textarea with inline @mention autocomplete and an optional coloured
 * background preview.
 *
 * Typing `@` followed by a name opens a small suggestion popover of community
 * members (shared engine, VTID-04926: touch, mouse and ↑/↓/Enter/Tab/Esc);
 * picking one inserts `@DisplayName ` into the body and records the mention so
 * the renderer can later link it. Callers prune the list with `pruneMentions`
 * before saving, so a name deleted from the text is no longer tagged. When a `background`
 * preset is supplied, the field renders the text large and centred on the
 * gradient — a live Facebook-style preview of how the post will look.
 */
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MentionSuggestions } from "@/components/mentions/MentionSuggestions";
import { useMentionComposer } from "@/hooks/useMentionComposer";
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
  const [popoverTop, setPopoverTop] = useState(0);
  const onTokenCaret = useCallback((caret: number) => {
    const el = ref.current;
    if (!el) return;
    const { top, lineHeight } = getCaretLineMetrics(el, caret);
    setPopoverTop(top + lineHeight);
  }, []);
  const mc = useMentionComposer({
    value,
    onChange,
    inputRef: ref,
    mentions,
    onMentionsChange,
    onTokenCaret,
  });

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
          mc.sync();
        }}
        onKeyDown={mc.onKeyDown}
        onKeyUp={mc.sync}
        onClick={mc.sync}
        onBlur={mc.closeSoon}
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

      <MentionSuggestions {...mc.suggestionProps} className="mt-1" style={{ top: popoverTop }} />
    </div>
  );
}
