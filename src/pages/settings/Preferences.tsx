import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus, Palette, Globe, Type, Home, Monitor, Sun, Moon, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { settingsNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";
import { ResetDefaultsPopup } from "@/components/ResetDefaultsPopup";
import { useLanguage } from "@/contexts/LanguageContext";

function Preferences() {
  const [activeTab, setActiveTab] = useState("appearance");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const { selectedLanguage, setSelectedLanguage, languageOptions } = useLanguage();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => setThemeMounted(true), []);

  return (
    <AppLayout>
      <SEO title="Preferences | Settings" description="Customize your app preferences and experience" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title="Preferences ⚙️"
            description="Customize your app preferences and experience to make Vitana uniquely yours"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search preferences, themes, language settings..." />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Reset Defaults
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="appearance">🎨 Appearance</SplitBarTrigger>
              <SplitBarTrigger value="language">🌐 Language & Region</SplitBarTrigger>
              <SplitBarTrigger value="accessibility">♿ Accessibility</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="appearance">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Theme Settings"
                    subtitle="Customize Appearance"
                    icon={Palette}
                    content={
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Theme</label>
                          <Select value={themeMounted ? theme : undefined} onValueChange={setTheme}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">
                                <div className="flex items-center gap-2">
                                  <Sun className="w-4 h-4" />
                                  Light
                                </div>
                              </SelectItem>
                              <SelectItem value="dark">
                                <div className="flex items-center gap-2">
                                  <Moon className="w-4 h-4" />
                                  Dark
                                </div>
                              </SelectItem>
                              <SelectItem value="system">
                                <div className="flex items-center gap-2">
                                  <Monitor className="w-4 h-4" />
                                  System
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Primary Color</label>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-primary cursor-pointer"></div>
                            <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-transparent cursor-pointer"></div>
                            <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-transparent cursor-pointer"></div>
                            <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-transparent cursor-pointer"></div>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Compact Mode"
                    subtitle="Space Efficiency"
                    icon={Monitor}
                    content={
                      <div className="space-y-3">
                        <div className="text-center">
                          <Switch />
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          Show more content by reducing spacing
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Current Theme"
                    subtitle="Active Setting"
                    icon={Palette}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-purple-600">
                          {themeMounted ? (resolvedTheme === "dark" ? "Dark" : "Light") : "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {themeMounted && theme === "system" ? "Following system" : "Manual override"}
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="encouragement" />
                </div>

                {/* Row 3: Single Full Row (12) */}
                <div className="col-span-12">
                  <StandardCard
                    title="Advanced Appearance Settings"
                    subtitle="Fine-tune Your Experience"
                    icon={SettingsIcon}
                    content={
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">High Contrast</h4>
                              <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
                            </div>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Reduce Motion</h4>
                              <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
                            </div>
                            <Switch />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Auto Dark Mode</h4>
                              <p className="text-sm text-muted-foreground">Switch themes based on time</p>
                            </div>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Smooth Scrolling</h4>
                              <p className="text-sm text-muted-foreground">Enhanced page navigation</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="language">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Language"
                    subtitle="Current"
                    icon={Globe}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">EN</div>
                        <div className="text-xs text-muted-foreground">English (US)</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Region"
                    subtitle="Time Zone"
                    icon={Globe}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">PST</div>
                        <div className="text-xs text-muted-foreground">Pacific Standard</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Language & Region Settings"
                    subtitle="Customize Localization"
                    icon={Globe}
                    content={
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Voice & AI Language</label>
                          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                              {languageOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            This language is used for voice recognition and AI responses
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Date Format</label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                                <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                                <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Time Format</label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="12">12-hour</SelectItem>
                                <SelectItem value="24">24-hour</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="guidance" />
                </div>

                {/* Row 3: Single Full Row (12) */}
                <div className="col-span-12">
                  <StandardCard
                    title="Regional Preferences"
                    subtitle="Enhanced Localization"
                    icon={Globe}
                    content={
                      <div className="grid grid-cols-2 gap-6 text-sm">
                        <div className="space-y-3">
                          <div className="font-medium">Measurement Units</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Distance</span>
                              <span className="font-medium">Miles</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Weight</span>
                              <span className="font-medium">Pounds</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Temperature</span>
                              <span className="font-medium">Fahrenheit</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="font-medium">Currency & Numbers</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Currency</span>
                              <span className="font-medium">USD ($)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Number Format</span>
                              <span className="font-medium">1,234.56</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">First Day of Week</span>
                              <span className="font-medium">Sunday</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="accessibility">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Accessibility Settings"
                    subtitle="Enhanced Usability"
                    icon={Type}
                    content={
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Font Size</label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                              <SelectItem value="extra-large">Extra Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Screen Reader Support</h4>
                              <p className="text-sm text-muted-foreground">Enhanced navigation for assistive technology</p>
                            </div>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Keyboard Navigation</h4>
                              <p className="text-sm text-muted-foreground">Navigate without mouse</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Font Size"
                    subtitle="Current Setting"
                    icon={Type}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-purple-600">Medium</div>
                        <div className="text-xs text-muted-foreground">16px base size</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Accessibility"
                    subtitle="Features Active"
                    icon={Type}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">3</div>
                        <div className="text-xs text-muted-foreground">Enabled features</div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="partnership" />
                </div>

                {/* Row 3: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Default Views"
                    subtitle="Home Setting"
                    icon={Home}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">Dashboard</div>
                        <div className="text-xs text-muted-foreground">Default home view</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Auto-save"
                    subtitle="Preferences"
                    icon={SettingsIcon}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">On</div>
                        <div className="text-xs text-muted-foreground">Settings saved</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="View Preferences"
                    subtitle="Customize Default Pages"
                    icon={Home}
                    content={
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Homepage Default</label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select default view" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dashboard">Dashboard</SelectItem>
                              <SelectItem value="discover">Discover</SelectItem>
                              <SelectItem value="community">Community</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Calendar Default View</label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select default view" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="month">Month View</SelectItem>
                              <SelectItem value="week">Week View</SelectItem>
                              <SelectItem value="day">Day View</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      <ResetDefaultsPopup isOpen={actionPopupOpen} onClose={() => setActionPopupOpen(false)} />
    </AppLayout>
  );
}

export default withScreenId(Preferences, SCREEN_IDS.SETTINGS_OVERVIEW);