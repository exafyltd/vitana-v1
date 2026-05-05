import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Apple, Droplets, Dumbbell, Moon, Brain } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

type Rating = 1 | 2 | 3 | 4 | 5;
type PillarKey = "nutrition" | "hydration" | "exercise" | "sleep" | "mental";

interface Props {
  /** Controlled open state. When undefined, the modal checks status on mount and auto-opens for users who haven't taken the survey. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const QUESTIONS: Array<{
  key: PillarKey;
  icon: typeof Apple;
  title: string;
  prompt: string;
}> = [
  {
    key: "nutrition",
    icon: Apple,
    title: "How you're eating",
    prompt: "How well do you feel you're eating these days? (1 = poorly, 5 = nourishing and balanced)",
  },
  {
    key: "hydration",
    icon: Droplets,
    title: "Your hydration",
    prompt: "How much water and fluids are you getting? (1 = very little, 5 = steady all day)",
  },
  {
    key: "exercise",
    icon: Dumbbell,
    title: "Your movement",
    prompt: "How active has your body been this week? (1 = sedentary, 5 = strong and active)",
  },
  {
    key: "sleep",
    icon: Moon,
    title: "Your sleep",
    prompt: "How rested do you feel when you wake up? (1 = exhausted, 5 = fully rested)",
  },
  {
    key: "mental",
    icon: Brain,
    title: "Your mind right now",
    prompt: "How clear and calm is your mind today? (1 = very stressed, 5 = clear and calm)",
  },
];

async function fetchWithAuth(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? "";
  return fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

export function VitanaBaselineSurveyModal({ open: controlledOpen, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen! : uncontrolledOpen;
  const setOpen = (v: boolean) => (isControlled ? onOpenChange?.(v) : setUncontrolledOpen(v));

  const [step, setStep] = useState(0);
  const [ratings, setRatings] = useState<Partial<Record<PillarKey, Rating>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isControlled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth("/health/baseline-survey/status");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.ok && !json.completed) {
          setUncontrolledOpen(true);
        }
      } catch {
        // silent — the modal just won't auto-open on error
      }
    })();
    return () => { cancelled = true; };
  }, [isControlled]);

  const current = QUESTIONS[step];
  const currentRating = ratings[current.key];

  const handlePick = (value: Rating) => {
    setRatings((prev) => ({ ...prev, [current.key]: value }));
  };

  const handleNext = async () => {
    if (currentRating === undefined) return;
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }
    // Submit
    setSubmitting(true);
    try {
      const res = await fetchWithAuth("/health/baseline-survey", {
        method: "POST",
        body: JSON.stringify(ratings),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const detail = json.detail ? ` — ${json.detail}` : "";
        throw new Error(`${json.error || "Submission failed"}${detail}`);
      }
      notify('toasts.health.yourVitanaIndexLive');
      queryClient.invalidateQueries({ queryKey: ["vitana_index"] });
      setOpen(false);
    } catch (err: any) {
      notifyError('toasts.health.couldNotSaveYourBaseline');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <DialogTitle>{current.title}</DialogTitle>
          </div>
          <DialogDescription>
            Five quick questions to set your Day-0 Vitana Index — one for each pillar. Step {step + 1} of {QUESTIONS.length}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-foreground mb-4">{current.prompt}</p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = currentRating === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => handlePick(n as Rating)}
                  className={`h-12 rounded-lg border text-lg font-semibold transition ${
                    active
                      ? "bg-calendar-primary text-white border-calendar-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                  aria-pressed={active}
                  aria-label={`Rating ${n}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between gap-2">
          <Button variant="ghost" onClick={handleBack} disabled={step === 0 || submitting}>
            Back
          </Button>
          <Button onClick={handleNext} disabled={currentRating === undefined || submitting}>
            {submitting ? "Saving…" : step === QUESTIONS.length - 1 ? "Finish" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VitanaBaselineSurveyModal;
