import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Clock, DollarSign, Calendar } from "lucide-react";
import { ServiceOffering } from "@/types/profile";
import { t } from '@/lib/i18n-toast';

export function ServicesForm() {
  const [hostSessions, setHostSessions] = useState(false);
  const [offerings, setOfferings] = useState<ServiceOffering[]>([]);

  const addOffering = () => {
    const newOffering: ServiceOffering = {
      id: Date.now().toString(),
      title: "",
      durationMin: 60,
      priceCents: 0,
      currency: "USD",
      nextTimes: [],
      status: "draft"
    };
    setOfferings([...offerings, newOffering]);
  };

  const updateOffering = (id: string, field: keyof ServiceOffering, value: any) => {
    setOfferings(offerings.map(offering => 
      offering.id === id ? { ...offering, [field]: value } : offering
    ));
  };

  const removeOffering = (id: string) => {
    setOfferings(offerings.filter(offering => offering.id !== id));
  };

  const toggleOfferingStatus = (id: string) => {
    setOfferings(offerings.map(offering => 
      offering.id === id 
        ? { ...offering, status: offering.status === "draft" ? "published" : "draft" }
        : offering
    ));
  };

  const formatPrice = (priceCents: number | undefined, currency: string = "USD") => {
    if (!priceCents || priceCents === 0) return "Free";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(priceCents / 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">{t('screens.profile.servicesPricing')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('screens.profile.offerSessionsServicesCommunityAvailableAll')}
        </p>
      </div>

      {/* Host Sessions Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="host-sessions" className="text-base font-medium">
              {t('screens.profile.hostSessions')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('screens.profile.enableThisStartOfferingServicesOther')}
            </p>
          </div>
          <Switch
            id="host-sessions"
            checked={hostSessions}
            onCheckedChange={setHostSessions}
          />
        </div>
      </Card>

      {hostSessions && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">{t('screens.profile.yourOfferings')}</Label>
            <Button variant="outline" size="sm" onClick={addOffering}>
              <Plus className="w-4 h-4 mr-2" />
              {t('screens.profile.addOffering')}
            </Button>
          </div>

          {offerings.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">{t('screens.profile.noOfferingsYet')}</p>
              <Button onClick={addOffering}>{t('screens.profile.createYourFirstOffering')}</Button>
            </Card>
          )}

          {offerings.map((offering) => (
            <Card key={offering.id} className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={offering.status === "published" ? "default" : "secondary"}>
                      {offering.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleOfferingStatus(offering.id)}
                    >
                      {offering.status === "draft" ? "Publish" : "Unpublish"}
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeOffering(offering.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('screens.profile.title')}</Label>
                    <Input
                      placeholder={t('screens.profile.eGWellnessConsultation')}
                      value={offering.title}
                      onChange={(e) => updateOffering(offering.id, "title", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('screens.profile.duration')}</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Select 
                        value={offering.durationMin.toString()} 
                        onValueChange={(value) => updateOffering(offering.id, "durationMin", parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">{t('screens.profile.text30Minutes')}</SelectItem>
                          <SelectItem value="45">{t('screens.profile.text45Minutes')}</SelectItem>
                          <SelectItem value="60">{t('screens.profile.text1Hour')}</SelectItem>
                          <SelectItem value="90">{t('screens.profile.text15Hours')}</SelectItem>
                          <SelectItem value="120">{t('screens.profile.text2Hours')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('screens.profile.price')}</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        value={offering.priceCents ? (offering.priceCents / 100).toString() : "0"}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          updateOffering(offering.id, "priceCents", Math.round(value * 100));
                        }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {formatPrice(offering.priceCents, offering.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('screens.profile.currency')}</Label>
                    <Select 
                      value={offering.currency} 
                      onValueChange={(value) => updateOffering(offering.id, "currency", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">{t('screens.profile.usd')}</SelectItem>
                        <SelectItem value="EUR">{t('screens.profile.eur')}</SelectItem>
                        <SelectItem value="GBP">{t('screens.profile.gbp')}</SelectItem>
                        <SelectItem value="CAD">{t('screens.profile.cad')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('screens.profile.availableTimes')}</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{t('screens.profile.calendarIntegrationComingSoon')}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="pt-4 border-t">
        <Button className="w-full">{t('screens.profile.saveChanges')}</Button>
      </div>
    </div>
  );
}