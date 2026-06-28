/**
 * Forward a message to another chat — VTID-03089 follow-up.
 *
 * Lists the caller's existing conversations (group chats + direct messages)
 * and forwards the selected message there. Used by MessageBubble's "Forward"
 * action, so it works identically in private chat (ConversationView) and the
 * standalone GroupChat view. Previously `handleForward` was a no-op stub, so
 * the Forward button did nothing anywhere.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchGroups,
  fetchConversations,
  sendGroupMessage,
  sendChatMessage,
} from "@/hooks/useChatApi";
import { t } from "@/lib/i18n-toast";
import { notify, notifyError } from "@/lib/i18n-toast";

interface ForwardTarget {
  kind: "group" | "dm";
  id: string; // group id or peer user id
  name: string;
  avatarUrl?: string;
}

interface ForwardMessageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: any;
}

export function ForwardMessageSheet({ open, onOpenChange, message }: ForwardMessageSheetProps) {
  const [targets, setTargets] = useState<ForwardTarget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Load forwardable targets (groups + DM peers) when the sheet opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    setQuery("");

    (async () => {
      try {
        const [groups, conversations] = await Promise.all([
          fetchGroups().catch(() => []),
          fetchConversations().catch(() => []),
        ]);

        const groupTargets: ForwardTarget[] = groups.map(g => ({
          kind: "group" as const,
          id: g.id,
          name: g.name,
          avatarUrl:
            g.metadata && typeof g.metadata === "object" && typeof (g.metadata as any).avatar_url === "string"
              ? String((g.metadata as any).avatar_url)
              : undefined,
        }));

        const peerIds = Array.from(new Set(conversations.map(c => c.peer_id).filter(Boolean)));
        const profileById = new Map<string, { display_name: string | null; full_name: string | null; avatar_url: string | null }>();
        if (peerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, full_name, avatar_url")
            .in("user_id", peerIds);
          (profiles || []).forEach((p: any) => profileById.set(p.user_id, p));
        }

        const dmTargets: ForwardTarget[] = peerIds.map(peerId => {
          const p = profileById.get(peerId);
          return {
            kind: "dm" as const,
            id: peerId,
            name: p?.display_name || p?.full_name || t("inbox.forward.unknownUser"),
            avatarUrl: p?.avatar_url || undefined,
          };
        });

        if (!cancelled) setTargets([...groupTargets, ...dmTargets]);
      } catch {
        if (!cancelled) setTargets([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter(tgt => tgt.name.toLowerCase().includes(q));
  }, [targets, query]);

  const handleSelect = useCallback(
    async (target: ForwardTarget) => {
      if (sendingId) return;
      setSendingId(target.id);
      const content = (message?.body || message?.content || "") as string;
      const messageType = (message?.message_type as string | undefined) || "text";
      const contentData = message?.content_data ?? undefined;
      try {
        if (target.kind === "group") {
          await sendGroupMessage(target.id, content, { messageType, contentData });
        } else {
          await sendChatMessage(target.id, content, { messageType, contentData });
        }
        notify("inbox.forward.sent", undefined, { name: target.name });
        onOpenChange(false);
      } catch {
        notifyError("inbox.forward.failed");
      } finally {
        setSendingId(null);
      }
    },
    [sendingId, message, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>{t("inbox.forward.title")}</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("inbox.forward.searchPlaceholder")}
            aria-label={t("inbox.forward.searchPlaceholder")}
          />
        </div>

        <ScrollArea className="max-h-[55vh]">
          <div className="px-2 pb-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {t("inbox.forward.empty")}
              </div>
            ) : (
              filtered.map(target => (
                <button
                  key={`${target.kind}:${target.id}`}
                  onClick={() => handleSelect(target)}
                  disabled={!!sendingId}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent disabled:opacity-60"
                >
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={target.avatarUrl} alt={target.name} className="object-cover" />
                    <AvatarFallback>
                      {target.kind === "group"
                        ? <Users className="h-4 w-4" />
                        : (target.name?.[0] || "?").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{target.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {target.kind === "group"
                        ? t("inbox.forward.groupLabel")
                        : t("inbox.forward.dmLabel")}
                    </div>
                  </div>
                  {sendingId === target.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default ForwardMessageSheet;
