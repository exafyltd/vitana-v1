/**
 * VTID-04574 — news-feed card for a member who just joined.
 *
 * The card exists to prompt the community to greet the newcomer, so the
 * greeting is one tap away on the card itself. "Say hello" opens an inline
 * greeting composer (VTID-05207); tapping the card or "View profile" opens
 * their profile (/u/:userId), from where the DM thread is still reachable.
 *
 * Pressing "Say hello" sends nothing on its own — only the composer's explicit
 * Send delivers the private greeting DM.
 */
import { useState } from "react";
import { MessageCircle, User, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n-toast";
import { NewMemberGreetingComposer } from "@/components/home/NewMemberGreetingComposer";

export interface NewMemberCardProps {
  userId: string;
  title: string;
  summary?: string | null;
  /** Append a party emoji — only for our own "just joined" line, never a member's bio. */
  celebrateSummary?: boolean;
  avatarUrl?: string | null;
  displayInitial: string;
  timestamp?: string;
  /** Analytics hook, fired on any tap before navigating. */
  onOpen?: () => void;
}

/**
 * Typographic guard for the welcome title: no space before closing punctuation
 * and the last two words glued together, so a long first + last name can wrap
 * but never leaves a lone word or a stray "!" on the second line.
 */
function tidyTitle(title: string): string {
  return title
    .replace(/\s+([!?.,:;])/g, "$1")
    .replace(/\s+(\S+)$/, "\u00a0$1");
}

export function NewMemberCard({
  userId,
  title,
  summary,
  celebrateSummary,
  avatarUrl,
  displayInitial,
  timestamp,
  onOpen,
}: NewMemberCardProps) {
  const navigate = useNavigate();
  const [composerOpen, setComposerOpen] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const openProfile = () => {
    onOpen?.();
    navigate(`/u/${userId}`);
  };

  // In-session hide after a successful Send. On the next load the card is
  // hidden by fetchGreetedMemberIds (it counts viewer-sent DMs), so this only
  // handles the immediate collapse.
  if (greeted) return null;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={openProfile}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openProfile();
        }
      }}
      className="overflow-hidden rounded-2xl border-sys-member-card-border bg-sys-member-card shadow-sm cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md animate-fade-in"
      data-testid="new-member-card"
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-sys-member-accent min-w-0">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{t("newsCard.member.eyebrow")}</span>
          {timestamp && (
            <>
              <span className="text-muted-foreground font-normal shrink-0">•</span>
              <span className="text-muted-foreground font-normal normal-case tracking-normal whitespace-nowrap shrink-0">
                {timestamp}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 mt-3">
          <Avatar className="h-14 w-14 shrink-0 ring-2 ring-sys-member-card-border">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback className="bg-sys-member-tint text-lg font-semibold text-sys-member-accent">{displayInitial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight text-foreground line-clamp-2 [text-wrap:balance]">
              <span aria-hidden="true">🤩</span> {tidyTitle(title)}
            </p>
            {summary && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{summary}{celebrateSummary && <span aria-hidden="true"> 🎉</span>}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1 gap-2 rounded-full bg-category-2/40 text-category-2 hover:bg-category-2/80 font-semibold shadow-sm"
            aria-expanded={composerOpen}
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.();
              setComposerOpen(true);
            }}
          >
            <MessageCircle className="h-4 w-4" />
            {t("newsCard.member.sayHello")}
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 rounded-full border-[1.5px] border-sys-member-accent bg-card text-sys-member-accent hover:bg-sys-member-tint dark:bg-sys-member-card"
            onClick={(e) => {
              e.stopPropagation();
              openProfile();
            }}
          >
            <User className="h-4 w-4" />
            {t("newsCard.member.viewProfile")}
          </Button>
        </div>

        {composerOpen && (
          <NewMemberGreetingComposer
            userId={userId}
            onSent={() => {
              setComposerOpen(false);
              setGreeted(true);
            }}
            onCancel={() => setComposerOpen(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
