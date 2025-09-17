import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function EconomyHealthCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-500" />
          Economy Health
        </CardTitle>
        <CardDescription>VTN ecosystem status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">System Status</span>
          <Badge className="bg-green-100 text-green-700">Healthy</Badge>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span>VTN Burn Rate</span>
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium">2.4%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Daily Active Users</span>
            <span className="font-medium">847.2K</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Total VTN Supply</span>
            <span className="font-medium">12.4M VTN</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Market Cap</span>
            <span className="font-medium">$2.8M USD</span>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex items-start gap-2 p-2 bg-amber-50 rounded text-xs">
            <AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
            <span className="text-amber-700">Fee burns help maintain token value by reducing supply over time.</span>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" className="w-full text-xs">
          <ExternalLink className="h-3 w-3 mr-1" />
          View Tokenomics
        </Button>
      </CardContent>
    </Card>
  );
}