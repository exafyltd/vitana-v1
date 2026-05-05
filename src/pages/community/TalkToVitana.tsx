// VTID-02047: Talk to Vitana — community feedback capture
// Parent plan PR 2: minimal text-first capture screen for the unified
// feedback pipeline. Voice intake (orb handoff to specialists) lands in
// later PRs.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { communityFetch } from "@/lib/community-gateway";
import { communityNavigation } from "@/config/navigation";
import { notify, notifyError, t } from '@/lib/i18n-toast';

type Kind = "bug" | "ux_issue" | "support_question" | "account_issue" | "marketplace_claim" | "feature_request" | "feedback";

const KIND_OPTIONS: { value: Kind; label: string; hint: string }[] = [
  { value: "feedback", label: "General feedback", hint: "Ideas, thoughts, anything else" },
  { value: "bug", label: "Bug or crash", hint: "Something is broken" },
  { value: "ux_issue", label: "Confusing or hard to use", hint: "UI/UX feedback" },
  { value: "support_question", label: "How do I…?", hint: "Question about using Vitana" },
  { value: "account_issue", label: "Account problem", hint: "Login, profile, data" },
  { value: "marketplace_claim", label: "Order or payment", hint: "Refunds, marketplace" },
  { value: "feature_request", label: "Feature request", hint: "Something I wish existed" },
];

interface Ticket {
  id: string;
  ticket_number: string;
  kind: Kind;
  status: string;
  priority: string;
  surface: string | null;
  created_at: string;
  resolver_agent: string | null;
  resolved_at: string | null;
  user_confirmed_at: string | null;
  // VTID-02047: voice tool sets structured_fields.voice_origin=true so we
  // can render a "captured by voice" indicator. Backend includes this on
  // the /mine response when the field exists.
  structured_fields?: { voice_origin?: boolean } | null;
}

