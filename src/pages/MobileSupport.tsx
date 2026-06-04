import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mic, Square, Send, CheckCircle2, Mail, MessageCircle, Phone, BookOpen, Paperclip, X, Users } from "lucide-react";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { MobileModePill, type ModeOption } from "@/components/ui/MobileModePill";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { ClientSTT } from "@/utils/clientSTT";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocalStorageItem } from "@/lib/localStorage";
import { notifyError, t } from "@/lib/i18n-toast";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { cn } from "@/lib/utils";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_BASE || "https://gateway-q74ibpv6ia-uc.a.run.app";

const CATEGORY_KEYS = ["account", "billing", "technical", "feature", "privacy", "other"] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

type TabKey = "contact" | "faqs" | "community";

// VTID-NAV-SUPPORT-TABS: map an incoming `?tab=` value (e.g. from a Vitana
// deep-link like /support?tab=faqs) onto a local tab. Accepts the canonical
// keys plus a few synonyms the navigator/desktop screen may emit (knowledge →
// faqs) so "take me to Support FAQs" opens the FAQ tab directly.
const TAB_ALIASES: Record<string, TabKey> = {
  contact: "contact",
  "contact-support": "contact",
  faqs: "faqs",
  faq: "faqs",
  knowledge: "faqs",
  "knowledge-base": "faqs",
  help: "faqs",
  articles: "faqs",
  community: "community",
  "community-help": "community",
};

function normalizeTab(value: string | null | undefined): TabKey | null {
  if (!value) return null;
  return TAB_ALIASES[value.trim().toLowerCase().replace(/[\s_]+/g, "-")] ?? null;
}

const FAQ_KEYS = ["CreateAccount", "ResetPassword", "UpdateProfile", "PaymentMethods", "DataSecure", "DeleteAccount"] as const;

