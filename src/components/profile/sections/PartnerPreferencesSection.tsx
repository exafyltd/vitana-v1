/**
 * E2 — PartnerPreferencesSection.
 *
 * Public render of profiles.partner_preferences. Visibility is gated by
 * E5 account_visibility:
 *   - section default 'private' (whole section hidden from non-owners
 *     unless flipped to 'connections' or 'public')
 *   - sub-fields: 'partnerPreferences.ageRange', '.gender',
 *     '.relationshipIntent', '.locationRadius' — each can be hidden even
 *     when the section is visible
 *
 * The owner ALWAYS sees their own data. For viewers, the gate is
 * applied client-side here as a defense layer; server-side enforcement
 * (planned) will redact at fetch time.
 */

import { Heart, MapPin, Users } from "lucide-react";
import type { PartnerPreferences } from "@/lib/profilePrefsApi";
import type { AccountVisibility, FieldVisibility } from "@/types/profile";
import { t } from '@/lib/i18n-toast';

type ViewerRel = "self" | "connection" | "stranger";

interface PartnerPreferencesSectionProps {
  prefs: PartnerPreferences | null | undefined;
  visibility: AccountVisibility | null | undefined;
  viewerRelationship: ViewerRel;
}

const DEFAULTS: Record<string, FieldVisibility> = {
  partnerPreferences: "private",
  "partnerPreferences.ageRange": "private",
  "partnerPreferences.gender": "private",
  "partnerPreferences.relationshipIntent": "private",
  "partnerPreferences.locationRadius": "connections",
};

function tier(vis: AccountVisibility | null | undefined, key: string): FieldVisibility {
  const explicit = vis?.[key as keyof AccountVisibility];
  if (explicit === "private" || explicit === "connections" || explicit === "public") return explicit;
  return DEFAULTS[key] ?? "private";
}

function canRead(
  vis: AccountVisibility | null | undefined,
  key: string,
  rel: ViewerRel
): boolean {
  if (rel === "self") return true;
  const t = tier(vis, key);
  if (t === "public") return true;
  if (t === "connections" && rel === "connection") return true;
  return false;
}

const GENDER_LABEL: Record<string, string> = {
  female: "Women",
  male: "Men",
  any: "Anyone",
};

const INTENT_LABEL: Record<string, string> = {
  dating: "Dating",
  life_partner: "Life partner",
  companionship: "Companionship",
  open: "Open to anything",
};

export function PartnerPreferencesSection({ prefs, visibility, viewerRelationship }: PartnerPreferencesSectionProps) {
  // Whole-section gate.
  if (!canRead(visibility, "partnerPreferences", viewerRelationship)) return null;
  if (!prefs || Object.keys(prefs).length === 0) return null;

  const showGender = canRead(visibility, "partnerPreferences.gender", viewerRelationship) && prefs.gender_pref;
  const showAge = canRead(visibility, "partnerPreferences.ageRange", viewerRelationship) && Array.isArray(prefs.age_range);
  const showIntent = canRead(visibility, "partnerPreferences.relationshipIntent", viewerRelationship) && prefs.relationship_intent;
  const showRadius = canRead(visibility, "partnerPreferences.locationRadius", viewerRelationship) && (prefs.location_label || prefs.max_radius_km);
  const showMustHaves = (prefs.must_haves?.length ?? 0) > 0;
  const showDealBreakers = viewerRelationship === "self" && (prefs.deal_breakers?.length ?? 0) > 0;

  // If every visible sub-field is hidden, render nothing (don't telegraph emptiness).
  if (!showGender && !showAge && !showIntent && !showRadius && !showMustHaves && !showDealBreakers) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <header className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-rose-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Partner preferences
        </h3>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        {showGender && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-muted/40">
            <Users className="h-3 w-3" />
            {GENDER_LABEL[prefs.gender_pref!] ?? prefs.gender_pref}
          </span>
        )}
        {showAge && (
          <span className="inline-flex items-center px-2 py-1 rounded border border-border bg-muted/40">
            {prefs.age_range![0]}–{prefs.age_range![1]} years
          </span>
        )}
        {showIntent && (
          <span className="inline-flex items-center px-2 py-1 rounded border border-border bg-muted/40">
            {INTENT_LABEL[prefs.relationship_intent!] ?? prefs.relationship_intent}
          </span>
        )}
        {showRadius && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-muted/40">
            <MapPin className="h-3 w-3" />
            {prefs.location_label ?? "Anywhere"}
            {prefs.max_radius_km != null ? ` · ${prefs.max_radius_km} km` : ""}
          </span>
        )}
      </div>

      {showMustHaves && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('screens.profile.musthaves')}</div>
          <div className="flex flex-wrap gap-1">
            {prefs.must_haves!.map((m, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {showDealBreakers && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Deal-breakers <span className="opacity-70">{t('screens.profile.onlyYouSeeThis')}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {prefs.deal_breakers!.map((m, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
