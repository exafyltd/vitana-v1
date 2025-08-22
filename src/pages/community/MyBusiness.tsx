import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, Users, Calendar, TrendingUp, BarChart3 } from "lucide-react";
import { useState } from "react";
import CreateBusinessEventPopup from "@/components/CreateBusinessEventPopup";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "my-groups", name: "My Groups & Feed", path: "/community/my-groups" },
  { id: "events", name: "Events & Meetups", path: "/community/events" },
  { id: "my-business", name: "My Business", path: "/community/my-business" },
  { id: "media-hub", name: "Media Hub", path: "/community/media-hub" },
  { id: "live-interaction", name: "LIVE Hub", path: "/community/live-interaction" },
  { id: "ai-insights", name: "AI Insights", path: "/community/ai-insights" },
];

export default function MyBusiness() {
  const [showCreatePopup, setShowCreatePopup] = useState(false);

  return (
    <AppLayout>
      <SEO title="My Business | Community" description="Manage your wellness services and events" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Your wellness business hub! 💼"
            description="Create and manage your services, events, and client interactions."
            icon={BarChart3}
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">$2,450</p>
                    <p className="text-sm text-muted-foreground">This Month</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">147</p>
                    <p className="text-sm text-muted-foreground">Active Clients</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">23</p>
                    <p className="text-sm text-muted-foreground">Upcoming Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">4.9</p>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create New Button */}
          <div className="mb-6">
            <Button onClick={() => setShowCreatePopup(true)} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Create New Service/Event
            </Button>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active">Active Services</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Morning Yoga Flow</CardTitle>
                        <p className="text-sm text-muted-foreground">Recurring • Mon, Wed, Fri at 7:00 AM</p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <span className="text-sm">👥 12/15 spots</span>
                        <span className="text-sm">💰 $25/session</span>
                        <span className="text-sm">⭐ 4.8 rating</span>
                      </div>
                      <Button variant="outline" size="sm">Manage</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Nutrition Consultation</CardTitle>
                        <p className="text-sm text-muted-foreground">One-on-one • 60 minutes</p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <span className="text-sm">📅 Available slots</span>
                        <span className="text-sm">💰 $80/session</span>
                        <span className="text-sm">⭐ 5.0 rating</span>
                      </div>
                      <Button variant="outline" size="sm">Manage</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Weekend Wellness Workshop</CardTitle>
                    <p className="text-sm text-muted-foreground">Saturday, Dec 16 • 10:00 AM - 4:00 PM</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <span className="text-sm">👥 8/20 registered</span>
                        <span className="text-sm">💰 $150/person</span>
                        <Badge variant="secondary">In 5 days</Badge>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Revenue analytics will be displayed here</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Popular Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Service popularity metrics</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="clients" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Client Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Client list and communication tools</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showCreatePopup && (
        <CreateBusinessEventPopup 
          isOpen={showCreatePopup}
          onClose={() => setShowCreatePopup(false)}
        />
      )}
    </AppLayout>
  );
}