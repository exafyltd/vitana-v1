import { useState, useEffect } from "react";
import { useAutopilotComplete } from "@/hooks/useAutopilotComplete";
import { Plus, Mic, Image, PenSquare, LayoutGrid, List, Bug } from "lucide-react";
import { FeedbackRecorder } from "@/components/feedback/FeedbackRecorder";
import { FeedbackReportList } from "@/components/feedback/FeedbackReportList";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { DiaryMasterActionPopup } from "@/components/memory/DiaryMasterActionPopup";
import VoiceDiaryRecorder from "@/components/memory/VoiceDiaryRecorder";
import { PhotoDiaryUploader } from "@/components/diary/PhotoDiaryUploader";
import { TextDiaryEditor } from "@/components/diary/TextDiaryEditor";
import { DiaryEntryList } from "@/components/diary/DiaryEntryList";
import { PhotoGalleryGrid } from "@/components/diary/PhotoGalleryGrid";
import { PhotoCarouselModal } from "@/components/diary/PhotoCarouselModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

interface SelectedEntry {
  images: string[];
  caption: string;
  tags: string[];
  createdAt: string;
  initialIndex: number;
}

function Diary() {
  const [activeTab, setActiveTab] = useState("voice");
  const { completeBySourceRef } = useAutopilotComplete();
  useEffect(() => { completeBySourceRef('onboarding_diary_day0'); }, [completeBySourceRef]);
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const [photoViewMode, setPhotoViewMode] = useState<"list" | "gallery">("list");
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry | null>(null);
  const [feedbackRefreshKey, setFeedbackRefreshKey] = useState(0);

  // Query for photo entries (used in gallery view)
  const { data: photoEntries } = useQuery({
    queryKey: ["diary-entries", "photo"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("diary_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("source", "photo")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  return (
    <AppLayout>
      <SEO title={t('screens.memory.wellnessDiaryVitanaMemory')} description="Record and review your wellness journey through voice entries, photos, and personal reflections." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title={t('screens.memory.wellnessDiary')}
          description={t('screens.memory.wellnessDiaryMultimediaDescription')}
          emoji="📔"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder={t('screens.memory.searchDiaryEntriesReflections')} />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setActionPopupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('screens.memory.newEntry')}
          </Button>
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
          <SplitBarList>
            <SplitBarTrigger value="voice">{t('screens.memory.voice')}</SplitBarTrigger>
            <SplitBarTrigger value="photos">{t('screens.memory.photos')}</SplitBarTrigger>
            <SplitBarTrigger value="text">{t('screens.memory.text')}</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="voice">
            <div className="mt-6 space-y-6 pb-24">
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    {t('screens.memory.recordTodaySEntry')}
                  </CardTitle>
                  <CardDescription>
                    {t('screens.memory.shareYourThoughtsFeelingsWellnessObservations')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VoiceDiaryRecorder />
                </CardContent>
              </Card>

              <DiaryEntryList entryType="voice" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="photos">
            <div className="mt-6 space-y-6 pb-24">
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Image className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        {t('screens.memory.uploadTodaySEntry')}
                      </CardTitle>
                      <CardDescription>
                        {t('screens.memory.captureShareYourWellnessMomentsThrough')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={photoViewMode === "list" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPhotoViewMode("list")}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={photoViewMode === "gallery" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPhotoViewMode("gallery")}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <PhotoDiaryUploader />
                </CardContent>
              </Card>

              {photoViewMode === "list" ? (
                <DiaryEntryList entryType="photo" />
              ) : (
                <PhotoGalleryGrid
                  entries={(photoEntries || []).map(entry => ({
                    ...entry,
                    attachments: Array.isArray(entry.attachments) ? entry.attachments as string[] : []
                  }))}
                  onEntryClick={(entry) => {
                    setSelectedEntry({
                      images: entry.attachments,
                      caption: entry.text,
                      tags: entry.tags || [],
                      createdAt: entry.created_at,
                      initialIndex: 0,
                    });
                  }}
                />
              )}
            </div>
          </SplitBarContent>

          <SplitBarContent value="text">
            <div className="mt-6 space-y-6 pb-24">
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PenSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    {t('screens.memory.typeYourTodaySEntry')}
                  </CardTitle>
                  <CardDescription>
                    {t('screens.memory.expressYourWellnessJourneyThroughWritten')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TextDiaryEditor />
                </CardContent>
              </Card>

              <DiaryEntryList entryType="text" />
            </div>
          </SplitBarContent>
        </SplitBar>

        {/* Test Feedback Section */}
        <div className="border-t border-border mt-8 pt-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bug className="h-5 w-5 text-destructive" />
              {t('screens.memory.testFeedback')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('screens.memory.helpExafyImproveVitanalandReportBugs')}
            </p>
          </div>

          <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mic className="h-5 w-5 text-red-600 dark:text-red-400" />
                {t('screens.memory.recordFeedback')}
              </CardTitle>
              <CardDescription>{t('screens.memory.describeIssueImprovementAttachScreenshotsIf')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedbackRecorder onSubmitted={() => setFeedbackRefreshKey(k => k + 1)} />
            </CardContent>
          </Card>

          <FeedbackReportList refreshKey={feedbackRefreshKey} />
        </div>

        <DiaryMasterActionPopup 
          open={actionPopupOpen}
          onOpenChange={setActionPopupOpen}
        />

        <PhotoCarouselModal
          open={!!selectedEntry}
          onOpenChange={(open) => !open && setSelectedEntry(null)}
          images={selectedEntry?.images || []}
          caption={selectedEntry?.caption}
          tags={selectedEntry?.tags}
          createdAt={selectedEntry?.createdAt}
          initialIndex={selectedEntry?.initialIndex || 0}
        />
      </div>
    </AppLayout>
  );
}

export default withScreenId(Diary, SCREEN_IDS.MEMORY_DIARY);
