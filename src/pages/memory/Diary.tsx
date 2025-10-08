import { useState } from "react";
import { Plus, Mic, Image, PenSquare } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

function Diary() {
  const [activeTab, setActiveTab] = useState("voice");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Wellness Diary | VITANA Memory" description="Record and review your wellness journey through voice entries, photos, and personal reflections." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title="Wellness Diary"
          description="Record and review your wellness journey through multimedia entries."
          emoji="📔"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder="Search diary entries and reflections..." />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setActionPopupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
          <SplitBarList>
            <SplitBarTrigger value="voice">Voice</SplitBarTrigger>
            <SplitBarTrigger value="photos">Photos</SplitBarTrigger>
            <SplitBarTrigger value="text">Text</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="voice">
            <div className="mt-6 space-y-6">
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Record Today's Entry
                  </CardTitle>
                  <CardDescription>
                    Share your thoughts, feelings, and wellness observations
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
            <div className="mt-6 space-y-6">
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Upload Today's Entry
                  </CardTitle>
                  <CardDescription>
                    Capture and share your wellness moments through photos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PhotoDiaryUploader />
                </CardContent>
              </Card>

              <DiaryEntryList entryType="photo" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="text">
            <div className="mt-6 space-y-6">
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PenSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Type Your Today's Entry
                  </CardTitle>
                  <CardDescription>
                    Express your wellness journey through written reflections
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

        <DiaryMasterActionPopup 
          open={actionPopupOpen}
          onOpenChange={setActionPopupOpen}
        />
      </div>
    </AppLayout>
  );
}

export default withScreenId(Diary, SCREEN_IDS.MEMORY_DIARY);
