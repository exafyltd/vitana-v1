/**
 * VTID-04335 — the desktop Customer Support page.
 *
 * Replaces a fake page: hard-coded mock tickets, invented stats, and a
 * "Submit ticket" form with no submit handler (its "new ticket" popup only
 * logged). Now: a real contact form posting to the unified ticket pipeline
 * (surface 'support', same body as mobile Support → Contact), "Report by
 * voice" opening the ORB, and the member's real tickets (MyTicketsList).
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Mail, Mic, Send, Users } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { notifyError, t } from "@/lib/i18n-toast";
import { communityFetch } from "@/lib/community-gateway";
import { activateOrb } from "@/lib/orbActivate";
import { buildSupportContactBody, SUPPORT_CATEGORIES, type SupportCategory } from "@/lib/feedback-ticket";
import { MyTicketsList } from "@/components/support/MyTicketsList";
import { useRTL } from "@/components/RTLProvider";
import { MY_TICKETS_QUERY_KEY } from "@/lib/feedback-ticket";

type TabKey = "contact" | "tickets" | "knowledge" | "community";

// VTID-NAV-SUPPORT-TABS: map an incoming `?tab=` value onto one of this
// screen's tabs. Accepts the canonical keys plus synonyms the navigator emits
// (faq/faqs → knowledge) so a Vitana deep-link like /support?tab=faqs opens the
// Knowledge Base tab directly instead of the default Contact tab.
const TAB_ALIASES: Record<string, TabKey> = {
  contact: "contact",
  "contact-support": "contact",
  tickets: "tickets",
  "my-tickets": "tickets",
  ticket: "tickets",
  knowledge: "knowledge",
  "knowledge-base": "knowledge",
  faq: "knowledge",
  faqs: "knowledge",
  help: "knowledge",
  articles: "knowledge",
  community: "community",
  "community-help": "community",
};

function normalizeSupportTab(value: string | null | undefined): TabKey | null {
  if (!value) return null;
  return TAB_ALIASES[value.trim().toLowerCase().replace(/[\s_]+/g, "-")] ?? null;
}

const CATEGORY_LABEL: Record<SupportCategory, string> = {
  account: "mobilesupport.categoryAccount",
  billing: "mobilesupport.categoryBilling",
  technical: "mobilesupport.categoryTechnical",
  feature: "mobilesupport.categoryFeature",
  privacy: "mobilesupport.categoryPrivacy",
  other: "mobilesupport.categoryOther",
};

const FAQ_KEYS = ["CreateAccount", "ResetPassword", "UpdateProfile", "PaymentMethods", "DataSecure", "DeleteAccount"] as const;

function Support() {
  const navigate = useNavigate();
  // Radix Tabs (SplitBar) defaults to dir="ltr"; follow the app direction so
  // Arabic lays out right-to-left.
  const { isRTL } = useRTL();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(
    () => normalizeSupportTab(searchParams.get("tab")) ?? (searchParams.get("ticket") ? "tickets" : "contact"),
  );
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<SupportCategory | "">("");
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<{ id: string; ticket_number: string } | null>(null);

  // Honor `?tab=` deep-links on mount and whenever the param changes.
  useEffect(() => {
    const next = normalizeSupportTab(searchParams.get("tab"));
    if (next && next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Keep the URL in sync so the active tab is deep-linkable/shareable.
  const handleTabChange = (next: string, extra?: Record<string, string>) => {
    const tab = normalizeSupportTab(next) ?? "contact";
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
    setSearchParams(params, { replace: true });
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      notifyError("mobilesupport.errorEmpty");
      return;
    }
    setSending(true);
    try {
      const res = await communityFetch("/api/v1/feedback/tickets", {
        method: "POST",
        body: JSON.stringify(buildSupportContactBody({ message, category, entryMethod: "text" })),
      });
      const result = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; ticket_number?: string };
      if (!res.ok || !result.ok) throw new Error(`HTTP ${res.status}`);
      setMessage("");
      setCategory("");
      setCreated(result.id && result.ticket_number ? { id: result.id, ticket_number: result.ticket_number } : null);
      await queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
    } catch {
      notifyError("mobilesupport.errorSend");
    } finally {
      setSending(false);
    }
  };

  const handleVoice = () => {
    if (!activateOrb()) notifyError("supportTickets.orbUnavailable");
  };

  return (
    <AppLayout>
      <SEO title={t("supportTickets.support.seoTitle")} description={t("supportTickets.support.seoDescription")} canonical={window.location.href} />
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-5xl">
          <StandardHeader
            title={t("supportTickets.support.headerTitle")}
            description={t("supportTickets.support.headerDescription")}
          />

          <SplitBar value={activeTab} onValueChange={(v) => handleTabChange(v)} dir={isRTL ? "rtl" : "ltr"}>
            <SplitBarList>
              <SplitBarTrigger value="contact">{t("supportTickets.support.tabContact")}</SplitBarTrigger>
              <SplitBarTrigger value="tickets">{t("supportTickets.support.tabTickets")}</SplitBarTrigger>
              <SplitBarTrigger value="knowledge">{t("supportTickets.support.tabFaqs")}</SplitBarTrigger>
              <SplitBarTrigger value="community">{t("supportTickets.support.tabCommunity")}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="contact">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 lg:col-span-8">
                  <Card>
                    <CardContent className="space-y-4 p-5">
                      {created ? (
                        <div className="flex flex-col items-center gap-3 py-6 text-center" data-testid="ticket-created">
                          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                          <h3 className="text-lg font-semibold">{t("supportTickets.submittedTitle")}</h3>
                          <p className="text-base font-semibold" dir="auto">
                            {t("supportTickets.submittedNumber", { number: created.ticket_number })}
                          </p>
                          <p className="max-w-md text-sm text-muted-foreground">{t("supportTickets.submittedBody")}</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button onClick={() => { handleTabChange("tickets", { ticket: created.id }); setCreated(null); }}>
                              {t("supportTickets.viewTicket")}
                            </Button>
                            <Button variant="outline" onClick={() => setCreated(null)}>
                              {t("supportTickets.sendAnother")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <h3 className="flex items-center gap-2 font-semibold">
                              <Send className="h-4 w-4 text-primary" />
                              {t("supportTickets.support.contactTitle")}
                            </h3>
                            <p className="text-sm text-muted-foreground">{t("supportTickets.support.contactSubtitle")}</p>
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="support-category" className="text-sm font-medium">{t("mobilesupport.categoryLabel")}</label>
                            <Select value={category} onValueChange={(v) => setCategory(v as SupportCategory)}>
                              <SelectTrigger id="support-category">
                                <SelectValue placeholder={t("mobilesupport.categoryPlaceholder")} />
                              </SelectTrigger>
                              <SelectContent>
                                {SUPPORT_CATEGORIES.map((c) => (
                                  <SelectItem key={c} value={c}>{t(CATEGORY_LABEL[c])}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="support-message" className="text-sm font-medium">{t("supportTickets.support.messageLabel")}</label>
                            <Textarea
                              id="support-message"
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder={t("supportTickets.support.messagePlaceholder")}
                              className="min-h-32"
                              maxLength={10_000}
                            />
                          </div>
                          <Button className="w-full" onClick={handleSubmit} disabled={sending || !message.trim()}>
                            <Send className="me-2 h-4 w-4" />
                            {sending ? t("supportTickets.support.sending") : t("supportTickets.support.submit")}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="col-span-12 space-y-4 lg:col-span-4">
                  <Card>
                    <CardContent className="space-y-3 p-5">
                      <h3 className="flex items-center gap-2 font-semibold">
                        <Mic className="h-4 w-4 text-primary" />
                        {t("supportTickets.support.voiceTitle")}
                      </h3>
                      <p className="text-sm text-muted-foreground">{t("supportTickets.support.voiceBody")}</p>
                      <Button variant="outline" className="w-full" onClick={handleVoice}>
                        <Mic className="me-2 h-4 w-4" />
                        {t("supportTickets.support.voiceButton")}
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="space-y-3 p-5">
                      <h3 className="flex items-center gap-2 font-semibold">
                        <Mail className="h-4 w-4 text-primary" />
                        {t("supportTickets.support.emailTitle")}
                      </h3>
                      <p className="text-sm text-muted-foreground">{t("supportTickets.support.emailBody")}</p>
                      <Button variant="ghost" className="w-full" onClick={() => { window.location.href = "mailto:support@exafy.io"; }}>
                        <span dir="ltr">{t("mobilesupport.quickContactEmailSub")}</span>
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="col-span-12">
                  <MyTicketsList pageSize={3} headingKey="supportTickets.title" />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="tickets">
              <p className="mb-3 text-sm text-muted-foreground">{t("supportTickets.subtitle")}</p>
              <MyTicketsList hideHeading />
            </SplitBarContent>

            <SplitBarContent value="knowledge">
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <div>
                      <h3 className="font-semibold">{t("mobilesupport.faqsTitle")}</h3>
                      <p className="text-sm text-muted-foreground">{t("mobilesupport.faqsSubtitle")}</p>
                    </div>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    {FAQ_KEYS.map((k) => (
                      <AccordionItem key={k} value={k}>
                        <AccordionTrigger className="text-start text-sm">{t(`mobilesupport.faq${k}Q`)}</AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">{t(`mobilesupport.faq${k}A`)}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <Button variant="outline" onClick={() => navigate("/maxina_support")}>
                    {t("mobilesupport.faqsOpenHelpCenter")}
                  </Button>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="community">
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <div>
                      <h3 className="font-semibold">{t("mobilesupport.communityTitle")}</h3>
                      <p className="text-sm text-muted-foreground">{t("mobilesupport.communitySubtitle")}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2 rounded-xl border p-4">
                      <h4 className="text-sm font-medium">{t("mobilesupport.communityGroupTitle")}</h4>
                      <p className="text-sm text-muted-foreground">{t("mobilesupport.communityGroupBody")}</p>
                      <Button size="sm" onClick={() => navigate("/comm/groups")}>{t("mobilesupport.communityGroupCta")}</Button>
                    </div>
                    <div className="space-y-2 rounded-xl border p-4">
                      <h4 className="text-sm font-medium">{t("mobilesupport.communityForumTitle")}</h4>
                      <p className="text-sm text-muted-foreground">{t("mobilesupport.communityForumBody")}</p>
                      <Button size="sm" variant="outline" onClick={() => navigate("/comm/groups")}>{t("mobilesupport.communityForumCta")}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Support, SCREEN_IDS.SUPPORT_OVERVIEW);
