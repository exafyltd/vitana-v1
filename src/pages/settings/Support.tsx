import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, Phone, Mail, Book, Users, Send, Search, HelpCircle, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { settingsNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";
import { NewTicketPopup } from "@/components/NewTicketPopup";
import { t } from '@/lib/i18n-toast';

function Support() {
  const [activeTab, setActiveTab] = useState("contact");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title={t('screens.settings.supportSettings')} description="Get help and support for your account" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title={t('screens.settings.supportCenter')}
            description="We're here to help you succeed - get help and support for your account"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={t('screens.settings.searchHelpArticlesSupportTopicsFaqs')} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="contact">{t('screens.settings.contactSupport')}</SplitBarTrigger>
              <SplitBarTrigger value="knowledge">{t('screens.settings.knowledgeBase')}</SplitBarTrigger>
              <SplitBarTrigger value="community">{t('screens.settings.communityHelp')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="contact">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title={t('screens.settings.contactSupportOptions')}
                    subtitle="Get Help When You Need It"
                    icon={MessageCircle}
                    content={
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Button className="h-auto p-4 flex flex-col items-center gap-2" variant="outline">
                          <MessageCircle className="w-6 h-6 text-primary" />
                          <div className="text-center">
                            <div className="font-medium text-xs">{t('screens.settings.liveChat')}</div>
                            <div className="text-xs text-muted-foreground">{t('screens.settings.instantHelp')}</div>
                          </div>
                        </Button>
                        <Button className="h-auto p-4 flex flex-col items-center gap-2" variant="outline">
                          <Mail className="w-6 h-6 text-primary" />
                          <div className="text-center">
                            <div className="font-medium text-xs">{t('screens.settings.emailSupport')}</div>
                            <div className="text-xs text-muted-foreground">{t('screens.settings.text24hResponse')}</div>
                          </div>
                        </Button>
                        <Button className="h-auto p-4 flex flex-col items-center gap-2" variant="outline">
                          <Phone className="w-6 h-6 text-primary" />
                          <div className="text-center">
                            <div className="font-medium text-xs">{t('screens.settings.callBack')}</div>
                            <div className="text-xs text-muted-foreground">{t('screens.settings.scheduleCall')}</div>
                          </div>
                        </Button>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.responseTime')}
                    subtitle="Average Support"
                    icon={MessageCircle}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">{t('screens.settings.text2hr')}</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.avgFirstResponse')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.openTickets')}
                    subtitle="Your Support"
                    icon={HelpCircle}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">1</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.activeTicket')}</div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="encouragement" />
                </div>

                {/* Row 3: Single Full Row (12) */}
                <div className="col-span-12">
                  <StandardCard
                    title={t('screens.settings.submitSupportTicket')}
                    subtitle="Describe Your Issue"
                    icon={Send}
                    content={
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Subject</label>
                            <Input placeholder={t('screens.settings.brieflyDescribeYourIssue')} />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Category</label>
                            <select className="w-full p-2 border rounded-md bg-background">
                              <option>{t('screens.settings.selectCategory')}</option>
                              <option>{t('screens.settings.accountIssues')}</option>
                              <option>{t('screens.settings.billingPayments')}</option>
                              <option>{t('screens.settings.technicalProblems')}</option>
                              <option>{t('screens.settings.featureRequests')}</option>
                              <option>{t('screens.settings.privacySecurity')}</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Description</label>
                          <Textarea 
                            placeholder={t('screens.settings.pleaseProvideAsMuchDetailAs')}
                            className="min-h-24"
                          />
                        </div>
                        <Button className="w-full">
                          <Send className="w-4 h-4 mr-2" />
                          Submit Ticket
                        </Button>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="knowledge">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.helpArticles')}
                    subtitle="Available"
                    icon={Book}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">47</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.articlesAvailable')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.mostPopular')}
                    subtitle="Help Topic"
                    icon={Book}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">Setup</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.gettingStarted')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title={t('screens.settings.searchKnowledgeBase')}
                    subtitle="Find Quick Answers"
                    icon={Search}
                    content={
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                          <Input 
                            placeholder={t('screens.settings.searchHelpArticles')}
                            className="pl-10"
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Popular searches: "getting started", "sync issues", "privacy settings"
                        </div>
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
                    title={t('screens.settings.popularHelpArticles')}
                    subtitle="Most Viewed Guides"
                    icon={Book}
                    content={
                      <div className="space-y-3">
                        <div className="p-3 border rounded-lg hover:bg-muted cursor-pointer">
                          <h4 className="font-medium text-sm">{t('screens.settings.gettingStartedWithVitana')}</h4>
                          <p className="text-xs text-muted-foreground">{t('screens.settings.learnBasicsSettingUpYourWellness')}</p>
                        </div>
                        <div className="p-3 border rounded-lg hover:bg-muted cursor-pointer">
                          <h4 className="font-medium text-sm">{t('screens.settings.connectingWearableDevices')}</h4>
                          <p className="text-xs text-muted-foreground">{t('screens.settings.stepbystepGuideSyncYourFitnessTrackers')}</p>
                        </div>
                        <div className="p-3 border rounded-lg hover:bg-muted cursor-pointer">
                          <h4 className="font-medium text-sm">{t('screens.settings.understandingYourVitanaIndex')}</h4>
                          <p className="text-xs text-muted-foreground">{t('screens.settings.howYourWellnessScoreCalculated')}</p>
                        </div>
                        <div className="p-3 border rounded-lg hover:bg-muted cursor-pointer">
                          <h4 className="font-medium text-sm">{t('screens.settings.privacyDataSecurity')}</h4>
                          <p className="text-xs text-muted-foreground">{t('screens.settings.learnHowWeProtectYourPersonal')}</p>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.categories')}
                    subtitle="Help Topics"
                    icon={SettingsIcon}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-purple-600">8</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.helpCategories')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.newestArticles')}
                    subtitle="Recently Added"
                    icon={Book}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">3</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.thisWeek')}</div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="community">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Single Full Row (12) */}
                <div className="col-span-12">
                  <StandardCard
                    title={t('screens.settings.communityHelpSupport')}
                    subtitle="Get Help From Other Users"
                    icon={Users}
                    content={
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.vitanaCommunityHelpGroup')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.getHelpFromOtherUsersShare')}</p>
                            </div>
                            <Button size="sm">{t('screens.settings.joinGroup')}</Button>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.expertUserForum')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.advancedTipsTricksFromPowerUsers')}</p>
                            </div>
                            <Button size="sm" variant="outline">Browse</Button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="font-medium text-sm">{t('screens.settings.communityStats')}</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">{t('screens.settings.activeMembers')}</span>
                              <span className="font-medium">2,847</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">{t('screens.settings.questionsAnswered')}</span>
                              <span className="font-medium">1,234</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">{t('screens.settings.averageResponseTime')}</span>
                              <span className="font-medium">{t('screens.settings.text23Min')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">{t('screens.settings.expertContributors')}</span>
                              <span className="font-medium">47</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="partnership" />
                </div>

                {/* Row 3: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.communitySize')}
                    subtitle="Active Members"
                    icon={Users}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">2.8K</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.helpfulMembers')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.responseRate')}
                    subtitle="Questions Answered"
                    icon={MessageCircle}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">94%</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.successRate')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title={t('screens.settings.recentSupportTickets')}
                    subtitle="Your Support History"
                    icon={HelpCircle}
                    content={
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium text-sm">{t('screens.settings.unableSyncFitbitData')}</h4>
                            <p className="text-xs text-muted-foreground">{t('screens.settings.submittedDec102024')}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-700 text-xs">Resolved</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium text-sm">{t('screens.settings.featureRequestDarkMode')}</h4>
                            <p className="text-xs text-muted-foreground">{t('screens.settings.submittedNov282024')}</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 text-xs">{t('screens.settings.progress')}</Badge>
                        </div>
                        <div className="text-center py-2">
                          <Button variant="outline" size="sm">{t('screens.settings.viewAllTickets')}</Button>
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
      <NewTicketPopup isOpen={actionPopupOpen} onClose={() => setActionPopupOpen(false)} />
    </AppLayout>
  );
}

export default withScreenId(Support, SCREEN_IDS.SETTINGS_OVERVIEW);