/**
 * VTID-05085 — pick up to 10 interests (E4 "Add Your Interests").
 *
 * The column `profiles.interests TEXT[]` stores stable slugs, never display
 * text; labels resolve at render time from `screens.interests.<slug>` in the
 * member's language. Saves through the same direct profile update the About
 * editor uses (AboutDrawer). A real member write — never exercised on staging.
 */
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';

export const INTEREST_SLUGS = [
  'fitness',
  'nutrition',
  'sleep',
  'mindfulness',
  'longevity',
  'biohacking',
  'yoga',
  'running',
  'strength',
  'dance',
  'nature',
  'cooking',
  'social',
  'travel',
  'career',
] as const;

export type InterestSlug = (typeof INTEREST_SLUGS)[number];
export const MAX_INTERESTS = 10;

const INTEREST_LABEL_KEYS: Record<InterestSlug, string> = {
  fitness: 'screens.interests.fitness',
  nutrition: 'screens.interests.nutrition',
  sleep: 'screens.interests.sleep',
  mindfulness: 'screens.interests.mindfulness',
  longevity: 'screens.interests.longevity',
  biohacking: 'screens.interests.biohacking',
  yoga: 'screens.interests.yoga',
  running: 'screens.interests.running',
  strength: 'screens.interests.strength',
  dance: 'screens.interests.dance',
  nature: 'screens.interests.nature',
  cooking: 'screens.interests.cooking',
  social: 'screens.interests.social',
  travel: 'screens.interests.travel',
  career: 'screens.interests.career',
};

const isSlug = (v: unknown): v is InterestSlug => typeof v === 'string' && (INTEREST_SLUGS as readonly string[]).includes(v);

export interface InterestsPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires after a successful save (the E4 card re-reads its state). */
  onSaved?: (slugs: InterestSlug[]) => void;
}

export function InterestsPicker({ open, onOpenChange, onSaved }: InterestsPickerProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<InterestSlug[]>([]);
  const [saving, setSaving] = useState(false);

  // Load the member's current interests each time the picker opens.
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    (async () => {
      // `interests` is newer than the generated types (VTID-05085 migration).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('profiles').select('interests').eq('user_id', user.id).maybeSingle();
      if (cancelled) return;
      const current = Array.isArray(data?.interests) ? (data.interests as unknown[]).filter(isSlug) : [];
      setSelected(current.slice(0, MAX_INTERESTS));
    })().catch(() => {
      /* nothing preselected — the member can still pick */
    });
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const toggle = (slug: InterestSlug) =>
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= MAX_INTERESTS ? prev : [...prev, slug],
    );

  const save = async () => {
    if (!user?.id || saving) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ interests: selected, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
      notifySuccess('toasts.vitanaCards.interestsSaved');
      onSaved?.(selected);
      onOpenChange(false);
    } catch {
      notifyError('toasts.vitanaCards.interestsSaveFailed');
    } finally {
      setSaving(false);
    }
  };

  const full = selected.length >= MAX_INTERESTS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-form" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{t('screens.interests.title')}</DialogTitle>
          <DialogDescription>{t('screens.interests.description', { max: MAX_INTERESTS })}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2" role="group" aria-label={t('screens.interests.title')}>
          {INTEREST_SLUGS.map((slug) => {
            const on = selected.includes(slug);
            return (
              <button
                key={slug}
                type="button"
                aria-pressed={on}
                disabled={!on && full}
                onClick={() => toggle(slug)}
                data-testid={`interest-${slug}`}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:pointer-events-none disabled:opacity-50',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted',
                )}
              >
                {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                {t(INTEREST_LABEL_KEYS[slug])}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {t('screens.interests.selectedCount', { count: selected.length, max: MAX_INTERESTS })}
        </p>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('screens.interests.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={saving || !user?.id} data-testid="interests-save">
            {t('screens.interests.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
