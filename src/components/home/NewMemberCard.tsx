/**
 * VTID-04574 — news-feed card for a member who just joined.
 *
 * The card exists to prompt the community to greet the newcomer, so the
 * greeting is one tap away on the card itself: "Say hello" opens the direct
 * conversation (/inbox/u/:userId), tapping the card opens their profile.
 */
import { MessageCircle, User, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n-toast";

export interface NewMemberCardProps {
  userId: string;
  title: string;
  summary?: string | null;
  avatarUrl?: string | null;
  displayInitial: string;
  timestamp?: string;
  /** Analytics hook, fired on any tap before navigating. */
  onOpen?: () => void;
}

export function NewMemberCard({
  userId,
  title,
  summary,
  avatarUrl,
  displayInitial,
  timestamp,
  onOpen,
}: NewMemberCardProps) {
  const navigate = useNavigate();
  const openProfile = () => {
    onOpen?.();
    navigate(`/u/${userId}`);
  };

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
      className="overflow-hidden rounded-2xl border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background cursor-pointer"
      data-testid="new-member-card"
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary min-w-0">
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
          <Avatar className="h-14 w-14 shrink-0 ring-2 ring-primary/30">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback className="text-lg font-semibold">{displayInitial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight text-foreground line-clamp-2">{title}</p>
            {summary && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{summary}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1 gap-2"
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.();
              navigate(`/inbox/u/${userId}`);
            }}
          >
            <MessageCircle className="h-4 w-4" />
            {t("newsCard.member.sayHello")}
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={(e) => {
              e.stopPropagation();
              openProfile();
            }}
          >
            <User className="h-4 w-4" />
            {t("newsCard.member.viewProfile")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
