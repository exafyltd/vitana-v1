import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Camera, Mic, Eye } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface VertexMediaPreviewProps {
  isScreenSharing: boolean;
  isCameraActive: boolean;
  isRecording: boolean;
}

export function VertexMediaPreview({ 
  isScreenSharing, 
  isCameraActive,
  isRecording 
}: VertexMediaPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('screens.vertex.aiVisionPreview')}</CardTitle>
        <CardDescription>{t('screens.vertex.whatAiCanSee')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Screen Preview */}
        {isScreenSharing && (
          <div className="border-2 border-blue-500 rounded-lg p-3 bg-blue-50">
            <div className="flex items-center gap-2 mb-1">
              <Monitor className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm text-blue-900">{t('screens.vertex.screenSharingActive')}</span>
            </div>
            <p className="text-xs text-blue-700">
              AI can see your screen at 1 frame per second
            </p>
          </div>
        )}
        
        {/* Camera Preview */}
        {isCameraActive && (
          <div className="border-2 border-green-500 rounded-lg p-3 bg-green-50">
            <div className="flex items-center gap-2 mb-1">
              <Camera className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm text-green-900">{t('screens.vertex.cameraActive')}</span>
            </div>
            <p className="text-xs text-green-700">
              AI can see your camera feed at 1 frame per second
            </p>
          </div>
        )}
        
        {/* Audio Preview */}
        {isRecording && (
          <div className="border-2 border-red-500 rounded-lg p-3 bg-red-50">
            <div className="flex items-center gap-2 mb-1">
              <Mic className="h-4 w-4 text-red-600 animate-pulse" />
              <span className="font-medium text-sm text-red-900">{t('screens.vertex.microphoneActive')}</span>
            </div>
            <p className="text-xs text-red-700">
              AI is listening to your voice
            </p>
          </div>
        )}
        
        {/* Idle State */}
        {!isScreenSharing && !isCameraActive && !isRecording && (
          <div className="text-center py-6 text-muted-foreground">
            <Eye className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('screens.vertex.noActiveInputs')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
