import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Square, Send, CheckCircle2, Mail, MessageCircle, Phone, BookOpen, Paperclip, X } from "lucide-react";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ClientSTT } from "@/utils/clientSTT";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocalStorageItem } from "@/lib/localStorage";
import { notifyError, t } from "@/lib/i18n-toast";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_BASE || "https://gateway-q74ibpv6ia-uc.a.run.app";

const CATEGORY_KEYS = ["account", "billing", "technical", "feature", "privacy", "other"] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

function MobileSupport() {
  const navigate = useNavigate();
  const { selectedLanguage } = useLanguage();
  const { pendingCount } = useAutopilot();
  const isAndroid = /Android/i.test(navigator.userAgent);

  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [, setSearchQuery] = useState("");
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
      notifyError("screens.mobilesupport.errorNotSupported");
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
          notifyError("screens.mobilesupport.errorMicPermission");
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
      notifyError("screens.mobilesupport.errorEmpty");
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
      notifyError("screens.mobilesupport.errorSend");
    } finally {
      setIsSending(false);
    }
  };

  const handleEmailClick = () => {
    window.location.href = "mailto:support@exafy.io";
  };

  return (
    <MobileAppShell>
      <div className="px-4 pt-4 pb-0 h-[100dvh] overflow-hidden flex flex-col bg-gradient-to-b from-background to-muted/30">
        <StandardHeader
          title={t("screens.mobilesupport.title")}
          description={t("screens.mobilesupport.description")}
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
              placeholder={t("screens.mobilesupport.searchPlaceholder")}
              onSearch={setSearchQuery}
            />
          </div>
        </UtilityActionButton>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-24 space-y-3 px-0">
          {showSuccess ? (
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-green-100 dark:bg-green-950/30">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold">{t("screens.mobilesupport.sentTitle")}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {t("screens.mobilesupport.sentBody")}
                </p>
                <Button variant="outline" onClick={() => setShowSuccess(false)} className="mt-2">
                  {t("screens.mobilesupport.sendAnother")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Hero: big mic button */}
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {t("screens.mobilesupport.hint")}
                  </p>

                  <div className="flex items-center justify-center py-2">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        aria-label={t("screens.mobilesupport.recordButtonStart")}
                        className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                      >
                        <Mic className="h-10 w-10" />
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <button
                          onClick={stopRecording}
                          aria-label={t("screens.mobilesupport.recordButtonStop")}
                          className="h-24 w-24 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg animate-pulse"
                        >
                          <Square className="h-10 w-10" />
                        </button>
                        <Badge variant="destructive">{t("screens.mobilesupport.recording")}</Badge>
                        <div className="text-xl font-mono font-bold text-destructive">
                          {formatDuration(recordingDuration)}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {isRecording ? t("screens.mobilesupport.listening") : t("screens.mobilesupport.tapToSpeak")}
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
                        {t("screens.mobilesupport.transcriptTitle")}
                      </span>
                      {!isRecording && recordingDuration > 0 && (
                        <Badge variant="outline">{formatDuration(recordingDuration)}</Badge>
                      )}
                    </div>
                    <Textarea
                      value={transcript + (interimText ? ` ${interimText}` : "")}
                      onChange={(e) => !isRecording && setTranscript(e.target.value)}
                      placeholder={t("screens.mobilesupport.transcriptPlaceholder")}
                      className="min-h-24 text-sm"
                      disabled={isRecording}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("screens.mobilesupport.speakNaturally")}
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
                        {t("screens.mobilesupport.categoryLabel")}
                      </label>
                      <Select value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder={t("screens.mobilesupport.categoryPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="account">{t("screens.mobilesupport.categoryAccount")}</SelectItem>
                          <SelectItem value="billing">{t("screens.mobilesupport.categoryBilling")}</SelectItem>
                          <SelectItem value="technical">{t("screens.mobilesupport.categoryTechnical")}</SelectItem>
                          <SelectItem value="feature">{t("screens.mobilesupport.categoryFeature")}</SelectItem>
                          <SelectItem value="privacy">{t("screens.mobilesupport.categoryPrivacy")}</SelectItem>
                          <SelectItem value="other">{t("screens.mobilesupport.categoryOther")}</SelectItem>
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
                      {t("screens.mobilesupport.attachLabel")}
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
                      {isSending ? t("screens.mobilesupport.submitting") : t("screens.mobilesupport.submitButton")}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      {t("screens.mobilesupport.responseTime")}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Quick contact */}
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold">
                    {t("screens.mobilesupport.quickContactTitle")}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handleEmailClick}
                      className="p-3 rounded-xl border border-border/50 hover:bg-muted/50 flex flex-col items-center gap-1 text-center min-w-0"
                    >
                      <Mail className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-medium text-[11px] leading-tight truncate w-full">
                        {t("screens.mobilesupport.quickContactEmail")}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight truncate w-full">
                        {t("screens.mobilesupport.quickContactEmailSub")}
                      </span>
                    </button>
                    <div className="p-3 rounded-xl border border-border/50 flex flex-col items-center gap-1 text-center opacity-60 min-w-0">
                      <MessageCircle className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-medium text-[11px] leading-tight truncate w-full">
                        {t("screens.mobilesupport.quickContactChat")}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight truncate w-full">
                        {t("screens.mobilesupport.quickContactChatSub")}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl border border-border/50 flex flex-col items-center gap-1 text-center opacity-60 min-w-0">
                      <Phone className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-medium text-[11px] leading-tight truncate w-full">
                        {t("screens.mobilesupport.quickContactCall")}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight truncate w-full">
                        {t("screens.mobilesupport.quickContactCallSub")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Help Center */}
              <button
                onClick={() => navigate("/maxina_support")}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block">
                    {t("screens.mobilesupport.helpCenterTitle")}
                  </span>
                  <p className="text-xs text-muted-foreground truncate">
                    {t("screens.mobilesupport.helpCenterSub")}
                  </p>
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
    </MobileAppShell>
  );
}

export default withScreenId(MobileSupport, SCREEN_IDS.SUPPORT_OVERVIEW);
