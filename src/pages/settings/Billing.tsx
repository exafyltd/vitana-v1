import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { settingsNavigation } from "@/config/navigation";
import { CreditCard, Calendar, Download, Star, Check, Trophy, Gift, Target, Award, Coins, Sparkles } from "lucide-react";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Progress } from "@/components/ui/progress";

export default function Billing() {
  return (
    <AppLayout>
      <SEO title="Billing | Settings" description="Manage your subscription and billing information" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
        <StandardHeader 
          title="Manage your investment in wellness!"
          description="Manage your subscription and billing information"
          emoji="💳"
        />
        
        <SplitBar defaultValue="billing" className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="billing">Billing</SplitBarTrigger>
            <SplitBarTrigger value="rewards">Rewards & Achievements</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="billing" className="space-y-6">
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
          </SplitBarContent>

          <SplitBarContent value="rewards" className="space-y-6">
            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Points Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">2,450</div>
                    <div className="text-sm text-muted-foreground">Total Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">$24.50</div>
                    <div className="text-sm text-muted-foreground">Credit Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">850</div>
                    <div className="text-sm text-muted-foreground">This Month</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">550</div>
                    <div className="text-sm text-muted-foreground">To Next Credit</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress to next $5 credit</span>
                    <span>2,450 / 3,000 points</span>
                  </div>
                  <Progress value={81.6} className="h-2" />
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1">
                    <Coins className="w-4 h-4 mr-2" />
                    Redeem Points
                  </Button>
                  <Button variant="outline">View Rules</Button>
                </div>
              </CardContent>
            </Card>

            {/* Earn Points */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  Earn Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <span>💧</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Daily Water Goal</h4>
                        <p className="text-sm text-muted-foreground">Log 8 glasses of water</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>+50 pts</Badge>
                      <Button size="sm">Do Now</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span>👥</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Community Engagement</h4>
                        <p className="text-sm text-muted-foreground">Share in group chat</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>+25 pts</Badge>
                      <Button size="sm">Do Now</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span>📊</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Weekly Check-in</h4>
                        <p className="text-sm text-muted-foreground">Complete health assessment</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>+100 pts</Badge>
                      <Button size="sm">Do Now</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Redeem */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-green-500" />
                  Redeem Points
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">$5 Subscription Credit</h4>
                    <Badge variant="outline">500 points</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Apply $5 credit to your next billing cycle. Maximum 2 credits per month.
                  </p>
                  <Button>Redeem Now</Button>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">$10 Subscription Credit</h4>
                    <Badge variant="outline">1,000 points</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Apply $10 credit to your next billing cycle. Maximum 1 credit per month.
                  </p>
                  <Button>Redeem Now</Button>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-500" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 border rounded-lg bg-yellow-50">
                    <div className="text-2xl mb-2">🏆</div>
                    <div className="font-medium text-sm">Early Adopter</div>
                    <div className="text-xs text-muted-foreground">Joined in 2024</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg bg-blue-50">
                    <div className="text-2xl mb-2">💪</div>
                    <div className="font-medium text-sm">Consistency King</div>
                    <div className="text-xs text-muted-foreground">7-day streak</div>
                  </div>

                  <div className="text-center p-4 border rounded-lg bg-green-50">
                    <div className="text-2xl mb-2">👥</div>
                    <div className="font-medium text-sm">Community Leader</div>
                    <div className="text-xs text-muted-foreground">100+ interactions</div>
                  </div>

                  <div className="text-center p-4 border rounded-lg border-dashed opacity-50">
                    <div className="text-2xl mb-2">🔒</div>
                    <div className="font-medium text-sm">Points Master</div>
                    <div className="text-xs text-muted-foreground">Earn 5,000 pts</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Upcoming Milestones</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">Points Collector</div>
                        <div className="text-xs text-muted-foreground">Earn 3,000 total points</div>
                        <Progress value={81.6} className="h-1 mt-1" />
                      </div>
                      <div className="text-sm text-muted-foreground">2,450/3,000</div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Target className="w-5 h-5 text-blue-500" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">Weekly Warrior</div>
                        <div className="text-xs text-muted-foreground">Complete 4 weekly goals</div>
                        <Progress value={50} className="h-1 mt-1" />
                      </div>
                      <div className="text-sm text-muted-foreground">2/4</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SplitBarContent>
        </SplitBar>
        </div>
      </div>
    </AppLayout>
  );
}