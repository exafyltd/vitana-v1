import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plug, Search, Star, Shield, Zap, Activity, Calendar, Users } from "lucide-react";

interface ConnectAppPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectAppPopup({ isOpen, onClose }: ConnectAppPopupProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", name: "All Apps", icon: Plug },
    { id: "health", name: "Health & Fitness", icon: Activity },
    { id: "calendar", name: "Calendar", icon: Calendar },
    { id: "social", name: "Social", icon: Users },
    { id: "productivity", name: "Productivity", icon: Zap },
  ];

  const apps = [
    {
      id: "apple-health",
      name: "Apple Health",
      description: "Sync your health and fitness data automatically",
      category: "health",
      icon: "🍎",
      rating: 4.8,
      connected: false,
      verified: true,
    },
    {
      id: "google-fit",
      name: "Google Fit",
      description: "Track workouts, nutrition, and wellness metrics",
      category: "health",
      icon: "🏃‍♂️",
      rating: 4.6,
      connected: false,
      verified: true,
    },
    {
      id: "google-calendar",
      name: "Google Calendar",
      description: "Sync appointments and health reminders",
      category: "calendar",
      icon: "📅",
      rating: 4.9,
      connected: true,
      verified: true,
    },
    {
      id: "strava",
      name: "Strava",
      description: "Import running, cycling, and activity data",
      category: "health",
      icon: "🏃",
      rating: 4.7,
      connected: false,
      verified: true,
    },
    {
      id: "myfitnesspal",
      name: "MyFitnessPal",
      description: "Track nutrition and calorie intake",
      category: "health",
      icon: "🥗",
      rating: 4.5,
      connected: false,
      verified: false,
    },
  ];

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleConnect = (appId: string) => {
    // Connect app logic
    console.log('Connecting app:', appId);
  };

  const handleDisconnect = (appId: string) => {
    // Disconnect app logic
    console.log('Disconnecting app:', appId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="w-5 h-5 text-blue-500" />
            Connect Apps & Services
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Search and Categories */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search apps and services..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="whitespace-nowrap"
                >
                  <category.icon className="w-4 h-4 mr-2" />
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Popular Apps */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Available Apps</h3>
            <div className="grid gap-4">
              {filteredApps.map((app) => (
                <Card key={app.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                        {app.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{app.name}</h4>
                          {app.verified && (
                            <Badge className="bg-blue-500 text-white">
                              <Shield className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {app.connected && (
                            <Badge className="bg-green-500 text-white">Connected</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{app.description}</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{app.rating}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {app.connected ? (
                          <>
                            <Button variant="outline" size="sm">
                              Settings
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDisconnect(app.id)}
                            >
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" onClick={() => handleConnect(app.id)}>
                            <Plug className="w-4 h-4 mr-2" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {filteredApps.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No apps found matching your search.</p>
            </div>
          )}

          <div className="flex gap-3 pt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Done
            </Button>
            <Button className="flex-1">
              <Plug className="w-4 h-4 mr-2" />
              Manage All Connections
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}