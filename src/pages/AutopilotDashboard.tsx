import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { communityFetch } from "@/lib/community-gateway";
import {
  CheckCircle2, Loader2, Rocket, Sun, Heart, Activity,
  Lightbulb, Compass, Calendar, TrendingUp, HeartPulse, Sparkles,
  Play,
} from "lucide-react";
import { useState, useMemo } from "react";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";

// ── Types ───────────────────────────────────────────────────

interface Recommendation {
  id: string;
  title: string;
  summary: string;
  status: string;
  source_ref: string;
  impact_score: number;
  wave_id?: string;
  wave_order?: number;
}

interface WaveMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  is_initiative: boolean;
  timeline: { start_day: number; end_day: number };
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  waves?: WaveMeta[];
}

// ── Constants ───────────────────────────────────────────────

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

// ── Timeline Component ──────────────────────────────────────

function JourneyTimeline({ waves, userDayCount }: { waves: WaveMeta[]; userDayCount: number }) {
  const maxDay = 90;
  const markerPct = Math.min((userDayCount / maxDay) * 100, 100);

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Your Timeline</h3>
          <Badge variant="outline" className="text-xs">Day {userDayCount}</Badge>
        </div>
        {/* Day markers */}
        <div className="relative mb-2">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Day 0</span>
            <span>Day 30</span>
            <span>Day 60</span>
            <span>Day 90</span>
          </div>
          <div className="relative h-px bg-border mt-1">
            {/* "You are here" marker */}
            <div
              className="absolute -top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm"
              style={{ left: `${markerPct}%`, transform: "translateX(-50%)" }}
            />
          </div>
        </div>
        {/* Wave bars */}
        <div className="space-y-1 mt-3">
          {waves.map((wave, i) => {
            const left = (wave.timeline.start_day / maxDay) * 100;
            const width = ((wave.timeline.end_day - wave.timeline.start_day) / maxDay) * 100;
            return (
              <div key={wave.id} className="relative h-4">
                <div
                  className={`absolute h-full rounded-sm ${WAVE_COLORS[i % WAVE_COLORS.length]} opacity-75`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  <span className="text-[9px] text-white font-medium px-1 truncate block leading-4">
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

// ── Wave Section Component ──────────────────────────────────

function WaveSection({
  wave,
  recommendations,
  index,
  onActivate,
  activatingId,
}: {
  wave: WaveMeta;
  recommendations: Recommendation[];
  index: number;
  onActivate: (rec: Recommendation) => void;
  activatingId: string | null;
}) {
  const Icon = WAVE_ICONS[wave.icon] || Sparkles;
  const total = recommendations.length;
  const activated = recommendations.filter(r => r.status === "activated").length;
  const completed = recommendations.filter(r => r.status === "completed").length;

  // Sort: completed last, activated middle, new first
  const sorted = [...recommendations].sort((a, b) => {
    const order = { new: 0, activated: 1, completed: 2 };
    return (order[a.status as keyof typeof order] ?? 0) - (order[b.status as keyof typeof order] ?? 0);
  });

  return (
    <div className="mb-6">
      {/* Wave header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${WAVE_COLORS[index % WAVE_COLORS.length]} text-white flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">
              {wave.name}
            </h2>
            {wave.is_initiative && (
              <Badge className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0">
                NEW
              </Badge>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          Day {wave.timeline.start_day}–{wave.timeline.end_day}
        </span>
      </div>

      {/* Wave stats */}
      <div className="text-xs text-muted-foreground mb-2 pl-9">
        {total} tasks &middot; {activated + completed} activated &middot; {completed} completed
      </div>

      {/* Task cards */}
      <div className="space-y-2 pl-9">
        {sorted.map((rec) => (
          <Card key={rec.id} className={rec.status === "completed" ? "opacity-60" : ""}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-foreground">{rec.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rec.summary}</p>
                </div>
                <div className="flex-shrink-0">
                  {rec.status === "completed" ? (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Done
                      </Badge>
                      <span className="text-xs font-semibold text-green-600">+10 CREDITS</span>
                    </div>
                  ) : rec.status === "activated" ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                      Active
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => onActivate(rec)}
                      disabled={activatingId === rec.id}
                    >
                      {activatingId === rec.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          Activate
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2">
            Tasks coming soon...
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

export default function AutopilotDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const { pendingCount } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["autopilot-onboarding"],
    queryFn: async () => {
      const res = await communityFetch(
        "/api/v1/autopilot/recommendations?status=new,activated,completed&limit=100"
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<RecommendationsResponse>;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });

  const recommendations = data?.recommendations ?? [];
  const waves = data?.waves ?? [];

  // Compute user day count from account creation
  const userDayCount = useMemo(() => {
    if (!user?.created_at) return 0;
    const created = new Date(user.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / 86400000);
  }, [user?.created_at]);

  // Group recommendations by wave
  const waveGroups = useMemo(() => {
    const groups = new Map<string, Recommendation[]>();
    for (const rec of recommendations) {
      const waveId = rec.wave_id || "wave-1";
      if (!groups.has(waveId)) groups.set(waveId, []);
      groups.get(waveId)!.push(rec);
    }
    return groups;
  }, [recommendations]);

  // Ensure all waves have entries (even empty ones)
  const sortedWaves = useMemo(() => {
    return [...waves].sort((a, b) => a.order - b.order);
  }, [waves]);

  // Overall stats
  const total = recommendations.length;
  const activated = recommendations.filter(r => r.status === "activated" || r.status === "completed").length;
  const completed = recommendations.filter(r => r.status === "completed").length;
  const progressPct = total > 0 ? (activated / total) * 100 : 0;

  const handleActivate = async (rec: Recommendation) => {
    setActivatingId(rec.id);
    try {
      const res = await communityFetch(
        `/api/v1/autopilot/recommendations/${rec.id}/activate`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Activation failed");
      const result = await res.json();
      if (result.action_type === "navigate") {
        navigate(result.target);
      } else if (result.action_type === "notify") {
        toast.success(result.completion_message);
      }
      queryClient.invalidateQueries({ queryKey: ["autopilot-onboarding"] });
    } catch {
      toast.error("Could not start task");
    } finally {
      setActivatingId(null);
    }
  };

  // ── Mobile layout ──────────────────────────────────────────
  if (isMobile) {
    return (
      <AppLayout>
        <SEO title="My Journey" description="Your personalized autopilot journey" canonical={window.location.href} />

        <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background pb-32">
          {/* Header */}
          <div className="px-4 pt-2">
            <StandardHeader title="My Journey" description="Your personalized 90-day autopilot journey" emoji="🚀" />
          </div>

          {/* Utility Action Bar */}
          <div className="px-4">
            <UtilityActionButton
              compact
              afterGiftVoucherChildren={
                <>
                  <VitanaIndexChip />
                  <AutopilotChip pendingCount={pendingCount} onClick={() => setAutopilotOpen(true)} />
                </>
              }
            >
              <ExpandableSearchButton placeholder="Search tasks..." />
              <UniversalCalendarButton />
            </UtilityActionButton>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Timeline */}
                {sortedWaves.length > 0 && (
                  <JourneyTimeline waves={sortedWaves} userDayCount={userDayCount} />
                )}

                {/* Overall progress */}
                <div className="mb-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{activated} of {total} activated</span>
                    <span>{completed} completed</span>
                  </div>
                  <Progress value={progressPct} className="h-3" />
                </div>

                {/* Wave sections */}
                {sortedWaves.length > 0 ? (
                  sortedWaves.map((wave, i) => (
                    <WaveSection
                      key={wave.id}
                      wave={wave}
                      recommendations={waveGroups.get(wave.id) || []}
                      index={i}
                      onActivate={handleActivate}
                      activatingId={activatingId}
                    />
                  ))
                ) : (
                  /* Flat fallback list */
                  <div className="space-y-2">
                    {recommendations
                      .sort((a, b) => {
                        if (a.status === "completed" && b.status !== "completed") return 1;
                        if (a.status !== "completed" && b.status === "completed") return -1;
                        return 0;
                      })
                      .map((rec) => (
                        <Card key={rec.id} className={rec.status === "completed" ? "opacity-60" : ""}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm">{rec.title}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rec.summary}</p>
                              </div>
                              <div className="flex-shrink-0">
                                {rec.status === "completed" ? (
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Done
                                    </Badge>
                                    <span className="text-xs font-semibold text-green-600">+10 CREDITS</span>
                                  </div>
                                ) : rec.status === "activated" ? (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                                    Active
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => handleActivate(rec)}
                                    disabled={activatingId === rec.id}
                                  >
                                    {activatingId === rec.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Play className="w-3 h-3" />
                                        Activate
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-muted-foreground pb-4">
                  <Sparkles className="w-4 h-4 inline-block mr-1 align-text-top" />
                  New features are added regularly by Vitana.
                </div>
              </>
            )}
          </div>
        </div>

        <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
      </AppLayout>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────
  return (
    <AppLayout>
      <SEO
        title="My Journey"
        description="Your personalized autopilot journey"
        canonical={window.location.href}
      />
      <div className="p-6 min-h-screen bg-gradient-subtle">
        <div className="max-w-2xl mx-auto">
          <StandardHeader
            title="My Journey"
            description="Your personalized 90-day autopilot journey"
            emoji="🚀"
          />

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Timeline calendar */}
              {sortedWaves.length > 0 && (
                <JourneyTimeline waves={sortedWaves} userDayCount={userDayCount} />
              )}

              {/* Overall progress */}
              <div className="mb-6 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{activated} of {total} activated</span>
                  <span>{completed} completed</span>
                </div>
                <Progress value={progressPct} className="h-3" />
              </div>

              {/* Wave sections */}
              {sortedWaves.length > 0 ? (
                sortedWaves.map((wave, i) => (
                  <WaveSection
                    key={wave.id}
                    wave={wave}
                    recommendations={waveGroups.get(wave.id) || []}
                    index={i}
                    onActivate={handleActivate}
                    activatingId={activatingId}
                  />
                ))
              ) : (
                /* Fallback: flat list if no wave metadata */
                <div className="space-y-2">
                  {recommendations
                    .sort((a, b) => {
                      if (a.status === "completed" && b.status !== "completed") return 1;
                      if (a.status !== "completed" && b.status === "completed") return -1;
                      return 0;
                    })
                    .map((rec) => (
                      <Card key={rec.id} className={rec.status === "completed" ? "opacity-60" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground">{rec.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{rec.summary}</p>
                            </div>
                            <div className="flex-shrink-0">
                              {rec.status === "completed" ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Done
                                  </Badge>
                                  <span className="text-sm font-semibold text-green-600">+10 CREDITS</span>
                                </div>
                              ) : rec.status === "activated" ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  In Progress
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleActivate(rec)}
                                  disabled={activatingId === rec.id}
                                >
                                  {activatingId === rec.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Start"
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}

              {/* Footer message */}
              <div className="mt-8 text-center text-sm text-muted-foreground pb-8">
                <Sparkles className="w-4 h-4 inline-block mr-1 align-text-top" />
                New features are added regularly by Vitana.
                <br />
                Check back for new tasks to activate!
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
