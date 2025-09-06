import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Mic, Play, Calendar, Clock } from "lucide-react";
import VoiceDiaryRecorder from "@/components/memory/VoiceDiaryRecorder";
import { useState } from "react";

// Sample diary entries for now
const recentEntries = [
  {
    id: 1,
    date: "2024-01-20",
    time: "18:30",
    content: "Had a great workout today. Feeling energized and accomplished. Started with 30 minutes of cardio followed by strength training. My energy levels have been consistently higher since I began this routine.",
    duration: "2:15",
    type: "Voice Entry"
  },
  {
    id: 2,
    date: "2024-01-19",
    time: "22:00",
    content: "Reflecting on today's meditation session. Found it easier to focus and my stress levels seem more manageable. The breathing exercises are really helping with my anxiety.",
    duration: "1:45",
    type: "Voice Entry"
  },
  {
    id: 3,
    date: "2024-01-18",
    time: "07:15",
    content: "Morning gratitude practice. Grateful for good health, supportive family, and the opportunity to grow. Starting the day with positive intentions.",
    duration: "1:30",
    type: "Voice Entry"
  }
];

function Diary() {
  const [isRecording, setIsRecording] = useState(false);

  return (
    <AppLayout>
      <SEO title="Daily Diary - Vitana Memory" description="Record daily voice entries to track your wellness journey and experiences." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="px-6 py-8 space-y-8">
        <StandardHeader 
          title="Daily Diary"
          description="Record your daily experiences and track your wellness journey through voice entries"
        />

        {/* Voice Recording Section */}
        <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mic className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Record Today's Entry</h3>
              <p className="text-muted-foreground">
                Share your thoughts, feelings, and experiences. Your voice will be automatically transcribed and added to your memory timeline.
              </p>
            </div>
            <VoiceDiaryRecorder onRecordingChange={setIsRecording} />
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recent Entries</h2>
            <Badge variant="outline" className="text-sm">
              {recentEntries.length} entries this week
            </Badge>
          </div>
          
          <div className="space-y-4">
            {recentEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Mic className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{entry.type}</Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {entry.date}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {entry.time}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Duration: {entry.duration}
                        </div>
                      </div>
                      <p className="text-foreground leading-relaxed">{entry.content}</p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Play Recording
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Floating Action Button for Quick Recording */}
        {!isRecording && (
          <div className="fixed bottom-8 right-8">
            <Button 
              size="lg" 
              className="h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90"
              aria-label="Quick voice recording"
            >
              <Mic className="h-8 w-8" />
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default withScreenId(Diary, SCREEN_IDS.MEMORY_DIARY);