/**
 * VTID-01975 + VTID-DANCE-D2/D9/D10: Generic intent card.
 *
 * Renders a UserIntent with kind-aware chip strip + dance facet chips when
 * present. Share button (D10) opens IntentShareSheet for direct-invite to
 * friends, copy-link, or external share.
 */

import { useState, MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import type { UserIntent } from "@/lib/intentApi";
import { KIND_COLOR, KIND_LABEL } from "@/lib/intentKind";
import { getIntentCoverUrl } from "@/lib/intentCovers";
import { IntentShareSheet } from "./IntentShareSheet";
import { t } from '@/lib/i18n-toast';

function kindChips(intent: UserIntent): string[] {
  const p = intent.kind_payload as any;
  const chips: string[] = [];
  if (intent.category) chips.push(intent.category.replace(/_/g, " "));

  // VTID-DANCE-D9: dance facet chips work uniformly across kinds.
  if (p?.dance && typeof p.dance === "object") {
    const d = p.dance;
    if (d.variety) chips.push(`💃 ${d.variety}`);
    if (d.level_target) chips.push(d.level_target);
    if (d.role_pref && d.role_pref !== "either") chips.push(d.role_pref);
  }

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
    case "learning_seek": {
      if (p?.learning?.topic && (!p?.dance || p.dance.variety !== p.learning.topic)) {
        chips.push(p.learning.topic);
      }
      if (p?.learning?.mode_pref) chips.push(p.learning.mode_pref.replace("_", " "));
      if (p?.counterparty_filter?.location_label) {
        chips.push(`📍 ${p.counterparty_filter.location_label}`);
      }
      if (p?.counterparty_filter?.max_radius_km) {
        chips.push(`within ${p.counterparty_filter.max_radius_km}km`);
      }
      break;
    }
    case "mentor_seek": {
      if (p?.teaching?.topic && (!p?.dance || p.dance.variety !== p.teaching.topic)) {
        chips.push(p.teaching.topic);
      }
      if (Array.isArray(p?.teaching?.modes_offered) && p.teaching.modes_offered.length > 0) {
        chips.push(p.teaching.modes_offered.join("/"));
      }
      if (p?.teaching?.price_cents) {
        const cur = p.teaching.currency || "EUR";
        chips.push(`${cur} ${(p.teaching.price_cents / 100).toFixed(0)}`);
      }
      break;
    }
  }
  return chips;
}

interface IntentCardProps {
  intent: UserIntent;
  showStatus?: boolean;
  showShare?: boolean;
  to?: string;
  onClick?: () => void;
}

export function IntentCard({
  intent,
  showStatus = true,
  showShare = true,
  to,
  onClick,
}: IntentCardProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const chips = kindChips(intent);

  const handleShareClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShareOpen(true);
  };

  const coverUrl = getIntentCoverUrl(intent);

  const card = (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {coverUrl && (
        <div className="relative w-full aspect-[16/9] bg-muted">
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${KIND_COLOR[intent.intent_kind] ?? "bg-muted"}`}
        >
          {KIND_LABEL[intent.intent_kind] ?? intent.intent_kind}
        </span>
        <div className="flex items-center gap-2">
          {showStatus && (
            <span className="text-xs text-muted-foreground">{intent.status}</span>
          )}
          {showShare && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleShareClick}
              aria-label={t('screens.intents.sharePost')}
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <h3 className="font-semibold text-base leading-snug mb-1">{intent.title}</h3>
      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{intent.scope}</p>
      {(chips.length > 0 || intent.match_count > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs"
            >
              {c}
            </span>
          ))}
          {intent.match_count > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
              {t('screens.intents.match_countMatchValue1', { match_count: intent.match_count, value1: intent.match_count === 1 ? "" : "es" })}
            </span>
          )}
        </div>
      )}
      </div>
    </div>
  );

  return (
    <>
      {to ? <Link to={to} className="block">{card}</Link> : card}
      {showShare && (
        <IntentShareSheet
          open={shareOpen}
          onOpenChange={setShareOpen}
          intentId={intent.intent_id}
          intentTitle={intent.title}
          intentScopeExcerpt={intent.scope?.slice(0, 240) ?? null}
        />
      )}
    </>
  );
}
