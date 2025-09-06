import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { communityNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Plus, Users, Search } from "lucide-react";
import { CreateMeetupPopup } from "@/components/CreateMeetupPopup";
import { useState } from "react";

export default withScreenId(function Meetups() {
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Meetups | Community" description="Discover and join local meetups and events" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6">
        <StandardHeader
          title="Meetups"
          description="Find and attend local wellness meetups and community events."
          emoji="🤝"
        />

        {/* Utility Action Button */}
        <UtilityActionButton>
          <Button variant="outline" size="sm">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Button size="sm" onClick={() => setCreateMeetupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            MeetUp
          </Button>
        </UtilityActionButton>

        {/* Sample Meetups */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Today's Meetup */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Morning Yoga in Central Park</h3>
                  <p className="text-xs text-muted-foreground mb-2">Start your day with mindful movement</p>
                </div>
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                  Today
                </div>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>15 going • 5 spots left</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>📍 Central Park, NYC</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>⏰ 7:00 AM - 8:30 AM</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs">Join</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs">Details</Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Meetup */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Healthy Cooking Workshop</h3>
                  <p className="text-xs text-muted-foreground mb-2">Learn to cook nutritious meals</p>
                </div>
                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                  Tomorrow
                </div>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>8 going • 12 spots left</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>📍 Community Kitchen</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>⏰ 6:00 PM - 8:00 PM</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs">Join</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs">Details</Button>
              </div>
            </CardContent>
          </Card>

          {/* Weekend Meetup */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Weekend Hiking Adventure</h3>
                  <p className="text-xs text-muted-foreground mb-2">Explore nature trails together</p>
                </div>
                <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                  Sat
                </div>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>12 going • 8 spots left</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>📍 Bear Mountain Trail</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>⏰ 8:00 AM - 4:00 PM</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs">Join</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs">Details</Button>
              </div>
            </CardContent>
          </Card>

          {/* Next Week Meetup */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Meditation Circle</h3>
                  <p className="text-xs text-muted-foreground mb-2">Find inner peace together</p>
                </div>
                <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                  Sun
                </div>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>10 going • 10 spots left</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>📍 Wellness Center</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>⏰ 5:00 PM - 6:30 PM</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs">Join</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs">Details</Button>
              </div>
            </CardContent>
          </Card>

          {/* Popular Meetup */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Nutrition Q&A Session</h3>
                  <p className="text-xs text-muted-foreground mb-2">Ask our registered dietitian</p>
                </div>
                <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                  Popular
                </div>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>25 going • 5 spots left</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>📍 Virtual Meeting</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>⏰ Next Wed 7:00 PM</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs">Join</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs">Details</Button>
              </div>
            </CardContent>
          </Card>

          {/* Fitness Meetup */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Morning Run Club</h3>
                  <p className="text-xs text-muted-foreground mb-2">Weekly running group for all levels</p>
                </div>
                <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                  Weekly
                </div>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>18 going • Unlimited</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>📍 Riverside Park</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>⏰ Every Fri 6:30 AM</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs">Join</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs">Details</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Meetup Popup */}
      <CreateMeetupPopup 
        isOpen={createMeetupOpen} 
        onClose={() => setCreateMeetupOpen(false)}
      />
    </AppLayout>
  );
}, SCREEN_IDS.COMMUNITY_MEETUPS);
