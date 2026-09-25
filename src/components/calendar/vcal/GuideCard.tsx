/**
 * Vitana's one suggestion for today (VTID-04536). The rules live in
 * guidance.ts; this card only words them and offers the one next move.
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
      className="h-10 rounded-full px-4 text-sm font-extrabold"
      style={primary ? { background: SURFACE.primary, color: "#FFFFFF" } : { background: "#FFFFFF", color: SURFACE.primary }}
    >
      {label}
    </button>
  );
}

export function GuideCard({ guidance, actions }: { guidance: Guidance; actions: GuideActions }) {
  const { text, sub } = wording(guidance);
  return (
    <div className="flex flex-col gap-3 rounded-[20px] px-4 py-3.5" style={{ background: "#ECEAFF", color: "#2F2A7A" }} data-testid="vcal-guide" data-kind={guidance.kind}>
      <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#5B54D6" }}>
        ✨ {t("vcal.guide.eyebrow")}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-bold leading-snug">{text}</span>
        {sub && <span className="text-sm opacity-80">{sub}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
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
