import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVisualContext } from '@/hooks/useVisualContext';
import { Monitor, Camera, Eye, EyeOff, Settings } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/lib/i18n-toast';

export const VisualContextControls = () => {
  const { isCapturing, config, setConfig, startCapture, stopCapture } = useVisualContext();
  const [showSettings, setShowSettings] = useState(false);

  const handleIntervalChange = (value: string) => {
    setConfig({ ...config, captureInterval: parseInt(value) });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Visual Context Awareness
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {showSettings && (
        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="screen-share" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Screen Sharing
            </Label>
            <Switch
              id="screen-share"
              checked={config.enableScreen}
              onCheckedChange={(checked) => setConfig({ ...config, enableScreen: checked })}
              disabled={isCapturing}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="camera" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Camera
            </Label>
            <Switch
              id="camera"
              checked={config.enableCamera}
              onCheckedChange={(checked) => setConfig({ ...config, enableCamera: checked })}
              disabled={isCapturing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">{t('screens.common.captureInterval')}</Label>
            <Select
              value={config.captureInterval.toString()}
              onValueChange={handleIntervalChange}
              disabled={isCapturing}
            >
              <SelectTrigger id="interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10000">{t('screens.common.text10Seconds')}</SelectItem>
                <SelectItem value="30000">{t('screens.common.text30Seconds')}</SelectItem>
                <SelectItem value="60000">{t('screens.common.text1Minute')}</SelectItem>
                <SelectItem value="300000">{t('screens.common.text5Minutes')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!isCapturing ? (
          <Button
            onClick={startCapture}
            disabled={!config.enableScreen && !config.enableCamera}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            Start Context Capture
          </Button>
        ) : (
          <Button onClick={stopCapture} variant="destructive" className="flex-1">
            <EyeOff className="h-4 w-4 mr-2" />
            Stop Context Capture
          </Button>
        )}
      </div>

      {isCapturing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Active - Analyzing your visual context
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Visual context helps your AI assistant provide more relevant and timely suggestions based on what you're viewing.
      </p>
    </Card>
  );
};
