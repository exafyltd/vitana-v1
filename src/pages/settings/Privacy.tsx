import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus, Shield, Eye, Users, Lock, Smartphone, History, Settings as SettingsIcon, Brain, Bell } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { settingsNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";
import { PrivacyAuditPopup } from "@/components/PrivacyAuditPopup";
import { useAIConsent } from "@/hooks/useAIConsent";
import { AIDataConsentDialog } from "@/components/ai/AIDataConsentDialog";
import { t } from '@/lib/i18n-toast';

function Privacy() {
  const [activeTab, setActiveTab] = useState("profile");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const { hasConsent, dialogOpen: consentDialogOpen, setDialogOpen: setConsentDialogOpen, grantConsent, revokeConsent } = useAIConsent();

  return (
    <AppLayout>
      <SEO title={t('screens.settings.privacySettings')} description="Manage your privacy settings and data control" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.settings.privacySettings2')}
            description="Your data, your control - manage privacy settings and data sharing preferences"
          />

          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title={t('screens.settings.settingsOverview')}
                subtitle="Your Account Status"
                icon={SettingsIcon}
                content={
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">{t('screens.settings.protected')}</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.privacyStatus')}</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{t('screens.settings.premium')}</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.subscription')}</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t('screens.settings.notificationsActive')}</span>
                        <span className="text-blue-600">{t('screens.settings.text5Types')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('screens.settings.connectedApps')}</span>
                        <span className="text-green-600">{t('screens.settings.text3Apps')}</span>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.settings.activeSettings')}
                subtitle="Configured"
                icon={Bell}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">12</div>
                    <div className="text-xs text-muted-foreground">{t('screens.settings.settingsConfigured')}</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.settings.recentSettingsActivity')}
                subtitle="Latest Changes"
                icon={History}
                content={
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{t('screens.settings.privacySettingsUpdated2DaysAgo')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{t('screens.settings.connectedNewFitnessApp1Week')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>{t('screens.settings.notificationPreferencesSaved')}</span>
                    </div>
                  </div>
                }
              />
            </div>
          </div>

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={t('screens.settings.searchPrivacyControlsDataSettingsSecurity')} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('screens.settings.privacyAudit')}
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="profile">{t('screens.settings.profileVisibility')}</SplitBarTrigger>
              <SplitBarTrigger value="data">{t('screens.settings.dataSharing')}</SplitBarTrigger>
              <SplitBarTrigger value="security">{t('screens.settings.security')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="profile">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title={t('screens.settings.profileVisibilityControls')}
                    subtitle="Who Can See Your Profile"
                    icon={Eye}
                    content={
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{t('screens.settings.publicProfile')}</h4>
                            <p className="text-sm text-muted-foreground">{t('screens.settings.allowOthersFindViewYourProfile')}</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{t('screens.settings.activityStatus')}</h4>
                            <p className="text-sm text-muted-foreground">{t('screens.settings.showWhenYouReActivePlatform')}</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{t('screens.settings.vitanaIndexScore')}</h4>
                            <p className="text-sm text-muted-foreground">{t('screens.settings.shareYourWellnessScoreWithCommunity')}</p>
                          </div>
                          <Switch />
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.privacyScore')}
                    subtitle="Protection Level"
                    icon={Shield}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">95%</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.excellentProtection')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.visibleSettings')}
                    subtitle="Public Items"
                    icon={Eye}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">3</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.itemsVisible')}</div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="partnership" />
                </div>

                {/* Row 3: Single Full Row (12) */}
                <div className="col-span-12">
                  <StandardCard
                    title={t('screens.settings.detailedPrivacyControls')}
                    subtitle="Fine-tune Your Visibility"
                    icon={SettingsIcon}
                    content={
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.progressSharing')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.shareWellnessProgressPublicly')}</p>
                            </div>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.achievementBadges')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.displayEarnedAchievements')}</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.contactInformation')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.allowMembersContactYou')}</p>
                            </div>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.locationData')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.shareApproximateLocation')}</p>
                            </div>
                            <Switch />
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="data">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.sharedData')}
                    subtitle="Analytics"
                    icon={Users}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">{t('screens.settings.active')}</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.anonymizedSharing')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.thirdpartyApps')}
                    subtitle="Data Access"
                    icon={Smartphone}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-orange-600">{t('screens.settings.limited')}</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.controlledAccess')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title={t('screens.settings.dataSharingPreferences')}
                    subtitle="Control Your Information"
                    icon={Users}
                    content={
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{t('screens.settings.healthDataAnalytics')}</h4>
                            <p className="text-sm text-muted-foreground">{t('screens.settings.shareAnonymizedHealthDataImproveAi')}</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{t('screens.settings.communityInsights')}</h4>
                            <p className="text-sm text-muted-foreground">{t('screens.settings.allowYourProgressContributeCommunityStatistics')}</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{t('screens.settings.thirdpartyIntegrations')}</h4>
                            <p className="text-sm text-muted-foreground">{t('screens.settings.shareDataWithConnectedAppsServices')}</p>
                          </div>
                          <Switch />
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* AI Data Sharing Consent */}
                <div className="col-span-12">
                  <StandardCard
                    title={t('screens.settings.aiDataSharing')}
                    subtitle="Third-Party AI Disclosure"
                    icon={Brain}
                    content={
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{t('screens.settings.shareDataWithAiProvider')}</h4>
                            <p className="text-sm text-muted-foreground">
                              {t('screens.settings.allowPersonalDataSentThirdpartyAi')}
                            </p>
                          </div>
                          <Switch
                            checked={hasConsent}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setConsentDialogOpen(true);
                              } else {
                                revokeConsent();
                              }
                            }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 border-l-2 border-muted pl-3">
                          <p><strong>{t('screens.settings.dataShared')}</strong> {t('screens.settings.voiceRecordingsTranscriptsTypedPromptsChat')}</p>
                          <p><strong>{t('screens.settings.recipients')}</strong> {t('screens.settings.googleGeminiAiCloudAi')}</p>
                          <p><strong>{t('screens.settings.purpose')}</strong> {t('screens.settings.aiResponsesVoiceSynthesisProactiveGreetings')}</p>
                          <p><strong>{t('screens.settings.control')}</strong> {t('screens.settings.toggleOffHereRevokeConsentAt')}</p>
                        </div>
                        {hasConsent && (
                          <p className="text-xs text-muted-foreground">{t('screens.settings.consentGrantedYouCanRevokeAt')}
                          </p>
                        )}
                        {!hasConsent && (
                          <p className="text-xs text-muted-foreground">{t('screens.settings.aiFeaturesVoiceAssistantProactiveMessages')}
                          </p>
                        )}
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="guidance" />
                </div>

                {/* Row 3: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title={t('screens.settings.dataExportControl')}
                    subtitle="Your Rights"
                    icon={History}
                    content={
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>{t('screens.settings.requestDataExportAnytime')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{t('screens.settings.deleteAccountAllData')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>{t('screens.settings.viewAllDataSharingActivities')}</span>
                        </div>
                        <div className="pt-2">
                          <Button variant="outline" size="sm">{t('screens.settings.requestDataExport')}</Button>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.exportRequests')}
                    subtitle="Recent Activity"
                    icon={History}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">1</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.dec2024')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.dataPoints')}
                    subtitle="Total Collected"
                    icon={Users}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">1.2K</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.healthMetrics')}</div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="security">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Single Full Row (12) */}
                <div className="col-span-12">
                  <StandardCard
                    title={t('screens.settings.securitySettings')}
                    subtitle="Protect Your Account"
                    icon={Lock}
                    content={
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.passwordProtection')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.lastChanged30DaysAgo')}</p>
                            </div>
                            <Button variant="outline" size="sm">{t('screens.settings.change')}</Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.twofactorAuthentication')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.addExtraLayerSecurity')}</p>
                            </div>
                            <Switch />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.loginNotifications')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.getNotifiedNewLoginAttempts')}</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.sessionTimeout')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.autoLogoutAfterInactivity')}</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="encouragement" />
                </div>

                {/* Row 3: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.activeSessions')}
                    subtitle="Current Logins"
                    icon={Smartphone}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">2</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.devicesConnected')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.securityScore')}
                    subtitle="Account Protection"
                    icon={Shield}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">98%</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.excellentSecurity')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title={t('screens.settings.recentSecurityActivity')}
                    subtitle="Account Events"
                    icon={History}
                    content={
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center p-2 bg-muted rounded">
                          <div>
                            <div className="font-medium">{t('screens.settings.passwordChanged')}</div>
                            <div className="text-xs text-muted-foreground">{t('screens.settings.text30DaysAgo')}</div>
                          </div>
                          <div className="text-green-600 text-xs">{t('screens.settings.secure')}</div>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-muted rounded">
                          <div>
                            <div className="font-medium">{t('screens.settings.newDeviceLogin')}</div>
                            <div className="text-xs text-muted-foreground">{t('screens.settings.iphone2HoursAgo')}</div>
                          </div>
                          <div className="text-green-600 text-xs">{t('screens.settings.verified')}</div>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-muted rounded">
                          <div>
                            <div className="font-medium">{t('screens.settings.privacySettingsUpdated')}</div>
                            <div className="text-xs text-muted-foreground">{t('screens.settings.text1WeekAgo')}</div>
                          </div>
                          <div className="text-blue-600 text-xs">{t('screens.settings.updated')}</div>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      <PrivacyAuditPopup isOpen={actionPopupOpen} onClose={() => setActionPopupOpen(false)} />
      <AIDataConsentDialog
        open={consentDialogOpen}
        onOpenChange={setConsentDialogOpen}
        onConsent={grantConsent}
      />
    </AppLayout>
  );
}

export default withScreenId(Privacy, SCREEN_IDS.SETTINGS_OVERVIEW);