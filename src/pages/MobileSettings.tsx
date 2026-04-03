import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, BellOff, Shield, SlidersHorizontal, LifeBuoy, 
  Trash2, ChevronRight, Plane, Moon 
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { useTranslation } from "@/hooks/useTranslation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { MobileModePill, ModeOption } from "@/components/ui/MobileModePill";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface NavCardProps {
  icon: React.ElementType;
  label: string;
  subtitle?: string;
  route: string;
  variant?: 'default' | 'destructive';
}

function NavCard({ icon: Icon, label, subtitle, route, variant = 'default' }: NavCardProps) {
  const navigate = useNavigate();
  const isDestructive = variant === 'destructive';

  return (
    <button
      onClick={() => navigate(route)}
      className={`w-full flex items-center gap-4 rounded-2xl px-4 py-4 transition-all duration-150 text-left ${
        isDestructive
          ? 'bg-destructive/5 hover:bg-destructive/10 border border-destructive/20'
          : 'bg-card hover:bg-accent/50 border border-border/50'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        isDestructive 
          ? 'bg-destructive/10' 
          : 'bg-primary/10'
      }`}>
        <Icon className={`w-4.5 h-4.5 ${isDestructive ? 'text-destructive' : 'text-primary'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${isDestructive ? 'text-destructive' : 'text-foreground'}`}>
          {label}
        </span>
        {subtitle && (
          <p className={`text-xs mt-0.5 ${isDestructive ? 'text-destructive/60' : 'text-muted-foreground'}`}>
            {subtitle}
          </p>
        )}
      </div>
      <ChevronRight className={`w-4 h-4 shrink-0 ${isDestructive ? 'text-destructive/40' : 'text-muted-foreground/40'}`} />
    </button>
  );
}

export default function MobileSettings() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const { pendingCount } = useAutopilot();
  const { prefs, loading: prefsLoading, updatePref } = useNotificationPreferences();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState('notifications');

  const settingsModes: ModeOption[] = [
    { value: 'notifications', label: translate('settings.notifications', 'Notifications'), icon: '🔔' },
    { value: 'privacy', label: translate('settings.privacy', 'Privacy'), icon: '🛡️' },
    { value: 'preferences', label: translate('settings.preferences', 'Preferences'), icon: '🎛️' },
    { value: 'support', label: translate('settings.support', 'Support'), icon: '🆘' },
  ];

  const sectionRefs = {
    notifications: useRef<HTMLDivElement>(null),
    privacy: useRef<HTMLDivElement>(null),
    preferences: useRef<HTMLDivElement>(null),
    support: useRef<HTMLDivElement>(null),
  };

  const handleSectionChange = (value: string) => {
    setActiveSection(value);
    const ref = sectionRefs[value as keyof typeof sectionRefs];
    ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (!isMobile) {
      navigate("/settings", { replace: true });
    }
  }, [isMobile, navigate]);

  if (!isMobile) return null;

  const handleToggle = async (field: keyof typeof prefs, value: boolean) => {
    try {
      await updatePref(field, value);
    } catch {
      toast.error(translate('settings.updateFailed', 'Failed to update preference'));
    }
  };

  const notificationToggles: { field: keyof typeof prefs; label: string; icon?: React.ElementType }[] = [
    { field: 'live_room_notifications', label: translate('settings.liveRooms', 'Live Rooms') },
    { field: 'community_notifications', label: translate('settings.community', 'Community') },
    { field: 'recommendation_notifications', label: translate('settings.recommendations', 'Recommendations') },
    { field: 'task_notifications', label: translate('settings.tasks', 'Tasks') },
    { field: 'match_notifications', label: translate('settings.matches', 'Matches') },
    { field: 'memory_notifications', label: translate('settings.memory', 'Memory') },
  ];

  return (
    <MobileAppShell>
      <div className="px-4 pt-4 pb-0 h-[100dvh] overflow-hidden flex flex-col bg-gradient-to-b from-background to-muted/30">
        <StandardHeader
          title={translate('settings.title', 'Settings')}
          description={translate('settings.description', 'Manage your preferences and account')}
          emoji="⚙️"
        />

        <UtilityActionButton 
          compact
          className="px-1 min-w-0"
          afterGiftVoucherChildren={(
            <>
              <VitanaIndexChip />
              <AutopilotChip pendingCount={pendingCount} onClick={() => setAutopilotOpen(true)} />
            </>
          )}
        >
          <ExpandableSearchButton
            placeholder={translate('settings.search', 'Search settings...')}
            onSearch={setSearchQuery}
          />
          <MobileModePill
            modes={settingsModes}
            activeMode={activeSection}
            onModeChange={handleSectionChange}
          />
        </UtilityActionButton>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-24 space-y-5 px-0">
          
          {/* Notifications Section */}
          <div ref={sectionRefs.notifications}></div>
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4.5 h-4.5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {translate('settings.notifications', 'Notifications')}
                </h3>
              </div>

              {/* Master push toggle */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  {prefs.push_enabled ? (
                    <Bell className="w-4 h-4 text-primary" />
                  ) : (
                    <BellOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {translate('settings.pushNotifications', 'Push Notifications')}
                  </span>
                </div>
                <Switch
                  checked={prefs.push_enabled}
                  onCheckedChange={(v) => handleToggle('push_enabled', v)}
                  disabled={prefsLoading}
                />
              </div>

              <Separator className="bg-border/30" />

              {/* Category toggles */}
              {notificationToggles.map((item) => (
                <div key={item.field} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-foreground/80">{item.label}</span>
                  <Switch
                    checked={!!prefs[item.field]}
                    onCheckedChange={(v) => handleToggle(item.field, v)}
                    disabled={prefsLoading || !prefs.push_enabled}
                  />
                </div>
              ))}

              <Separator className="bg-border/30" />

              {/* Quiet Hours */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground/80">
                    {translate('settings.quietHours', 'Quiet Hours')}
                  </span>
                </div>
                <Switch
                  checked={prefs.dnd_enabled}
                  onCheckedChange={(v) => handleToggle('dnd_enabled', v)}
                  disabled={prefsLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Navigation Cards */}
          <div className="space-y-2">
            <NavCard
              icon={Shield}
              label={translate('settings.privacy', 'Privacy')}
              subtitle={translate('settings.privacySub', 'Data sharing & visibility')}
              route="/settings/privacy"
            />
            <NavCard
              icon={SlidersHorizontal}
              label={translate('settings.preferences', 'Preferences')}
              subtitle={translate('settings.preferencesSub', 'Language, theme & display')}
              route="/settings/preferences"
            />
            <NavCard
              icon={LifeBuoy}
              label={translate('settings.support', 'Support')}
              subtitle={translate('settings.supportSub', 'Help center & contact us')}
              route="/settings/support"
            />
          </div>

          {/* Delete Account — de-emphasized */}
          <div className="pt-6">
            <NavCard
              icon={Trash2}
              label={translate('settings.deleteAccount', 'Delete Account')}
              subtitle={translate('settings.deleteAccountSub', 'Permanently remove your account and data')}
              route="/delete-account"
              variant="destructive"
            />
          </div>
        </div>
      </div>

      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen} 
      />
    </MobileAppShell>
  );
}
