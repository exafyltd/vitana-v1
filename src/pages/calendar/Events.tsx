import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";

export default function Events() {
  return (
    <AppLayout>
      <SEO title="Events | Calendar" description="Manage your events" canonical={window.location.href} />
      
      <StandardHeader
        title="Events"
        description="Create and manage your events and special occasions."
        emoji="🎉"
      />
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">Events Coming Soon</h2>
              <p className="text-muted-foreground">
                Event management and creation features are being developed.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}