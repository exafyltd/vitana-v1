/**
 * VTID-01967 + VTID-01987: Vitana ID onboarding interstitial.
 *
 * Shown automatically once after signup when profile.vitanaIdLocked === false.
 * The user accepts the auto-suggested ID ("Use this") or opens the picker
 * modal to change the BASE name part. The SUFFIX is the user's
 * chronological registration_seq — locked, never editable. This guarantees
 * the property "vitana_id ends with the user's registration rank" holds for
 * every account.
 *
 * One-shot: after POST /api/v1/users/me/vitana-id/confirm succeeds, the
 * server flips vitana_id_locked = true. This component never renders again
 * for that user.
 */

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthProvider";
import { useProfile } from "@/context/ProfileProvider";
import { lookup, notifyError, t } from '@/lib/i18n-toast';

const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

const BASE_REGEX = /^[a-z][a-z0-9]{1,7}$/;

async function gatewayFetch(path: string, init: RequestInit, token?: string): Promise<Response> {
  return fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(init.headers || {}),
    },
  });
}

function splitVitanaId(v: string | undefined): { base: string; seq: string } {
  if (!v) return { base: "", seq: "" };
  const m = v.match(/^([a-z][a-z0-9]*?)([0-9]+)$/);
  if (!m) return { base: v, seq: "" };
  return { base: m[1], seq: m[2] };
}

