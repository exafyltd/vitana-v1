import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Store, Search, Star, Shield, Users, Zap, Heart, Brain, Activity } from "lucide-react";
import { useState } from "react";

const integrationData = {
  featured: [
    {
      id: 1,
      name: "Epic MyChart Integration",
      provider: "Epic Systems",
      category: "Healthcare Platform",
      description: "Seamlessly sync your health data with Epic MyChart for comprehensive care coordination",
      rating: 4.8,
      users: "2.5M+",
      dataTypes: ["Lab Results", "Medications", "Appointments", "Medical History"],
      features: ["Real-time sync", "Bi-directional data flow", "HIPAA compliant"],
      price: "Free",
      icon: Heart,
      verified: true
    },
    {
      id: 2,
      name: "Fitbit Health Connect",
      provider: "Google",
      category: "Fitness Tracker",
      description: "Connect your Fitbit data for comprehensive activity and health tracking integration",
      rating: 4.6,
      users: "1.8M+",
      dataTypes: ["Activity Data", "Heart Rate", "Sleep Patterns", "Weight"],
      features: ["Automatic sync", "Historical data import", "Real-time updates"],
      price: "Free",
      icon: Activity,
      verified: true
    },
    {
      id: 3,
      name: "Mindfulness Research Platform",
      provider: "Stanford Medicine",
      category: "Research",
      description: "Contribute to cutting-edge mindfulness and mental health research studies",
      rating: 4.9,
      users: "45K+",
      dataTypes: ["Mental Health Assessments", "Sleep Data", "Stress Levels", "Meditation Logs"],
      features: ["IRB approved studies", "Compensation available", "Anonymous participation"],
      price: "Earn $50-200",
      icon: Brain,
      verified: true
    }
  ],
  categories: [
    { name: "Healthcare Platforms", count: 24, icon: Heart },
    { name: "Research Studies", count: 18, icon: Brain },
    { name: "Fitness & Wellness", count: 32, icon: Activity },
    { name: "Wearable Devices", count: 15, icon: Zap },
    { name: "Mental Health", count: 12, icon: Brain },
    { name: "Nutrition", count: 8, icon: Heart }
  ],
  allIntegrations: [
    {
      id: 4,
      name: "Apple Health Connect",
      provider: "Apple Inc.",
      category: "Health Platform",
      rating: 4.7,
      users: "3.2M+",
      price: "Free",
      verified: true
    },
    {
      id: 5,
      name: "Diabetes Care Network",
      provider: "ADA Research Institute",
      category: "Research",
      rating: 4.5,
      users: "28K+",
      price: "Earn $75-150",
      verified: true
    },
    {
      id: 6,
      name: "MyFitnessPal Integration",
      provider: "Under Armour",
      category: "Nutrition",
      rating: 4.4,
      users: "890K+",
      price: "Free",
      verified: false
    },
    {
      id: 7,
      name: "Headspace Research Portal",
      provider: "Headspace Health",
      category: "Mental Health",
      rating: 4.6,
      users: "156K+",
      price: "Free",
      verified: true
    }
  ]
};

function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  return (
    <AppLayout>
      <SEO 
        title="Integration Marketplace - Vitana Sharing" 
        description="Discover and connect with healthcare platforms, research studies, and wellness apps to maximize the value of your health data."
      />
      <SubNavigation items={sharingNavigation} />
      
      <div className="px-6 py-8 space-y-8">
        <StandardHeader 
          title="Integration Marketplace"
          description="Discover verified integrations to share your health data with trusted healthcare platforms and research studies"
        />

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search integrations..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant={selectedCategory === "all" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                >
                  All Categories
                </Button>
                {integrationData.categories.slice(0, 3).map((category) => (
                  <Button 
                    key={category.name}
                    variant={selectedCategory === category.name ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Browse Categories</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {integrationData.categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Card key={category.name} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <IconComponent className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="font-medium text-sm">{category.name}</div>
                    <div className="text-xs text-muted-foreground">{category.count} apps</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Featured Integrations */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold">Featured Integrations</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {integrationData.featured.map((integration) => {
              const IconComponent = integration.icon;
              return (
                <Card key={integration.id} className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {integration.name}
                            {integration.verified && (
                              <Shield className="h-4 w-4 text-green-600" />
                            )}
                          </CardTitle>
                          <div className="text-sm text-muted-foreground">{integration.provider}</div>
                        </div>
                      </div>
                      <Badge variant="outline">{integration.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription>{integration.description}</CardDescription>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{integration.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{integration.users}</span>
                      </div>
                      <div className="font-medium text-primary">{integration.price}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Data Types</div>
                      <div className="flex flex-wrap gap-1">
                        {integration.dataTypes.map((type, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">{type}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Key Features</div>
                      <ul className="text-sm space-y-1">
                        {integration.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Button className="w-full">Connect Integration</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* All Integrations */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold">All Integrations</h2>
          </div>
          
          <div className="space-y-4">
            {integrationData.allIntegrations.map((integration) => (
              <Card key={integration.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {integration.name}
                          {integration.verified && (
                            <Shield className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{integration.provider}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <Badge variant="outline">{integration.category}</Badge>
                      
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{integration.rating}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{integration.users}</span>
                      </div>
                      
                      <div className="text-sm font-medium text-primary min-w-[80px]">
                        {integration.price}
                      </div>
                      
                      <Button size="sm">Connect</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Button variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            View My Connections
          </Button>
          <Button variant="outline">
            <Star className="h-4 w-4 mr-2" />
            Submit Integration Request
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Marketplace, SCREEN_IDS.SHARING_MARKETPLACE);