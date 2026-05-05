import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Users, Lock, Heart, Activity, Info, Settings } from "lucide-react";
import { Visibility } from "@/types/profile";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

export function VisibilityForm() {
  const { translate } = useTranslation();
  const [profileVisibility, setProfileVisibility] = useState<Visibility>("public");
  const [aboutVisibility, setAboutVisibility] = useState<Visibility>("public");
  const [linksVisibility, setLinksVisibility] = useState<Visibility>("public");
  const [locationVisibility, setLocationVisibility] = useState<Visibility>("followers");
  const [showcaseVisibility, setShowcaseVisibility] = useState<Visibility>("public");
  const [healthShareConsent, setHealthShareConsent] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  const getVisibilityIcon = (visibility: Visibility) => {
    switch (visibility) {
      case "public": return <Globe className="w-3 h-3" />;
      case "followers": return <Users className="w-3 h-3" />;
      case "private": return <Lock className="w-3 h-3" />;
    }
  };

  const getVisibilityDescription = (visibility: Visibility) => {
    switch (visibility) {
      case "public": return "Anyone can see this";
      case "followers": return "Only your followers can see this";
      case "private": return "Only you can see this";
    }
  };

  const handleHealthShareToggle = (enabled: boolean) => {
    if (enabled && !healthShareConsent) {
      setShowConsentDialog(true);
    } else {
      setHealthShareConsent(enabled);
    }
  };

  const confirmHealthShare = () => {
    setHealthShareConsent(true);
    setShowConsentDialog(false);
    // TODO: Log to consent ledger
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">{t('screens.profile.visibility')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('screens.profile.controlWhoCanSeeDifferentParts')}
        </p>
      </div>

      {/* Master Profile Visibility */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">{t('screens.profile.profileVisibility')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('screens.profile.overallVisibilityYourProfile')}
            </p>
          </div>
          <Select value={profileVisibility} onValueChange={(value: Visibility) => setProfileVisibility(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <div>
                    <div>{t('screens.profile.public')}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.profile.anyoneCanFindViewYourProfile')}</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="followers">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <div>
                    <div>{t('screens.profile.followersOnly')}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.profile.onlyYourFollowersCanViewYour')}</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <div>
                    <div>{t('screens.profile.private')}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.profile.onlyYouCanViewYourProfile')}</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Field-level Visibility */}
      <div className="space-y-4">
        <Label className="text-base font-medium">{t('screens.profile.fieldVisibility')}</Label>
        
        {[
          { key: 'about', label: 'About/Bio', value: aboutVisibility, setter: setAboutVisibility },
          { key: 'links', label: 'Links', value: linksVisibility, setter: setLinksVisibility },
          { key: 'location', label: 'Location', value: locationVisibility, setter: setLocationVisibility },
          { key: 'showcase', label: translate('editProfile.showcaseTitle'), value: showcaseVisibility, setter: setShowcaseVisibility },
        ].map(({ key, label, value, setter }) => (
          <Card key={key} className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{label}</Label>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {getVisibilityIcon(value)}
                  {getVisibilityDescription(value)}
                </p>
              </div>
              <Select value={value} onValueChange={(val: Visibility) => setter(val)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3" />
                      {t('screens.profile.public')}
                    </div>
                  </SelectItem>
                  <SelectItem value="followers">
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      {t('screens.profile.followers')}
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3" />
                      {t('screens.profile.private')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        ))}
      </div>

      {/* Health Data Sharing */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                {t('screens.profile.healthSnapshotSharing')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('screens.profile.shareYourVitanaIndexHealthInsights')}
              </p>
            </div>
            <Switch
              checked={healthShareConsent}
              onCheckedChange={handleHealthShareToggle}
            />
          </div>

          {healthShareConsent && (
            <Alert>
              <Heart className="h-4 w-4" />
              <AlertDescription>{t('screens.profile.yourVitanaIndexHealthSnapshotTab')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>

      {/* Settings Link */}
      <Card className="p-4 border-muted-foreground/20">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <Label className="text-base">{t('screens.profile.advancedPrivacySettings')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('screens.profile.manageAdditionalPrivacyOptionsDataSharing')}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/settings/privacy">{t('screens.profile.openSettings')}</Link>
          </Button>
        </div>
      </Card>

      {/* Consent Dialog */}
      {showConsentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4">
            <div className="space-y-4">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-3 text-primary" />
                <h3 className="text-lg font-medium">{t('screens.profile.shareHealthData')}</h3>
              </div>
              <p className="text-sm text-muted-foreground text-center">{t('screens.profile.byEnablingThisYourVitanaIndex')}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowConsentDialog(false)}>
                  {t('screens.profile.cancel')}
                </Button>
                <Button className="flex-1" onClick={confirmHealthShare}>
                  {t('screens.profile.enableSharing')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="pt-4 border-t">
        <Button className="w-full">{t('screens.profile.savePrivacySettings')}</Button>
      </div>
    </div>
  );
}