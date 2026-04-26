/**
 * VTID-01975: Generic intent card (P2-B).
 *
 * Renders a UserIntent with kind-aware chip strip. Same component is
 * used in Business Hub My Listings, community IntentBoard, and the
 * MyIntents page. Kind-specific fancy renderers (kindRenderers/*) are
 * deferred to a follow-up — for P2-B, one card serves all kinds.
 */

import { Link } from "react-router-dom";
import type { UserIntent } from "@/lib/intentApi";

const KIND_LABEL: Record<string, string> = {
  commercial_buy: "I'm buying",
  commercial_sell: "I'm selling",
  activity_seek: "Activity partner",
  partner_seek: "Life partner",
  social_seek: "Social / mentorship",
  mutual_aid: "Mutual aid",
};

const KIND_COLOR: Record<string, string> = {
  commercial_buy: "bg-blue-100 text-blue-700 border-blue-200",
  commercial_sell: "bg-emerald-100 text-emerald-700 border-emerald-200",
  activity_seek: "bg-orange-100 text-orange-700 border-orange-200",
  partner_seek: "bg-rose-100 text-rose-700 border-rose-200",
  social_seek: "bg-violet-100 text-violet-700 border-violet-200",
  mutual_aid: "bg-amber-100 text-amber-700 border-amber-200",
};

function kindChips(intent: UserIntent): string[] {
  const p = intent.kind_payload as any;
  const chips: string[] = [];
  if (intent.category) chips.push(intent.category.replace(/_/g, " "));

  switch (intent.intent_kind) {
    case "commercial_buy":
    case "commercial_sell": {
      if (p?.budget_min && p?.budget_max) chips.push(`€${p.budget_min}–${p.budget_max}`);
      else if (p?.price_floor && p?.price_ceiling) chips.push(`€${p.price_floor}–${p.price_ceiling}`);
      if (p?.location_label) chips.push(`📍 ${p.location_label}`);
      if (p?.urgency) chips.push(p.urgency);
      break;
    }
    case "activity_seek": {
      if (p?.activity) chips.push(p.activity);
      if (p?.location_label) chips.push(`📍 ${p.location_label}`);
      if (p?.skill_level) chips.push(p.skill_level);
      break;
    }
    case "partner_seek": {
      if (Array.isArray(p?.age_range)) chips.push(`age ${p.age_range[0]}–${p.age_range[1]}`);
      if (p?.location_radius_km) chips.push(`within ${p.location_radius_km}km`);
      break;
    }
    case "social_seek": {
      if (p?.topic) chips.push(p.topic);
      if (p?.format_pref) chips.push(p.format_pref);
      break;
    }
    case "mutual_aid": {
      if (p?.direction) chips.push(p.direction);
      if (p?.object_or_skill) chips.push(p.object_or_skill);
      break;
    }
  }
  return chips;
}

interface IntentCardProps {
  intent: UserIntent;
  showStatus?: boolean;
  to?: string;
  onClick?: () => void;
}

export function IntentCard({ intent, showStatus = true, to, onClick }: IntentCardProps) {
  const chips = kindChips(intent);
  const card = (
    <div
      className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${KIND_COLOR[intent.intent_kind] ?? "bg-muted"}`}
        >
          {KIND_LABEL[intent.intent_kind] ?? intent.intent_kind}
        </span>
        {showStatus && (
          <span className="text-xs text-muted-foreground">{intent.status}</span>
        )}
      </div>
      <h3 className="font-semibold text-base leading-snug mb-1">{intent.title}</h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{intent.scope}</p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs"
            >
              {c}
            </span>
          ))}
        </div>
      )}
      {intent.match_count > 0 && (
        <div className="mt-3 text-xs text-primary font-medium">
          {intent.match_count} match{intent.match_count === 1 ? "" : "es"}
        </div>
      )}
    </div>
  );

  if (to) return <Link to={to} className="block">{card}</Link>;
  return card;
}
