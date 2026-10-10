/**
 * VTID-04917 — invite someone to a calendar entry: pick a chat or a group and
 * send. The message is an invite card the gateway builds from the member's
 * own entry (title, time, place); the app only names the entry. The person
 * answers on the card: a free event is joined, a paid event or a live room
 * opens, an own entry lands in their calendar.
 *
 * Nothing is sent until the member picks one conversation and taps Send.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { useAuth } from "@/context/AuthProvider";
import { fetchGroups, sendChatMessage, sendGroupMessage } from "@/hooks/useChatApi";
import { buildGlobalThreadsQueryFn, type GlobalMessageThread } from "@/hooks/useGlobalMessages";
import { chatGroupsQueryKey } from "@/hooks/useChatGroupsAsThreads";
import { isVitanaBot } from "@/lib/vitanaBotIdentity";
import { inviteRefusalOf, type CalendarWindowItem } from "@/lib/calendar-window-client";
import { entryTitle } from "./labels";
import { SURFACE } from "./theme";

export interface InviteTarget {
  kind: "dm" | "group";
  id: string;
  name: string;
}

const MAX_CHATS = 30;

/** Direct chats with a real member (never the Vitana bot, never a legacy thread). */
export function dmTargets(threads: GlobalMessageThread[] | undefined): InviteTarget[] {
  const out: InviteTarget[] = [];
  for (const th of threads ?? []) {
    if (th.type !== "direct" || isVitanaBot(th.id)) continue;
    const peer = th.participants?.find((p) => p.user_id === th.id);
    if (!peer) continue; // legacy threads are keyed by thread id, not by the person
    out.push({ kind: "dm", id: th.id, name: peer.display_name || "" });
    if (out.length >= MAX_CHATS) break;
  }
  return out;
}

export async function sendInvite(target: InviteTarget, entryId: string): Promise<void> {
  const opts = { messageType: "calendar_invite", contentData: { entry_id: entryId } };
  if (target.kind === "dm") await sendChatMessage(target.id, "", opts);
  else await sendGroupMessage(target.id, "", opts);
}

interface Props {
  item: CalendarWindowItem;
  onClose: () => void;
}

export function InviteToChatSheet({ item, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<InviteTarget | null>(null);

  const threadsKey = ["global-threads", user?.id] as const;
  const threads = useQuery({
    queryKey: threadsKey,
    queryFn: () => buildGlobalThreadsQueryFn(user!.id, queryClient, threadsKey),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const groups = useQuery({
    queryKey: chatGroupsQueryKey(user?.id),
    queryFn: fetchGroups,
    enabled: !!user?.id,
    staleTime: 2 * 60_000,
  });

  const targets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: InviteTarget[] = [
      ...dmTargets(threads.data),
      ...(groups.data ?? []).map((g) => ({ kind: "group" as const, id: g.id, name: g.name })),
    ];
    return q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
  }, [threads.data, groups.data, query]);

  const send = useMutation({
    mutationFn: (target: InviteTarget) => sendInvite(target, item.event_id),
    onSuccess: (_d, target) => {
      notify("vcal.invite.sent", undefined, { name: target.name });
      onClose();
    },
    onError: (err) => notifyError(inviteRefusalOf(err) === "not_invitable" ? "vcal.invite.notInvitable" : "vcal.invite.error"),
  });

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const loading = threads.isLoading || groups.isLoading;
  const title = item.event ? entryTitle(item.event) : "";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vcal-invite-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-hidden rounded-t-[28px] p-6 pb-28 md:rounded-[28px] md:pb-6"
        style={{ background: SURFACE.page, color: SURFACE.ink }}
        onClick={(e) => e.stopPropagation()}
        data-testid="vcal-invite-sheet"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="vcal-invite-title" className="m-0 text-lg font-bold leading-tight tracking-tight">
              {t("vcal.invite.title")}
            </h2>
            <p className="m-0 mt-1 truncate text-sm" style={{ color: SURFACE.muted }}>
              {title}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("vcal.entry.close")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg"
          >
            ✕
          </button>
        </div>

        <input
          type="search"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
          placeholder={t("vcal.invite.search")}
          aria-label={t("vcal.invite.search")}
          className="h-12 w-full rounded-2xl bg-white px-4 text-base text-slate-900"
          data-testid="vcal-invite-search"
        />

        <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-2 overflow-y-auto p-0" data-testid="vcal-invite-list">
          {loading && targets.length === 0 && (
            <li className="rounded-2xl bg-white px-4 py-3 text-sm" style={{ color: SURFACE.muted }}>
              {t("vcal.invite.loading")}
            </li>
          )}
          {!loading && targets.length === 0 && (
            <li className="rounded-2xl bg-white px-4 py-3 text-sm" style={{ color: SURFACE.muted }} data-testid="vcal-invite-empty">
              {t("vcal.invite.empty")}
            </li>
          )}
          {targets.map((x) => {
            const selected = picked?.kind === x.kind && picked.id === x.id;
            return (
              <li key={`${x.kind}:${x.id}`}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPicked(selected ? null : x)}
                  className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl bg-white px-4 py-2 text-start"
                  style={selected ? { outline: `2px solid ${SURFACE.primary}` } : undefined}
                  data-testid={`vcal-invite-target-${x.kind}`}
                >
                  <span aria-hidden className="text-xl">
                    {x.kind === "group" ? "👥" : "💬"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-base">{x.name}</span>
                  <span className="shrink-0 text-xs" style={{ color: SURFACE.muted }}>
                    {x.kind === "group" ? t("vcal.invite.group") : t("vcal.invite.chat")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          disabled={!picked || send.isPending}
          onClick={() => picked && send.mutate(picked)}
          className="h-14 shrink-0 rounded-[18px] text-lg font-semibold text-white disabled:opacity-50"
          style={{ background: SURFACE.primary }}
          data-testid="vcal-invite-send"
        >
          {picked ? t("vcal.invite.sendTo", { name: picked.name }) : t("vcal.invite.send")}
        </button>
      </div>
    </div>
  );
}
