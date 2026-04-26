/**
 * VTID-01967: Vitana ID onboarding interstitial.
 *
 * Shown automatically once after signup when profile.vitanaIdLocked === false.
 * The user either accepts the auto-suggested ID ("Use this") or opens the
 * picker modal to choose from 3 alternative suggestions or type their own.
 *
 * One-shot: after POST /api/v1/users/me/vitana-id/confirm succeeds, the
 * server flips vitana_id_locked = true. This component never renders again
 * for that user — there is no subsequent edit path.
 */

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthProvider";
import { useProfile } from "@/context/ProfileProvider";

const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

const VITANA_ID_REGEX = /^[a-z][a-z0-9]{3,11}$/;

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

export function VitanaIdOnboardingCard() {
  const { session, user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { toast } = useToast();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [customValue, setCustomValue] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Show the card when authenticated AND profile says not yet locked AND we
  // have a vitana_id to display. Hidden once the user confirms.
  const shouldShow = useMemo(() => {
    if (!user || !session) return false;
    if (!profile.vitanaId) return false;
    return profile.vitanaIdLocked === false;
  }, [user, session, profile.vitanaId, profile.vitanaIdLocked]);

  // Validate the custom-typed value live so the picker disables submit
  // before the user even reaches the server.
  const customValidationError = useMemo(() => {
    if (!customValue) return "";
    const normalized = customValue.trim().replace(/^@/, "").toLowerCase();
    if (!VITANA_ID_REGEX.test(normalized)) {
      return "4-12 characters, must start with a letter, lowercase + digits only.";
    }
    const letters = (normalized.match(/[a-z]/g) || []).length;
    const digits = (normalized.match(/[0-9]/g) || []).length;
    if (letters < 2 || digits < 2) {
      return "Needs at least 2 letters and 2 digits.";
    }
    return "";
  }, [customValue]);

  const candidateToSubmit = (selected || customValue).trim().replace(/^@/, "").toLowerCase();

  const fetchSuggestions = async () => {
    if (!session?.access_token) return;
    try {
      const res = await gatewayFetch(
        "/users/me/vitana-id/suggestion",
        { method: "GET" },
        session.access_token,
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        if (!selected && data.suggestions.length > 0 && !customValue) {
          setSelected(data.suggestions[0]);
        }
      }
    } catch (err) {
      console.warn("[VitanaIdOnboarding] failed to load suggestions:", err);
    }
  };

  useEffect(() => {
    if (pickerOpen) {
      fetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);

  const submit = async (value: string) => {
    if (!session?.access_token || !value) return;
    setSubmitting(true);
    try {
      const res = await gatewayFetch(
        "/users/me/vitana-id/confirm",
        {
          method: "POST",
          body: JSON.stringify({ vitana_id: value }),
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
                ? "That Vitana ID is reserved"
                : data.error === "WEAK_COMPOSITION"
                  ? "Need at least 2 letters and 2 digits"
                  : data.error === "INVALID_FORMAT"
                    ? "Invalid format"
                    : data.error === "ALREADY_LOCKED"
                      ? "Your Vitana ID was already set"
                      : "Could not save Vitana ID",
          description: data.message || data.error || "Please try a different value.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: `Vitana ID set: @${data.vitana_id}`,
        description: "This is your speakable ID across Vitana. Permanent — pick wisely!",
      });
      setPickerOpen(false);
      // Refresh profile so vitanaIdLocked flips true and this card unmounts.
      refreshProfile();
    } catch (err: any) {
      toast({
        title: "Network error",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseCurrent = async () => {
    if (!profile.vitanaId) return;
    await submit(profile.vitanaId);
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
      {/* Sticky bottom-sheet style banner — non-dismissable interstitial.
          User must Use this or Pick a different one before continuing. */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur-md shadow-lg"
        role="dialog"
        aria-label="Pick your Vitana ID"
      >
        <div className="max-w-xl mx-auto p-4 space-y-3">
          <div className="text-center space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Your Vitana ID
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
                aria-label="Copy Vitana ID"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Speakable. Language-neutral. Permanent once you confirm.
              Say it to invite friends or send messages by voice.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={handleUseCurrent}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Use this"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setPickerOpen(true)}
              disabled={submitting}
            >
              Pick a different one
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={pickerOpen} onOpenChange={(open) => !submitting && setPickerOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pick your Vitana ID</DialogTitle>
            <DialogDescription>
              Choose from a fresh suggestion or type your own. Once you confirm, your Vitana ID is permanent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Suggestions
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSelected(s);
                        setCustomValue("");
                      }}
                      className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                        selected === s && !customValue
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      @{s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Or type your own
              </p>
              <Input
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value);
                  if (e.target.value) setSelected("");
                }}
                placeholder="e.g. alex3700"
                aria-invalid={Boolean(customValidationError)}
                aria-describedby="vitana-id-help"
              />
              <p id="vitana-id-help" className="text-xs text-muted-foreground">
                4–12 characters · lowercase letters and digits · at least 2 of each.
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
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => submit(candidateToSubmit)}
              disabled={
                submitting ||
                !candidateToSubmit ||
                Boolean(customValidationError && customValue) ||
                (Boolean(customValue) && customValue.trim().replace(/^@/, "").toLowerCase() !== candidateToSubmit)
              }
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
