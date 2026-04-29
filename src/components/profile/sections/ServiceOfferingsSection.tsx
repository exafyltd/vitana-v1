/**
 * E2 — ServiceOfferingsSection.
 *
 * Public render of profiles.service_offerings. Default visibility is
 * public per E5 (hiding defeats the purpose). Section-level toggle in
 * account_visibility.serviceOfferings can flip it.
 */

import { Briefcase } from "lucide-react";
import type { ServiceOffering } from "@/lib/profilePrefsApi";
import type { AccountVisibility, FieldVisibility } from "@/types/profile";

type ViewerRel = "self" | "connection" | "stranger";

interface ServiceOfferingsSectionProps {
  offers: ServiceOffering[] | null | undefined;
  visibility: AccountVisibility | null | undefined;
  viewerRelationship: ViewerRel;
}

const DEFAULTS: Record<string, FieldVisibility> = {
  serviceOfferings: "public",
  "serviceOfferings.priceRange": "public",
};

function tier(vis: AccountVisibility | null | undefined, key: string): FieldVisibility {
  const explicit = vis?.[key as keyof AccountVisibility];
  if (explicit === "private" || explicit === "connections" || explicit === "public") return explicit;
  return DEFAULTS[key] ?? "public";
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

function formatPrice(min: number | undefined, max: number | undefined, currency: string | undefined): string | null {
  const sym = (currency ?? "EUR").toUpperCase();
  const fmt = (cents: number) => (cents / 100).toFixed(2).replace(/\.00$/, "");
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${fmt(min)}–${fmt(max)} ${sym}`;
  if (min != null) return `${fmt(min)} ${sym}`;
  if (max != null) return `${fmt(max)} ${sym}`;
  return null;
}

export function ServiceOfferingsSection({ offers, visibility, viewerRelationship }: ServiceOfferingsSectionProps) {
  if (!canRead(visibility, "serviceOfferings", viewerRelationship)) return null;
  if (!offers || offers.length === 0) return null;

  const showPrice = canRead(visibility, "serviceOfferings.priceRange", viewerRelationship);

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <header className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Services I offer
        </h3>
      </header>

      <div className="space-y-2">
        {offers.map((o, i) => {
          const price = showPrice ? formatPrice(o.price_min_cents, o.price_max_cents, o.currency) : null;
          return (
            <div key={i} className="border border-border rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{o.title}</span>
                    {o.category && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {o.category}
                      </span>
                    )}
                  </div>
                  {o.short_description && (
                    <p className="text-sm text-muted-foreground mt-1 break-words">{o.short_description}</p>
                  )}
                </div>
                {price && (
                  <span className="shrink-0 text-sm font-medium text-emerald-700">
                    {price}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
