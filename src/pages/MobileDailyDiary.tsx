import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Type, Camera, Image, X, Plane } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { useTranslation } from "@/hooks/useTranslation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhotoDiaryUploader } from "@/components/diary/PhotoDiaryUploader";
import { TextDiaryEditor } from "@/components/diary/TextDiaryEditor";
import { DiaryEntryList } from "@/components/diary/DiaryEntryList";
import { FeedbackReportList } from "@/components/feedback/FeedbackReportList";
import { Card, CardContent } from "@/components/ui/card";
import { UnifiedCaptureCard, type CaptureMode } from "@/components/capture/UnifiedCaptureCard";

type CategoryTab = "health" | "bugs";
type PlusOption = "text" | "camera" | "photo";

export default function MobileDailyDiary() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const [activeTab, setActiveTab] = useState<CategoryTab>("health");
  const [activePlusOption, setActivePlusOption] = useState<PlusOption | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedbackRefreshKey, setFeedbackRefreshKey] = useState(0);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bugSubMode, setBugSubMode] = useState<'bug_report' | 'ux_improvement'>('bug_report');
  const { pendingCount } = useAutopilot();

  const CATEGORIES: { id: CategoryTab; emoji: string; labelKey: string }[] = [
    { id: "health", emoji: "🩺", labelKey: "diary.healthTab" },
    { id: "bugs", emoji: "🐛", labelKey: "diary.bugTab" },
  ];

  const PLUS_OPTIONS: { id: PlusOption; icon: typeof Type; labelKey: string }[] = [
    { id: "text", icon: Type, labelKey: "diary.text" },
    { id: "camera", icon: Camera, labelKey: "diary.photo" },
  ];

  useEffect(() => {
    if (!isMobile) {
      navigate("/memory/diary", { replace: true });
    }
  }, [isMobile, navigate]);

  if (!isMobile) return null;

  const handleEntryComplete = () => {
    setRefreshKey((k) => k + 1);
    setActivePlusOption(null);
  };

  return (
    <MobileAppShell>
      <div className="px-2 pt-2 pb-0 h-[100dvh] overflow-hidden flex flex-col bg-gradient-to-b from-background to-muted/30">
        {/* Standard header with subtitle */}
        <StandardHeader
          title={translate('diary.title', '📔 Daily Diary')}
          description={translate('diary.description', 'Track your wellness journey and help us improve')}
        />

        {/* Utility action bar */}
        <UtilityActionButton 
          className="pt-1 pb-2 px-1 min-w-0"
          afterGiftVoucherChildren={(
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/health')}
                className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0"
              >
                <span className="text-xs opacity-60">🧬</span>
                <span className="text-sm font-medium text-primary">742</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setAutopilotOpen(true)}
                className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 relative shrink-0"
              >
                <Plane className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{translate('actionBar.autopilot', 'Autopilot')}</span>
                {pendingCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full p-0 flex items-center justify-center text-[10px] animate-pulse"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            </>
          )}
        >
          <div className="flex items-center gap-2 min-w-max">
            <ExpandableSearchButton 
              placeholder={translate('diary.searchPlaceholder', 'Search diary...')}
              onSearch={(query) => setSearchQuery(query)}
            />
            <UniversalCalendarButton />
          </div>
        </UtilityActionButton>

        {/* Two-segment tabs */}
        <div className="flex gap-1 px-1 py-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveTab(cat.id);
                setActivePlusOption(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === cat.id
                  ? cat.id === "health"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-destructive text-destructive-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{translate(cat.labelKey)}</span>
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-[120px] space-y-4 px-1">
          {activeTab === "health" && (
            <>
              {/* Unified voice-first capture card */}
              <UnifiedCaptureCard
                mode="health"
                onRecordingChange={() => {}}
                onSaveComplete={() => setRefreshKey(k => k + 1)}
              />

              {/* Compact action row for text/photo add */}
              <div className="flex gap-2 px-1">
                {PLUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setActivePlusOption(activePlusOption === opt.id ? null : opt.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      activePlusOption === opt.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <opt.icon className="h-3.5 w-3.5" />
                    {translate(opt.labelKey)}
                  </button>
                ))}
              </div>

              {/* Active plus option inline */}
              {activePlusOption && (
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {activePlusOption === "text" && translate('diary.textEntry', '✍️ Text Entry')}
                        {(activePlusOption === "camera" || activePlusOption === "photo") && translate('diary.photoEntry', '📸 Photo Entry')}
                      </span>
                      <button
                        onClick={() => setActivePlusOption(null)}
                        className="p-1 rounded-full hover:bg-muted"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    {activePlusOption === "text" && (
                      <TextDiaryEditor onSaveComplete={handleEntryComplete} />
                    )}
                    {(activePlusOption === "camera" || activePlusOption === "photo") && (
                      <PhotoDiaryUploader onUploadComplete={handleEntryComplete} />
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Unified entry list */}
              <DiaryEntryList />
            </>
          )}

          {activeTab === "bugs" && (
            <>
              {/* Unified voice-first capture card for bugs */}
              <UnifiedCaptureCard
                mode={bugSubMode}
                onModeChange={setBugSubMode}
                onSubmitted={() => setFeedbackRefreshKey((k) => k + 1)}
              />
              <FeedbackReportList refreshKey={feedbackRefreshKey} />
            </>
          )}
        </div>
      </div>

      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen} 
      />
    </MobileAppShell>
  );
}
