import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Calendar, TrendingUp, Plus, Copy, Sparkles, Check } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { useIsReseller } from "@/hooks/useIsReseller";
import { useState } from "react";
import { toast } from "sonner";

interface BusinessHubOverviewProps {
  onCreateService: () => void;
  onCreateEvent: () => void;
  onCreateCampaign: () => void;
}

export function BusinessHubOverview({ 
  onCreateService, 
  onCreateEvent, 
  onCreateCampaign 
}: BusinessHubOverviewProps) {
  const { pendingCount, getLatestActions } = useAutopilot();
  const { isReseller } = useIsReseller();
  const { data: resellerProfile } = useResellerProfile();
  const [copied, setCopied] = useState(false);
  
  const latestActions = getLatestActions(3);

  const handleCopyResellerCode = () => {
    if (resellerProfile?.reseller_code) {
      navigator.clipboard.writeText(resellerProfile.reseller_code);
      setCopied(true);
      toast.success("Reseller code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-[0_0_20px_rgba(34,197,94,0.1)] hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] transition-all duration-300 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-400/20 to-emerald-500/20 shadow-lg shadow-green-500/20">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">$2,450</p>
              <p className="text-xs text-muted-foreground">Revenue this month</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-[0_0_20px_rgba(59,130,246,0.1)] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all duration-300 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400/20 to-cyan-500/20 shadow-lg shadow-blue-500/20">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">147</p>
              <p className="text-xs text-muted-foreground">Active clients</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] transition-all duration-300 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-400/20 to-fuchsia-500/20 shadow-lg shadow-purple-500/20">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">23</p>
              <p className="text-xs text-muted-foreground">Upcoming sessions</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-[0_0_20px_rgba(251,191,36,0.1)] hover:shadow-[0_0_30px_rgba(251,191,36,0.2)] transition-all duration-300 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 shadow-lg shadow-yellow-500/20">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">4.9</p>
              <p className="text-xs text-muted-foreground">Average rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reseller Code (if active) */}
      {isReseller && resellerProfile?.reseller_code && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Your reseller code:</span>
          <Badge variant="outline" className="font-mono gap-2">
            {resellerProfile.reseller_code}
            <button onClick={handleCopyResellerCode} className="hover:text-foreground transition-colors">
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </button>
          </Badge>
        </div>
      )}

      {/* Autopilot Suggestions */}
      <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-red-400" />
            Autopilot for your business
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestActions.length > 0 ? (
            latestActions.map((action) => (
              <div key={action.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{action.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{action.title}</p>
                    {action.reason && (
                      <p className="text-xs text-muted-foreground">{action.reason}</p>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No suggestions right now. Keep growing your business!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2" onClick={onCreateService}>
              <Plus className="w-4 h-4" />
              Create Service
            </Button>
            <Button variant="outline" className="gap-2" onClick={onCreateEvent}>
              <Plus className="w-4 h-4" />
              Create Event
            </Button>
            {isReseller && (
              <Button variant="outline" className="gap-2" onClick={onCreateCampaign}>
                <Plus className="w-4 h-4" />
                Create Campaign
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
