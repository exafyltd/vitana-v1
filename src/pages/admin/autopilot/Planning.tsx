/**
 * Autopilot > Planning tab
 *
 * Admin view of autopilot waves with toggle controls. Shows a timeline
 * visualization and expandable wave cards with automation details.
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronRight, Rocket, Sun, Heart, Activity, Lightbulb, Compass, Calendar, TrendingUp, HeartPulse, Sparkles } from "lucide-react";
import {
  useAutopilotWaves,
  useToggleWave,
  type WaveDefinition,
} from "@/hooks/useAdminAutopilot";

const WAVE_ICONS: Record<string, React.ElementType> = {
  rocket: Rocket,
  sun: Sun,
  heart: Heart,
  activity: Activity,
  lightbulb: Lightbulb,
  compass: Compass,
  calendar: Calendar,
  "trending-up": TrendingUp,
  "heart-pulse": HeartPulse,
};

const WAVE_COLORS = [
  "bg-blue-500", "bg-amber-500", "bg-rose-500", "bg-green-500",
  "bg-purple-500", "bg-cyan-500", "bg-orange-500", "bg-emerald-500", "bg-pink-500",
];

function TimelineBar({ waves }: { waves: WaveDefinition[] }) {
  const maxDay = 90;
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Journey Timeline</h3>
        {/* Day markers */}
        <div className="relative mb-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Day 0</span>
            <span>Day 30</span>
            <span>Day 60</span>
            <span>Day 90</span>
          </div>
          <div className="h-px bg-border mt-1" />
        </div>
        {/* Wave bars */}
        <div className="space-y-1.5">
          {waves.map((wave, i) => {
            const left = (wave.timeline.start_day / maxDay) * 100;
            const width = ((wave.timeline.end_day - wave.timeline.start_day) / maxDay) * 100;
            return (
              <div key={wave.id} className="relative h-5">
                <div
                  className={`absolute h-full rounded-sm ${WAVE_COLORS[i % WAVE_COLORS.length]} ${wave.enabled ? "opacity-80" : "opacity-25"} transition-opacity`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  <span className="text-[10px] text-white font-medium px-1 truncate block leading-5">
                    {wave.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function WaveCard({ wave, index }: { wave: WaveDefinition; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const toggleWave = useToggleWave();
  const Icon = WAVE_ICONS[wave.icon] || Sparkles;

  return (
    <Card className={`transition-opacity ${wave.enabled ? "" : "opacity-60"}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${WAVE_COLORS[index % WAVE_COLORS.length]} text-white flex-shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Wave {wave.order}: {wave.name}</h3>
              {wave.is_initiative && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">NEW</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{wave.description}</p>
          </div>

          {/* Timeline badge */}
          <Badge variant="outline" className="text-xs flex-shrink-0">
            Day {wave.timeline.start_day}–{wave.timeline.end_day}
          </Badge>

          {/* Stats */}
          <div className="flex gap-2 flex-shrink-0">
            <Badge variant="secondary" className="text-xs">
              {wave.total_templates} tasks
            </Badge>
            {wave.total_automations > 0 && (
              <Badge variant="secondary" className="text-xs">
                {wave.enabled_automations}/{wave.total_automations} AP
              </Badge>
            )}
          </div>

          {/* Toggle */}
          <Switch
            checked={wave.enabled}
            onCheckedChange={(checked) =>
              toggleWave.mutate({ waveId: wave.id, enabled: checked })
            }
            disabled={toggleWave.isPending}
          />

          {/* Expand */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 pl-12 space-y-3">
            {/* Journey Tasks */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Journey Tasks ({wave.recommendation_templates.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {wave.recommendation_templates.map((tpl) => (
                  <Badge key={tpl} variant="outline" className="text-xs font-mono">
                    {tpl}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Automations */}
            {wave.automations.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Automations ({wave.automations.length})
                </h4>
                <div className="space-y-1">
                  {wave.automations.map((ap) => (
                    <div key={ap.id} className="flex items-center gap-2 text-xs">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 ${
                          ap.status === "IMPLEMENTED" || ap.status === "LIVE"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {ap.status}
                      </Badge>
                      <span className="font-mono text-muted-foreground">{ap.id}</span>
                      <span>{ap.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AutopilotPlanning() {
  const wavesQuery = useAutopilotWaves();
  const waves = wavesQuery.data || [];
  const activeCount = waves.filter(w => w.enabled).length;
  const totalAP = waves.reduce((n, w) => n + w.total_automations, 0);
  const enabledAP = waves.reduce((n, w) => n + w.enabled_automations, 0);

  const coreWaves = waves.filter(w => !w.is_initiative);
  const initiatives = waves.filter(w => w.is_initiative);

  return (
    <AppLayout>
      <AdminTabs sectionKey="autopilot" />
      <div className="p-6">
        <AdminHeader
          title="Autopilot Planning"
          description={`Configure autopilot waves — ${activeCount}/${waves.length} active, ${enabledAP}/${totalAP} automations enabled`}
        />

        {wavesQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Timeline overview */}
            <TimelineBar waves={waves} />

            {/* Core waves */}
            <div className="space-y-3 mb-6">
              {coreWaves.map((wave, i) => (
                <WaveCard key={wave.id} wave={wave} index={i} />
              ))}
            </div>

            {/* New Initiatives divider */}
            {initiatives.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    New Initiatives
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-3">
                  {initiatives.map((wave, i) => (
                    <WaveCard key={wave.id} wave={wave} index={coreWaves.length + i} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