export function VitanaIdOnboardingCard() {
  const { session, user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { toast } = useToast();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [baseAlternatives, setBaseAlternatives] = useState<string[]>([]);
  const [selectedBase, setSelectedBase] = useState<string>("");
  const [customBase, setCustomBase] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const shouldShow = useMemo(() => {
    if (!user || !session) return false;
    if (!profile.vitanaId) return false;
    return profile.vitanaIdLocked === false;
  }, [user, session, profile.vitanaId, profile.vitanaIdLocked]);

  // Suffix is the user's registration_seq — never editable. We extract it
  // from the current vitana_id as a safety net for older accounts where
  // registrationSeq wasn't surfaced yet.
  const { base: currentBase, seq: parsedSeq } = splitVitanaId(profile.vitanaId);
  const seqDigits =
    profile.registrationSeq !== undefined && profile.registrationSeq !== null
      ? String(profile.registrationSeq)
      : parsedSeq;

  const customValidationError = useMemo(() => {
    if (!customBase) return "";
    const normalized = customBase.trim().replace(/^@/, "").toLowerCase();
    if (!BASE_REGEX.test(normalized)) {
      return "2-8 characters, must start with a letter, lowercase + digits only.";
    }
    return "";
  }, [customBase]);

  const candidateBase = (selectedBase || customBase).trim().replace(/^@/, "").toLowerCase();
  const candidatePreview = candidateBase && seqDigits ? `${candidateBase}${seqDigits}` : "";

  const fetchSuggestion = async () => {
    if (!session?.access_token) return;
    try {
      const res = await gatewayFetch(
        "/users/me/vitana-id/suggestion",
        { method: "GET" },
        session.access_token,
      );
      const data = await res.json();
      const alternatives: string[] | undefined = data?.data?.base_alternatives;
      if (res.ok && Array.isArray(alternatives)) {
        setBaseAlternatives(alternatives);
        if (!selectedBase && alternatives.length > 0 && !customBase) {
          setSelectedBase(alternatives[0]);
        }
      }
    } catch (err) {
      console.warn("[VitanaIdOnboarding] failed to load suggestion:", err);
    }
  };

  useEffect(() => {
    if (pickerOpen) {
      fetchSuggestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);

  const submitBase = async (base: string) => {
    if (!session?.access_token || !base) return;
    setSubmitting(true);
    try {
      const res = await gatewayFetch(
        "/users/me/vitana-id/confirm",
        {
          method: "POST",
          body: JSON.stringify({ base }),
        },
        session.access_token,
      );
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: data.error === "TAKEN"
            ? "That Vitana ID is already taken"
            : data.error === "ALIAS_COLLISION"
              ? "That Vitana ID was previously used"
              : data.error === "RESERVED_TOKEN"
                ? "That name is reserved"
                : data.error === "INVALID_BASE"
                  ? "Invalid name"
                  : data.error === "ALREADY_LOCKED"
                    ? "Your Vitana ID was already set"
                    : "Could not save Vitana ID",
          description: data.message || data.error || "Please try a different name.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: `Vitana ID set: @${data.vitana_id}`,
        description: lookup('toasts.onboarding.thisYourSpeakableIdAcrossVitana'),
      });
      setPickerOpen(false);
      refreshProfile();
    } catch (err: any) {
      notifyError('toasts.onboarding.networkError');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseCurrent = async () => {
    if (!currentBase) return;
    await submitBase(currentBase);
  };

  const handleCopy = async () => {
    if (!profile.vitanaId) return;
    try {
      await navigator.clipboard.writeText(`@${profile.vitanaId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard not available in some WebViews
    }
  };

  if (!shouldShow) return null;

  return (
    <>
      <div
        data-vtid-onboarding-card
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur-md shadow-lg"
        role="dialog"
        aria-label={t('screens.onboarding.pickYourVitanaId')}
      >
        <div className="max-w-xl mx-auto p-4 space-y-3">
          <div className="text-center space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Your Vitana ID — Member #{seqDigits || "?"}
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-semibold tracking-wide">
                @{profile.vitanaId}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopy}
                aria-label={t('screens.onboarding.copyVitanaId')}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Speakable. Language-neutral. The number is your registration rank — locked.
              You can change the name part once.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={handleUseCurrent}
              disabled={submitting || !currentBase}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Use this"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setPickerOpen(true)}
              disabled={submitting}
            >
              {t('screens.onboarding.changeName')}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={pickerOpen} onOpenChange={(open) => !submitting && setPickerOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('screens.onboarding.pickNamePartYourVitanaId')}</DialogTitle>
            <DialogDescription>
              The number ({seqDigits}) is your registration rank — locked, can't be changed.
              You can change the name. Once you confirm, your Vitana ID is permanent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {baseAlternatives.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('screens.onboarding.suggestions')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {baseAlternatives.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setSelectedBase(b);
                        setCustomBase("");
                      }}
                      className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                        selectedBase === b && !customBase
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      @{b}
                      <span className="text-muted-foreground">{seqDigits}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Or type your own name
              </p>
              <div className="flex items-center gap-1">
                <span className="text-lg font-medium text-muted-foreground">@</span>
                <Input
                  value={customBase}
                  onChange={(e) => {
                    setCustomBase(e.target.value);
                    if (e.target.value) setSelectedBase("");
                  }}
                  placeholder="e.g. alex"
                  aria-invalid={Boolean(customValidationError)}
                  aria-describedby="vitana-id-help"
                  className="flex-1"
                />
                <span className="px-2 py-2 rounded-md bg-muted text-sm font-medium text-muted-foreground">
                  {seqDigits}
                </span>
              </div>
              <p id="vitana-id-help" className="text-xs text-muted-foreground">
                {t('screens.onboarding.namePart28CharactersLowercase')} <span className="font-mono">@{candidatePreview || `(your name)${seqDigits}`}</span>.
                {customValidationError && (
                  <span className="block text-destructive mt-1">{customValidationError}</span>
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPickerOpen(false)}
              disabled={submitting}
            >
              {t('screens.onboarding.cancel')}
            </Button>
            <Button
              variant="default"
              onClick={() => submitBase(candidateBase)}
              disabled={
                submitting ||
                !candidateBase ||
                Boolean(customValidationError && customBase) ||
                (Boolean(customBase) && customBase.trim().replace(/^@/, "").toLowerCase() !== candidateBase)
              }
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Confirm @${candidatePreview || "..."}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
