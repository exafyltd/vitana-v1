import React from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Clock, FileText, CheckCircle, Zap, Lock, Calendar, Users, Headphones, Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotCategory, AutopilotPriority } from "@/types/autopilot";
import { homeNavigation } from "@/config/navigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Search, Plus } from "lucide-react";
import { ManageMyActionsPopup } from "@/components/ManageMyActionsPopup";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { HorizontalCardList } from "@/components/ui/horizontal-card-list";
import { HorizontalVisualCardsScroll } from "@/components/ui/horizontal-visual-cards-scroll";
import { transformAutopilotActionsToVisualCards } from "@/lib/autopilot-transformers";
import { HorizontalCardSkeleton } from "@/components/ui/horizontal-card-skeleton";
import { useToast } from '@/hooks/use-toast';
import { notify } from '@/lib/i18n-toast';

export default function Actions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { pendingActions, executeActions, toggleActionSelection, dismissActions } = useAutopilot();
  const [manageActionsOpen, setManageActionsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Guide rail visibility - set to true when Guide widgets are added
  const hasGuide = false;

  const handleExecuteAction = async (actionId: string) => {
    await executeActions([actionId]);
    notify('toasts.home.actionExecuted', 'toasts.home.yourActionHasCompletedSuccessfully');
  };

  const handleDismissAction = (actionId: string) => {
    dismissActions([actionId]);
    notify('toasts.home.actionDismissed', 'toasts.home.thisActionHasRemovedFromYour');
  };

  const getCategoryIcon = (category: AutopilotCategory) => {
    switch (category) {
      case "health": return Heart;
      case "community": return Users;
      case "media": return Headphones;
      case "discover": return ShoppingCart;
      case "calendar": return Calendar;
      default: return Star;
    }
  };

  const getCategoryColor = (category: AutopilotCategory) => {
    switch (category) {
      case "health": return "text-green-600 bg-green-50 border-green-200";
      case "community": return "text-purple-600 bg-purple-50 border-purple-200";
      case "media": return "text-blue-600 bg-blue-50 border-blue-200"; 
      case "discover": return "text-orange-600 bg-orange-50 border-orange-200";
      case "calendar": return "text-indigo-600 bg-indigo-50 border-indigo-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getPriorityColor = (priority: AutopilotPriority) => {
    switch (priority) {
      case "high": return "text-red-500 bg-red-50";
      case "medium": return "text-amber-600 bg-amber-50";
      case "low": return "text-green-600 bg-green-50";
    }
  };

  const actionsByCategory = pendingActions.reduce((acc, action) => {
    if (!acc[action.category]) acc[action.category] = [];
    acc[action.category].push(action);
    return acc;
  }, {} as Record<AutopilotCategory, typeof pendingActions>);

  const categories: { key: AutopilotCategory; label: string; count: number }[] = [
    { key: "health", label: "Health & Biomarkers", count: actionsByCategory.health?.length || 0 },
    { key: "community", label: "Community & Social", count: actionsByCategory.community?.length || 0 },
    { key: "media", label: "Media & Learning", count: actionsByCategory.media?.length || 0 },
    { key: "discover", label: "Discover Shop & Services", count: actionsByCategory.discover?.length || 0 },
    { key: "calendar", label: "Calendar & Productivity", count: actionsByCategory.calendar?.length || 0 }
  ];

  return (
    <AppLayout>
      <SEO title="Actions | Dashboard" description="Next Best Actions & Today's Plan" canonical={window.location.href} />
      <SubNavigation items={homeNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-pink-50/50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-pink-950/20 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Next Best Actions & Today's Plan"
            description="Autopilot = your decision partner."
            emoji="⭐"
          />

          {/* Action Buttons */}
          <UtilityActionButton className="mb-6">
            <ExpandableSearchButton 
              placeholder="Search actions, categories, or autopilot tasks…"
              onSearch={(query) => console.log('Search Actions:', query)}
            />
            <UniversalCalendarButton />
            <Button variant="default" size="sm" onClick={() => setManageActionsOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Actions
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation */}
          <SplitBar defaultValue="pending" className="w-full">
            <SplitBarList className="grid w-full grid-cols-4">
              <SplitBarTrigger value="pending">⏳ Pending</SplitBarTrigger>
              <SplitBarTrigger value="categories">📂 Categories</SplitBarTrigger>
              <SplitBarTrigger value="completed">✅ Completed</SplitBarTrigger>
              <SplitBarTrigger value="failed">❌ Failed</SplitBarTrigger>
            </SplitBarList>
            
            {/* Soft separator gradient line */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border/60 to-transparent my-4" />

            {/* Pending Actions Tab */}
            <SplitBarContent value="pending">
              <div className="mt-2">
                {/* AI contextual hint */}
                <div className="mb-6 px-1">
                  <p className="text-sm text-muted-foreground/80 flex items-center gap-2">
                    <span className="text-base">🤖</span>
                    <span>Autopilot analyzed your routines and found <strong className="text-foreground font-semibold">{pendingActions.length} optimized actions</strong> for today.</span>
                  </p>
                </div>
                
                <div className="grid grid-cols-12 gap-6 xl:gap-7">
                  <section
                    className={cn(
                      "col-span-12",
                      hasGuide ? "xl:col-span-9" : "xl:col-span-12"
                    )}
                    data-testid="actions-main-rail"
                  >
                    {pendingActions.length > 0 ? (
          <HorizontalCardList
            variant="visual"
            layout="stack"
            items={transformAutopilotActionsToVisualCards(
              pendingActions.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
              }),
              'home_actions_pending',
              handleExecuteAction,
              handleDismissAction
            ).map(item => ({ ...item, layoutMode: 'stack' as const }))}
            screenId="home_actions_pending"
            listId="pending-actions"
            infiniteScroll={false}
            className="mt-4"
            emptyState={
              <div className="text-center py-12">
                <p className="text-muted-foreground">No pending actions</p>
              </div>
            }
          />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                          <Zap className="w-8 h-8 text-gray-400" />
                        </div>
                        <p>No pending actions</p>
                      </div>
                    )}
                  </section>
                  
                  {hasGuide && (
                    <aside className="hidden xl:block xl:col-span-3" data-testid="actions-guide-rail">
                      <div className="sticky top-6 space-y-4">
                        {/* Future: Quick stats, tips, or filters */}
                      </div>
                    </aside>
                  )}
                </div>
              </div>
            </SplitBarContent>

            {/* Categories Tab */}
            <SplitBarContent value="categories">
              <div className="mt-6">
                <div className="grid grid-cols-12 gap-6 xl:gap-7">
                  <section
                    className={cn(
                      "col-span-12",
                      hasGuide ? "xl:col-span-9" : "xl:col-span-12"
                    )}
                    data-testid="actions-main-rail"
                  >
                    <Tabs defaultValue="health" className="w-full">
                      <TabsList className="grid grid-cols-5 w-full mb-4">
                        {categories.map(category => {
                          const IconComponent = getCategoryIcon(category.key);
                          return (
                            <TabsTrigger 
                              key={category.key} 
                              value={category.key}
                              className="text-xs"
                            >
                              <IconComponent className="w-4 h-4 mr-1" />
                              {category.label.split(' ')[0]} ({category.count})
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>

                      {categories.map(category => (
                        <TabsContent key={category.key} value={category.key} className="space-y-6">
                          {actionsByCategory[category.key]?.length > 0 ? (
                            <>
                              <HorizontalCardList
                                variant="visual"
                                layout="stack"
                                items={transformAutopilotActionsToVisualCards(
                                  actionsByCategory[category.key].sort((a, b) => {
                                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                                  }),
                                  `home_actions_${category.key}`,
                                  handleExecuteAction,
                                  handleDismissAction
                                ).map(item => ({ ...item, layoutMode: 'stack' as const }))}
                                screenId={`home_actions_${category.key}`}
                                listId={`${category.key}-actions`}
                                infiniteScroll={false}
                                className="mt-4"
                              />
                              <div className="flex justify-between pt-4">
                                <Button 
                                  variant="outline"
                                  onClick={() => executeActions(actionsByCategory[category.key].map(a => a.id))}
                                >
                                  <Zap className="w-4 h-4 mr-2" />
                                  Execute All {category.label.split(' ')[0]}
                                </Button>
                                <Button variant="ghost" size="sm">
                                  Configure Category
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                                {React.createElement(getCategoryIcon(category.key), { className: "w-8 h-8 text-gray-400" })}
                              </div>
                              <p>No {category.label.toLowerCase()} actions available</p>
                            </div>
                          )}
                        </TabsContent>
                      ))}
                    </Tabs>
                  </section>
                  
                  {hasGuide && (
                    <aside className="hidden xl:block xl:col-span-3" data-testid="actions-guide-rail">
                      <div className="sticky top-6 space-y-4">
                        {/* Future: Category insights */}
                      </div>
                    </aside>
                  )}
                </div>
              </div>
            </SplitBarContent>

            {/* Completed Actions Tab */}
            <SplitBarContent value="completed">
              <div className="mt-6">
                <div className="grid grid-cols-12 gap-6 xl:gap-7">
                  <section
                    className={cn(
                      "col-span-12",
                      hasGuide ? "xl:col-span-9" : "xl:col-span-12"
                    )}
                    data-testid="actions-main-rail"
                  >
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-gray-400" />
                      </div>
                      <p>No completed actions to show</p>
                    </div>
                  </section>
                  
                  {hasGuide && (
                    <aside className="hidden xl:block xl:col-span-3" data-testid="actions-guide-rail">
                      <div className="sticky top-6 space-y-4">
                        {/* Future: Completion stats */}
                      </div>
                    </aside>
                  )}
                </div>
              </div>
            </SplitBarContent>

            {/* Failed Actions Tab */}
            <SplitBarContent value="failed">
              <div className="mt-6">
                <div className="grid grid-cols-12 gap-6 xl:gap-7">
                  <section
                    className={cn(
                      "col-span-12",
                      hasGuide ? "xl:col-span-9" : "xl:col-span-12"
                    )}
                    data-testid="actions-main-rail"
                  >
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <p>No failed actions to show</p>
                    </div>
                  </section>
                  
                  {hasGuide && (
                    <aside className="hidden xl:block xl:col-span-3" data-testid="actions-guide-rail">
                      <div className="sticky top-6 space-y-4">
                        {/* Future: Error analytics */}
                      </div>
                    </aside>
                  )}
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      
      <ManageMyActionsPopup open={manageActionsOpen} onOpenChange={setManageActionsOpen} />
    </AppLayout>
  );
}