const STATUS_PILL: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "Submitted", tone: "secondary" },
  interviewing: { label: "Talking", tone: "secondary" },
  triaged: { label: "Triaged", tone: "secondary" },
  spec_pending: { label: "Reviewing", tone: "secondary" },
  spec_ready: { label: "Reviewing", tone: "secondary" },
  answer_pending: { label: "Drafting answer", tone: "secondary" },
  answer_ready: { label: "Reviewing", tone: "secondary" },
  approved: { label: "In progress", tone: "default" },
  in_progress: { label: "In progress", tone: "default" },
  resolved: { label: "Resolved", tone: "default" },
  user_confirmed: { label: "Confirmed", tone: "default" },
  duplicate: { label: "Duplicate", tone: "outline" },
  rejected: { label: "Closed", tone: "outline" },
  wont_fix: { label: "Closed", tone: "outline" },
  needs_more_info: { label: "Needs info", tone: "outline" },
  reopened: { label: "Reopened", tone: "destructive" },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function TalkToVitana() {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind>("feedback");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery<Ticket[]>({
    queryKey: ["feedback-tickets-mine"],
    queryFn: async () => {
      const res = await communityFetch("/api/v1/feedback/tickets/mine?limit=25");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.tickets ?? [];
    },
    // Refetch every 30s so voice-captured tickets (created via Vitana ORB
    // tool report_to_specialist) appear without manual refresh, and so
    // status transitions (resolved, etc.) are visible to the user soon
    // after they happen.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const handleSubmit = async () => {
    if (!text.trim()) {
      notifyError('toasts.community.addDescription', 'toasts.community.tellVitanaWhatSYourMind');
      return;
    }
    setSubmitting(true);
    try {
      const appVersion = (import.meta.env.VITE_APP_VERSION as string | undefined) || undefined;
      const payload: Record<string, unknown> = {
        raw_text: text.trim(),
        kind,
      };
      if (typeof window !== "undefined") {
        payload.screen_path = window.location.pathname;
      }
      if (appVersion) payload.app_version = appVersion;
      const res = await communityFetch("/api/v1/feedback/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as Record<string, unknown>));
        throw new Error((body as { details?: string; error?: string }).details ?? (body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const created = await res.json();
      setText("");
      setKind("feedback");
      await queryClient.invalidateQueries({ queryKey: ["feedback-tickets-mine"] });
      notify('toasts.community.thanksVitanaHasIt');
    } catch (err) {
      notifyError('toasts.community.couldnTSubmit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <SEO
        title={t('screens.community.talkVitana')}
        description="Report bugs, ask questions, or share feedback. Vitana and her colleagues will follow up."
      />
      <StandardHeader
        title={t('screens.community.talkVitana')}
        description="Bugs, questions, feedback — Vitana hands off to a specialist colleague when the topic is outside her domain."
      />
      <SubNavigation items={communityNavigation} activeId="overview" />

      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4" />
            {t('screens.community.whatSYourMind')}
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('screens.community.topic')}</label>
            <Select value={kind} onValueChange={v => setKind(v as Kind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="font-medium">{o.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{o.hint}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder={t('screens.community.describeWhatHappenedWhatYouTried')}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            className="resize-none"
            maxLength={10_000}
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting || !text.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Sending…" : "Send to Vitana"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('screens.community.vitanaDevonSageAtlasMiraAi')}
          </p>
        </Card>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">{t('screens.community.yourReports')}</h2>
          {ticketsQuery.isLoading && <p className="text-sm text-muted-foreground">{t('screens.community.loading2')}</p>}
          {ticketsQuery.error && (
            <p className="text-sm text-destructive">{t('screens.community.couldnTLoadYourReports')}</p>
          )}
          {ticketsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('screens.community.nothingHereYetYourReportsWill')}</p>
          )}
          {ticketsQuery.data?.map(t => {
            const pill = STATUS_PILL[t.status] ?? { label: t.status, tone: "outline" as const };
            const awaitingConfirm = t.status === "resolved";

            const handleConfirm = async () => {
              try {
                const res = await communityFetch(`/api/v1/feedback/tickets/${t.id}/confirm`, { method: "POST" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                await queryClient.invalidateQueries({ queryKey: ["feedback-tickets-mine"] });
                notify('toasts.community.thanks', 'toasts.community.weLlKeepEyeIt');
              } catch (err) {
                notifyError('toasts.community.couldnTConfirm');
              }
            };
            const handleReopen = async () => {
              try {
                const res = await communityFetch(`/api/v1/feedback/tickets/${t.id}/reopen`, { method: "POST" });
                if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  throw new Error(body.details ?? body.error ?? `HTTP ${res.status}`);
                }
                await queryClient.invalidateQueries({ queryKey: ["feedback-tickets-mine"] });
                notify('toasts.community.reopened', 'toasts.community.vitanaWillFollowUp');
              } catch (err) {
                notifyError('toasts.community.couldnTReopen');
              }
            };

            return (
              <Card key={t.id} className="flex flex-col gap-2 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="font-medium">{t.ticket_number}</span>
                      <Badge variant={pill.tone} className="text-[10px]">{pill.label}</Badge>
                      {t.structured_fields?.voice_origin && (
                        <Badge variant="outline" className="text-[10px]">{t('screens.community.viaVoice')}</Badge>
                      )}
                      {t.resolver_agent && (
                        <span className="text-xs text-muted-foreground">{t('screens.community.handledByResolver_agent', { resolver_agent: t.resolver_agent })}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {KIND_OPTIONS.find(k => k.value === t.kind)?.label ?? t.kind} · {timeAgo(t.created_at)}
                    </div>
                  </div>
                </div>
                {awaitingConfirm && (
                  <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                    <div className="mb-2 font-medium">
                      {t.resolver_agent
                        ? `${t.resolver_agent.charAt(0).toUpperCase() + t.resolver_agent.slice(1)} says this is fixed.`
                        : "We think this is fixed."}{" "}
                      Did it work?
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleConfirm}>{t('screens.community.yesFixed')}</Button>
                      <Button size="sm" variant="outline" onClick={handleReopen}>{t('screens.community.noStillBroken')}</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
