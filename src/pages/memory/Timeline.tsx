import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Clock, Calendar, MapPin, Heart, Plus } from "lucide-react";

const timelineData = [
  {
    id: 1,
    date: "2024-01-20",
    time: "14:30",
    type: "Health Metric",
    title: "Blood Pressure Reading",
    details: "120/80 mmHg - Normal range",
    location: "Home",
    icon: Heart
  },
  {
    id: 2,
    date: "2024-01-19",
    time: "09:15",
    type: "Appointment",
    title: "Cardiology Consultation",
    details: "Follow-up appointment with Dr. Johnson",
    location: "Mayo Clinic",
    icon: Calendar
  }
];

function Timeline() {
  return (
    <AppLayout>
      <SEO title="Timeline - Vitana Memory" description="View your comprehensive health timeline and life events." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title="Health Timeline"
          description="Your comprehensive health journey and important life events"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder="Search timeline events..." />
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </UtilityActionButton>

        <div className="space-y-4 mt-6">
          {timelineData.map((event) => {
            const IconComponent = event.icon;
            return (
              <Card key={event.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{event.title}</h3>
                        <Badge variant="outline">{event.type}</Badge>
                        <div className="text-sm text-muted-foreground">
                          {event.date} at {event.time}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{event.details}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Timeline, SCREEN_IDS.MEMORY_TIMELINE);