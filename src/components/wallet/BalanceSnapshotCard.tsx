import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Eye, Plus } from "lucide-react";
import { RewardDot } from "@/components/ui/reward-dot";

export function BalanceSnapshotCard() {
  return (
    <Card className="relative overflow-hidden">
      <RewardDot points={5} description="View balance details" />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Balance Snapshot
        </CardTitle>
        <CardDescription>Current wallet overview</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Available Balance</span>
            <span className="font-semibold text-lg">$2,847.32</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pending</span>
            <span className="font-medium text-amber-600">$124.50</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">VTP Tokens</span>
            <span className="font-medium text-purple-600">1,247 VTP</span>
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1">
            <Plus className="h-4 w-4 mr-1" />
            Add Funds
          </Button>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}