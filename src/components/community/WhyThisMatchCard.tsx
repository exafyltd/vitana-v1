/**
 * VTID-02754 — "How we searched" card.
 *
 * Renders on PublicProfilePage when the URL has ?from=who_search&search_id=...
 * Fetches the structured match_recipe from
 * /api/v1/community/find-member/recipe/:search_id and shows the user
 * exactly which signals Vitana considered when picking this profile.
 *
 * Two affordances:
 *   - "Show me someone else" — re-runs the search with this profile
 *     excluded; navigates to the next-best match.
 *   - "Dismiss" — hides the card for the rest of the visit.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminFetch } from '@/lib/admin-api';
import { t } from '@/lib/i18n-toast';

type SignalEntry = {
  label: string;
  value: string;
  weight: number | 'filter' | 'sort';
  matched: boolean;
};

type MatchRecipe = {
  interpreted_intent: string;
  tier: 1 | 2 | 3 | 4;
  lane: string;
  ethics_reroute: boolean;
  signals_considered: SignalEntry[];
};

interface RecipeResponse {
  ok: true;
  search_id: string;
  query: string;
  tier: 1 | 2 | 3 | 4;
  lane: string;
  winner_vitana_id: string | null;
  match_recipe: MatchRecipe;
}

interface FindMemberResponse {
  ok: true;
  vitana_id: string | null;
  display_name: string;
  voice_summary: string;
  match_recipe: MatchRecipe;
  redirect: { screen: string; route: string };
  search_id?: string;
}

interface WhyThisMatchCardProps {
  searchId: string;
  currentVitanaId: string | null;
}

export function WhyThisMatchCard({ searchId, currentVitanaId }: WhyThisMatchCardProps) {
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErrored(false);
    adminFetch(`/api/v1/community/find-member/recipe/${searchId}`)
      .then((data: RecipeResponse) => {
        if (!alive) return;
        setRecipe(data);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setErrored(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [searchId]);

  if (dismissed) return null;
  if (loading) {
    return (
      <div className="rounded-lg border border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
        {t('whyThisMatch.loadingRecipe')}
      </div>
    );
  }
  if (errored || !recipe) {
    return (
      <div className="rounded-lg border border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
        {t('whyThisMatch.recipeUnavailable')}
      </div>
    );
  }

  const onShowAnother = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const excluded = currentVitanaId ? [currentVitanaId] : [];
      const out: FindMemberResponse = await adminFetch('/api/v1/community/find-member', {
        method: 'POST',
        body: JSON.stringify({
          query: recipe.query,
          excluded_vitana_ids: excluded,
        }),
      });
      if (out?.redirect?.route) {
        navigate(out.redirect.route);
      } else {
        setRequesting(false);
      }
    } catch {
      setRequesting(false);
    }
  };

  const tierLabel = t(`whyThisMatch.tierLabel.${recipe.match_recipe.tier}` as const);

  return (
    <section
      aria-label={t('whyThisMatch.title')}
      className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">{t('whyThisMatch.title')}</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{tierLabel}</span>
      </header>

      <p className="mb-1 text-muted-foreground">
        <span className="font-medium text-foreground">{t('whyThisMatch.interpretedAs')}</span>{' '}
        <span>{recipe.match_recipe.interpreted_intent}</span>
      </p>

      {recipe.match_recipe.ethics_reroute ? (
        <p className="mb-2 italic text-muted-foreground">{t('whyThisMatch.ethicsNote')}</p>
      ) : null}

      <p className="mt-3 mb-1 font-medium">{t('whyThisMatch.consideredSignals')}</p>
      <ul className="space-y-1.5">
        {recipe.match_recipe.signals_considered.map((s, i) => (
          <li key={`${recipe.search_id}-sig-${i}`} className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5">{s.matched ? '✓' : '·'}</span>
            <span className="flex-1">
              <span className="font-medium">{s.label}</span>
              <span className="text-muted-foreground"> — {s.value}</span>
            </span>
          </li>
        ))}
      </ul>

      <footer className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onShowAnother}
          disabled={requesting}
          className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {t('whyThisMatch.showSomeoneElse')}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-full border border-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/40"
        >
          {t('whyThisMatch.dismiss')}
        </button>
      </footer>
    </section>
  );
}

export default WhyThisMatchCard;
