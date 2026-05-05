import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Download, Star, Calendar, Users, Zap } from "lucide-react";
import { isIAPRestricted } from "@/lib/appilix";
import { t } from '@/lib/i18n-toast';

interface BillingActionPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BillingActionPopup({ isOpen, onClose }: BillingActionPopupProps) {
  const [activeTab, setActiveTab] = useState("payment");

  const handleAddPayment = () => {
    // Add payment method logic
    console.log('Adding payment method');
    onClose();
  };

  const handleUpgradePlan = () => {
    // Upgrade plan logic  
    console.log('Upgrading plan');
    onClose();
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    // Download invoice logic
    console.log('Downloading invoice:', invoiceId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-500" />
            Billing Actions
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className={`grid grid-cols-2 ${isIAPRestricted() ? '' : 'md:grid-cols-4'} gap-4`}>
            {!isIAPRestricted() && (
              <Button
                variant="outline"
                className="h-auto p-4 flex-col gap-2"
                onClick={() => setActiveTab("payment")}
              >
                <CreditCard className="w-6 h-6" />
                <span className="text-sm">{t('screens.common.addPayment')}</span>
              </Button>
            )}

            {!isIAPRestricted() && (
              <Button
                variant="outline"
                className="h-auto p-4 flex-col gap-2"
                onClick={() => setActiveTab("upgrade")}
              >
                <Star className="w-6 h-6" />
                <span className="text-sm">{t('screens.common.upgradePlan')}</span>
              </Button>
            )}

            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() => setActiveTab("invoices")}
            >
              <Download className="w-6 h-6" />
              <span className="text-sm">Invoices</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() => setActiveTab("usage")}
            >
              <Calendar className="w-6 h-6" />
              <span className="text-sm">{t('screens.common.usageStats')}</span>
            </Button>
          </div>

          <Separator />

          {/* Add Payment Method */}
          {!isIAPRestricted() && activeTab === "payment" && (
            <Card>
              <CardHeader>
                <CardTitle>{t('screens.common.addPaymentMethod')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cardNumber">{t('screens.common.cardNumber')}</Label>
                    <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                  </div>
                  <div>
                    <Label htmlFor="expiryDate">{t('screens.common.expiryDate')}</Label>
                    <Input id="expiryDate" placeholder={t('screens.common.mmyy')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input id="cvv" placeholder="123" />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">{t('screens.common.zipCode')}</Label>
                    <Input id="zipCode" placeholder="12345" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cardName">{t('screens.common.nameCard')}</Label>
                  <Input id="cardName" placeholder={t('screens.common.johnDoe')} />
                </div>
                <Button onClick={handleAddPayment} className="w-full">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add Payment Method
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Upgrade Plan */}
          {!isIAPRestricted() && activeTab === "upgrade" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('screens.common.availableUpgrades')}</h3>
              <div className="grid gap-4">
                <Card className="border-2 border-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{t('screens.common.premiumPlan')}</h4>
                          <Badge className="bg-primary">{t('screens.common.mostPopular')}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Advanced AI insights, unlimited storage, priority support
                        </p>
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold">{t('screens.common.text1999mo')}</span>
                          <span className="text-sm text-muted-foreground line-through">{t('screens.common.text2999mo')}</span>
                        </div>
                      </div>
                      <Button onClick={handleUpgradePlan}>
                        <Star className="w-4 h-4 mr-2" />
                        Upgrade Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold mb-2">{t('screens.common.enterprisePlan')}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Custom AI models, team management, advanced analytics
                        </p>
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold">{t('screens.common.text4999mo')}</span>
                        </div>
                      </div>
                      <Button variant="outline">
                        <Users className="w-4 h-4 mr-2" />
                        Contact Sales
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Invoices */}
          {activeTab === "invoices" && (
            <Card>
              <CardHeader>
                <CardTitle>{t('screens.common.recentInvoices')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: "inv_001", date: "Dec 15, 2024", amount: "$19.99", status: "paid" },
                  { id: "inv_002", date: "Nov 15, 2024", amount: "$19.99", status: "paid" },
                  { id: "inv_003", date: "Oct 15, 2024", amount: "$19.99", status: "paid" },
                ].map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">{t('screens.common.premiumSubscription')}</p>
                      <p className="text-sm text-muted-foreground">{invoice.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-500 text-white">{invoice.status}</Badge>
                      <span className="font-medium">{invoice.amount}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownloadInvoice(invoice.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Usage Stats */}
          {activeTab === "usage" && (
            <Card>
              <CardHeader>
                <CardTitle>{t('screens.common.currentMonthUsage')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">1,247</div>
                    <div className="text-sm text-muted-foreground">{t('screens.common.aiInsights')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{t('screens.common.text152Gb')}</div>
                    <div className="text-sm text-muted-foreground">{t('screens.common.storageUsed')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">42</div>
                    <div className="text-sm text-muted-foreground">{t('screens.common.supportTickets')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">7</div>
                    <div className="text-sm text-muted-foreground">Integrations</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 pt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button className="flex-1">
              <Zap className="w-4 h-4 mr-2" />
              Quick Actions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}