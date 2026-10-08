/**
 * VTID-04926: the @mention suggestion list shared by every composer.
 *
 * Positioned by the host (absolute, below the caret line for posts, above the
 * composer for chat). Rows pick on `click` while `mousedown` is prevented, so
 * the text field never loses focus — the on-screen keyboard stays up on
 * Android/iOS and the blur timer never races the tap.
 */
import type { CSSProperties } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n-toast";
import type { MentionCandidate } from "@/hooks/useMentionCandidates";

interface MentionSuggestionsProps {
  open: boolean;
  candidates: MentionCandidate[];
  isLoading: boolean;
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (candidate: MentionCandidate) => void;
  className?: string;
  style?: CSSProperties;
}

export function MentionSuggestions({
  open,
  candidates,
  isLoading,
  activeIndex,
  onHover,
  onSelect,
  className,
  style,
}: MentionSuggestionsProps) {
  if (!open) return null;
  return (
    <div
      role="listbox"
      aria-label={t("profilePosts.mentionSuggestions")}
      data-testid="mention-suggestions"
      className={cn(
        "absolute inset-x-2 z-50 max-h-56 overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg",
        className,
      )}
      style={style}
      onMouseDown={(e) => e.preventDefault()}
    >
      {isLoading && candidates.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">{t("profilePosts.searchingPeople")}</p>
      ) : candidates.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">{t("profilePosts.noPeopleFound")}</p>
      ) : (
        candidates.map((c, i) => (
          <button
            key={c.user_id}
            type="button"
            role="option"
            aria-selected={i === activeIndex}
            data-testid="mention-suggestion"
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => onHover(i)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(c);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start",
              i === activeIndex ? "bg-accent" : "hover:bg-accent",
            )}
          >
            <Avatar className="h-7 w-7 shrink-0">
              {c.avatar_url && <AvatarImage src={c.avatar_url} alt="" />}
              <AvatarFallback className="text-xs">{(c.display_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm text-foreground">{c.display_name}</span>
          </button>
        ))
      )}
    </div>
  );
}
