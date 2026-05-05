/**
 * E5 — Privacy & Visibility settings page.
 *
 * Mobile-first dedicated screen at /profile/me/privacy. Lets owners
 * toggle per-section + per-sub-field visibility tiers (Public /
 * Connections / Private). Mirrors the server-side FIELD_DEFAULTS in
 * services/gateway/src/lib/account-visibility.ts.
 *
 * Each row writes through useProfile().setFieldVisibility() which
 * upserts profiles.account_visibility jsonb. Server-side filters
 * (introduced in feat/e5-cross-user-prefs) read this map at request time.
 *
 * Hardcoded keys (myPosts.partnerSeek) are NOT user-toggleable — they
 * stay hidden regardless. We still surface them in the UI as a read-only
 * note so users understand the partner_seek redaction rule.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Users, Eye, Heart, Briefcase, Cake, Sparkles, FileText } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/context/ProfileProvider";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import {
  AccountFieldKey,
  DEFAULT_ACCOUNT_VISIBILITY,
  FieldVisibility,
} from "@/types/profile";
import { notifyError } from '@/lib/i18n-toast';

const NEXT_TIER: Record<FieldVisibility, FieldVisibility> = {
  private: "connections",
  connections: "public",
  public: "private",
};

const TIER_LABEL: Record<FieldVisibility, string> = {
  private: "Private",
  connections: "Connections",
  public: "Public",
};

const TIER_COLOR: Record<FieldVisibility, string> = {
  private: "bg-rose-50 text-rose-700 border-rose-200",
  connections: "bg-amber-50 text-amber-700 border-amber-200",
  public: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const TierIcon = ({ tier }: { tier: FieldVisibility }) => {
  if (tier === "private") return <Lock className="h-3.5 w-3.5" />;
  if (tier === "connections") return <Users className="h-3.5 w-3.5" />;
  return <Eye className="h-3.5 w-3.5" />;
};

interface SectionDef {
  key: AccountFieldKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  subFields?: { key: AccountFieldKey; label: string }[];
}

const SECTIONS: SectionDef[] = [
  {
    key: "dancePreferences",
    label: "Dance preferences",
    description: "Styles, level, role, what you're looking for.",
    icon: <Sparkles className="h-4 w-4 text-pink-500" />,
    subFields: [
      { key: "dancePreferences.varieties", label: "My styles" },
      { key: "dancePreferences.level", label: "My level" },
      { key: "dancePreferences.lookingFor", label: "What I'm looking for" },
    ],
  },
  {
    key: "partnerPreferences",
    label: "Partner preferences",
    description: "Who you're looking for. Private by default. Sub-fields stay private even if the section opens.",
    icon: <Heart className="h-4 w-4 text-rose-500" />,
    subFields: [
      { key: "partnerPreferences.gender", label: "Gender preference" },
      { key: "partnerPreferences.ageRange", label: "Age range" },
      { key: "partnerPreferences.relationshipIntent", label: "Relationship intent" },
      { key: "partnerPreferences.locationRadius", label: "Location & radius" },
    ],
  },
  {
    key: "serviceOfferings",
    label: "Service offerings",
    description: "What you offer. Public by default — hiding defeats the purpose.",
    icon: <Briefcase className="h-4 w-4 text-emerald-600" />,
    subFields: [
      { key: "serviceOfferings.priceRange", label: "Price range" },
    ],
  },
  {
    key: "myPosts",
    label: "My posts",
    description: "Open intents you've dictated. Partner-search posts NEVER appear here regardless of toggle.",
    icon: <FileText className="h-4 w-4 text-blue-600" />,
    subFields: [
      { key: "myPosts.commercial", label: "Marketplace posts" },
    ],
  },
  {
    key: "derivedAgeBand",
    label: "Age band",
    description: "Show only your age band (e.g. 30s) instead of exact age. Default: connections only.",
    icon: <Cake className="h-4 w-4 text-amber-600" />,
  },
];

interface VisibilityRowProps {
  fieldKey: AccountFieldKey;
  label: string;
  current: FieldVisibility;
  onCycle: () => void;
  indent?: boolean;
  disabled?: boolean;
  disabledNote?: string;
}

function VisibilityRow({ fieldKey, label, current, onCycle, indent, disabled, disabledNote }: VisibilityRowProps) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2.5 ${indent ? "pl-6" : ""}`}>
      <div className="text-sm text-foreground/90 truncate">
        {label}
        {disabled && disabledNote && (
          <span className="block text-xs text-muted-foreground mt-0.5">{disabledNote}</span>
        )}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onCycle}
        className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
          disabled ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60" : TIER_COLOR[current]
        }`}
        aria-label={`${label}: ${TIER_LABEL[current]}. Tap to change.`}
      >
        <TierIcon tier={current} />
        <span>{TIER_LABEL[current]}</span>
      </button>
    </div>
  );
}

export default function PrivacySettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, refreshProfile, setFieldVisibility } = useProfile();
  const { toast } = useToast();

  useEffect(() => {
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibility = profile.account?.visibility ?? DEFAULT_ACCOUNT_VISIBILITY;

  const tierFor = (key: AccountFieldKey): FieldVisibility => {
    const explicit = (visibility as Record<string, FieldVisibility>)[key];
    if (explicit === "private" || explicit === "connections" || explicit === "public") return explicit;
    return DEFAULT_ACCOUNT_VISIBILITY[key] ?? "private";
  };

  const cycle = async (key: AccountFieldKey) => {
    const next = NEXT_TIER[tierFor(key)];
    try {
      await setFieldVisibility(key, next);
      toast({ title: `${key} → ${TIER_LABEL[next]}` });
    } catch (e: any) {
      notifyError('toasts.privacysettings.couldNotSave');
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="container max-w-xl mx-auto px-4 py-10 text-center text-muted-foreground">
          Please sign in to manage your privacy settings.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title="Privacy & Visibility — Vitana" description="Control which parts of your profile are visible." />
      <div className="container max-w-2xl mx-auto px-4 py-4 space-y-4">
        <header className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Privacy & Visibility</h1>
        </header>

        <p className="text-sm text-muted-foreground">
          Tap any tier badge to cycle Private → Connections → Public.
          Defaults err on the side of privacy — you decide what to share.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.key} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                {section.icon}
                <h3 className="text-sm font-semibold">{section.label}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
            </div>
            <div className="px-3 divide-y divide-border">
              <VisibilityRow
                fieldKey={section.key}
                label="Whole section"
                current={tierFor(section.key)}
                onCycle={() => cycle(section.key)}
              />
              {section.subFields?.map((sf) => (
                <VisibilityRow
                  key={sf.key}
                  fieldKey={sf.key}
                  label={sf.label}
                  current={tierFor(sf.key)}
                  onCycle={() => cycle(sf.key)}
                  indent
                />
              ))}
              {section.key === "myPosts" && (
                <VisibilityRow
                  fieldKey={"myPosts.partnerSeek" as AccountFieldKey}
                  label="Partner-search posts"
                  current="private"
                  onCycle={() => undefined}
                  indent
                  disabled
                  disabledNote="Always private. Mutual-reveal protocol gates these regardless of toggle."
                />
              )}
            </div>
          </section>
        ))}

        <p className="text-xs text-muted-foreground text-center pt-4">
          Server enforces these tiers on every cross-user fetch — your toggle is binding, not advisory.
        </p>
      </div>
    </AppLayout>
  );
}
