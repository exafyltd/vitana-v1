import { useUrlTab } from "@/hooks/useUrlTab";
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
import { t } from '@/lib/i18n-toast';

function Preferences() {
  const [activeTab, setActiveTab] = useUrlTab("section", "appearance");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const { selectedLanguage, setSelectedLanguage, languageOptions } = useLanguage();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => setThemeMounted(true), []);

  return (
    <AppLayout>
      <SEO title={t('screens.settings.preferencesSettings')} description="Customize your app preferences and experience" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title={t('screens.settings.preferences')}
            description="Customize your app preferences and experience to make Vitana uniquely yours"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={t('screens.settings.searchPreferencesThemesLanguageSettings')} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('screens.settings.resetDefaults')}
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="appearance">{t('screens.settings.appearance')}</SplitBarTrigger>
              <SplitBarTrigger value="language">{t('screens.settings.languageRegion')}</SplitBarTrigger>
              <SplitBarTrigger value="accessibility">{t('screens.settings.accessibility')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="appearance">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title={t('screens.settings.themeSettings')}
                    subtitle="Customize Appearance"
                    icon={Palette}
                    content={
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('screens.settings.theme')}</label>
                          <Select value={themeMounted ? theme : undefined} onValueChange={setTheme}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t('screens.settings.selectTheme')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">
                                <div className="flex items-center gap-2">
                                  <Sun className="w-4 h-4" />
                                  {t('screens.settings.light')}
                                </div>
                              </SelectItem>
                              <SelectItem value="dark">
                                <div className="flex items-center gap-2">
                                  <Moon className="w-4 h-4" />
                                  {t('screens.settings.dark')}
                                </div>
                              </SelectItem>
                              <SelectItem value="system">
                                <div className="flex items-center gap-2">
                                  <Monitor className="w-4 h-4" />
                                  {t('screens.settings.system')}
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('screens.settings.primaryColor')}</label>
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
                    title={t('screens.settings.compactMode')}
                    subtitle="Space Efficiency"
                    icon={Monitor}
                    content={
                      <div className="space-y-3">
                        <div className="text-center">
                          <Switch />
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          {t('screens.settings.showMoreContentByReducingSpacing')}
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.currentTheme')}
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
                    title={t('screens.settings.advancedAppearanceSettings')}
                    subtitle="Fine-tune Your Experience"
                    icon={SettingsIcon}
                    content={
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.highContrast')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.increaseContrastForBetterVisibility')}</p>
                            </div>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.reduceMotion')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.minimizeAnimationsTransitions')}</p>
                            </div>
                            <Switch />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.autoDarkMode')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.switchThemesBasedTime')}</p>
                            </div>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.smoothScrolling')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.enhancedPageNavigation')}</p>
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
                    title={t('screens.settings.language')}
                    subtitle="Current"
                    icon={Globe}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">EN</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.englishUs')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.region')}
                    subtitle="Time Zone"
                    icon={Globe}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">{t('screens.settings.pst')}</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.pacificStandard')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title={t('screens.settings.languageRegionSettings')}
                    subtitle="Customize Localization"
                    icon={Globe}
                    content={
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('screens.settings.voiceAiLanguage')}</label>
                          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('screens.settings.selectLanguage')} />
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
                            {t('screens.settings.thisLanguageUsedForVoiceRecognition')}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">{t('screens.settings.dateFormat')}</label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder={t('screens.settings.selectFormat')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mm/dd/yyyy">{t('screens.settings.mmddyyyy')}</SelectItem>
                                <SelectItem value="dd/mm/yyyy">{t('screens.settings.ddmmyyyy')}</SelectItem>
                                <SelectItem value="yyyy-mm-dd">{t('screens.settings.yyyymmdd')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">{t('screens.settings.timeFormat')}</label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder={t('screens.settings.selectFormat')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="12">{t('screens.settings.text12hour')}</SelectItem>
                                <SelectItem value="24">{t('screens.settings.text24hour')}</SelectItem>
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
                    title={t('screens.settings.regionalPreferences')}
                    subtitle="Enhanced Localization"
                    icon={Globe}
                    content={
                      <div className="grid grid-cols-2 gap-6 text-sm">
                        <div className="space-y-3">
                          <div className="font-medium">{t('screens.settings.measurementUnits')}</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('screens.settings.distance')}</span>
                              <span className="font-medium">{t('screens.settings.miles')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('screens.settings.weight')}</span>
                              <span className="font-medium">{t('screens.settings.pounds')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('screens.settings.temperature')}</span>
                              <span className="font-medium">{t('screens.settings.fahrenheit')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="font-medium">{t('screens.settings.currencyNumbers')}</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('screens.settings.currency')}</span>
                              <span className="font-medium">{t('screens.settings.usd')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('screens.settings.numberFormat')}</span>
                              <span className="font-medium">1,234.56</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('screens.settings.firstDayWeek')}</span>
                              <span className="font-medium">{t('screens.settings.sunday')}</span>
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
                    title={t('screens.settings.accessibilitySettings')}
                    subtitle="Enhanced Usability"
                    icon={Type}
                    content={
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('screens.settings.fontSize')}</label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder={t('screens.settings.selectSize')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">{t('screens.settings.small')}</SelectItem>
                              <SelectItem value="medium">{t('screens.settings.medium')}</SelectItem>
                              <SelectItem value="large">{t('screens.settings.large')}</SelectItem>
                              <SelectItem value="extra-large">{t('screens.settings.extraLarge')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.screenReaderSupport')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.enhancedNavigationForAssistiveTechnology')}</p>
                            </div>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{t('screens.settings.keyboardNavigation')}</h4>
                              <p className="text-sm text-muted-foreground">{t('screens.settings.navigateWithoutMouse')}</p>
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
                    title={t('screens.settings.fontSize')}
                    subtitle="Current Setting"
                    icon={Type}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-purple-600">{t('screens.settings.medium')}</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.text16pxBaseSize')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.accessibility2')}
                    subtitle="Features Active"
                    icon={Type}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">3</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.enabledFeatures')}</div>
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
                    title={t('screens.settings.defaultViews')}
                    subtitle="Home Setting"
                    icon={Home}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">{t('screens.settings.dashboard')}</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.defaultHomeView')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.autosave')}
                    subtitle="Preferences"
                    icon={SettingsIcon}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">{t('screens.settings.text')}</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.settingsSaved')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title={t('screens.settings.viewPreferences')}
                    subtitle="Customize Default Pages"
                    icon={Home}
                    content={
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('screens.settings.homepageDefault')}</label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder={t('screens.settings.selectDefaultView')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dashboard">{t('screens.settings.dashboard')}</SelectItem>
                              <SelectItem value="discover">{t('screens.settings.discover')}</SelectItem>
                              <SelectItem value="community">{t('screens.settings.community')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('screens.settings.calendarDefaultView')}</label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder={t('screens.settings.selectDefaultView')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="month">{t('screens.settings.monthView')}</SelectItem>
                              <SelectItem value="week">{t('screens.settings.weekView')}</SelectItem>
                              <SelectItem value="day">{t('screens.settings.dayView')}</SelectItem>
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