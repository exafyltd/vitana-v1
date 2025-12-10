import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, History, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function ClientsSubTabs() {
  const navigate = useNavigate();

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="prospects">Prospects</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="space-y-4">
        {/* Placeholder for active clients */}
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Active Clients</h3>
          <p className="text-muted-foreground">
            Active clients with subscriptions or bookings will appear here.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="prospects" className="space-y-4">
        <div className="text-center py-12">
          <UserPlus className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Prospects Yet</h3>
          <p className="text-muted-foreground mb-4">
            Leads from sharing campaigns and reseller links will appear here.
          </p>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/sharing")}>
            <Share2 className="w-4 h-4" />
            Promote via Sharing
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        <div className="text-center py-12">
          <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Past Clients</h3>
          <p className="text-muted-foreground">
            Clients who had past sessions but no active plan will appear here.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
