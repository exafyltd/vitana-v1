import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { settingsNavigation } from "@/config/navigation";
import { MessageCircle, Phone, Mail, Book, Users, Send, Search } from "lucide-react";

export default function Support() {
  return (
    <AppLayout>
      <SEO title="Support | Settings" description="Get help and support for your account" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <StandardHeader 
          title="We're here to help you succeed!"
          description="Get help and support for your account"
          emoji="🆘"
        />
        
        {/* Contact Options */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="h-auto p-6 flex flex-col items-center gap-3" variant="outline">
                <MessageCircle className="w-8 h-8 text-primary" />
                <div className="text-center">
                  <h3 className="font-medium">Live Chat</h3>
                  <p className="text-sm text-muted-foreground">Get instant help</p>
                </div>
              </Button>

              <Button className="h-auto p-6 flex flex-col items-center gap-3" variant="outline">
                <Mail className="w-8 h-8 text-primary" />
                <div className="text-center">
                  <h3 className="font-medium">Email Support</h3>
                  <p className="text-sm text-muted-foreground">Response within 24h</p>
                </div>
              </Button>

              <Button className="h-auto p-6 flex flex-col items-center gap-3" variant="outline">
                <Phone className="w-8 h-8 text-primary" />
                <div className="text-center">
                  <h3 className="font-medium">Call Back</h3>
                  <p className="text-sm text-muted-foreground">Schedule a call</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submit Ticket */}
        <Card>
          <CardHeader>
            <CardTitle>Submit a Support Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input placeholder="Briefly describe your issue" />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <select className="w-full p-2 border rounded-md bg-background">
                <option>Select a category</option>
                <option>Account Issues</option>
                <option>Billing & Payments</option>
                <option>Technical Problems</option>
                <option>Feature Requests</option>
                <option>Privacy & Security</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea 
                placeholder="Please provide as much detail as possible..."
                className="min-h-32"
              />
            </div>

            <Button className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Submit Ticket
            </Button>
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5" />
              Knowledge Base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input 
                placeholder="Search help articles..."
                className="pl-10"
              />
            </div>

            <div className="space-y-3">
              <div className="p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <h4 className="font-medium">Getting Started with Vitana</h4>
                <p className="text-sm text-muted-foreground">Learn the basics of setting up your wellness journey</p>
              </div>

              <div className="p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <h4 className="font-medium">Connecting Wearable Devices</h4>
                <p className="text-sm text-muted-foreground">Step-by-step guide to sync your fitness trackers</p>
              </div>

              <div className="p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <h4 className="font-medium">Understanding Your VITANA Index</h4>
                <p className="text-sm text-muted-foreground">How your wellness score is calculated</p>
              </div>

              <div className="p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <h4 className="font-medium">Privacy and Data Security</h4>
                <p className="text-sm text-muted-foreground">Learn how we protect your personal information</p>
              </div>
            </div>

            <Button variant="outline" className="w-full">Browse All Articles</Button>
          </CardContent>
        </Card>

        {/* Community Help */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Community Help
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <h4 className="font-medium">Vitana Community Help Group</h4>
                <p className="text-sm text-muted-foreground">Get help from other users and share your experience</p>
              </div>
              <Button>Join Group</Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Support Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">Unable to sync Fitbit data</h4>
                <p className="text-sm text-muted-foreground">Submitted Dec 10, 2024</p>
              </div>
              <Badge className="bg-green-100 text-green-700">Resolved</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">Feature request: Dark mode</h4>
                <p className="text-sm text-muted-foreground">Submitted Nov 28, 2024</p>
              </div>
              <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>
            </div>

            <div className="text-center py-4">
              <Button variant="outline">View All Tickets</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}