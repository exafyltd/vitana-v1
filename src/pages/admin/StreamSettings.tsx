import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminLiveStreamNavigation } from "@/config/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notify, t } from '@/lib/i18n-toast';

export default function StreamSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    notify('toasts.admin.settingsSaved', 'toasts.admin.streamSettingsHaveUpdatedSuccessfully');
  };

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.streamSettingsAdminVitana')} 
        description="Configure global streaming settings" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminLiveStreamNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.streamSettings')}
            description="Configure global settings for all streaming features"
            emoji="⚙️"
          />

          <Tabs defaultValue="vertex" className="space-y-4">
            <TabsList>
              <TabsTrigger value="vertex">{t('screens.admin.vertexAi')}</TabsTrigger>
              <TabsTrigger value="community">{t('screens.admin.communityRooms')}</TabsTrigger>
              <TabsTrigger value="telemedicine">Telemedicine</TabsTrigger>
              <TabsTrigger value="global">{t('screens.admin.globalSettings')}</TabsTrigger>
            </TabsList>

            <TabsContent value="vertex" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.vertexAiConfiguration')}</CardTitle>
                  <CardDescription>{t('screens.admin.settingsForGoogleVertexAiStreaming')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vertex-model">Model</Label>
                    <Select defaultValue="gemini-2.0-flash">
                      <SelectTrigger id="vertex-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.0-flash">{t('screens.admin.gemini20FlashRecommended')}</SelectItem>
                        <SelectItem value="gemini-pro">{t('screens.admin.geminiPro')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vertex-voice">Voice</Label>
                    <Select defaultValue="Puck">
                      <SelectTrigger id="vertex-voice">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Puck">Puck</SelectItem>
                        <SelectItem value="Charon">Charon</SelectItem>
                        <SelectItem value="Kore">Kore</SelectItem>
                        <SelectItem value="Fenrir">Fenrir</SelectItem>
                        <SelectItem value="Aoede">Aoede</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="system-prompt">{t('screens.admin.systemPrompt')}</Label>
                    <Textarea
                      id="system-prompt"
                      placeholder={t('screens.admin.youHelpfulAiAssistant')}
                      className="min-h-[100px]"
                      defaultValue="You are VITANA's AI assistant. Be helpful, concise, and friendly."
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('screens.admin.voiceActivityDetection')}</Label>
                      <p className="text-sm text-muted-foreground">{t('screens.admin.automaticallyDetectWhenUserStopsSpeaking')}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="community" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.communityRoomDefaults')}</CardTitle>
                  <CardDescription>{t('screens.admin.defaultSettingsForNewCommunityLive')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-participants">{t('screens.admin.maxParticipants')}</Label>
                    <Input id="max-participants" type="number" defaultValue="50" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('screens.admin.autorecordSessions')}</Label>
                      <p className="text-sm text-muted-foreground">{t('screens.admin.automaticallyRecordAllCommunityRooms')}</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('screens.admin.publicByDefault')}</Label>
                      <p className="text-sm text-muted-foreground">{t('screens.admin.newRoomsPubliclyVisible')}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="moderation-level">{t('screens.admin.moderationLevel')}</Label>
                    <Select defaultValue="moderate">
                      <SelectTrigger id="moderation-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relaxed">Relaxed</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="strict">Strict</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="telemedicine" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.telemedicineDefaults')}</CardTitle>
                  <CardDescription>{t('screens.admin.settingsForHealthcareVideoConsultations')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-duration">{t('screens.admin.defaultSessionDurationMinutes')}</Label>
                    <Input id="session-duration" type="number" defaultValue="30" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('screens.admin.requireRecordingConsent')}</Label>
                      <p className="text-sm text-muted-foreground">{t('screens.admin.patientsMustConsentRecording')}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('screens.admin.autoendInactiveSessions')}</Label>
                      <p className="text-sm text-muted-foreground">{t('screens.admin.endSessionsAfter10MinutesInactivity')}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="global" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.globalStreamSettings')}</CardTitle>
                  <CardDescription>{t('screens.admin.settingsThatApplyAllStreamingFeatures')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-concurrent">{t('screens.admin.maxConcurrentStreams')}</Label>
                    <Input id="max-concurrent" type="number" defaultValue="100" />
                    <p className="text-xs text-muted-foreground">{t('screens.admin.perTenantLimit')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bandwidth-limit">{t('screens.admin.bandwidthLimitMbps')}</Label>
                    <Input id="bandwidth-limit" type="number" defaultValue="1000" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="analytics-retention">{t('screens.admin.analyticsRetentionDays')}</Label>
                    <Input id="analytics-retention" type="number" defaultValue="90" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('screens.admin.enableCdn')}</Label>
                      <p className="text-sm text-muted-foreground">{t('screens.admin.useContentDeliveryNetworkForStreaming')}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
