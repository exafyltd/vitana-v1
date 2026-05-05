import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";
import { CheckCircle, StopCircle, Zap } from "lucide-react";
import { useState } from "react";
import { t } from '@/lib/i18n-toast';

export function CommandConsolePanel() {
  const [command, setCommand] = useState('');
  const readonly = DEV_HUB_CONFIG.readonly;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('screens.dev.commandConsole')}</CardTitle>
        <CardDescription>
          {readonly 
            ? "Commands disabled in read-only mode" 
            : "Issue commands and test events"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={readonly 
            ? "Command console is read-only until backend routes are confirmed..." 
            : "Enter command or test event payload..."}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          disabled={readonly}
          className="min-h-32 font-mono text-sm"
        />

        <div className="flex gap-2 flex-wrap">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled={readonly} className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t('screens.dev.approve')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('screens.dev.commandsDisabledUntilBackendRoutesConfirmed')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" disabled={readonly} className="gap-2">
                  <StopCircle className="h-4 w-4" />
                  {t('screens.dev.stop')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('screens.dev.commandsDisabledUntilBackendRoutesConfirmed')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" disabled={readonly} className="gap-2">
                  <Zap className="h-4 w-4" />
                  {t('screens.dev.emitTestEvent')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('screens.dev.commandsDisabledUntilBackendRoutesConfirmed')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {readonly && (
          <p className="text-xs text-muted-foreground">{t('screens.dev.phase1ReadonlyModeActiveSet')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
