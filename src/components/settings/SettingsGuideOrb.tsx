import { useMemo } from "react";
import { motion } from "framer-motion";
import { OrbCore } from "@/components/vitanaland/OrbCore";
import { useTranslation } from "@/hooks/useTranslation";

const SETTINGS_SECTION_PROMPT_KEY: Record<string, string> = {
  notifications: "screens.mobilesettings.orbHintNotifications",
  privacy: "screens.mobilesettings.orbHintPrivacy",
  "privacy.visibility": "screens.mobilesettings.orbHintPrivacyVisibility",
  "privacy.data": "screens.mobilesettings.orbHintPrivacyData",
  "privacy.security": "screens.mobilesettings.orbHintPrivacySecurity",
  preferences: "screens.mobilesettings.orbHintPreferences",
  "preferences.appearance": "screens.mobilesettings.orbHintAppearance",
  "preferences.language": "screens.mobilesettings.orbHintLanguage",
  billing: "screens.mobilesettings.orbHintBilling",
  support: "screens.mobilesettings.orbHintSupport",
};

type QuickAction = { key: string; section: string };

const QUICK_ACTIONS_BY_SECTION: Record<string, QuickAction[]> = {
  notifications: [
    { key: "screens.mobilesettings.quickAskPushOff", section: "notifications" },
    { key: "screens.mobilesettings.quickAskQuietHours", section: "notifications" },
    { key: "screens.mobilesettings.quickAskOpenPrivacy", section: "privacy.data" },
  ],
  "privacy.visibility": [
    { key: "screens.mobilesettings.quickAskHideProfile", section: "privacy.visibility" },
    { key: "screens.mobilesettings.quickAskOpenSecurity", section: "privacy.security" },
  ],
  "privacy.data": [
    { key: "screens.mobilesettings.quickAskExportData", section: "privacy.data" },
    { key: "screens.mobilesettings.quickAskRevokeAi", section: "privacy.data" },
  ],
  "privacy.security": [
    { key: "screens.mobilesettings.quickAsk2FA", section: "privacy.security" },
    { key: "screens.mobilesettings.quickAskChangePassword", section: "privacy.security" },
  ],
  "preferences.appearance": [
    { key: "screens.mobilesettings.quickAskDarkMode", section: "preferences.appearance" },
    { key: "screens.mobilesettings.quickAskReduceMotion", section: "preferences.appearance" },
  ],
  "preferences.language": [
    { key: "screens.mobilesettings.quickAskChangeLanguage", section: "preferences.language" },
  ],
  billing: [
    { key: "screens.mobilesettings.quickAskUpgradePlan", section: "billing.plan" },
    { key: "screens.mobilesettings.quickAskInvoices", section: "billing.invoices" },
  ],
  support: [
    { key: "screens.mobilesettings.quickAskContactSupport", section: "support.contact" },
    { key: "screens.mobilesettings.quickAskKnowledgeBase", section: "support.knowledge" },
  ],
};

function pickSection(activeSection: string): string {
  if (QUICK_ACTIONS_BY_SECTION[activeSection]) return activeSection;
  const parent = activeSection.split(".")[0];
  if (QUICK_ACTIONS_BY_SECTION[parent]) return parent;
  return "notifications";
}

function openVitanaOrb(): boolean {
  const orb = (window as unknown as { VitanaOrb?: { show?: () => void } }).VitanaOrb;
  if (orb && typeof orb.show === "function") {
    try {
      orb.show();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

interface SettingsGuideOrbProps {
  activeSection: string;
  onJumpToSection: (section: string) => void;
}

export function SettingsGuideOrb({ activeSection, onJumpToSection }: SettingsGuideOrbProps) {
  const { translate } = useTranslation();

  const sectionKey = pickSection(activeSection);
  const promptKey =
    SETTINGS_SECTION_PROMPT_KEY[activeSection] ||
    SETTINGS_SECTION_PROMPT_KEY[sectionKey] ||
    "screens.mobilesettings.orbHintDefault";

  const quickActions = useMemo(
    () => QUICK_ACTIONS_BY_SECTION[sectionKey] ?? [],
    [sectionKey],
  );

  const handleOrbTap = () => {
    if (!openVitanaOrb()) {
      window.dispatchEvent(
        new CustomEvent("vitana:settings-help-requested", {
          detail: { section: activeSection },
        }),
      );
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    onJumpToSection(action.section);
    window.dispatchEvent(
      new CustomEvent("vitana:settings-quickaction", {
        detail: { promptKey: action.key, section: action.section },
      }),
    );
    openVitanaOrb();
  };

  return (
    <div className="mb-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleOrbTap}
          aria-label={translate("screens.mobilesettings.askVitana", "Ask Vitana")}
          className="flex shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <OrbCore size="sm" enableFloat />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-primary/80">
            {translate("screens.mobilesettings.askVitana", "Ask Vitana")}
          </p>
          <motion.p
            key={promptKey}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-sm font-medium leading-snug text-foreground"
          >
            {translate(
              promptKey,
              "How can I help you with your settings?",
            )}
          </motion.p>
          <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
            {translate(
              "screens.mobilesettings.orbGuideSubtitle",
              "I'll guide you to the right screen and change settings for you.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOrbTap}
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition active:scale-95"
        >
          {translate("screens.mobilesettings.askVitanaCta", "Talk")}
        </button>
      </div>

      {quickActions.length > 0 && (
        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {quickActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => handleQuickAction(action)}
              className="shrink-0 whitespace-nowrap rounded-full border border-primary/20 bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/40 hover:bg-primary/5 active:scale-95"
            >
              {translate(action.key, "")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
