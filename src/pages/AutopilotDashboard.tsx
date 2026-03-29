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
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

interface Recommendation {
  id: string;
  title: string;
  summary: string;
  status: string;
  source_ref: string;
  impact_score: number;
}

export default function AutopilotDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["autopilot-onboarding"],
    queryFn: async () => {
      const res = await communityFetch("/api/v1/autopilot/recommendations");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ recommendations: Recommendation[] }>;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });

  const recommendations = data?.recommendations ?? [];
  const sorted = [...recommendations].sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;
    return 0;
  });

  const total = recommendations.length;
  const completed = recommendations.filter((r) => r.status === "completed").length;
  const progressPct = total > 0 ? (completed / total) * 100 : 0;

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
    } catch (e) {
      toast.error("Could not start task");
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <AppLayout>
      <SEO
        title="My Journey"
        description="Complete onboarding tasks to earn VTN"
        canonical={window.location.href}
      />
      <div className={`p-6 min-h-screen bg-gradient-subtle ${isMobile ? "" : ""}`}>
        <div className={isMobile ? "" : "max-w-2xl mx-auto"}>
          <StandardHeader
            title="My Journey"
            description="Complete tasks to earn VTN credits!"
            emoji="🚀"
          />

          {/* Progress */}
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{completed} of {total} completed</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} className="h-3" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((rec) => (
                <Card key={rec.id} className={rec.status === "completed" ? "opacity-70" : ""}>
                  <CardContent className={isMobile ? "p-4" : "p-5"}>
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
                            <span className="text-sm font-semibold text-green-600">+10 VTN</span>
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
              {sorted.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No tasks available yet. Check back soon!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
