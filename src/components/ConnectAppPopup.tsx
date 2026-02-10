import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plug, Search, Shield, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/useTranslation";
import {
  socialIntegrations,
  fitnessIntegrations,
  healthIntegrations,
  otherIntegrations,
  getAllIntegrations,
  type Integration,
} from "@/components/settings/integrationData";

interface ConnectAppPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (integration: Integration) => void;
}

export function ConnectAppPopup({ isOpen, onClose, onConnect }: ConnectAppPopupProps) {
  const { translate } = useTranslation();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", name: translate('connectedApps.popup.categories.all') },
    { id: "fitness", name: translate('connectedApps.sections.fitness') },
    { id: "social", name: translate('connectedApps.popup.categories.social') },
    { id: "health", name: translate('connectedApps.sections.health') },
  ];

  // Get all integrations from centralized data
  const allIntegrations = getAllIntegrations();

  const filteredApps = allIntegrations.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.syncData.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleConnect = (integration: Integration) => {
    if (onConnect) {
      onConnect(integration);
    }
    onClose();
  };

  const PopupContent = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={translate('connectedApps.popup.searchPlaceholder')}
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className="whitespace-nowrap rounded-full h-8 text-xs"
          >
            {category.name}
          </Button>
        ))}
      </div>

      <Separator />

      {/* Apps List */}
      <div className={cn(
        "space-y-2",
        isMobile ? "max-h-[40vh] overflow-y-auto" : "max-h-[50vh] overflow-y-auto"
      )}>
        <p className="text-sm font-medium text-muted-foreground px-1">
          {translate('connectedApps.popup.availableApps')}
        </p>
        {filteredApps.map((app) => {
          const Icon = app.icon;
          return (
            <div
              key={app.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                app.connected ? "bg-emerald-500/10" : "bg-muted"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm">{app.name}</span>
                  {!app.comingSoon && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium">
                      <Shield className="w-3 h-3" />
                      {translate('connectedApps.popup.verified')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{app.syncData}</p>
              </div>

              <div className="shrink-0">
                {app.connected ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    {translate('connectedApps.popup.connected')}
                  </span>
                ) : app.comingSoon ? (
                  <span className="text-xs text-muted-foreground">
                    {translate('connectedApps.status.soon')}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs rounded-full"
                    onClick={() => handleConnect(app)}
                  >
                    <Plug className="w-3 h-3 mr-1" />
                    {translate('connectedApps.popup.connect')}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {filteredApps.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">{translate('connectedApps.popup.noResults')}</p>
          </div>
        )}
      </div>

      {/* Done Button */}
      <Button variant="outline" onClick={onClose} className="w-full">
        {translate('connectedApps.popup.done')}
      </Button>
    </div>
  );

  // Mobile: Use Sheet (bottom drawer)
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-hidden">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2 text-left">
              <Plug className="w-5 h-5 text-primary" />
              {translate('connectedApps.popup.title')}
            </SheetTitle>
          </SheetHeader>
          <PopupContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use Dialog
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="w-5 h-5 text-primary" />
            {translate('connectedApps.popup.title')}
          </DialogTitle>
        </DialogHeader>
        <PopupContent />
      </DialogContent>
    </Dialog>
  );
}
