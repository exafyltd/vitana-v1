/**
 * Vitana's one suggestion for today (VTID-04536). The rules live in
 * guidance.ts; this card only words them and offers the one next move.
 *
 * VTID-04681: a quiet card the member can put away for the day.
 * VTID-04852: the Index page's "next up" box.
 */
import { Sparkles, X } from "lucide-react";
import { INDEX_NEXT_UP, INDEX_NEXT_UP_CHIP, INDEX_PRIMARY_BTN } from "@/lib/index-look";
import { t } from "@/lib/i18n-toast";
import { fmtTime } from "@/lib/locale-format";
import type { Guidance } from "./guidance";
import { SURFACE } from "./theme";

export interface GuideActions {
  onStartStep: (stepId: string) => void;
  onFindEvent: () => void;
  onAskVitana: () => void;
  onShowWeek: () => void;
  onConnect: () => void;
  onDismiss?: () => void;
}

function wording(g: Guidance): { text: string; sub?: string } {
  switch (g.kind) {
    case "allDone":
      return { text: t("vcal.guide.allDone", { count: g.count }) };
    case "nextStep":
      return {
        text: t("vcal.guide.nextStep", { title: g.title }),
        sub: g.openCount === 1 ? t("vcal.guide.stepsOpenOne") : t("vcal.guide.stepsOpen", { count: g.openCount }),
      };
    case "freeDay":
      return { text: t("vcal.guide.freeDay") };
    case "freeWindow":
      return { text: t("vcal.guide.freeWindow", { from: fmtTime(g.from, { hour: "2-digit", minute: "2-digit" }), to: fmtTime(g.to, { hour: "2-digit", minute: "2-digit" }) }) };
    case "connect":
      return { text: t("vcal.guide.connect") };
    case "busy":
      return { text: t("vcal.guide.busy", { count: g.count }) };
  }
}

function Action({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return primary ? (
    <button type="button" onClick={onClick} className={`${INDEX_PRIMARY_BTN} !h-10 !px-4`}>
      {label}
    </button>
  ) : (
    <button type="button" onClick={onClick} className="h-10 rounded-full px-3 text-[15px] font-semibold text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
      {label}
    </button>
  );
}

export function GuideCard({ guidance, actions }: { guidance: Guidance; actions: GuideActions }) {
  const { text, sub } = wording(guidance);
  return (
    <div className={`${INDEX_NEXT_UP} flex flex-col gap-3`} style={{ color: SURFACE.ink }} data-testid="vcal-guide" data-kind={guidance.kind}>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={`${INDEX_NEXT_UP_CHIP} self-start`}>
            <Sparkles className="h-3 w-3" aria-hidden />
            {t("vcal.guide.eyebrow")}
          </span>
          <span className="mt-1.5 text-[15px] font-semibold leading-snug text-slate-900">{text}</span>
          {sub && <span className="text-sm leading-snug text-slate-600">{sub}</span>}
        </div>
        {actions.onDismiss && (
          <button
            type="button"
            onClick={actions.onDismiss}
            aria-label={t("vcal.guide.dismiss")}
            className="-me-1 -mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ color: SURFACE.faint }}
            data-testid="vcal-guide-dismiss"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {guidance.kind === "nextStep" && <Action primary label={t("vcal.guide.start")} onClick={() => actions.onStartStep(guidance.stepId)} />}
        {(guidance.kind === "freeDay" || guidance.kind === "freeWindow") && (
          <>
            <Action primary label={t("vcal.guide.findEvent")} onClick={actions.onFindEvent} />
            <Action label={t("vcal.guide.planWithVitana")} onClick={actions.onAskVitana} />
          </>
        )}
        {guidance.kind === "allDone" && <Action label={t("vcal.guide.seeWeek")} onClick={actions.onShowWeek} />}
        {guidance.kind === "connect" && <Action primary label={t("vcal.guide.connectAction")} onClick={actions.onConnect} />}
      </div>
    </div>
  );
}
