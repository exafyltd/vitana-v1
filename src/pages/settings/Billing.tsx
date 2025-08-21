import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, Download, Star, Check } from "lucide-react";

const settingsSubItems = [
  { id: "overview", name: "Overview", path: "/settings" },
  { id: "privacy", name: "Privacy", path: "/settings/privacy" },
  { id: "notifications", name: "Notifications", path: "/settings/notifications" },
  { id: "preferences", name: "Preferences", path: "/settings/preferences" },
  { id: "connected-apps", name: "Connected Apps", path: "/settings/connected-apps" },
  { id: "billing", name: "Billing", path: "/settings/billing" },
  { id: "support", name: "Support", path: "/settings/support" },
];

export default function Billing() {
  return (
    <AppLayout>
      <SEO title="Billing | Settings" description="Manage your subscription and billing information" canonical={window.location.href} />
      <SubNavigation items={settingsSubItems} />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <PageHeader 
          title="Manage your investment in wellness! 💳"
          description="Manage your subscription and billing information"
          icon={CreditCard}
        />
        
        {/* Current Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Vitana Premium</h3>
                <p className="text-sm text-muted-foreground">Advanced AI insights, unlimited storage, priority support</p>
              </div>
              <Badge className="bg-primary text-primary-foreground">Active</Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Cost</p>
                <p className="font-semibold">$19.99</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Billing</p>
                <p className="font-semibold">Jan 15, 2025</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-semibold">Oct 15, 2024</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Auto-Renew</p>
                <p className="font-semibold text-green-600">Enabled</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline">Change Plan</Button>
              <Button variant="outline">Cancel Subscription</Button>
            </div>
          </CardContent>
        </Card>

        {/* Available Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Basic</h3>
                <div className="text-2xl font-bold mb-4">Free</div>
                <ul className="space-y-2 text-sm mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Basic health tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Community access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Limited AI insights
                  </li>
                </ul>
                <Button variant="outline" className="w-full" disabled>Current Plan</Button>
              </div>

              <div className="border-2 border-primary rounded-lg p-6 relative">
                <Badge className="absolute -top-3 left-6 bg-primary">Most Popular</Badge>
                <h3 className="font-semibold mb-2">Premium</h3>
                <div className="text-2xl font-bold mb-4">$19.99/mo</div>
                <ul className="space-y-2 text-sm mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Advanced AI insights
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Unlimited storage
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    All integrations
                  </li>
                </ul>
                <Button className="w-full" disabled>Current Plan</Button>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Enterprise</h3>
                <div className="text-2xl font-bold mb-4">$49.99/mo</div>
                <ul className="space-y-2 text-sm mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Custom AI models
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Team management
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Advanced analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    24/7 phone support
                  </li>
                </ul>
                <Button variant="outline" className="w-full">Upgrade</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">•••• •••• •••• 4242</h4>
                  <p className="text-sm text-muted-foreground">Expires 12/26</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Primary</Badge>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              <CreditCard className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Billing History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Premium Subscription</p>
                <p className="text-sm text-muted-foreground">Dec 15, 2024</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">$19.99</span>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Premium Subscription</p>
                <p className="text-sm text-muted-foreground">Nov 15, 2024</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">$19.99</span>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">Premium Subscription</p>
                <p className="text-sm text-muted-foreground">Oct 15, 2024</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">$19.99</span>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}