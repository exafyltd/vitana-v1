/**
 * VTID-DANCE-D5/D9 finish: Public render of dance_preferences on a profile.
 *
 * Self-contained — pulls dance_preferences directly from profiles. Renders
 * nothing when the user hasn't set any preferences. Visibility-aware:
 * checks account_visibility.dance_preferences (defaults to 'public').
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

interface Props {
  userId: string;        // profile being viewed
  isOwn?: boolean;       // owner can always see their own
}

interface DancePrefs {
  varieties?: string[];
  levels?: Record<string, string>;
  roles?: string[];
  looking_for?: string[];
  radius_km?: number;
  venue_prefs?: string[];
}

export function DancePublicSection({ userId, isOwn = false }: Props) {
  const [prefs, setPrefs] = useState<DancePrefs | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("dance_preferences, account_visibility")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      const dp = ((data as any)?.dance_preferences as DancePrefs) || {};
      const av = ((data as any)?.account_visibility as Record<string, string>) || {};
      const vis = av?.dance_preferences || "public";
      if (!isOwn && vis !== "public") {
        setHidden(true);
        return;
      }
      setPrefs(dp);
    })();
    return () => { cancelled = true; };
  }, [userId, isOwn]);

  if (hidden) return null;
  if (!prefs) return null;
  const varieties = Array.isArray(prefs.varieties) ? prefs.varieties : [];
  if (varieties.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 my-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        💃 Dance preferences
      </h3>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {varieties.map((v) => {
            const level = prefs.levels?.[v];
            return (
              <span
                key={v}
                className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 text-primary text-sm"
              >
                <span className="capitalize">{v}</span>
                {level && (
                  <span className="ml-1.5 text-xs opacity-70">· {level}</span>
                )}
              </span>
            );
          })}
        </div>

        {Array.isArray(prefs.roles) && prefs.roles.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">{t('screens.profile.role')}</span>{" "}
            <span className="capitalize">{prefs.roles.join(" / ")}</span>
          </div>
        )}

        {Array.isArray(prefs.looking_for) && prefs.looking_for.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">{t('screens.profile.lookingFor2')}</span>{" "}
            {prefs.looking_for.join(" · ")}
          </div>
        )}

        {typeof prefs.radius_km === "number" && (
          <div className="text-sm text-muted-foreground">
            Travel willingness: <span className="text-foreground">{prefs.radius_km} km</span>
          </div>
        )}

        {Array.isArray(prefs.venue_prefs) && prefs.venue_prefs.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">{t('screens.profile.where')}</span>{" "}
            {prefs.venue_prefs.join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}
