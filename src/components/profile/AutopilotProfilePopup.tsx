import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, User, Sparkles, Image, Palette, Loader2, Check, X, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAIConsent } from "@/hooks/useAIConsent";
import { AIDataConsentDialog } from "@/components/ai/AIDataConsentDialog";

interface AutopilotProfilePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBio?: string;
  currentArchetype?: string;
  refreshProfile?: () => void;
}

interface SuggestionOption {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: typeof User;
  comingSoon?: boolean;
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
    comingSoon: true,
  },
  {
    id: "style-profile",
    titleKey: "autopilot.profilePopup.styleProfile",
    descriptionKey: "autopilot.profilePopup.styleProfileDesc",
    icon: Palette,
    comingSoon: true,
  },
];

type Step = "select" | "loading" | "preview";

interface Suggestions {
  bio?: string | null;
  archetype?: string | null;
}

export function AutopilotProfilePopup({ open, onOpenChange, currentBio, currentArchetype, refreshProfile }: AutopilotProfilePopupProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [suggestions, setSuggestions] = useState<Suggestions>({});
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());
  const { translate } = useTranslation();
  const { toast } = useToast();
  const { hasConsent, dialogOpen: consentDialogOpen, setDialogOpen: setConsentDialogOpen, grantConsent } = useAIConsent();

  const handleSuggestionToggle = (suggestionId: string) => {
    setSelectedSuggestions(prev =>
      prev.includes(suggestionId)
        ? prev.filter(id => id !== suggestionId)
        : [...prev, suggestionId]
    );
  };

  const resetState = () => {
    setStep("select");
    setSuggestions({});
    setAcceptedFields(new Set());
    setSelectedSuggestions([]);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const handleRunAutopilot = async () => {
    if (!hasConsent) {
      setConsentDialogOpen(true);
      return;
    }
    setStep("loading");
    try {
      const { data, error } = await supabase.functions.invoke("autopilot-profile", {
        body: {
          currentBio: currentBio || "",
          currentArchetype: currentArchetype || "",
          selectedOptions: selectedSuggestions,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuggestions({ bio: data?.bio, archetype: data?.archetype });
      setStep("preview");
    } catch (err: any) {
      console.error("Autopilot error:", err);
      toast({
        title: translate("autopilot.profilePopup.error"),
        description: err.message || "Unknown error",
        variant: "destructive",
      });
      setStep("select");
    }
  };

  const handleAccept = async (field: "bio" | "archetype") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: Record<string, string> = {};
      if (field === "bio" && suggestions.bio) updates.bio = suggestions.bio;
      if (field === "archetype" && suggestions.archetype) updates.longevity_archetype = suggestions.archetype;

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      setAcceptedFields(prev => new Set(prev).add(field));
      refreshProfile?.();
    } catch (err: any) {
      toast({
        title: translate("autopilot.profilePopup.error"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleAcceptAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: Record<string, string> = {};
      if (suggestions.bio) updates.bio = suggestions.bio;
      if (suggestions.archetype) updates.longevity_archetype = suggestions.archetype;

      if (Object.keys(updates).length === 0) return;

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      refreshProfile?.();
      toast({ title: translate("autopilot.profilePopup.applied") });
      handleClose(false);
    } catch (err: any) {
      toast({
        title: translate("autopilot.profilePopup.error"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Check if all available suggestions have been accepted
  const allAccepted =
    (!suggestions.bio || acceptedFields.has("bio")) &&
    (!suggestions.archetype || acceptedFields.has("archetype"));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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

          {/* Step 1: Selection */}
          {step === "select" && (
            <>
              <div className="space-y-3 mb-6">
              {suggestionConfigs.map((suggestion) => {
                  const IconComponent = suggestion.icon;
                  const isSelected = selectedSuggestions.includes(suggestion.id);
                  const isComingSoon = suggestion.comingSoon;

                  return (
                    <Card
                      key={suggestion.id}
                      className={`p-4 transition-colors ${
                        isComingSoon
                          ? 'opacity-50 cursor-not-allowed'
                          : `cursor-pointer hover:bg-accent/50 ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`
                      }`}
                      onClick={() => !isComingSoon && handleSuggestionToggle(suggestion.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          disabled={isComingSoon}
                          onChange={() => !isComingSoon && handleSuggestionToggle(suggestion.id)}
                          className="mt-1"
                        />
                        <div className="flex-shrink-0 mt-1">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm mb-1">{translate(suggestion.titleKey)}</h4>
                            {isComingSoon && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                <Clock className="h-2.5 w-2.5 mr-0.5" />
                                {translate('autopilot.profilePopup.comingSoon')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{translate(suggestion.descriptionKey)}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => handleClose(false)}>
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
            </>
          )}

          {/* Step: Loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{translate('autopilot.profilePopup.generating')}</p>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && (
            <>
              <div className="space-y-4 mb-6">
                {suggestions.bio && (
                  <SuggestionCard
                    label={translate("autopilot.profilePopup.suggestedBio")}
                    currentLabel={translate("autopilot.profilePopup.currentValue")}
                    currentValue={currentBio || "—"}
                    suggestedValue={suggestions.bio}
                    accepted={acceptedFields.has("bio")}
                    onAccept={() => handleAccept("bio")}
                    onReject={() => setSuggestions(prev => ({ ...prev, bio: null }))}
                    translate={translate}
                  />
                )}
                {suggestions.archetype && (
                  <SuggestionCard
                    label={translate("autopilot.profilePopup.suggestedArchetype")}
                    currentLabel={translate("autopilot.profilePopup.currentValue")}
                    currentValue={currentArchetype || "—"}
                    suggestedValue={suggestions.archetype}
                    accepted={acceptedFields.has("archetype")}
                    onAccept={() => handleAccept("archetype")}
                    onReject={() => setSuggestions(prev => ({ ...prev, archetype: null }))}
                    translate={translate}
                  />
                )}
                {!suggestions.bio && !suggestions.archetype && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {translate("autopilot.profilePopup.error")}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  {translate('autopilot.profilePopup.cancel')}
                </Button>
                {(suggestions.bio || suggestions.archetype) && !allAccepted && (
                  <Button onClick={handleAcceptAll}>
                    <Check className="h-4 w-4 mr-2" />
                    {translate('autopilot.profilePopup.acceptAll')}
                  </Button>
                )}
                {allAccepted && (
                  <Button onClick={() => { toast({ title: translate("autopilot.profilePopup.applied") }); handleClose(false); }}>
                    <Check className="h-4 w-4 mr-2" />
                    {translate('autopilot.profilePopup.applied')}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <AIDataConsentDialog
      open={consentDialogOpen}
      onOpenChange={setConsentDialogOpen}
      onConsent={grantConsent}
    />
    </>
  );
}

function SuggestionCard({
  label,
  currentLabel,
  currentValue,
  suggestedValue,
  accepted,
  onAccept,
  onReject,
  translate,
}: {
  label: string;
  currentLabel: string;
  currentValue: string;
  suggestedValue: string;
  accepted: boolean;
  onAccept: () => void;
  onReject: () => void;
  translate: (key: string) => string;
}) {
  return (
    <Card className={`p-4 ${accepted ? 'border-green-500 bg-green-500/5' : 'border-border'}`}>
      <h4 className="font-medium text-sm mb-3">{label}</h4>
      <div className="space-y-2 mb-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">{currentLabel}:</span>
          <p className="mt-1">{currentValue}</p>
        </div>
        <div className="text-xs">
          <span className="font-medium text-primary">{label}:</span>
          <p className="mt-1">{suggestedValue}</p>
        </div>
      </div>
      {!accepted ? (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onReject}>
            <X className="h-3 w-3 mr-1" />
            {translate("autopilot.profilePopup.reject")}
          </Button>
          <Button size="sm" onClick={onAccept}>
            <Check className="h-3 w-3 mr-1" />
            {translate("autopilot.profilePopup.accept")}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
          <Check className="h-3 w-3" /> {translate("autopilot.profilePopup.applied")}
        </p>
      )}
    </Card>
  );
}
