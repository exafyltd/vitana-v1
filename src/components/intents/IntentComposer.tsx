/**
 * VTID-01975: Intent composer modal (P2-B).
 *
 * Two modes:
 *   - Voice: tells the user to use ORB ("Just say it: I need a contractor...").
 *     The post_intent voice tool handles classification + extraction +
 *     confirmation entirely server-side.
 *   - Form: kind picker + minimal fields. Maps directly to POST /intents.
 *
 * The form is intentionally minimal in P2-B. P2-C / a follow-up will
 * upgrade it with kind-specific field renderers (kindRenderers/*) and
 * inline category pickers driven by /intent-categories.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mic } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { postIntent, type IntentKind } from "@/lib/intentApi";
import type { CoverTheme } from "@/lib/intentCovers";
import { CoverPhotoPicker } from "./CoverPhotoPicker";
import { notify, notifyError, t } from '@/lib/i18n-toast';
import { supabase } from "@/integrations/supabase/client";

interface IntentComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultKind?: IntentKind;
  onPosted?: (intentId: string) => void;
}

const KIND_OPTIONS: { value: IntentKind; labelKey: string }[] = [
  { value: "commercial_buy", labelKey: "screens.intents.kindOptionCommercialBuy" },
  { value: "commercial_sell", labelKey: "screens.intents.kindOptionCommercialSell" },
  { value: "activity_seek", labelKey: "screens.intents.kindOptionActivitySeek" },
  { value: "social_seek", labelKey: "screens.intents.kindOptionSocialSeek" },
  { value: "mutual_aid", labelKey: "screens.intents.kindOptionMutualAid" },
  { value: "partner_seek", labelKey: "screens.intents.kindOptionPartnerSeek" },
];

export function IntentComposer({ open, onOpenChange, defaultKind, onPosted }: IntentComposerProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"form" | "voice">("form");
  const [kind, setKind] = useState<IntentKind>(defaultKind ?? "commercial_buy");
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [location, setLocation] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // VTID-02806 — universal cover photo from the requester's profile.
  // When set, the gateway falls back to it whenever no library photo
  // matches, so we can loosen the per-post upload requirement.
  const [universalCoverUrl, setUniversalCoverUrl] = useState<string | null>(null);

  // Read universal cover once when the composer opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      // The auto-generated Database type predates VTID-02806's
      // `universal_intent_cover_url` column on `profiles`. Re-running
      // `supabase gen types typescript` will let us drop this cast.
      type ProfileMaybe = {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (
              col: string,
              val: string,
            ) => {
              maybeSingle: () => Promise<{
                data: { universal_intent_cover_url?: string | null } | null;
              }>;
            };
          };
        };
      };
      const { data: profile } = await (
        supabase as unknown as ProfileMaybe
      )
        .from("profiles")
        .select("universal_intent_cover_url")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      const raw =
        (profile as { universal_intent_cover_url?: string | null } | null)
          ?.universal_intent_cover_url ?? null;
      setUniversalCoverUrl(raw);
    })().catch(() => {
      if (!cancelled) setUniversalCoverUrl(null);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // True when the user has either a per-post upload or a universal photo
  // on their profile. In that case the gateway can always resolve a
  // cover, so we drop the hard "you must upload" requirement.
  const hasCoverFallback = !!coverUrl || !!universalCoverUrl;

  // Drives the themed-cover picker. Today only dance/fitness have
  // dedicated covers; other kinds fall back to the generic set.
  // Once a real category picker lands in the composer this should
  // read from the chosen category instead.
  const coverTheme: CoverTheme = useMemo(() => {
    if (kind === "activity_seek" || kind === "social_seek") return "dance";
    return "generic";
  }, [kind]);

  const reset = () => {
    setTitle("");
    setScope("");
    setBudgetMin("");
    setBudgetMax("");
    setLocation("");
    setCoverUrl(null);
  };

  const submit = async () => {
    if (!title.trim() || title.trim().length < 3) {
      notifyError('toasts.intents.titleRequired', 'toasts.intents.message3140Characters');
      return;
    }
    if (!scope.trim() || scope.trim().length < 20) {
      notifyError('toasts.intents.scopeTooShort', 'toasts.intents.minimum20Characters');
      return;
    }
    // The gateway will resolve a cover from the user's library /
    // universal photo / AI / curated chain when none is supplied. We
    // only block submit when the user has neither a per-post upload
    // nor a universal photo set — otherwise every post would fail
    // for new users who haven't set up their library yet.
    if (!hasCoverFallback) {
      notifyError('toasts.intents.coverPhotoRequired', 'toasts.intents.uploadOneTapGenerateForMe');
      return;
    }

    const kindPayload: Record<string, unknown> = {};
    if (kind === "commercial_buy" || kind === "commercial_sell") {
      if (budgetMin) kindPayload.budget_min = Number(budgetMin);
      if (budgetMax) kindPayload.budget_max = Number(budgetMax);
      kindPayload.currency = "EUR";
      if (location) kindPayload.location_label = location;
    } else if (location) {
      kindPayload.location_label = location;
    }
    // Per-post upload still wins when the user supplied one. When
    // unset, the gateway falls back through library → universal → AI
    // → curated, so we deliberately do NOT echo the universal URL
    // here — the gateway looks it up itself.
    if (coverUrl) {
      kindPayload.cover_url = coverUrl;
    }

    setSubmitting(true);
    try {
      const result = await postIntent({
        intent_kind: kind,
        title: title.trim(),
        scope: scope.trim(),
        kind_payload: kindPayload,
      });
      notify('toasts.intents.postedCommunity');
      reset();
      onPosted?.(result.intent_id);
      onOpenChange(false);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[IntentComposer] Post failed:', err);
      const reason = err instanceof Error && err.message ? err.message : '';
      if (reason) {
        notifyError('toasts.intents.couldNotPost', 'toasts.intents.couldNotPostReason', { reason });
      } else {
        notifyError('toasts.intents.couldNotPost');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('screens.intents.postCommunity')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t('screens.intents.tellCommunityWhatYouNeedWhat')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <div className="flex gap-2 mb-3">
            <Button
              variant={mode === "form" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("form")}
            >{t('screens.intents.form')}
            </Button>
            <Button
              variant={mode === "voice" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("voice")}
            >
              <Mic className="h-4 w-4 mr-1.5" />{t('screens.intents.voice')}
            </Button>
          </div>

          {mode === "voice" ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-2">
              <Mic className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">{t('screens.intents.openOrbJustSayIt')}</p>
              <p className="text-xs text-muted-foreground">{t('screens.intents.examples')}
                <br />
                <em>{t('screens.intents.iNeedKitchenContractorViennaBudget')}</em>
                <br />
                <em>{t('screens.intents.iMLookingForSomeonePlay')}</em>
                <br />{t('screens.intents.orbWillReadItBackYou')}
              </p>
              <p className="text-[11px] text-muted-foreground/80 pt-1">{t('screens.intents.donTWorryAboutCoverPhoto')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('screens.intents.kind')}
                </Label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as IntentKind)}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  {KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="intent-title" className="text-xs uppercase tracking-wider text-muted-foreground">{t('screens.intents.title3140Chars')}
                </Label>
                <Input
                  id="intent-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('screens.intents.shortHeadline')}
                  maxLength={140}
                />
              </div>

              <div>
                <Label htmlFor="intent-scope" className="text-xs uppercase tracking-wider text-muted-foreground">{t('screens.intents.description20Chars')}
                </Label>
                <Textarea
                  id="intent-scope"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder={t('screens.intents.describeWhatYouNeedWhat')}
                  rows={3}
                  maxLength={1500}
                />
              </div>

              {(kind === "commercial_buy" || kind === "commercial_sell") && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('screens.intents.budgetMin')}
                    </Label>
                    <Input value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="0" type="number" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('screens.intents.budgetMax')}
                    </Label>
                    <Input value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="1000" type="number" />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('screens.intents.locationOptional')}
                </Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('screens.intents.vienna')} />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {hasCoverFallback
                    ? t('screens.intents.coverPhotoOptional')
                    : t('screens.intents.coverPhotoRequired')}
                </Label>
                <div className="mt-1">
                  <CoverPhotoPicker
                    value={coverUrl}
                    onChange={setCoverUrl}
                    theme={coverTheme}
                  />
                </div>
                {!coverUrl && universalCoverUrl && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {t('screens.intents.usingUniversalCoverHint')}
                  </p>
                )}
                {!hasCoverFallback && (
                  <div className="mt-2 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
                    <p className="text-xs font-medium">
                      {t('screens.intents.noCoverYetBannerTitle')}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t('screens.intents.noCoverYetBannerBody')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate('/edit-profile?drawer=cover-library')
                        }
                      >
                        {t('screens.intents.setUniversalCover')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>{t('screens.intents.cancel')}
          </Button>
          {mode === "form" && (
            <Button onClick={submit} disabled={submitting || !hasCoverFallback}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('screens.intents.post')}
            </Button>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
