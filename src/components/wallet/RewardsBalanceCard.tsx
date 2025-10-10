import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, ArrowUpDown, Send } from "lucide-react";
import { RewardDot } from "@/components/ui/reward-dot";

export function RewardsBalanceCard() {
  return (
    <Card className="relative">
      <RewardDot points={10} description="Convert or send VTNA" />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Coins className="h-5 w-5 text-purple-500" />
          VTNA Balance
        </CardTitle>
        <CardDescription>Vitana Network Tokens</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-2">
          <div className="text-3xl font-bold text-purple-600 mb-1">2,847 VTNA</div>
          <div className="text-sm text-muted-foreground">≈ $142.35 USD</div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1">
            <span>Available</span>
            <span className="font-medium">2,847 VTNA</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Staked</span>
            <span className="font-medium text-blue-600">500 VTNA</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Locked</span>
            <span className="font-medium text-orange-600">150 VTNA</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Convert
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            <Send className="h-4 w-4 mr-1" />
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}