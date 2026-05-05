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

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mic } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { postIntent, type IntentKind } from "@/lib/intentApi";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface IntentComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultKind?: IntentKind;
  onPosted?: (intentId: string) => void;
}

const KIND_OPTIONS: { value: IntentKind; label: string }[] = [
  { value: "commercial_buy", label: "I'm buying / hiring" },
  { value: "commercial_sell", label: "I'm selling / offering" },
  { value: "activity_seek", label: "Activity partner" },
  { value: "social_seek", label: "Coffee chat / mentorship" },
  { value: "mutual_aid", label: "Lend / borrow / give" },
  { value: "partner_seek", label: "Life partner" },
];

export function IntentComposer({ open, onOpenChange, defaultKind, onPosted }: IntentComposerProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"form" | "voice">("form");
  const [kind, setKind] = useState<IntentKind>(defaultKind ?? "commercial_buy");
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle("");
    setScope("");
    setBudgetMin("");
    setBudgetMax("");
    setLocation("");
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

    const kindPayload: Record<string, unknown> = {};
    if (kind === "commercial_buy" || kind === "commercial_sell") {
      if (budgetMin) kindPayload.budget_min = Number(budgetMin);
      if (budgetMax) kindPayload.budget_max = Number(budgetMax);
      kindPayload.currency = "EUR";
      if (location) kindPayload.location_label = location;
    } else if (location) {
      kindPayload.location_label = location;
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
      notifyError('toasts.intents.couldNotPost');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('screens.intents.postCommunity')}</DialogTitle>
          <DialogDescription>
            Tell the community what you need or what you're offering — the system will match you with the right people.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <Button
            variant={mode === "form" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("form")}
          >
            Form
          </Button>
          <Button
            variant={mode === "voice" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("voice")}
          >
            <Mic className="h-4 w-4 mr-1.5" /> Voice
          </Button>
        </div>

        {mode === "voice" ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-2">
            <Mic className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">{t('screens.intents.openOrbJustSayIt')}</p>
            <p className="text-xs text-muted-foreground">
              Examples:
              <br />
              <em>{t('screens.intents.iNeedKitchenContractorViennaBudget')}</em>
              <br />
              <em>{t('screens.intents.iMLookingForSomeonePlay')}</em>
              <br />
              ORB will read it back to you and post on confirmation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Kind
              </Label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as IntentKind)}
                className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                {KIND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="intent-title" className="text-xs uppercase tracking-wider text-muted-foreground">
                Title (3–140 chars)
              </Label>
              <Input
                id="intent-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short headline"
                maxLength={140}
              />
            </div>

            <div>
              <Label htmlFor="intent-scope" className="text-xs uppercase tracking-wider text-muted-foreground">
                Description (≥ 20 chars)
              </Label>
              <Textarea
                id="intent-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="Describe what you need / what you're offering"
                rows={3}
                maxLength={1500}
              />
            </div>

            {(kind === "commercial_buy" || kind === "commercial_sell") && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Budget min (€)
                  </Label>
                  <Input value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="0" type="number" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Budget max (€)
                  </Label>
                  <Input value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="1000" type="number" />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Location (optional)
              </Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Vienna" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          {mode === "form" && (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
