import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, Phone, Mail, Book, Users, Send, Search, HelpCircle, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { settingsNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";
import { NewTicketPopup } from "@/components/NewTicketPopup";

function Support() {
  const [activeTab, setActiveTab] = useState("contact");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Support | Settings" description="Get help and support for your account" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title="Support Center 🆘"
            description="We're here to help you succeed - get help and support for your account"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search help articles, support topics, FAQs..." />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="contact">Contact Support</SplitBarTrigger>
              <SplitBarTrigger value="knowledge">Knowledge Base</SplitBarTrigger>
              <SplitBarTrigger value="community">Community Help</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="contact">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Contact Support Options"
                    subtitle="Get Help When You Need It"
                    icon={MessageCircle}
                    content={
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Button className="h-auto p-4 flex flex-col items-center gap-2" variant="outline">
                          <MessageCircle className="w-6 h-6 text-primary" />
                          <div className="text-center">
                            <div className="font-medium text-xs">Live Chat</div>
                            <div className="text-xs text-muted-foreground">Instant help</div>
                          </div>
                        </Button>
                        <Button className="h-auto p-4 flex flex-col items-center gap-2" variant="outline">
                          <Mail className="w-6 h-6 text-primary" />
                          <div className="text-center">
                            <div className="font-medium text-xs">Email Support</div>
                            <div className="text-xs text-muted-foreground">24h response</div>
                          </div>
                        </Button>
                        <Button className="h-auto p-4 flex flex-col items-center gap-2" variant="outline">
                          <Phone className="w-6 h-6 text-primary" />
                          <div className="text-center">
                            <div className="font-medium text-xs">Call Back</div>
                            <div className="text-xs text-muted-foreground">Schedule call</div>
                          </div>
                        </Button>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Response Time"
                    subtitle="Average Support"
                    icon={MessageCircle}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">2hr</div>
                        <div className="text-xs text-muted-foreground">Avg. first response</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Open Tickets"
                    subtitle="Your Support"
                    icon={HelpCircle}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">1</div>
                        <div className="text-xs text-muted-foreground">Active ticket</div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="encouragement" />
                </div>

                {/* Row 3: Single Full Row (12) */}
                <div className="col-span-12">
                  <StandardCard
                    title="Submit a Support Ticket"
                    subtitle="Describe Your Issue"
                    icon={Send}
                    content={
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Description</label>
                          <Textarea 
                            placeholder="Please provide as much detail as possible..."
                            className="min-h-24"
                          />
                        </div>
                        <Button className="w-full">
                          <Send className="w-4 h-4 mr-2" />
                          Submit Ticket
                        </Button>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="knowledge">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Help Articles"
                    subtitle="Available"
                    icon={Book}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">47</div>
                        <div className="text-xs text-muted-foreground">Articles available</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Most Popular"
                    subtitle="Help Topic"
                    icon={Book}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">Setup</div>
                        <div className="text-xs text-muted-foreground">Getting started</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Search Knowledge Base"
                    subtitle="Find Quick Answers"
                    icon={Search}
                    content={
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                          <Input 
                            placeholder="Search help articles..."
                            className="pl-10"
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Popular searches: "getting started", "sync issues", "privacy settings"
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="guidance" />
                </div>

                {/* Row 3: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Popular Help Articles"
                    subtitle="Most Viewed Guides"
                    icon={Book}
                    content={
                      <div className="space-y-3">
                        <div className="p-3 border rounded-lg hover:bg-muted cursor-pointer">
                          <h4 className="font-medium text-sm">Getting Started with Vitana</h4>
                          <p className="text-xs text-muted-foreground">Learn the basics of setting up your wellness journey</p>
                        </div>
                        <div className="p-3 border rounded-lg hover:bg-muted cursor-pointer">
                          <h4 className="font-medium text-sm">Connecting Wearable Devices</h4>
                          <p className="text-xs text-muted-foreground">Step-by-step guide to sync your fitness trackers</p>
                        </div>
                        <div className="p-3 border rounded-lg hover:bg-muted cursor-pointer">
                          <h4 className="font-medium text-sm">Understanding Your VITANA Index</h4>
                          <p className="text-xs text-muted-foreground">How your wellness score is calculated</p>
                        </div>
                        <div className="p-3 border rounded-lg hover:bg-muted cursor-pointer">
                          <h4 className="font-medium text-sm">Privacy and Data Security</h4>
                          <p className="text-xs text-muted-foreground">Learn how we protect your personal information</p>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Categories"
                    subtitle="Help Topics"
                    icon={SettingsIcon}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-purple-600">8</div>
                        <div className="text-xs text-muted-foreground">Help categories</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Newest Articles"
                    subtitle="Recently Added"
                    icon={Book}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">3</div>
                        <div className="text-xs text-muted-foreground">This week</div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="community">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Single Full Row (12) */}
                <div className="col-span-12">
                  <StandardCard
                    title="Community Help & Support"
                    subtitle="Get Help From Other Users"
                    icon={Users}
                    content={
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <div>
                              <h4 className="font-medium">Vitana Community Help Group</h4>
                              <p className="text-sm text-muted-foreground">Get help from other users and share your experience</p>
                            </div>
                            <Button size="sm">Join Group</Button>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <div>
                              <h4 className="font-medium">Expert User Forum</h4>
                              <p className="text-sm text-muted-foreground">Advanced tips and tricks from power users</p>
                            </div>
                            <Button size="sm" variant="outline">Browse</Button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="font-medium text-sm">Community Stats</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Active Members</span>
                              <span className="font-medium">2,847</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Questions Answered</span>
                              <span className="font-medium">1,234</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Average Response Time</span>
                              <span className="font-medium">23 min</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Expert Contributors</span>
                              <span className="font-medium">47</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="partnership" />
                </div>

                {/* Row 3: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Community Size"
                    subtitle="Active Members"
                    icon={Users}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">2.8K</div>
                        <div className="text-xs text-muted-foreground">Helpful members</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Response Rate"
                    subtitle="Questions Answered"
                    icon={MessageCircle}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">94%</div>
                        <div className="text-xs text-muted-foreground">Success rate</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Recent Support Tickets"
                    subtitle="Your Support History"
                    icon={HelpCircle}
                    content={
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium text-sm">Unable to sync Fitbit data</h4>
                            <p className="text-xs text-muted-foreground">Submitted Dec 10, 2024</p>
                          </div>
                          <Badge className="bg-green-100 text-green-700 text-xs">Resolved</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium text-sm">Feature request: Dark mode</h4>
                            <p className="text-xs text-muted-foreground">Submitted Nov 28, 2024</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 text-xs">In Progress</Badge>
                        </div>
                        <div className="text-center py-2">
                          <Button variant="outline" size="sm">View All Tickets</Button>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      <NewTicketPopup isOpen={actionPopupOpen} onClose={() => setActionPopupOpen(false)} />
    </AppLayout>
  );
}

export default withScreenId(Support, SCREEN_IDS.SETTINGS_OVERVIEW);