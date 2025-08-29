import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { walletNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Calendar, CreditCard, Package, Settings, CheckCircle, Clock } from "lucide-react";

const subscriptionData = {
  active: [
    {
      id: 1,
      name: "Vitana Premium",
      description: "Complete health coaching and analytics platform",
      price: 299,
      billing: "monthly",
      nextBilling: "2024-02-15",
      features: ["Personal Health Coach", "Advanced Analytics", "Lab Test Discounts", "Priority Support"]
    },
    {
      id: 2,
      name: "Community Plus",
      description: "Enhanced community features and exclusive content",
      price: 49,
      billing: "monthly",
      nextBilling: "2024-02-12",
      features: ["All Group Access", "Live Room Hosting", "Premium Content", "Expert Q&A Sessions"]
    }
  ],
  paused: [
    {
      id: 3,
      name: "Wellness Tracker Pro",
      description: "Advanced health tracking and insights",
      price: 19,
      billing: "monthly",
      pausedDate: "2024-01-01",
      resumeDate: "2024-03-01"
    }
  ],
  available: [
    {
      id: 4,
      name: "AI Health Assistant",
      description: "24/7 AI-powered health guidance and recommendations",
      price: 99,
      billing: "monthly",
      features: ["24/7 AI Support", "Personalized Recommendations", "Health Risk Assessment", "Medication Reminders"]
    },
    {
      id: 5,
      name: "Family Plan",
      description: "Extend your health journey to family members",
      price: 399,
      billing: "monthly",
      features: ["Up to 4 Family Members", "Shared Health Goals", "Family Health Dashboard", "Group Coaching Sessions"]
    }
  ]
};

function Subscriptions() {
  return (
    <AppLayout>
      <SEO 
        title="Subscriptions - Vitana Wallet" 
        description="Manage your Vitana subscriptions, view active plans, and explore new subscription options."
      />
      <SubNavigation items={walletNavigation} />
      
      <div className="px-6 py-8 space-y-8">
        <StandardHeader 
          title="Subscriptions"
          description="Manage your active subscriptions and explore new plans"
        />

        {/* Active Subscriptions */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">Active Subscriptions</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {subscriptionData.active.map((subscription) => (
              <Card key={subscription.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{subscription.name}</CardTitle>
                      <CardDescription>{subscription.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">${subscription.price}</span>
                    <span className="text-muted-foreground">/{subscription.billing}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Next billing: {subscription.nextBilling}
                  </div>
                  
                  <ul className="space-y-1 text-sm">
                    {subscription.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                    <Button variant="outline" size="sm">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Billing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Paused Subscriptions */}
        {subscriptionData.paused.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-semibold">Paused Subscriptions</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {subscriptionData.paused.map((subscription) => (
                <Card key={subscription.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{subscription.name}</CardTitle>
                        <CardDescription>{subscription.description}</CardDescription>
                      </div>
                      <Badge variant="outline">Paused</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">${subscription.price}</span>
                      <span className="text-muted-foreground">/{subscription.billing}</span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Paused since: {subscription.pausedDate}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Resume date: {subscription.resumeDate}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button size="sm">Resume Now</Button>
                      <Button variant="outline" size="sm">Modify</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Subscriptions */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Available Subscriptions</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {subscriptionData.available.map((subscription) => (
              <Card key={subscription.id}>
                <CardHeader>
                  <CardTitle>{subscription.name}</CardTitle>
                  <CardDescription>{subscription.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">${subscription.price}</span>
                    <span className="text-muted-foreground">/{subscription.billing}</span>
                  </div>
                  
                  <ul className="space-y-1 text-sm">
                    {subscription.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="flex gap-2 pt-2">
                    <Button>Subscribe</Button>
                    <Button variant="outline">Learn More</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Subscriptions, SCREEN_IDS.WALLET_SUBSCRIPTIONS);