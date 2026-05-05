import { useState } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MoreHorizontal, Archive, Plus } from "lucide-react";
import { messagesNavigation } from "@/config/navigation";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

export default function Archived() {
  const [activeTab, setActiveTab] = useState("all");
  const [archiveActionOpen, setArchiveActionOpen] = useState(false);
  const { translate } = useTranslation();
  const archivedChats = [
    { id: 1, name: "Dr. Johnson", type: "direct", message: "Thanks for the consultation!", date: "Nov 15, 2023", category: "Healthcare" },
    { id: 2, name: "Yoga Beginners", type: "group", message: "Great session everyone!", date: "Nov 10, 2023", category: "Fitness" },
    { id: 3, name: "Sarah Martinez", type: "direct", message: "Recipe was amazing!", date: "Nov 8, 2023", category: "Nutrition" },
    { id: 4, name: "Weekend Warriors", type: "group", message: "Next hike scheduled for...", date: "Nov 5, 2023", category: "Activities" },
    { id: 5, name: "Dr. Kim", type: "direct", message: "Follow up in 2 weeks", date: "Oct 28, 2023", category: "Healthcare" },
  ];

  const categories = ["All", "Healthcare", "Fitness", "Nutrition", "Activities"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 overflow-x-hidden">
      <SEO title={t('screens.messages.archivedMessages2')} description="View archived conversations and messages" canonical={window.location.href} />
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6 lg:space-y-8">
            <SubNavigation items={messagesNavigation} />
            <StandardHeader 
              title={t('screens.messages.neverLoseImportantConversations')}
              description="View archived conversations and messages"
              emoji="📦"
            />
            
            <UtilityActionButton>
              <ExpandableSearchButton 
                placeholder={translate('archives.searchPlaceholder', 'Search archives...')}
                onSearch={(query) => console.log('Search:', query)}
              />
              <UniversalCalendarButton />
              <Button size="sm" onClick={() => setArchiveActionOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('screens.messages.archiveActions')}
              </Button>
            </UtilityActionButton>

            <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
              <SplitBarList>
                <SplitBarTrigger value="all">
                  {t('screens.messages.allArchives')}
                </SplitBarTrigger>
                <SplitBarTrigger value="recent">
                  {t('screens.messages.recentlyArchived')}
                </SplitBarTrigger>
                <SplitBarTrigger value="category">
                  {t('screens.messages.byCategory')}
                </SplitBarTrigger>
                <SplitBarTrigger value="settings">
                  {t('screens.messages.settings')}
                </SplitBarTrigger>
              </SplitBarList>

              <SplitBarContent value="all">
                <div className="flex h-[calc(100vh-140px)]" style={{ gap: '24px' }}>
                  {/* Left Sidebar - Archive Categories */}
                  <Card className="w-80 flex flex-col">
                    <CardHeader className="border-b">
                      <h2 className="font-semibold mb-3">{t('screens.messages.archivedMessages')}</h2>
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder={t('screens.messages.searchArchives')} className="pl-10" />
                      </div>
                      <div className="space-y-1">
                        {categories.map((category) => (
                          <Button key={category} variant="ghost" className="w-full justify-start">
                            {category}
                          </Button>
                        ))}
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Center - Archived Chat List */}
                  <Card className="flex-1 flex flex-col">
                    <CardHeader className="border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{t('screens.messages.allArchivedConversations')}</h3>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            {t('screens.messages.export')}
                          </Button>
                          <Button variant="ghost" size="sm">
                            {t('screens.messages.deleteSelected')}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 overflow-y-auto p-0">
                      {archivedChats.map((chat) => (
                        <div key={chat.id} className="p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-3 flex-1">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {chat.type === 'group' ? '👥' : chat.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium">{chat.name}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {chat.type === 'group' ? 'Group' : 'Direct'}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {chat.category}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{chat.message}</p>
                                <p className="text-xs text-muted-foreground">{chat.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm">
                                {t('screens.messages.restore')}
                              </Button>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Right Sidebar - Archive Actions */}
                  <Card className="w-80">
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">{t('screens.messages.archiveManagement')}</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">{t('screens.messages.quickActions')}</h4>
                          <div className="space-y-2">
                            <Button variant="outline" className="w-full justify-start">
                              <Archive className="h-4 w-4 mr-2" />
                              {t('screens.messages.archiveCurrentChat')}
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                              {t('screens.messages.exportArchives')}
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                              {t('screens.messages.importArchives')}
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">{t('screens.messages.archiveStatistics')}</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">{t('screens.messages.totalArchived')}</span>
                              <span className="text-sm font-medium">{t('screens.messages.text42Conversations')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">{t('screens.messages.thisMonth')}</span>
                              <span className="text-sm font-medium">{t('screens.messages.text5Conversations')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">{t('screens.messages.storageUsed')}</span>
                              <span className="text-sm font-medium">{t('screens.messages.text125Mb')}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">{t('screens.messages.autoarchiveSettings')}</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{t('screens.messages.autoarchiveAfter30Days')}</span>
                              <input type="checkbox" defaultChecked className="rounded" />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{t('screens.messages.keepImportantChats')}</span>
                              <input type="checkbox" defaultChecked className="rounded" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </SplitBarContent>

              <SplitBarContent value="recent">
                <Card className="p-6">
                  <p className="text-muted-foreground">{t('screens.messages.recentlyArchivedConversationsWillAppearHere')}</p>
                </Card>
              </SplitBarContent>

              <SplitBarContent value="category">
                <Card className="p-6">
                  <p className="text-muted-foreground">{t('screens.messages.categorybasedArchiveViewWillAppearHere')}</p>
                </Card>
              </SplitBarContent>

              <SplitBarContent value="settings">
                <Card className="p-6">
                  <p className="text-muted-foreground">{t('screens.messages.archiveSettingsWillAppearHere')}</p>
                </Card>
              </SplitBarContent>
            </SplitBar>
          </div>
        </div>
      </AppLayout>
    </div>
  );
}