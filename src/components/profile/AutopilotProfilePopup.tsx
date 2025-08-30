import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, User, Sparkles, Image, Palette } from "lucide-react";

interface AutopilotProfilePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SuggestionOption {
  id: string;
  title: string;
  description: string;
  icon: typeof User;
}

const suggestions: SuggestionOption[] = [
  {
    id: "polish-bio",
    title: "Polish my Bio",
    description: "Autopilot can rewrite About section to be more inspiring",
    icon: User,
  },
  {
    id: "refresh-archetype",
    title: "Refresh my Archetype", 
    description: "Suggest Longevity Archetype update based on activity",
    icon: Sparkles,
  },
  {
    id: "highlight-showcase",
    title: "Highlight my Showcase",
    description: "Suggest top posts or media for featured content",
    icon: Image,
  },
  {
    id: "style-profile",
    title: "Style my Profile",
    description: "Suggest improvements to cover photo, roles, profile picture",
    icon: Palette,
  },
];

export function AutopilotProfilePopup({ open, onOpenChange }: AutopilotProfilePopupProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);

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
              Let Autopilot polish your profile ✨
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mb-6">
            {suggestions.map((suggestion) => {
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
                      <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
                      <p className="text-xs text-muted-foreground">{suggestion.description}</p>
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
              Cancel
            </Button>
            <Button 
              onClick={handleRunAutopilot}
              disabled={selectedSuggestions.length === 0}
            >
              <Zap className="h-4 w-4 mr-2" />
              Run Autopilot
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}