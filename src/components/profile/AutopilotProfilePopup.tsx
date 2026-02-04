import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, User, Sparkles, Image, Palette } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface AutopilotProfilePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SuggestionOption {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: typeof User;
}

const suggestionConfigs: SuggestionOption[] = [
  {
    id: "polish-bio",
    titleKey: "autopilot.profilePopup.polishBio",
    descriptionKey: "autopilot.profilePopup.polishBioDesc",
    icon: User,
  },
  {
    id: "refresh-archetype",
    titleKey: "autopilot.profilePopup.refreshArchetype", 
    descriptionKey: "autopilot.profilePopup.refreshArchetypeDesc",
    icon: Sparkles,
  },
  {
    id: "highlight-showcase",
    titleKey: "autopilot.profilePopup.highlightShowcase",
    descriptionKey: "autopilot.profilePopup.highlightShowcaseDesc",
    icon: Image,
  },
  {
    id: "style-profile",
    titleKey: "autopilot.profilePopup.styleProfile",
    descriptionKey: "autopilot.profilePopup.styleProfileDesc",
    icon: Palette,
  },
];

export function AutopilotProfilePopup({ open, onOpenChange }: AutopilotProfilePopupProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const { translate } = useTranslation();

  const handleSuggestionToggle = (suggestionId: string) => {
    setSelectedSuggestions(prev => 
      prev.includes(suggestionId) 
        ? prev.filter(id => id !== suggestionId)
        : [...prev, suggestionId]
    );
  };

  const handleRunAutopilot = () => {
    console.log("Running autopilot with suggestions:", selectedSuggestions);
    // TODO: Implement autopilot logic
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0">
        <div className="p-6">
          <DialogHeader className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-xl font-semibold text-center">
              {translate('autopilot.profilePopup.title')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mb-6">
            {suggestionConfigs.map((suggestion) => {
              const IconComponent = suggestion.icon;
              const isSelected = selectedSuggestions.includes(suggestion.id);
              
              return (
                <Card 
                  key={suggestion.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => handleSuggestionToggle(suggestion.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSuggestionToggle(suggestion.id)}
                      className="mt-1"
                    />
                    <div className="flex-shrink-0 mt-1">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{translate(suggestion.titleKey)}</h4>
                      <p className="text-xs text-muted-foreground">{translate(suggestion.descriptionKey)}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              {translate('autopilot.profilePopup.cancel')}
            </Button>
            <Button 
              onClick={handleRunAutopilot}
              disabled={selectedSuggestions.length === 0}
            >
              <Zap className="h-4 w-4 mr-2" />
              {translate('autopilot.profilePopup.runAutopilot')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
