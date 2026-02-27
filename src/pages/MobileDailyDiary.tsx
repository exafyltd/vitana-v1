import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Camera, PenLine, ChevronDown, ChevronUp, Bug } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/useTranslation";
import VoiceDiaryRecorder from "@/components/memory/VoiceDiaryRecorder";
import { PhotoDiaryUploader } from "@/components/diary/PhotoDiaryUploader";
import { TextDiaryEditor } from "@/components/diary/TextDiaryEditor";
import { DiaryEntryList } from "@/components/diary/DiaryEntryList";
import { FeedbackRecorder } from "@/components/feedback/FeedbackRecorder";
import { FeedbackReportList } from "@/components/feedback/FeedbackReportList";
import { Card, CardContent } from "@/components/ui/card";

type EntryMode = "voice" | "photo" | "text";

const TABS: { id: EntryMode; emoji: string; label: string }[] = [
  { id: "voice", emoji: "🎤", label: "Voice" },
  { id: "photo", emoji: "📸", label: "Photo" },
  { id: "text",  emoji: "✍️", label: "Text" },
];

export default function MobileDailyDiary() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const [activeTab, setActiveTab] = useState<EntryMode>("voice");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedbackRefreshKey, setFeedbackRefreshKey] = useState(0);

  useEffect(() => {
    if (!isMobile) {
      navigate("/memory/diary", { replace: true });
    }
  }, [isMobile, navigate]);

  if (!isMobile) return null;

  const handleEntryComplete = () => setRefreshKey((k) => k + 1);

  return (
    <div className="px-2 pt-2 pb-0 h-[100dvh] overflow-hidden flex flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Compact header */}
      <div className="pt-2 pb-1 px-1">
        <h1 className="text-xl font-bold text-foreground">
          📔 {translate("drawerNav.diary", "Daily Diary")}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {translate("diary.subtitle", "Track your day & help us improve")}
        </p>
      </div>

      {/* Pill tabs */}
      <div className="flex gap-2 px-1 py-2 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-[120px] space-y-4 px-1">
        {/* Entry card */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-3">
            {activeTab === "voice" && (
              <VoiceDiaryRecorder onRecordingChange={() => {}} />
            )}
            {activeTab === "photo" && (
              <PhotoDiaryUploader onUploadComplete={handleEntryComplete} />
            )}
            {activeTab === "text" && (
              <TextDiaryEditor onSaveComplete={handleEntryComplete} />
            )}
          </CardContent>
        </Card>

        {/* Entry list */}
        <DiaryEntryList entryType={activeTab} />

        {/* Feedback section */}
        <div className="mt-4">
          <button
            onClick={() => setFeedbackOpen(!feedbackOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-sm font-medium text-foreground"
          >
            <span className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-destructive" />
              {translate("diary.testFeedback", "Test Feedback")}
            </span>
            {feedbackOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {feedbackOpen && (
            <div className="mt-2 space-y-3">
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-3">
                  <FeedbackRecorder
                    onSubmitted={() => setFeedbackRefreshKey((k) => k + 1)}
                  />
                </CardContent>
              </Card>
              <FeedbackReportList refreshKey={feedbackRefreshKey} />
            </div>
          )}
        </div>
      </div>
    </div>
    </MobileAppShell>
  );
}
