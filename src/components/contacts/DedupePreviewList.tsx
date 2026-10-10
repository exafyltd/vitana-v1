import { useMemo, useState } from "react";
import { Check, UserPlus, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InviteContactButton } from "./InviteContactButton";
import { t } from '@/lib/i18n-toast';

export interface MatchedContact {
  localContact: {
    id: string;
    name: string;
    phone?: string;
    phoneE164?: string;
    email?: string;
  };
  platformUser: {
    user_id: string;
    display_name: string;
    avatar_url?: string;
    handle?: string;
  };
  matchConfidence: "exact" | "probable" | "possible";
}

export interface ImportedContact {
  id: string;
  name: string;
  phone?: string;
  /** VTID-05057: the gateway's international form of the first number. */
  phoneE164?: string;
  email?: string;
}

interface DedupePreviewListProps {
  matches: MatchedContact[];
  nonMatches: ImportedContact[];
  /** Opens a chat with this member. */
  onMessage?: (userId: string) => void;
  /** Rows shown before "show more" (per section). */
  pageSize?: number;
}

/**
 * VTID-05058: the result of a contacts import, laid out like a messenger —
 * "On Vitanaland" with a Message button, everyone else with an Invite
 * button that opens the member's own WhatsApp / SMS / e-mail / share sheet.
 */
export function DedupePreviewList({ matches, nonMatches, onMessage, pageSize = 30 }: DedupePreviewListProps) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(pageSize);
  const [invited, setInvited] = useState<Set<string>>(new Set());

  const q = query.trim().toLowerCase();
  const hit = (name: string, phone?: string, email?: string) =>
    !q || name.toLowerCase().includes(q) || (phone ?? "").includes(q) || (email ?? "").toLowerCase().includes(q);

  const visibleMatches = useMemo(
    () => matches.filter((m) => hit(m.platformUser.display_name || m.localContact.name, m.localContact.phone, m.localContact.email)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matches, q],
  );
  const filteredOthers = useMemo(
    () => nonMatches.filter((c) => hit(c.name, c.phone, c.email)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nonMatches, q],
  );
  const visibleOthers = filteredOthers.slice(0, shown);

  if (matches.length === 0 && nonMatches.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">{t('screens.contacts.noContactsFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {matches.length + nonMatches.length > 8 && (
        <div className="relative">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('mailhub.findFriends.results.search')}
            aria-label={t('mailhub.findFriends.results.search')}
            className="ps-8 h-10 text-sm"
          />
        </div>
      )}

      {visibleMatches.length > 0 && (
        <section className="space-y-2" data-testid="find-friends-on-platform">
          <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="w-6 h-6 rounded-full bg-[hsl(var(--contact-success)/0.1)] flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-[hsl(var(--contact-success))]" aria-hidden />
            </span>
            {t('mailhub.findFriends.results.onPlatform', { count: matches.length })}
          </h4>
          {visibleMatches.map((match) => (
            <div
              key={match.platformUser.user_id}
              className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--contact-success)/0.05)] border border-[hsl(var(--contact-success)/0.1)]"
            >
              <Avatar className="w-10 h-10 ring-1 ring-border/60 shrink-0">
                <AvatarImage src={match.platformUser.avatar_url} loading="lazy" />
                <AvatarFallback className="bg-[hsl(var(--contact-success)/0.1)] text-[hsl(var(--contact-success))]">
                  {(match.platformUser.display_name || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{match.platformUser.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {match.platformUser.handle ? `@${match.platformUser.handle}` : match.localContact.name}
                </p>
              </div>
              {onMessage && (
                <Button
                  size="sm"
                  onClick={() => onMessage(match.platformUser.user_id)}
                  data-testid={`message-member-${match.platformUser.user_id}`}
                  className="flex items-center gap-2 h-10 min-w-10 px-2.5 sm:px-3 shrink-0"
                  aria-label={t('mailhub.findFriends.results.message')}
                >
                  <MessageCircle className="w-4 h-4" aria-hidden />
                  <span className="sr-only sm:not-sr-only">{t('mailhub.findFriends.results.message')}</span>
                </Button>
              )}
            </div>
          ))}
        </section>
      )}

      {filteredOthers.length > 0 && (
        <section className="space-y-2" data-testid="find-friends-to-invite">
          <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="w-6 h-6 rounded-full bg-[hsl(var(--contact-sync-tint))] flex items-center justify-center">
              <UserPlus className="w-3.5 h-3.5 text-[hsl(var(--contact-sync-accent))]" aria-hidden />
            </span>
            {t('mailhub.findFriends.results.toInvite', { count: nonMatches.length })}
          </h4>
          {visibleOthers.map((contact) => (
            <div key={contact.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card border-border/50">
              <Avatar className="w-10 h-10 ring-1 ring-border/60 shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {(contact.name || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {contact.phone || contact.email
                    ? <bdi dir="ltr">{contact.phone || contact.email}</bdi>
                    : t('mailhub.findFriends.results.noContactInfo')}
                </p>
              </div>
              <InviteContactButton
                target={{ id: contact.id, name: contact.name, phone: contact.phone, phoneE164: contact.phoneE164, email: contact.email }}
                invited={invited.has(contact.id)}
                onInvited={(id) => setInvited((prev) => new Set(prev).add(id))}
              />
            </div>
          ))}
          {filteredOthers.length > shown && (
            <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + pageSize)} className="w-full text-xs text-muted-foreground">
              {t('screens.contacts.showValue0More', { value0: filteredOthers.length - shown })}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

export default DedupePreviewList;
