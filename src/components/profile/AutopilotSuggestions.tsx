import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plane, TrendingUp, Star } from "lucide-react";
import { AutopilotProfilePopup } from "./AutopilotProfilePopup";
import { useTranslation } from "@/hooks/useTranslation";

interface AutopilotSuggestionsProps {
  type: 'banner' | 'bio' | 'showcase' | 'archetype' | 'profile-section';
  onSuggestionClick?: (suggestion: string) => void;
}

export function AutopilotSuggestions({ type, onSuggestionClick }: AutopilotSuggestionsProps) {
  const [showPopup, setShowPopup] = useState(false);
  const { translate } = useTranslation();
  
  if (type === 'banner') {
    return (
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 p-4 mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foreground">{translate('autopilot.suggestions.bannerTitle')}</h3>
            <p className="text-xs text-muted-foreground">{translate('autopilot.suggestions.bannerDesc')}</p>
          </div>
          <Button size="sm" variant="outline">
            <Plane className="h-3 w-3 mr-1" />
            {translate('autopilot.suggestions.enable')}
          </Button>
        </div>
      </Card>
    );
  }

  if (type === 'bio') {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/5 p-3 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{translate('profileEditor.autopilot.quickSuggestions')}</span>
          <Badge variant="secondary" className="text-xs">AI</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 text-xs hover:bg-primary/10"
            onClick={() => onSuggestionClick?.('shorter')}
          >
            {translate('profileEditor.autopilot.makeShorter')}
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 text-xs hover:bg-primary/10"
            onClick={() => onSuggestionClick?.('professional')}
          >
            {translate('profileEditor.autopilot.moreProfessional')}
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 text-xs hover:bg-primary/10"
            onClick={() => onSuggestionClick?.('inspirational')}
          >
            {translate('profileEditor.autopilot.moreInspirational')}
          </Button>
        </div>
      </Card>
    );
  }

  if (type === 'showcase') {
    return (
      <Card className="border-dashed border-secondary/30 bg-secondary/5 p-3 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-secondary" />
          <span className="text-sm font-medium">{translate('autopilot.suggestions.showcaseTitle')}</span>
          <Badge variant="secondary" className="text-xs">{translate('autopilot.suggestions.showcaseBadge')}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {translate('autopilot.suggestions.showcaseDesc')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs"
            onClick={() => onSuggestionClick?.('suggest-popular')}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {translate('autopilot.suggestions.suggestPopular')}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs"
            onClick={() => onSuggestionClick?.('suggest-recent')}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {translate('autopilot.suggestions.recentHighlights')}
          </Button>
        </div>
      </Card>
    );
  }

  if (type === 'archetype') {
    return (
      <Card className="border-dashed border-amber-300/30 bg-amber-50/50 p-3 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium">{translate('autopilot.suggestions.archetypeTitle')}</span>
          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">{translate('autopilot.suggestions.archetypeBadge')}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {translate('autopilot.suggestions.archetypeDesc')}
        </p>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-7 text-xs"
          onClick={() => onSuggestionClick?.('update-archetype')}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {translate('autopilot.suggestions.updateArchetype')}
        </Button>
      </Card>
    );
  }

  if (type === 'profile-section') {
    return (
      <Card className="bg-gradient-to-r from-slate-50/50 to-blue-50/30 border border-slate-200/50 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Plane className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {translate('autopilot.suggestions.profileSectionTitle')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {translate('autopilot.suggestions.profileSectionDesc')}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowPopup(true)}
              className="ml-4 flex-shrink-0"
              data-autopilot-trigger
            >
              {translate('autopilot.suggestions.tryAutopilot')}
            </Button>
          </div>
        </CardContent>
        <AutopilotProfilePopup 
          open={showPopup} 
          onOpenChange={setShowPopup} 
        />
      </Card>
    );
  }

  return null;
}
