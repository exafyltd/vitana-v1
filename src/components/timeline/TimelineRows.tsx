/**
 * VTID-05170 — timeline rows (VCard size="row"): a moment, the day's Vitana
 * Index card and the "Your day" digest. The influence badge shows a number
 * only when the gateway measured it; otherwise what the entry counted toward.
 */
import { Gauge, Sun } from "lucide-react";
import { VCard } from "@/components/ui/vcard";
import { t } from "@/lib/i18n-toast";
import { fmtNumber, fmtTime } from "@/lib/locale-format";
import { pillarLabel } from "@/hooks/useVitanaIndex";
import { PILLAR_KEYS, type TimelineDayDigest, type TimelineIndexDay, type TimelineInfluence, type TimelineMoment } from "@/lib/timeline-api";
import { PILLAR_STYLE, iconFor, momentFacts, momentTitle, signed } from "./timeline-meta";

export function InfluenceBadge({ influence }: { influence: TimelineInfluence | null }) {
  if (!influence) return null;
  if (influence.kind === "measured") {
    const parts = PILLAR_KEYS.filter((p) => (influence.delta_pillars?.[p] ?? 0) !== 0);
    if (parts.length === 0) return null;
    return (
      <span className="flex flex-wrap justify-end gap-1" data-testid="timeline-influence-measured">
        {parts.map((p) => (
          <span key={p} className={`rounded-full px-2 py-0.5 text-xs font-medium text-foreground ${PILLAR_STYLE[p].tint}`}>
            {t("timeline.influence.measured", { delta: signed(influence.delta_pillars?.[p] ?? 0), pillar: pillarLabel(p) })}
          </span>
        ))}
      </span>
    );
  }
  if (!influence.pillar) return null;
  const p = influence.pillar;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs text-muted-foreground ${PILLAR_STYLE[p].border}`}
      data-testid="timeline-influence-counted"
    >
      {t("timeline.influence.counted", { pillar: pillarLabel(p) })}
    </span>
  );
}

function RowIcon({ name, pillar }: { name: string; pillar: TimelineMoment["pillar"] }) {
  const Icon = iconFor(name);
  const style = pillar ? PILLAR_STYLE[pillar] : null;
  return (
    <span className={`flex h-full w-full items-center justify-center rounded-vcard-sm ${style ? `${style.tint} ${style.accent}` : "bg-muted text-muted-foreground"}`}>
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}

export function MomentRow({ item, onOpen }: { item: TimelineMoment; onOpen: (id: string) => void }) {
  const facts = momentFacts(item);
  const time = fmtTime(item.at, { hour: "2-digit", minute: "2-digit" });
  return (
    <VCard
      as="li"
      size="row"
      role="button"
      tabIndex={0}
      data-testid="timeline-moment"
      className="cursor-pointer"
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(item.id);
        }
      }}
      mediaSlot={<RowIcon name={item.icon} pillar={item.pillar ?? item.secondary_pillar} />}
      title={momentTitle(item)}
      meta={[time, ...facts].join(" · ")}
      actions={<InfluenceBadge influence={item.influence} />}
      dimmed={item.hidden_from_ai}
    />
  );
}

export function IndexDayRow({ item }: { item: TimelineIndexDay }) {
  const parts = PILLAR_KEYS.filter((p) => (item.delta_pillars[p] ?? 0) !== 0).map(
    (p) => `${pillarLabel(p)} ${signed(item.delta_pillars[p] ?? 0)}`,
  );
  return (
    <VCard
      as="li"
      size="row"
      data-testid="timeline-index-day"
      mediaSlot={
        <span className="flex h-full w-full items-center justify-center rounded-vcard-sm bg-primary/10 text-primary">
          <Gauge className="h-5 w-5" aria-hidden />
        </span>
      }
      title={
        item.score_total_after !== null
          ? t(item.delta_total >= 0 ? "timeline.indexDay.rose" : "timeline.indexDay.fell", {
              score: fmtNumber(item.score_total_after),
              delta: signed(item.delta_total),
            })
          : t("timeline.indexDay.changed", { delta: signed(item.delta_total) })
      }
      meta={parts.length ? parts.join(" · ") : item.daily_update ? t("timeline.indexDay.dailyUpdate") : undefined}
    />
  );
}

export function DigestRow({ item }: { item: TimelineDayDigest }) {
  const top = Object.entries(item.counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic, n]) => `${t(`timeline.topic.${topic}`)} ${fmtNumber(n)}×`);
  return (
    <VCard
      as="li"
      size="row"
      data-testid="timeline-day-digest"
      mediaSlot={
        <span className="flex h-full w-full items-center justify-center rounded-vcard-sm bg-muted text-muted-foreground">
          <Sun className="h-5 w-5" aria-hidden />
        </span>
      }
      title={t("timeline.digest.title", { n: fmtNumber(item.total) })}
      meta={top.join(" · ")}
    />
  );
}
