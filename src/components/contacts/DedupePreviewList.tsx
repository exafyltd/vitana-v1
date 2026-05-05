import { useState } from "react";
import { Check, UserPlus, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

export interface MatchedContact {
  localContact: {
    id: string;
    name: string;
    phone?: string;
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
  email?: string;
}

interface DedupePreviewListProps {
  matches: MatchedContact[];
  nonMatches: ImportedContact[];
  onConnect?: (userId: string) => void;
  onSelectForInvite: (contactIds: string[]) => void;
  selectedForInvite: string[];
  maxVisibleNonMatches?: number;
}

export function DedupePreviewList({
  matches,
  nonMatches,
  onConnect,
  onSelectForInvite,
  selectedForInvite,
  maxVisibleNonMatches = 5,
}: DedupePreviewListProps) {
  const [showAllNonMatches, setShowAllNonMatches] = useState(false);
  
  const visibleNonMatches = showAllNonMatches 
    ? nonMatches 
    : nonMatches.slice(0, maxVisibleNonMatches);

  const toggleSelectAll = () => {
    if (selectedForInvite.length === nonMatches.length) {
      onSelectForInvite([]);
    } else {
      onSelectForInvite(nonMatches.map(c => c.id));
    }
  };

  const toggleContact = (id: string) => {
    if (selectedForInvite.includes(id)) {
      onSelectForInvite(selectedForInvite.filter(i => i !== id));
    } else {
      onSelectForInvite([...selectedForInvite, id]);
    }
  };

  const getConfidenceBadge = (confidence: MatchedContact["matchConfidence"]) => {
    const config = {
      exact: { label: "Exact match", className: "bg-[hsl(var(--contact-success)/0.1)] text-[hsl(var(--contact-success))]" },
      probable: { label: "Likely match", className: "bg-[hsl(var(--contact-warning)/0.1)] text-[hsl(var(--contact-warning))]" },
      possible: { label: "Possible", className: "bg-muted text-muted-foreground" },
    };
    return config[confidence];
  };

  return (
    <div className="space-y-6">
      {/* Matches Section */}
      {matches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[hsl(var(--contact-success)/0.1)] flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-[hsl(var(--contact-success))]" />
            </div>
            <h4 className="text-sm font-medium text-foreground">
              Already on VITANA ({matches.length})
            </h4>
          </div>

          <div className="space-y-2">
            {matches.map((match, index) => (
              <motion.div
                key={match.platformUser.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--contact-success)/0.05)] border border-[hsl(var(--contact-success)/0.1)]"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 ring-1 ring-border/60">
                    <AvatarImage src={match.platformUser.avatar_url} />
                    <AvatarFallback className="bg-[hsl(var(--contact-success)/0.1)] text-[hsl(var(--contact-success))]">
                      {match.platformUser.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {match.platformUser.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {match.platformUser.handle ? `@${match.platformUser.handle}` : match.localContact.phone || match.localContact.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className={cn("text-[10px]", getConfidenceBadge(match.matchConfidence).className)}
                  >
                    {getConfidenceBadge(match.matchConfidence).label}
                  </Badge>
                  {onConnect && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onConnect(match.platformUser.user_id)}
                      className="h-8"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      {t('screens.contacts.connect')}
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Non-Matches Section */}
      {nonMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[hsl(var(--contact-sync-tint))] flex items-center justify-center">
                <UserPlus className="w-3.5 h-3.5 text-[hsl(var(--contact-sync-accent))]" />
              </div>
              <h4 className="text-sm font-medium text-foreground">
                Invite to VITANA ({nonMatches.length})
              </h4>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="text-xs h-7"
            >
              {selectedForInvite.length === nonMatches.length ? "Deselect all" : "Select all"}
            </Button>
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {visibleNonMatches.map((contact, index) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-colors",
                    selectedForInvite.includes(contact.id)
                      ? "bg-[hsl(var(--contact-sync-tint))] border-[hsl(var(--contact-sync-accent)/0.3)]"
                      : "bg-card border-border/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedForInvite.includes(contact.id)}
                      onCheckedChange={() => toggleContact(contact.id)}
                    />
                    <Avatar className="w-10 h-10 ring-1 ring-border/60">
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {contact.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {contact.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contact.phone || contact.email || "No contact info"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Show more/less toggle */}
          {nonMatches.length > maxVisibleNonMatches && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllNonMatches(!showAllNonMatches)}
              className="w-full text-xs text-muted-foreground"
            >
              {showAllNonMatches ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show {nonMatches.length - maxVisibleNonMatches} more
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Empty state */}
      {matches.length === 0 && nonMatches.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">{t('screens.contacts.noContactsFound')}</p>
        </div>
      )}
    </div>
  );
}

export default DedupePreviewList;
