// VTID-02047: Talk to Vitana — community feedback capture
// Parent plan PR 2: minimal text-first capture screen for the unified
// feedback pipeline. Voice intake (orb handoff to specialists) lands in
// later PRs.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MessageSquare, Send } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { communityFetch } from "@/lib/community-gateway";
import { communityNavigation } from "@/config/navigation";
import { notifyError, t } from '@/lib/i18n-toast';
import { TICKET_KINDS, type TicketKind } from "@/lib/feedback-ticket";
import { MyTicketsList } from "@/components/support/MyTicketsList";
import { MY_TICKETS_QUERY_KEY } from "@/lib/feedback-ticket";

// VTID-04335: the ticket list is the shared MyTicketsList (one status
// vocabulary, ticket numbers, answers, ?ticket= deep link); every visible
// string comes from the supportTickets catalog.
export default function TalkToVitana() {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<TicketKind>("feedback");
  const [submitting, setSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState<{ id: string; ticket_number: string } | null>(null);
  const queryClient = useQueryClient();

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json() as { id?: string; ticket_number?: string };
      setText("");
      setKind("feedback");
      if (created.id && created.ticket_number) setLastTicket({ id: created.id, ticket_number: created.ticket_number });
      await queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
    } catch {
      notifyError('toasts.community.couldnTSubmit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <SEO
        title={t('screens.community.talkVitana')}
        description={t('supportTickets.talk.seoDescription')}
      />
      <StandardHeader
        title={t('screens.community.talkVitana')}
        description={t('supportTickets.talk.headerDescription')}
      />
      <SubNavigation items={communityNavigation} />

      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4" />
            {t('screens.community.whatSYourMind')}
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t('screens.community.topic')}</label>
            <Select value={kind} onValueChange={v => setKind(v as TicketKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_KINDS.map(k => (
                  <SelectItem key={k} value={k}>
                    <span className="font-medium">{t(`supportTickets.kind.${k}`)}</span>
                    <span className="ms-2 text-xs text-muted-foreground">{t(`supportTickets.kindHint.${k}`)}</span>
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
              <Send className="me-2 h-4 w-4" />
              {submitting ? t('supportTickets.talk.sending') : t('supportTickets.talk.send')}
            </Button>
          </div>
          {lastTicket && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm" data-testid="ticket-created">
              <div className="font-medium">{t('supportTickets.submittedTitle')}</div>
              <div>{t('supportTickets.submittedNumber', { number: lastTicket.ticket_number })}</div>
              <Link className="text-primary underline" to={`/comm/talk-to-vitana?ticket=${encodeURIComponent(lastTicket.id)}`}>
                {t('supportTickets.viewTicket')}
              </Link>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t('screens.community.vitanaDevonSageAtlasMiraAi')}
          </p>
        </Card>

        <MyTicketsList headingKey="screens.community.yourReports" />
      </div>
    </AppLayout>
  );
}
