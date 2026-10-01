/**
 * Vitana's one suggestion for today (VTID-04536). The rules live in
 * guidance.ts; this card only words them and offers the one next move.
 *
 * VTID-04681: a quiet card the member can put away for the day.
 */
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-full px-4 text-sm ${primary ? "font-semibold" : ""}`}
      style={primary ? { background: SURFACE.primary, color: "#FFFFFF" } : { background: "transparent", color: SURFACE.primary }}
    >
      {label}
    </button>
  );
}

export function GuideCard({ guidance, actions }: { guidance: Guidance; actions: GuideActions }) {
  const { text, sub } = wording(guidance);
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl px-4 py-3" style={{ background: "#F3F2FF", color: SURFACE.ink }} data-testid="vcal-guide" data-kind={guidance.kind}>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs" style={{ color: SURFACE.primary }}>
            ✨ {t("vcal.guide.eyebrow")}
          </span>
          <span className="text-sm leading-snug">{text}</span>
          {sub && <span className="text-sm" style={{ color: SURFACE.muted }}>{sub}</span>}
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
            ✕
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
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