function MobileSupport() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedLanguage } = useLanguage();
  const { pendingCount } = useAutopilot();
  const isAndroid = /Android/i.test(navigator.userAgent);

  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>(() => normalizeTab(searchParams.get("tab")) ?? "contact");

  // VTID-NAV-SUPPORT-TABS: honor `?tab=` deep-links. Runs on mount and whenever
  // the param changes (e.g. Vitana navigates here with ?tab=faqs).
  useEffect(() => {
    const next = normalizeTab(searchParams.get("tab"));
    if (next && next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Keep the URL in sync so the active tab is deep-linkable/shareable.
  const handleTabChange = (next: TabKey) => {
    setActiveTab(next);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [category, setCategory] = useState<CategoryKey | "">("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const sttRef = useRef<ClientSTT | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isRecordingRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFinalRef = useRef("");
  const lastFinalAtRef = useRef(0);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      sttRef.current?.stop();
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const normalizeWords = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
      .split(/\s+/)
      .filter(Boolean);

  const mergeFinalTranscript = (existing: string, incoming: string) => {
    const e = existing.trim();
    const i = incoming.trim();
    if (!i) return e;
    if (!e) return i;
    const eNorm = normalizeWords(e).join(" ");
    const iNorm = normalizeWords(i).join(" ");
    if (!iNorm) return e;
    if (eNorm === iNorm || eNorm.includes(iNorm)) return e;
    const eWords = e.split(/\s+/);
    const iWords = i.split(/\s+/);
    const eWordsNorm = eWords.map((w) => normalizeWords(w).join(""));
    const iWordsNorm = iWords.map((w) => normalizeWords(w).join(""));
    let overlap = 0;
    const max = Math.min(eWordsNorm.length, iWordsNorm.length);
    for (let size = max; size > 0; size--) {
      const eSuf = eWordsNorm.slice(-size).join(" ");
      const iPre = iWordsNorm.slice(0, size).join(" ");
      if (eSuf && eSuf === iPre) {
        overlap = size;
        break;
      }
    }
    const tail = iWords.slice(overlap).join(" ").trim();
    return tail ? `${e} ${tail}`.trim() : e;
  };

  const startRecording = () => {
    if (!ClientSTT.isSupported()) {
      notifyError("mobilesupport.errorNotSupported");
      return;
    }

    const stored = getLocalStorageItem("global", "language", "selected_language");
    const sttLanguage = (typeof stored === "string" ? stored : selectedLanguage)?.trim() || "de-DE";
    const useContinuous = !isAndroid;

    sttRef.current = new ClientSTT({
      language: sttLanguage,
      continuous: useContinuous,
      interimResults: true,
      onResult: (text, isFinal) => {
        const cleaned = text.trim();
        if (!cleaned) return;
        if (isFinal) {
          const normalized = cleaned.toLowerCase();
          const now = Date.now();
          if (normalized === lastFinalRef.current && now - lastFinalAtRef.current < 1500) {
            setInterimText("");
            return;
          }
          lastFinalRef.current = normalized;
          lastFinalAtRef.current = now;
          setTranscript((prev) => mergeFinalTranscript(prev, cleaned));
          setInterimText("");
        } else {
          setInterimText(cleaned);
        }
      },
      onError: (error) => {
        if (error === "no-speech" || error === "aborted" || error === "audio-capture") return;
        if (error === "not-allowed" || error === "service-not-allowed") {
          notifyError("mobilesupport.errorMicPermission");
        }
        stopRecording();
      },
      onEnd: () => {
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = null;
        }
        if (!isRecordingRef.current || !sttRef.current) return;
        setInterimText("");
        restartTimeoutRef.current = setTimeout(() => {
          if (!isRecordingRef.current || !sttRef.current) return;
          try {
            sttRef.current.setLanguage(sttLanguage);
            sttRef.current.start();
          } catch (e) {
            console.warn("[MobileSupport] Failed to restart STT:", e);
          }
        }, isAndroid ? 750 : 350);
      },
    });

    sttRef.current.setLanguage(sttLanguage);
    sttRef.current.start();
    setIsRecording(true);
    isRecordingRef.current = true;
    setRecordingDuration(0);
    setInterimText("");
    lastFinalRef.current = "";
    lastFinalAtRef.current = 0;

    timerRef.current = setInterval(() => {
      setRecordingDuration((p) => p + 1);
    }, 1000);
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (sttRef.current) {
      sttRef.current.stop();
      setIsRecording(false);
      setInterimText("");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setAttachments((prev) => [...prev, ...images]);
    images.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) setPreviewUrls((prev) => [...prev, e.target!.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const message = transcript.trim();
    if (!message) {
      notifyError("mobilesupport.errorEmpty");
      return;
    }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const uploadedUrls: string[] = [];
      for (const file of attachments) {
        const ext = file.name.split(".").pop();
        const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("feedback-attachments").upload(fileName, file);
        if (!upErr) {
          const { data } = await supabase.storage.from("feedback-attachments").createSignedUrl(fileName, 31536000);
          if (data?.signedUrl) uploadedUrls.push(data.signedUrl);
        }
      }

      const taggedTranscript = `[SUPPORT${category ? `:${category}` : ""}] ${message}`;
      const res = await fetch(`${GATEWAY_URL}/api/v1/voice-feedback/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          transcript: taggedTranscript,
          report_type: "bug_report",
          severity: "medium",
          affected_screen: category ? `support:${category}` : "support",
          attachments: uploadedUrls,
        }),
      });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error || "Submit failed");

      setTranscript("");
      setRecordingDuration(0);
      setAttachments([]);
      setPreviewUrls([]);
      setCategory("");
      setShowSuccess(true);
    } catch (error) {
      console.error("[MobileSupport] Send error:", error);
      notifyError("mobilesupport.errorSend");
    } finally {
      setIsSending(false);
    }
  };

  const handleEmailClick = () => {
    window.location.href = "mailto:support@exafy.io";
  };

  const SUPPORT_MODES: ModeOption[] = [
    { value: "contact", label: t("mobilesupport.tabContact"), icon: "💬" },
    { value: "faqs", label: t("mobilesupport.tabFaqs"), icon: "❓" },
    { value: "community", label: t("mobilesupport.tabCommunity"), icon: "👥" },
  ];

  return (
    <MobileAppShell>
      <div className="px-4 pt-4 pb-0 h-[100dvh] overflow-hidden flex flex-col bg-gradient-to-b from-background to-muted/30">
        <StandardHeader
          title={t("mobilesupport.title")}
          description={t("mobilesupport.description")}
          emoji="🆘"
        />

        <UtilityActionButton
          compact
          className="px-1 min-w-0"
          afterGiftVoucherChildren={(
            <>
              <VitanaIndexChip />
              <AutopilotChip pendingCount={pendingCount} onClick={() => setAutopilotOpen(true)} />
            </>
          )}
        >
          <div className="flex items-center gap-2 min-w-max">
            <ExpandableSearchButton
              placeholder={t("mobilesupport.searchPlaceholder")}
              onSearch={setSearchQuery}
            />
            <MobileModePill
              modes={SUPPORT_MODES}
              activeMode={activeTab}
              onModeChange={(v) => handleTabChange(v as TabKey)}
            />
          </div>
        </UtilityActionButton>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-24 px-0 flex flex-col gap-3">
          {activeTab === "contact" && (
            showSuccess ? (
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="p-4 rounded-full bg-green-100 dark:bg-green-950/30">
                    <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold">{t("mobilesupport.sentTitle")}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {t("mobilesupport.sentBody")}
                  </p>
                  <Button variant="outline" onClick={() => setShowSuccess(false)} className="mt-2">
                    {t("mobilesupport.sendAnother")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Voice hero — fills viewport when idle (no recording, no transcript yet) */}
                <Card className={cn(
                  "rounded-2xl border-border/50 shadow-sm",
                  !isRecording && !transcript && "flex-1"
                )}>
                  <CardContent className={cn(
                    "p-5 flex flex-col items-center text-center space-y-3",
                    !isRecording && !transcript && "h-full justify-center"
                  )}>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      {t("mobilesupport.hint")}
                    </p>

                    <div className="flex items-center justify-center py-2">
                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          aria-label={t("mobilesupport.recordButtonStart")}
                          className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                        >
                          <Mic className="h-10 w-10" />
                        </button>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <button
                            onClick={stopRecording}
                            aria-label={t("mobilesupport.recordButtonStop")}
                            className="h-24 w-24 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg animate-pulse"
                          >
                            <Square className="h-10 w-10" />
                          </button>
                          <Badge variant="destructive">{t("mobilesupport.recording")}</Badge>
                          <div className="text-xl font-mono font-bold text-destructive">
                            {formatDuration(recordingDuration)}
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {isRecording ? t("mobilesupport.listening") : t("mobilesupport.tapToSpeak")}
                    </p>

                    {isRecording && (
                      <div className="flex items-end gap-1 h-10">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className="bg-primary rounded-full w-1.5 animate-pulse"
                            style={{ height: `${Math.random() * 32 + 8}px`, animationDelay: `${i * 80}ms` }}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Transcript */}
                {(isRecording || transcript) && (
                  <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {t("mobilesupport.transcriptTitle")}
                        </span>
                        {!isRecording && recordingDuration > 0 && (
                          <Badge variant="outline">{formatDuration(recordingDuration)}</Badge>
                        )}
                      </div>
                      <Textarea
                        value={transcript + (interimText ? ` ${interimText}` : "")}
                        onChange={(e) => !isRecording && setTranscript(e.target.value)}
                        placeholder={t("mobilesupport.transcriptPlaceholder")}
                        className="min-h-24 text-sm"
                        disabled={isRecording}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("mobilesupport.speakNaturally")}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Category + attachments + submit */}
                {transcript && !isRecording && (
                  <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          {t("mobilesupport.categoryLabel")}
                        </label>
                        <Select value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder={t("mobilesupport.categoryPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="account">{t("mobilesupport.categoryAccount")}</SelectItem>
                            <SelectItem value="billing">{t("mobilesupport.categoryBilling")}</SelectItem>
                            <SelectItem value="technical">{t("mobilesupport.categoryTechnical")}</SelectItem>
                            <SelectItem value="feature">{t("mobilesupport.categoryFeature")}</SelectItem>
                            <SelectItem value="privacy">{t("mobilesupport.categoryPrivacy")}</SelectItem>
                            <SelectItem value="other">{t("mobilesupport.categoryOther")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4" />
                        {t("mobilesupport.attachLabel")}
                      </Button>

                      {previewUrls.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {previewUrls.map((url, i) => (
                            <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeAttachment(i)}
                                className="absolute top-0 right-0 p-0.5 bg-destructive text-destructive-foreground rounded-bl-lg"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button onClick={handleSubmit} disabled={isSending} size="lg" className="w-full gap-2">
                        <Send className="h-4 w-4" />
                        {isSending ? t("mobilesupport.submitting") : t("mobilesupport.submitButton")}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        {t("mobilesupport.responseTime")}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Quick contact — pinned to the end of the viewport */}
                <Card className="rounded-2xl border-border/50 shadow-sm shrink-0">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="text-sm font-semibold">
                      {t("mobilesupport.quickContactTitle")}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={handleEmailClick}
                        className="p-3 rounded-xl border border-border/50 hover:bg-muted/50 flex flex-col items-center gap-1 text-center min-w-0"
                      >
                        <Mail className="w-5 h-5 text-primary shrink-0" />
                        <span className="font-medium text-[11px] leading-tight">
                          {t("mobilesupport.quickContactEmail")}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {t("mobilesupport.quickContactEmailSub")}
                        </span>
                      </button>
                      <div className="p-3 rounded-xl border border-border/50 flex flex-col items-center gap-1 text-center opacity-60 min-w-0">
                        <MessageCircle className="w-5 h-5 text-primary shrink-0" />
                        <span className="font-medium text-[11px] leading-tight">
                          {t("mobilesupport.quickContactChat")}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {t("mobilesupport.quickContactChatSub")}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl border border-border/50 flex flex-col items-center gap-1 text-center opacity-60 min-w-0">
                        <Phone className="w-5 h-5 text-primary shrink-0" />
                        <span className="font-medium text-[11px] leading-tight">
                          {t("mobilesupport.quickContactCall")}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {t("mobilesupport.quickContactCallSub")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          )}

          {activeTab === "faqs" && (
            <>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4.5 h-4.5 text-primary" />
                    <div>
                      <h3 className="text-sm font-semibold">{t("mobilesupport.faqsTitle")}</h3>
                      <p className="text-xs text-muted-foreground">{t("mobilesupport.faqsSubtitle")}</p>
                    </div>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    {FAQ_KEYS.map((k) => (
                      <AccordionItem key={k} value={k}>
                        <AccordionTrigger className="text-sm text-left">
                          {t(`mobilesupport.faq${k}Q`)}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">
                          {t(`mobilesupport.faq${k}A`)}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              <button
                onClick={() => navigate("/maxina_support")}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block">
                    {t("mobilesupport.faqsOpenHelpCenter")}
                  </span>
                </div>
              </button>
            </>
          )}

          {activeTab === "community" && (
            <>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4.5 h-4.5 text-primary" />
                    <div>
                      <h3 className="text-sm font-semibold">{t("mobilesupport.communityTitle")}</h3>
                      <p className="text-xs text-muted-foreground">{t("mobilesupport.communitySubtitle")}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/50 p-3 space-y-2">
                    <h4 className="text-sm font-medium">{t("mobilesupport.communityGroupTitle")}</h4>
                    <p className="text-xs text-muted-foreground">{t("mobilesupport.communityGroupBody")}</p>
                    <Button size="sm" className="w-full" onClick={() => navigate("/comm/groups")}>
                      {t("mobilesupport.communityGroupCta")}
                    </Button>
                  </div>

                  <div className="rounded-xl border border-border/50 p-3 space-y-2">
                    <h4 className="text-sm font-medium">{t("mobilesupport.communityForumTitle")}</h4>
                    <p className="text-xs text-muted-foreground">{t("mobilesupport.communityForumBody")}</p>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/comm/groups")}>
                      {t("mobilesupport.communityForumCta")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("mobilesupport.communityStatsActive")}</span>
                    <span className="font-semibold">2,847</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("mobilesupport.communityStatsAnswered")}</span>
                    <span className="font-semibold">1,234</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("mobilesupport.communityStatsResponse")}</span>
                    <span className="font-semibold">{t("mobilesupport.communityStatsResponseValue")}</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
    </MobileAppShell>
  );
}

export default withScreenId(MobileSupport, SCREEN_IDS.SUPPORT_OVERVIEW);
