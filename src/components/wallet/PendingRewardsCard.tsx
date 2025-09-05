import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Gift } from "lucide-react";
import { RewardDot } from "@/components/ui/reward-dot";

export function PendingRewardsCard() {
  return (
    <Card className="relative">
      <RewardDot points={15} description="Claim pending rewards" />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Pending Rewards
        </CardTitle>
        <CardDescription>Ready to claim</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-2">
          <div className="text-3xl font-bold text-amber-600 mb-1">487 VTP</div>
          <div className="text-sm text-muted-foreground">≈ $24.35 value</div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Health tracking</span>
            <span className="text-amber-600">+125 VTP</span>
          </div>
          <div className="flex justify-between">
            <span>Data sharing</span>
            <span className="text-amber-600">+200 VTP</span>
          </div>
          <div className="flex justify-between">
            <span>Community engagement</span>
            <span className="text-amber-600">+162 VTP</span>
          </div>
        </div>
        
        <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
          <Gift className="h-4 w-4 mr-2" />
          Claim All Rewards
        </Button>
      </CardContent>
    </Card>
  );
}