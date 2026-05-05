import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { EducationMasterActionPopup } from "@/components/EducationMasterActionPopup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { BookOpen, Video, Headphones, GraduationCap, Play, Clock, Star, Plus } from "lucide-react";
import { healthNavigation } from "@/config/navigation";
import { useState } from "react";
import { t } from '@/lib/i18n-toast';


export default function EducationResources() {
  const [activeSection, setActiveSection] = useState("articles");
  const [educationActionsOpen, setEducationActionsOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title={t('screens.health.educationResourcesHealth')} description="Access health education materials and resources" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.health.educationScience')}
            description="Access curated health education materials linked to your interests and demographic profile."
            emoji="📚"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={t('screens.health.searchArticlesVideosPodcastsTopics')} />
            <UniversalCalendarButton />
            <Button
              variant="default"
              size="sm"
              onClick={() => setEducationActionsOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Education Actions
            </Button>
          </UtilityActionButton>

        <SplitBar value={activeSection} onValueChange={setActiveSection} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="articles">{t('screens.health.articles')}</SplitBarTrigger>
            <SplitBarTrigger value="videos">{t('screens.health.videos')}</SplitBarTrigger>
            <SplitBarTrigger value="podcasts">{t('screens.health.podcasts')}</SplitBarTrigger>
          </SplitBarList>

            <SplitBarContent value="articles" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: "Understanding Your Vitana Index", category: "Health Metrics", readTime: "5 min", rating: 4.8 },
                  { title: "Nutrition Science Explained", category: "Nutrition", readTime: "8 min", rating: 4.9 },
                  { title: "Sleep Quality & Recovery", category: "Sleep Health", readTime: "6 min", rating: 4.7 },
                  { title: "Exercise Physiology Basics", category: "Fitness", readTime: "10 min", rating: 4.6 },
                  { title: "Mental Health & Wellness", category: "Psychology", readTime: "7 min", rating: 4.8 },
                  { title: "Preventive Care Guidelines", category: "Prevention", readTime: "12 min", rating: 4.9 }
                ].map((article, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">{article.category}</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span className="text-xs text-muted-foreground">{article.rating}</span>
                        </div>
                      </div>
                      <CardTitle className="text-lg">{article.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{article.readTime} read</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SplitBarContent>

            <SplitBarContent value="videos" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: "Vitana Index Deep Dive", category: "Health Metrics", duration: "15:30", views: "2.1K" },
                  { title: "Meal Prep for Optimal Health", category: "Nutrition", duration: "22:45", views: "5.8K" },
                  { title: "Sleep Optimization Techniques", category: "Sleep Health", duration: "18:20", views: "3.2K" },
                  { title: "HIIT Workout Science", category: "Fitness", duration: "25:10", views: "7.4K" },
                  { title: "Stress Management Strategies", category: "Mental Health", duration: "20:15", views: "4.6K" },
                  { title: "Lab Results Interpretation", category: "Medical", duration: "12:40", views: "1.9K" }
                ].map((video, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">{video.category}</span>
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-muted-foreground">{video.views} views</span>
                        </div>
                      </div>
                      <CardTitle className="text-lg">{video.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Video className="w-4 h-4" />
                        <span>{video.duration}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SplitBarContent>

            <SplitBarContent value="podcasts" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: "The Science of Longevity", series: "Health Deep Dive", duration: "45:20", episode: "Ep. 12" },
                  { title: "Nutrition Myths Debunked", series: "Food Science", duration: "38:15", episode: "Ep. 8" },
                  { title: "Sleep & Performance", series: "Peak Health", duration: "52:30", episode: "Ep. 15" },
                  { title: "Exercise & Brain Health", series: "Mind & Body", duration: "41:45", episode: "Ep. 22" },
                  { title: "Mental Resilience Training", series: "Psychology Today", duration: "35:10", episode: "Ep. 5" },
                  { title: "Preventive Medicine Trends", series: "Future Health", duration: "48:25", episode: "Ep. 18" }
                ].map((podcast, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">{podcast.series}</span>
                        <span className="text-xs text-muted-foreground">{podcast.episode}</span>
                      </div>
                      <CardTitle className="text-lg">{podcast.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Headphones className="w-4 h-4" />
                        <span>{podcast.duration}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      
      <EducationMasterActionPopup
        open={educationActionsOpen}
        onOpenChange={setEducationActionsOpen}
      />
    </AppLayout>
  );
}