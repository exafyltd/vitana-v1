import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, BellOff, Shield, SlidersHorizontal, LifeBuoy, 
  Trash2, ChevronRight, Moon, Eye, Users, Lock, Brain,
  Palette, Globe, Type, Monitor, Sun, MessageCircle, Phone, Mail, 
  Book, Send, Search, HelpCircle, Settings as SettingsIcon
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { useTranslation } from "@/hooks/useTranslation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { MobileModePill, ModeOption } from "@/components/ui/MobileModePill";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import { useNotificationCategoryPreferences, CategoryPreference } from "@/hooks/useNotificationCategoryPreferences";
import { Switch } from "@/components/ui/switch";
import PushDiagnostics from "@/components/PushDiagnostics";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAIConsent } from "@/hooks/useAIConsent";
import { AIDataConsentDialog } from "@/components/ai/AIDataConsentDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export default function MobileSettings() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const { pendingCount } = useAutopilot();
  const { prefs, loading: prefsLoading, updatePref } = useNotificationPreferences();
  const { categories, loading: catLoading, toggleCategory } = useNotificationCategoryPreferences();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState('notifications');
  const { hasConsent, dialogOpen: consentDialogOpen, setDialogOpen: setConsentDialogOpen, grantConsent, revokeConsent } = useAIConsent();
  const { selectedLanguage, setSelectedLanguage, languageOptions } = useLanguage();

  const settingsModes: ModeOption[] = [
    { value: 'notifications', label: 'Notifications', icon: '🔔' },
    { 
      value: 'privacy', 
      label: 'Privacy', 
      icon: '🛡️',
      children: [
        { value: 'privacy.visibility', label: 'Profile Visibility', icon: '👁️' },
        { value: 'privacy.data', label: 'Data Sharing', icon: '📊' },
        { value: 'privacy.security', label: 'Security', icon: '🔒' },
      ]
    },
    { 
      value: 'preferences', 
      label: 'Preferences', 
      icon: '🎛️',
      children: [
        { value: 'preferences.appearance', label: 'Appearance', icon: '🎨' },
        { value: 'preferences.language', label: 'Language & Region', icon: '🌐' },
      ]
    },
    { 
      value: 'support', 
      label: 'Support', 
      icon: '🆘',
      children: [
        { value: 'support.contact', label: 'Contact Support', icon: '💬' },
        { value: 'support.knowledge', label: 'Knowledge Base', icon: '📚' },
      ]
    },
  ];

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

  const handleCategoryToggle = async (cat: CategoryPreference) => {
    try {
      await toggleCategory(cat.id, !cat.enabled);
    } catch {
      toast.error(translate('settings.updateFailed', 'Failed to update preference'));
    }
  };

  const CATEGORY_TYPE_LABELS: Record<'chat' | 'calendar' | 'community', string> = {
    chat: translate('settings.chat', 'Chat'),
    calendar: translate('settings.calendar', 'Calendar'),
    community: translate('settings.community', 'Community'),
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'notifications':
        return (
          <>
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4.5 h-4.5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  {prefs.push_enabled ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm font-medium text-foreground">Push Notifications</span>
                </div>
                <Switch checked={prefs.push_enabled} onCheckedChange={(v) => handleToggle('push_enabled', v)} disabled={prefsLoading} />
              </div>

              {(['chat', 'calendar', 'community'] as const).map((type) => {
                const items = categories?.[type] || [];
                if (items.length === 0) return null;
                return (
                  <div key={type}>
                    <Separator className="bg-border/30" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 pb-1">
                      {CATEGORY_TYPE_LABELS[type]}
                    </p>
                    {items.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between py-2.5">
                        <div className="flex-1 min-w-0 mr-3">
                          <span className="text-sm text-foreground/80 block">{cat.display_name}</span>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{cat.description}</p>
                          )}
                        </div>
                        <Switch
                          checked={cat.enabled}
                          onCheckedChange={() => handleCategoryToggle(cat)}
                          disabled={catLoading || !prefs.push_enabled}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}

              <Separator className="bg-border/30" />
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground/80">Quiet Hours</span>
                </div>
                <Switch checked={prefs.dnd_enabled} onCheckedChange={(v) => handleToggle('dnd_enabled', v)} disabled={prefsLoading} />
              </div>
            </CardContent>
          </Card>
          <PushDiagnostics />
          </>
        );

      case 'privacy.visibility':
        return (
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4.5 h-4.5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Profile Visibility</h3>
              </div>
              {[
                { title: "Public Profile", desc: "Allow others to find and view your profile", defaultChecked: true },
                { title: "Activity Status", desc: "Show when you're active on the platform", defaultChecked: true },
                { title: "VITANA Index Score", desc: "Share your wellness score with community", defaultChecked: false },
                { title: "Progress Sharing", desc: "Share wellness progress publicly", defaultChecked: false },
                { title: "Achievement Badges", desc: "Display earned achievements", defaultChecked: true },
                { title: "Contact Information", desc: "Allow members to contact you", defaultChecked: false },
                { title: "Location Data", desc: "Share approximate location", defaultChecked: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div className="flex-1 min-w-0 mr-3">
                    <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={item.defaultChecked} />
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 'privacy.data':
        return (
          <>
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4.5 h-4.5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Data Sharing</h3>
                </div>
                {[
                  { title: "Health Data Analytics", desc: "Share anonymized health data to improve AI recommendations", defaultChecked: true },
                  { title: "Community Insights", desc: "Allow your progress to contribute to community statistics", defaultChecked: true },
                  { title: "Third-party Integrations", desc: "Share data with connected apps and services", defaultChecked: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div className="flex-1 min-w-0 mr-3">
                      <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.defaultChecked} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4.5 h-4.5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">AI Data Sharing</h3>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex-1 min-w-0 mr-3">
                    <h4 className="text-sm font-medium text-foreground">Share data with AI provider</h4>
                    <p className="text-xs text-muted-foreground">Allow personal data to be sent to third-party AI services</p>
                  </div>
                  <Switch
                    checked={hasConsent}
                    onCheckedChange={(checked) => {
                      if (checked) setConsentDialogOpen(true);
                      else revokeConsent();
                    }}
                  />
                </div>
                <div className="text-xs text-muted-foreground space-y-1 border-l-2 border-muted pl-3">
                  <p><strong>Data:</strong> Voice, transcripts, prompts, chat, diary, wellness goals, profile context</p>
                  <p><strong>Recipients:</strong> Google (Gemini AI / Cloud AI), Lovable AI Gateway</p>
                  <p><strong>Purpose:</strong> AI responses, voice, greetings, health coaching, enrichment</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasConsent ? "Consent granted. Toggle off to revoke." : "AI features disabled until consent is granted."}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4.5 h-4.5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Data Export & Control</h3>
                </div>
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full" /><span>Request data export anytime</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full" /><span>Delete account and all data</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-purple-500 rounded-full" /><span>View all data sharing activities</span></div>
                </div>
                <Button variant="outline" size="sm" className="mt-2">Request Data Export</Button>
              </CardContent>
            </Card>
          </>
        );

      case 'privacy.security':
        return (
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4.5 h-4.5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Security</h3>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex-1 min-w-0 mr-3">
                  <h4 className="text-sm font-medium text-foreground">Password Protection</h4>
                  <p className="text-xs text-muted-foreground">Last changed 30 days ago</p>
                </div>
                <Button variant="outline" size="sm">Change</Button>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex-1 min-w-0 mr-3">
                  <h4 className="text-sm font-medium text-foreground">Two-Factor Authentication</h4>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex-1 min-w-0 mr-3">
                  <h4 className="text-sm font-medium text-foreground">Biometric Login</h4>
                  <p className="text-xs text-muted-foreground">Use fingerprint or face recognition</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex-1 min-w-0 mr-3">
                  <h4 className="text-sm font-medium text-foreground">Login Alerts</h4>
                  <p className="text-xs text-muted-foreground">Get notified of new logins</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator className="bg-border/30" />
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Active Sessions</h4>
                <div className="space-y-2">
                  {[
                    { device: "iPhone 15 Pro", location: "San Francisco, CA", current: true },
                    { device: "MacBook Pro", location: "San Francisco, CA", current: false },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{s.device}</p>
                        <p className="text-xs text-muted-foreground">{s.location}</p>
                      </div>
                      {s.current ? (
                        <span className="text-xs text-green-600 font-medium">Current</span>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-xs text-destructive">Revoke</Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'preferences.appearance':
        return (
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4.5 h-4.5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Theme</label>
                <Select>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select theme" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="w-4 h-4" /> Light</div></SelectItem>
                    <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="w-4 h-4" /> Dark</div></SelectItem>
                    <SelectItem value="system"><div className="flex items-center gap-2"><Monitor className="w-4 h-4" /> System</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Primary Color</label>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-primary cursor-pointer" />
                  <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-transparent cursor-pointer" />
                  <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-transparent cursor-pointer" />
                  <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-transparent cursor-pointer" />
                </div>
              </div>
              <Separator className="bg-border/30" />
              {[
                { title: "Compact Mode", desc: "Show more content by reducing spacing", defaultChecked: false },
                { title: "High Contrast", desc: "Increase contrast for better visibility", defaultChecked: false },
                { title: "Reduce Motion", desc: "Minimize animations and transitions", defaultChecked: false },
                { title: "Auto Dark Mode", desc: "Switch themes based on time", defaultChecked: false },
                { title: "Smooth Scrolling", desc: "Enhanced page navigation", defaultChecked: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div className="flex-1 min-w-0 mr-3">
                    <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={item.defaultChecked} />
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 'preferences.language':
        return (
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4.5 h-4.5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Language & Region</h3>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Voice & AI Language</label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Used for voice recognition and AI responses</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Date Format</label>
                  <Select><SelectTrigger><SelectValue placeholder="Format" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Time Format</label>
                  <Select><SelectTrigger><SelectValue placeholder="Format" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12-hour</SelectItem>
                      <SelectItem value="24">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator className="bg-border/30" />
              <div className="space-y-2 text-sm">
                <h4 className="font-medium text-foreground">Regional Settings</h4>
                {[
                  ["Distance", "Miles"],
                  ["Weight", "Pounds"],
                  ["Temperature", "Fahrenheit"],
                  ["Currency", "USD ($)"],
                  ["First Day of Week", "Sunday"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'support.contact':
        return (
          <>
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-4.5 h-4.5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Contact Support</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: MessageCircle, label: "Live Chat", sub: "Instant help" },
                    { icon: Mail, label: "Email", sub: "24h response" },
                    { icon: Phone, label: "Call Back", sub: "Schedule" },
                  ].map((item, i) => (
                    <Button key={i} className="h-auto p-3 flex flex-col items-center gap-1.5" variant="outline">
                      <item.icon className="w-5 h-5 text-primary" />
                      <span className="font-medium text-xs">{item.label}</span>
                      <span className="text-[10px] text-muted-foreground">{item.sub}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Send className="w-4.5 h-4.5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Submit a Ticket</h3>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Subject</label>
                  <Input placeholder="Briefly describe your issue" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category</label>
                  <Select><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="account">Account Issues</SelectItem>
                      <SelectItem value="billing">Billing & Payments</SelectItem>
                      <SelectItem value="technical">Technical Problems</SelectItem>
                      <SelectItem value="feature">Feature Requests</SelectItem>
                      <SelectItem value="privacy">Privacy & Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <Textarea placeholder="Please provide as much detail as possible..." className="min-h-20" />
                </div>
                <Button className="w-full"><Send className="w-4 h-4 mr-2" />Submit Ticket</Button>
              </CardContent>
            </Card>
          </>
        );

      case 'support.knowledge':
        return (
          <>
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4.5 h-4.5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Knowledge Base</h3>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input placeholder="Search help articles..." className="pl-10" />
                </div>
                <p className="text-xs text-muted-foreground">Popular: "getting started", "sync issues", "privacy settings"</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Book className="w-4.5 h-4.5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Popular Articles</h3>
                </div>
                {[
                  { title: "Getting Started with Vitana", desc: "Learn the basics of setting up your wellness journey" },
                  { title: "Connecting Wearable Devices", desc: "Step-by-step guide to sync your fitness trackers" },
                  { title: "Understanding Your VITANA Index", desc: "How your wellness score is calculated" },
                  { title: "Privacy and Data Security", desc: "Learn how we protect your personal information" },
                ].map((a, i) => (
                  <div key={i} className="p-3 border border-border/50 rounded-xl hover:bg-muted/50 cursor-pointer">
                    <h4 className="text-sm font-medium">{a.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        );

      default:
        return null;
    }
  };

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
            onModeChange={setActiveSection}
          />
        </UtilityActionButton>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-24 space-y-3 px-0">
          {renderContent()}

          {/* Delete Account — always visible at bottom */}
          <div className="pt-4">
            <button
              onClick={() => navigate('/delete-account')}
              className="w-full flex items-center gap-4 rounded-2xl px-4 py-4 transition-all duration-150 text-left bg-destructive/5 hover:bg-destructive/10 border border-destructive/20"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-destructive/10">
                <Trash2 className="w-4.5 h-4.5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-destructive">Delete Account</span>
                <p className="text-xs mt-0.5 text-destructive/60">Permanently remove your account and data</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 text-destructive/40" />
            </button>
          </div>
        </div>
      </div>

      <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
      <AIDataConsentDialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen} onConsent={grantConsent} />
    </MobileAppShell>
  );
}
