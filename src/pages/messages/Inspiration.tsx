import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { InspirationMasterActionPopup } from "@/components/messages/InspirationMasterActionPopup";
import { Lightbulb, Copy, Send, Plus, Heart, Clock, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { messagesNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

const inspirationTemplates = [
  {
    categoryKey: "screens.messages.inspirationCategory_morningMotivation",
    templates: [
      { textKey: "screens.messages.inspirationTpl_morning1", icon: "☀️" },
      { textKey: "screens.messages.inspirationTpl_morning2", icon: "🌅" },
      { textKey: "screens.messages.inspirationTpl_morning3", icon: "🙏" }
    ]
  },
  {
    categoryKey: "screens.messages.inspirationCategory_goalSupport",
    templates: [
      { textKey: "screens.messages.inspirationTpl_goal1", icon: "🎯" },
      { textKey: "screens.messages.inspirationTpl_goal2", icon: "📈" },
      { textKey: "screens.messages.inspirationTpl_goal3", icon: "⭐" }
    ]
  },
  {
    categoryKey: "screens.messages.inspirationCategory_healthCheckins",
    templates: [
      { textKey: "screens.messages.inspirationTpl_checkin1", icon: "💙" },
      { textKey: "screens.messages.inspirationTpl_checkin2", icon: "🌸" },
      { textKey: "screens.messages.inspirationTpl_checkin3", icon: "🌿" }
    ]
  },
  {
    categoryKey: "screens.messages.inspirationCategory_celebrations",
    templates: [
      { textKey: "screens.messages.inspirationTpl_celebrate1", icon: "🎉" },
      { textKey: "screens.messages.inspirationTpl_celebrate2", icon: "👏" },
      { textKey: "screens.messages.inspirationTpl_celebrate3", icon: "🌟" }
    ]
  }
];

export default function Inspiration() {
  const [inspirationActionOpen, setInspirationActionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");
  return (
    <AppLayout>
      <SEO 
        title={t('screens.messages.communicationInspirationMessages')} 
        description="Get inspired with pre-written messages and templates for your wellness community"
        canonical={window.location.href}
      />
      <SubNavigation items={messagesNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-domain-messages-tint via-background to-domain-messages-tint/50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.messages.communicationInspiration')}
            description="Pre-written messages and templates to inspire your wellness community"
            emoji="💡"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder={t('screens.messages.searchMessageTemplates')}
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setInspirationActionOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('screens.messages.templateActions')}
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="templates">
                {t('screens.messages.templates')}
              </SplitBarTrigger>
              <SplitBarTrigger value="favorites">
                {t('screens.messages.myFavorites')}
              </SplitBarTrigger>
              <SplitBarTrigger value="recent">
                {t('screens.messages.recentlyUsed')}
              </SplitBarTrigger>
              <SplitBarTrigger value="custom">
                {t('screens.messages.customMessages')}
              </SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="templates">
              <div className="space-y-6">
                {inspirationTemplates.map((category, categoryIdx) => (
                  <Card key={categoryIdx}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        {t(category.categoryKey)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {category.templates.map((template, templateIdx) => {
                        const text = t(template.textKey);
                        return (
                        <div key={templateIdx} className="border rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-xl">{template.icon}</span>
                            <p className="text-sm">{text}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(text)}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              {t('screens.messages.copy')}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => console.log(`Forwarding: ${text}`)}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              {t('screens.messages.send')}
                            </Button>
                          </div>
                        </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SplitBarContent>

            <SplitBarContent value="favorites">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    {t('screens.messages.myFavoriteTemplates')}
                    <Badge variant="secondary">0</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">{t('screens.messages.yourSavedFavoriteTemplatesWillAppear')}</p>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="recent">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    {t('screens.messages.recentlyUsedTemplates')}
                    <Badge variant="secondary">0</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">{t('screens.messages.templatesYouVeUsedRecentlyWill')}</p>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="custom">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="w-5 h-5 text-green-500" />
                    {t('screens.messages.customMessages2')}
                    <Badge variant="secondary">0</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">{t('screens.messages.yourCustomCreatedMessagesWillAppear')}</p>
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      
      <InspirationMasterActionPopup 
        open={inspirationActionOpen}
        onOpenChange={setInspirationActionOpen}
      />
    </AppLayout>
  );
}