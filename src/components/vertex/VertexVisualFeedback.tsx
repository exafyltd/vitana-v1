import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Volume2, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { t } from '@/lib/i18n-toast';

interface VertexVisualFeedbackProps {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  isRecording: boolean;
  audioLevel: number;
  userTranscript: string;
  aiTranscript: string;
  isAISpeaking: boolean;
}

export function VertexVisualFeedback({
  connectionState,
  isRecording,
  audioLevel,
  userTranscript,
  aiTranscript,
  isAISpeaking
}: VertexVisualFeedbackProps) {
  
  const getConnectionBadge = () => {
    switch (connectionState) {
      case 'connected':
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            <Wifi className="h-3 w-3 mr-1" />
            {t('screens.vertex.connected')}
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {t('screens.vertex.connecting')}
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <WifiOff className="h-3 w-3 mr-1" />
            {t('screens.vertex.error')}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <WifiOff className="h-3 w-3 mr-1" />
            {t('screens.vertex.disconnected')}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{t('screens.vertex.connectionStatus')}</CardTitle>
            {getConnectionBadge()}
          </div>
        </CardHeader>
      </Card>

      {/* Microphone & Audio Level */}
      {isRecording && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mic className="h-4 w-4 text-red-500 animate-pulse" />
              {t('screens.vertex.recording')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('screens.vertex.audioLevel')}</span>
                <span>{Math.round(audioLevel)}%</span>
              </div>
              <Progress value={audioLevel} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Speaking Indicator */}
      {isAISpeaking && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary animate-pulse" />
              {t('screens.vertex.aiSpeaking')}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Conversation Transcript */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t('screens.vertex.conversationTranscript')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <div className="space-y-4">
              {userTranscript && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{t('screens.vertex.you')}</Badge>
                  </div>
                  <p className="text-sm bg-secondary/30 p-3 rounded-lg">
                    {userTranscript}
                  </p>
                </div>
              )}
              
              {aiTranscript && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                      AI
                    </Badge>
                  </div>
                  <p className="text-sm bg-primary/5 p-3 rounded-lg border border-primary/20">
                    {aiTranscript}
                  </p>
                </div>
              )}

              {!userTranscript && !aiTranscript && (
                <p className="text-sm text-muted-foreground text-center py-8">{t('screens.vertex.transcriptWillAppearHere')}
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
