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
        <h3 className="text-lg font-medium mb-4">Services & Pricing</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Offer sessions and services to the community. Available to all roles.
        </p>
      </div>

      {/* Host Sessions Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="host-sessions" className="text-base font-medium">
              Host Sessions
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable this to start offering services to other users
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
            <Label className="text-base font-medium">Your Offerings</Label>
            <Button variant="outline" size="sm" onClick={addOffering}>
              <Plus className="w-4 h-4 mr-2" />
              Add Offering
            </Button>
          </div>

          {offerings.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No offerings yet</p>
              <Button onClick={addOffering}>Create Your First Offering</Button>
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
                    <Label>Title</Label>
                    <Input
                      placeholder="e.g., Wellness Consultation"
                      value={offering.title}
                      onChange={(e) => updateOffering(offering.id, "title", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Duration</Label>
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
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Price</Label>
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
                    <Label>Currency</Label>
                    <Select 
                      value={offering.currency} 
                      onValueChange={(value) => updateOffering(offering.id, "currency", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Available Times</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Calendar integration coming soon</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="pt-4 border-t">
        <Button className="w-full">Save Changes</Button>
      </div>
    </div>
  );
}