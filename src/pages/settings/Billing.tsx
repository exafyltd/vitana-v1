import React, { useState } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { settingsNavigation } from "@/config/navigation";
import { CreditCard, Calendar, Download, Eye, Star, Check, Trophy, Gift, Target, Award, Coins, Sparkles, Plus } from "lucide-react";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Progress } from "@/components/ui/progress";
import { BillingActionPopup } from "@/components/BillingActionPopup";
import { InvoicePreviewDialog, type InvoiceData } from "@/components/billing/InvoicePreviewDialog";
import { CreatorPaymentsSection } from "@/components/creator/CreatorPaymentsSection";
import { t } from '@/lib/i18n-toast';

export default function Billing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Mock invoice data - will be replaced with real data from API
  const invoiceDataDec: InvoiceData = {
    id: "INV-2024-12-001",
    date: "Dec 15, 2024",
    amount: 19.99,
    description: "Premium Subscription",
    items: [
      { description: "Premium Subscription - Monthly", quantity: 1, price: 19.99 }
    ],
    subtotal: 19.99,
    tax: 0,
    total: 19.99,
    paymentMethod: "Card ending in 4242"
  };

  const invoiceDataNov: InvoiceData = {
    id: "INV-2024-11-001",
    date: "Nov 15, 2024",
    amount: 19.99,
    description: "Premium Subscription",
    items: [
      { description: "Premium Subscription - Monthly", quantity: 1, price: 19.99 }
    ],
    subtotal: 19.99,
    tax: 0,
    total: 19.99,
    paymentMethod: "Card ending in 4242"
  };

  const invoiceDataOct: InvoiceData = {
    id: "INV-2024-10-001",
    date: "Oct 15, 2024",
    amount: 19.99,
    description: "Premium Subscription",
    items: [
      { description: "Premium Subscription - Monthly", quantity: 1, price: 19.99 }
    ],
    subtotal: 19.99,
    tax: 0,
    total: 19.99,
    paymentMethod: "Card ending in 4242"
  };

  const handleViewInvoice = (invoiceData: InvoiceData) => {
    setSelectedInvoice(invoiceData);
    setIsInvoiceDialogOpen(true);
  };

  return (
    <AppLayout>
      <SEO title={t('screens.settings.billingSettings')} description="Manage your subscription and billing information" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.settings.manageYourInvestmentWellness')}
            description="Manage your subscription and billing information"
          />
        <UtilityActionButton>
          <ExpandableSearchButton 
            placeholder={t('screens.settings.searchBilling')} 
            onSearch={handleSearch}
          />
          <UniversalCalendarButton />
          <Button 
            size="sm" 
            onClick={() => setActionPopupOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Billing Actions
          </Button>
        </UtilityActionButton>
        
        <SplitBar defaultValue="billing" className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="billing">{t('screens.settings.billing')}</SplitBarTrigger>
            <SplitBarTrigger value="rewards">{t('screens.settings.rewardsAchievements')}</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="billing" className="space-y-6">
        {/* Creator Payments */}
        <CreatorPaymentsSection />

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
                <h3 className="text-lg font-semibold">{t('screens.settings.vitanaPremium')}</h3>
                <p className="text-sm text-muted-foreground">{t('screens.settings.advancedAiInsightsUnlimitedStoragePriority')}</p>
              </div>
              <Badge className="bg-primary text-primary-foreground">Active</Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('screens.settings.monthlyCost')}</p>
                <p className="font-semibold">$19.99</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('screens.settings.nextBilling')}</p>
                <p className="font-semibold">{t('screens.settings.jan152025')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-semibold">{t('screens.settings.oct152024')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('screens.settings.autorenew')}</p>
                <p className="font-semibold text-green-600">Enabled</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline">{t('screens.settings.changePlan')}</Button>
              <Button variant="outline">{t('screens.settings.cancelSubscription')}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Available Plans */}
        <Card>
          <CardHeader>
            <CardTitle>{t('screens.settings.availablePlans')}</CardTitle>
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
                <Button variant="outline" className="w-full" disabled>{t('screens.settings.currentPlan')}</Button>
              </div>

              <div className="border-2 border-primary rounded-lg p-6 relative">
                <Badge className="absolute -top-3 left-6 bg-primary">{t('screens.settings.mostPopular')}</Badge>
                <h3 className="font-semibold mb-2">Premium</h3>
                <div className="text-2xl font-bold mb-4">{t('screens.settings.text1999mo')}</div>
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
                <Button className="w-full" disabled>{t('screens.settings.currentPlan')}</Button>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Enterprise</h3>
                <div className="text-2xl font-bold mb-4">{t('screens.settings.text4999mo')}</div>
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
                  <p className="text-sm text-muted-foreground">{t('screens.settings.expires1226')}</p>
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
                <p className="font-medium">{t('screens.settings.premiumSubscription')}</p>
                <p className="text-sm text-muted-foreground">{t('screens.settings.dec152024')}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">$19.99</span>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    title={t('screens.settings.viewInvoice')}
                    onClick={() => handleViewInvoice(invoiceDataDec)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title={t('screens.settings.downloadInvoice')}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">{t('screens.settings.premiumSubscription')}</p>
                <p className="text-sm text-muted-foreground">{t('screens.settings.nov152024')}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">$19.99</span>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    title={t('screens.settings.viewInvoice')}
                    onClick={() => handleViewInvoice(invoiceDataNov)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title={t('screens.settings.downloadInvoice')}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{t('screens.settings.premiumSubscription')}</p>
                <p className="text-sm text-muted-foreground">{t('screens.settings.oct152024')}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">$19.99</span>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    title={t('screens.settings.viewInvoice')}
                    onClick={() => handleViewInvoice(invoiceDataOct)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title={t('screens.settings.downloadInvoice')}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
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
                    <div className="text-sm text-muted-foreground">{t('screens.settings.totalPoints')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">$24.50</div>
                    <div className="text-sm text-muted-foreground">{t('screens.settings.creditValue')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">850</div>
                    <div className="text-sm text-muted-foreground">{t('screens.settings.thisMonth')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">550</div>
                    <div className="text-sm text-muted-foreground">{t('screens.settings.nextCredit')}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('screens.settings.progressNext5Credit')}</span>
                    <span>{t('screens.settings.text24503000Points')}</span>
                  </div>
                  <Progress value={81.6} className="h-2" />
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1">
                    <Coins className="w-4 h-4 mr-2" />
                    Redeem Points
                  </Button>
                  <Button variant="outline">{t('screens.settings.viewRules')}</Button>
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
                        <h4 className="font-medium">{t('screens.settings.dailyWaterGoal')}</h4>
                        <p className="text-sm text-muted-foreground">{t('screens.settings.log8GlassesWater')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{t('screens.settings.text50Pts')}</Badge>
                      <Button size="sm">{t('screens.settings.doNow')}</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span>👥</span>
                      </div>
                      <div>
                        <h4 className="font-medium">{t('screens.settings.communityEngagement')}</h4>
                        <p className="text-sm text-muted-foreground">{t('screens.settings.shareGroupChat')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{t('screens.settings.text25Pts')}</Badge>
                      <Button size="sm">{t('screens.settings.doNow')}</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span>📊</span>
                      </div>
                      <div>
                        <h4 className="font-medium">{t('screens.settings.weeklyCheckin')}</h4>
                        <p className="text-sm text-muted-foreground">{t('screens.settings.completeHealthAssessment')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{t('screens.settings.text100Pts')}</Badge>
                      <Button size="sm">{t('screens.settings.doNow')}</Button>
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
                    <h4 className="font-medium">{t('screens.settings.text5SubscriptionCredit')}</h4>
                    <Badge variant="outline">{t('screens.settings.text500Points')}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Apply $5 credit to your next billing cycle. Maximum 2 credits per month.
                  </p>
                  <Button>{t('screens.settings.redeemNow')}</Button>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{t('screens.settings.text10SubscriptionCredit')}</h4>
                    <Badge variant="outline">{t('screens.settings.text1000Points')}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Apply $10 credit to your next billing cycle. Maximum 1 credit per month.
                  </p>
                  <Button>{t('screens.settings.redeemNow')}</Button>
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
                    <div className="font-medium text-sm">{t('screens.settings.earlyAdopter')}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.settings.joined2024')}</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg bg-blue-50">
                    <div className="text-2xl mb-2">💪</div>
                    <div className="font-medium text-sm">{t('screens.settings.consistencyKing')}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.settings.text7dayStreak')}</div>
                  </div>

                  <div className="text-center p-4 border rounded-lg bg-green-50">
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="font-medium text-sm">{t('screens.settings.goalCrusher')}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.settings.text10GoalsCompleted')}</div>
                  </div>

                  <div className="text-center p-4 border rounded-lg bg-purple-50">
                    <div className="text-2xl mb-2">🌟</div>
                    <div className="font-medium text-sm">{t('screens.settings.vitanaChampion')}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.settings.premiumFor3Months')}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">{t('screens.settings.comingUpNext')}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-xl">🔥</div>
                        <div>
                          <h5 className="font-medium text-sm">{t('screens.settings.streakMaster')}</h5>
                          <p className="text-xs text-muted-foreground">{t('screens.settings.maintain30dayStreak')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Progress value={23} className="w-20 h-2" />
                        <div className="text-xs text-muted-foreground">{t('screens.settings.text730Days')}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-xl">💎</div>
                        <div>
                          <h5 className="font-medium text-sm">{t('screens.settings.diamondMember')}</h5>
                          <p className="text-xs text-muted-foreground">{t('screens.settings.premiumFor6Months')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Progress value={50} className="w-20 h-2" />
                        <div className="text-xs text-muted-foreground">{t('screens.settings.text36Months')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SplitBarContent>
        </SplitBar>
      </div>
    </div>
      
      <BillingActionPopup 
        isOpen={actionPopupOpen}
        onClose={() => setActionPopupOpen(false)}
      />

      <InvoicePreviewDialog
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        invoiceData={selectedInvoice}
      />
    </AppLayout>
  );
}