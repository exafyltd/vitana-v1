import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, BarChart3 } from "lucide-react";

export function LifetimeEarningsCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Lifetime Earnings
        </CardTitle>
        <CardDescription>Total earned since joining</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-2">
          <div className="text-3xl font-bold text-green-600 mb-1">$8,247.85</div>
          <div className="text-sm text-muted-foreground">Since March 2023</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-semibold text-lg">15,847</div>
            <div className="text-muted-foreground">Total VTP</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-semibold text-lg">$1,247</div>
            <div className="text-muted-foreground">Cash Out</div>
          </div>
        </div>
        
        <Button variant="outline" className="w-full">
          <BarChart3 className="h-4 w-4 mr-2" />
          View Analytics
        </Button>
      </CardContent>
    </Card>
  );
}