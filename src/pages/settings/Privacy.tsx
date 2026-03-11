import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus, Shield, Eye, Users, Lock, Smartphone, History, Settings as SettingsIcon, Brain } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { settingsNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";
import { PrivacyAuditPopup } from "@/components/PrivacyAuditPopup";
import { useAIConsent } from "@/hooks/useAIConsent";
import { AIDataConsentDialog } from "@/components/ai/AIDataConsentDialog";

function Privacy() {
  const [activeTab, setActiveTab] = useState("profile");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const { hasConsent, dialogOpen: consentDialogOpen, setDialogOpen: setConsentDialogOpen, grantConsent, revokeConsent } = useAIConsent();

  return (
    <AppLayout>
      <SEO title="Privacy | Settings" description="Manage your privacy settings and data control" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title="Privacy Settings 🔒"
            description="Your data, your control - manage privacy settings and data sharing preferences"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search privacy controls, data settings, security..." />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Privacy Audit
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="profile">👁️ Profile Visibility</SplitBarTrigger>
              <SplitBarTrigger value="data">📊 Data Sharing</SplitBarTrigger>
              <SplitBarTrigger value="security">🔒 Security</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="profile">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Profile Visibility Controls"
                    subtitle="Who Can See Your Profile"
                    icon={Eye}
                    content={
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Public Profile</h4>
                            <p className="text-sm text-muted-foreground">Allow others to find and view your profile</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Activity Status</h4>
                            <p className="text-sm text-muted-foreground">Show when you're active on the platform</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">VITANA Index Score</h4>
                            <p className="text-sm text-muted-foreground">Share your wellness score with community</p>
                          </div>
                          <Switch />
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Privacy Score"
                    subtitle="Protection Level"
                    icon={Shield}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">95%</div>
                        <div className="text-xs text-muted-foreground">Excellent protection</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Visible Settings"
                    subtitle="Public Items"
                    icon={Eye}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">3</div>
                        <div className="text-xs text-muted-foreground">Items visible</div>
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
                    title="Detailed Privacy Controls"
                    subtitle="Fine-tune Your Visibility"
                    icon={SettingsIcon}
                    content={
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Progress Sharing</h4>
                              <p className="text-sm text-muted-foreground">Share wellness progress publicly</p>
                            </div>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Achievement Badges</h4>
                              <p className="text-sm text-muted-foreground">Display earned achievements</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Contact Information</h4>
                              <p className="text-sm text-muted-foreground">Allow members to contact you</p>
                            </div>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Location Data</h4>
                              <p className="text-sm text-muted-foreground">Share approximate location</p>
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
                    title="Shared Data"
                    subtitle="Analytics"
                    icon={Users}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">Active</div>
                        <div className="text-xs text-muted-foreground">Anonymized sharing</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Third-party Apps"
                    subtitle="Data Access"
                    icon={Smartphone}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-orange-600">Limited</div>
                        <div className="text-xs text-muted-foreground">Controlled access</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Data Sharing Preferences"
                    subtitle="Control Your Information"
                    icon={Users}
                    content={
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Health Data Analytics</h4>
                            <p className="text-sm text-muted-foreground">Share anonymized health data to improve AI recommendations</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Community Insights</h4>
                            <p className="text-sm text-muted-foreground">Allow your progress to contribute to community statistics</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Third-party Integrations</h4>
                            <p className="text-sm text-muted-foreground">Share data with connected apps and services</p>
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
                    title="AI Data Sharing"
                    subtitle="Third-Party AI Disclosure"
                    icon={Brain}
                    content={
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Share data with AI provider</h4>
                            <p className="text-sm text-muted-foreground">
                              Voice, text, diary, and profile data is sent to Google (Gemini AI) via Lovable AI Gateway for personalized responses.
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
                        {hasConsent && (
                          <p className="text-xs text-muted-foreground">
                            Consent granted. You can revoke at any time by toggling this off.
                          </p>
                        )}
                        {!hasConsent && (
                          <p className="text-xs text-muted-foreground">
                            AI features (voice assistant, proactive messages, profile enhancement) are disabled until consent is granted.
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
                    title="Data Export & Control"
                    subtitle="Your Rights"
                    icon={History}
                    content={
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Request data export anytime</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Delete account and all data</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>View all data sharing activities</span>
                        </div>
                        <div className="pt-2">
                          <Button variant="outline" size="sm">Request Data Export</Button>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Export Requests"
                    subtitle="Recent Activity"
                    icon={History}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">1</div>
                        <div className="text-xs text-muted-foreground">Dec 2024</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Data Points"
                    subtitle="Total Collected"
                    icon={Users}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">1.2K</div>
                        <div className="text-xs text-muted-foreground">Health metrics</div>
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
                    title="Security Settings"
                    subtitle="Protect Your Account"
                    icon={Lock}
                    content={
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Password Protection</h4>
                              <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                            </div>
                            <Button variant="outline" size="sm">Change</Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Two-Factor Authentication</h4>
                              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                            </div>
                            <Switch />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Login Notifications</h4>
                              <p className="text-sm text-muted-foreground">Get notified of new login attempts</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Session Timeout</h4>
                              <p className="text-sm text-muted-foreground">Auto logout after inactivity</p>
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
                    title="Active Sessions"
                    subtitle="Current Logins"
                    icon={Smartphone}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">2</div>
                        <div className="text-xs text-muted-foreground">Devices connected</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Security Score"
                    subtitle="Account Protection"
                    icon={Shield}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">98%</div>
                        <div className="text-xs text-muted-foreground">Excellent security</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Recent Security Activity"
                    subtitle="Account Events"
                    icon={History}
                    content={
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center p-2 bg-muted rounded">
                          <div>
                            <div className="font-medium">Password changed</div>
                            <div className="text-xs text-muted-foreground">30 days ago</div>
                          </div>
                          <div className="text-green-600 text-xs">Secure</div>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-muted rounded">
                          <div>
                            <div className="font-medium">New device login</div>
                            <div className="text-xs text-muted-foreground">iPhone • 2 hours ago</div>
                          </div>
                          <div className="text-green-600 text-xs">Verified</div>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-muted rounded">
                          <div>
                            <div className="font-medium">Privacy settings updated</div>
                            <div className="text-xs text-muted-foreground">1 week ago</div>
                          </div>
                          <div className="text-blue-600 text-xs">Updated</div>
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