import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Save, Database, Mail, Code, Activity, Bot } from "lucide-react";
import { adminSystemNavigation } from "@/config/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useVitanaIndexConfig } from "@/hooks/useVitanaIndexConfig";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { t } from '@/lib/i18n-toast';

export default function SystemConfig() {
  const { config, isLoading, updateConfig, isUpdating } = useVitanaIndexConfig();
  const [weights, setWeights] = useState({
    sleep: 0.25,
    exercise: 0.20,
    nutrition: 0.20,
    mental_wellness: 0.15,
    social_connection: 0.10,
    hydration: 0.10
  });

  useEffect(() => {
    if (config?.algorithm_weights) {
      setWeights(config.algorithm_weights);
    }
  }, [config]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const handleSaveWeights = () => {
    updateConfig({ algorithm_weights: weights });
  };

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.adminSystemConfiguration')} 
        description="Global system settings and configurations" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminSystemNavigation} />
      
      <div className="p-6 bg-gradient-subtle min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.systemConfiguration')}
            description="Configure global system settings, integrations, and API keys"
            emoji="⚙️"
          />

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">{t('screens.admin.general')}</TabsTrigger>
              <TabsTrigger value="vitana">{t('screens.admin.vitanaIndex')}</TabsTrigger>
              <TabsTrigger value="autopilot">{t('screens.admin.autopilot')}</TabsTrigger>
              <TabsTrigger value="integrations">{t('screens.admin.integrations')}</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      {t('screens.admin.database')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{t('screens.admin.connectionBackupSettings')}</p>
                    <Button variant="outline" size="sm">{t('screens.admin.configure')}</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      {t('screens.admin.emailService')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{t('screens.admin.smtpNotificationSettings')}</p>
                    <Button variant="outline" size="sm">{t('screens.admin.configure')}</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      {t('screens.admin.apiKeys')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{t('screens.admin.thirdpartyIntegrations')}</p>
                    <Button variant="outline" size="sm">{t('screens.admin.manage')}</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Vitana Index Configuration */}
            <TabsContent value="vitana" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        {t('screens.admin.vitanaIndexAlgorithmWeights')}
                      </CardTitle>
                      <CardDescription>
                        {t('screens.admin.configureWeightEachHealthMetricVitana')}
                      </CardDescription>
                    </div>
                    <Button onClick={handleSaveWeights} disabled={isUpdating}>
                      <Save className="w-4 h-4 mr-2" />
                      {t('screens.admin.saveWeights')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>{t('screens.admin.sleepValue0', { value0: (weights.sleep * 100).toFixed(0) })}</Label>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[weights.sleep]}
                      onValueChange={([value]) => setWeights({ ...weights, sleep: value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('screens.admin.exerciseValue0', { value0: (weights.exercise * 100).toFixed(0) })}</Label>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[weights.exercise]}
                      onValueChange={([value]) => setWeights({ ...weights, exercise: value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('screens.admin.nutritionValue0', { value0: (weights.nutrition * 100).toFixed(0) })}</Label>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[weights.nutrition]}
                      onValueChange={([value]) => setWeights({ ...weights, nutrition: value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('screens.admin.mentalWellnessValue0', { value0: (weights.mental_wellness * 100).toFixed(0) })}</Label>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[weights.mental_wellness]}
                      onValueChange={([value]) => setWeights({ ...weights, mental_wellness: value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('screens.admin.socialConnectionValue0', { value0: (weights.social_connection * 100).toFixed(0) })}</Label>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[weights.social_connection]}
                      onValueChange={([value]) => setWeights({ ...weights, social_connection: value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('screens.admin.hydrationValue0', { value0: (weights.hydration * 100).toFixed(0) })}</Label>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[weights.hydration]}
                      onValueChange={([value]) => setWeights({ ...weights, hydration: value })}
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">{t('screens.admin.totalWeight')} {(Object.values(weights).reduce((sum, val) => sum + val, 0) * 100).toFixed(0)}%
                      {Object.values(weights).reduce((sum, val) => sum + val, 0) !== 1 && (
                        <span className="text-destructive ml-2">{t('screens.admin.warningShouldEqual100')}</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.scoringTiersConfiguration')}</CardTitle>
                  <CardDescription>
                    {t('screens.admin.defineScoreRangesLabelsForVitana')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{t('screens.admin.currentTiersVeryPoor099Poor')}
                    </p>
                    <Button variant="outline" size="sm">{t('screens.admin.editTiers')}</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Autopilot Configuration */}
            <TabsContent value="autopilot" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    {t('screens.admin.globalAutopilotRules')}
                  </CardTitle>
                  <CardDescription>
                    {t('screens.admin.configureSystemwideAutomationRulesThatApply')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-max-actions">{t('screens.admin.defaultMaxActionsPerDay')}</Label>
                    <Input
                      id="default-max-actions"
                      type="number"
                      min="1"
                      max="20"
                      defaultValue={5}
                      placeholder="5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('screens.admin.globalQuietHours')}</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Input type="time" defaultValue="22:00" />
                      <Input type="time" defaultValue="08:00" />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button>
                      <Save className="w-4 h-4 mr-2" />
                      {t('screens.admin.saveGlobalSettings')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.automationRuleTemplates')}</CardTitle>
                  <CardDescription>
                    {t('screens.admin.createReusableRuleTemplatesThatUsers')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline">
                    {t('screens.admin.manageRuleTemplates')}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations */}
            <TabsContent value="integrations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.thirdpartyIntegrations2')}</CardTitle>
                  <CardDescription>
                    {t('screens.admin.manageApiKeysConfigurationsForExternal')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.admin.integrationManagementComingSoon')}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
