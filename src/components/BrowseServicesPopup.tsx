import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Star, Shield, Users, Heart, Brain, Activity, Zap, Filter } from "lucide-react";
import { useState } from "react";
import { t } from '@/lib/i18n-toast';

interface BrowseServicesPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const featuredServices = [
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
];

const categories = [
  { name: "Healthcare Platforms", count: 24, icon: Heart },
  { name: "Research Studies", count: 18, icon: Brain },
  { name: "Fitness & Wellness", count: 32, icon: Activity },
  { name: "Wearable Devices", count: 15, icon: Zap }
];

export function BrowseServicesPopup({ isOpen, onClose }: BrowseServicesPopupProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Browse Integration Services
          </DialogTitle>
          <DialogDescription>
            Discover and connect with healthcare platforms, research studies, and wellness apps
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={t('screens.common.searchIntegrations')} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          <Tabs defaultValue="featured" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="featured">Featured</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="all">{t('screens.common.allServices')}</TabsTrigger>
            </TabsList>

            <TabsContent value="featured" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {featuredServices.map((service) => {
                  const IconComponent = service.icon;
                  return (
                    <Card key={service.id} className="h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <IconComponent className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                {service.name}
                                {service.verified && (
                                  <Shield className="h-3 w-3 text-green-600" />
                                )}
                              </CardTitle>
                              <div className="text-xs text-muted-foreground">{service.provider}</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">{service.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <CardDescription className="text-xs">{service.description}</CardDescription>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{service.rating}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span>{service.users}</span>
                          </div>
                          <div className="font-medium text-primary text-xs">{service.price}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">{t('screens.common.dataTypes')}</div>
                          <div className="flex flex-wrap gap-1">
                            {service.dataTypes.slice(0, 2).map((type, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">{type}</Badge>
                            ))}
                            {service.dataTypes.length > 2 && (
                              <Badge variant="secondary" className="text-xs">+{service.dataTypes.length - 2} more</Badge>
                            )}
                          </div>
                        </div>
                        
                        <Button size="sm" className="w-full">{t('screens.common.connectIntegration')}</Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <Card key={category.name} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4 text-center">
                        <IconComponent className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <div className="font-medium text-sm">{category.name}</div>
                        <div className="text-xs text-muted-foreground">{category.count} apps</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <div className="text-center text-muted-foreground">
                <p>{t('screens.common.browseAllAvailableIntegrationsServices')}</p>
                <Button size="sm" className="mt-2">{t('screens.common.viewAllIntegrations')}</Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button size="sm">
              <Shield className="h-4 w-4 mr-2" />
              View My Connections
            </Button>
            <Button variant="outline" size="sm">
              <Star className="h-4 w-4 mr-2" />
              Submit Integration Request
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}