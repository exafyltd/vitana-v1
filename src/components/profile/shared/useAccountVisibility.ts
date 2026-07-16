import { useCallback, useMemo } from "react";
import { Eye, Lock, Users } from "lucide-react";
import {
  AccountFieldKey,
  AccountInfo,
  DEFAULT_ACCOUNT_VISIBILITY,
  FieldVisibility,
  UserProfile,
} from "@/types/profile";
import { useProfile } from "@/context/ProfileProvider";
import { useToast } from '@/hooks/use-toast';
import { notifyError } from '@/lib/i18n-toast';
import { useTranslation } from '@/hooks/useTranslation';

import { fmtDate } from '@/lib/locale-format';

type TranslateFn = (key: string, fallback?: string) => string;
export interface AccountFieldDef {
  key: AccountFieldKey;
  label: string;
  value?: string;
  placeholder?: string;
}

export interface AccountSectionDef {
  title: string;
  subtitle?: string;
  fields: AccountFieldDef[];
}

export const VISIBILITY_META: Record<
  FieldVisibility,
  // tint paints the chip's light background/border; tintText is the darker
  // ink for the label/icon so the chip stays readable on pastel surfaces.
  { labelKey: string; icon: typeof Eye; tint: string; tintText: string }
> = {
  private:     { labelKey: "profile.account.visibility.private",     icon: Lock,  tint: "hsl(0, 70%, 60%)",   tintText: "hsl(0, 65%, 42%)"   },
  connections: { labelKey: "profile.account.visibility.connections", icon: Users, tint: "hsl(42, 90%, 58%)",  tintText: "hsl(35, 90%, 34%)"  },
  public:      { labelKey: "profile.account.visibility.public",      icon: Eye,   tint: "hsl(150, 60%, 55%)", tintText: "hsl(152, 65%, 30%)" },
};

const NEXT_VISIBILITY: Record<FieldVisibility, FieldVisibility> = {
  private: "connections",
  connections: "public",
  public: "private",
};

export function formatAccountDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return fmtDate(d, { year: "numeric", month: "short", day: "numeric" });
}

function buildSections(account: AccountInfo, tr: TranslateFn): AccountSectionDef[] {
  return [
    {
      title: tr('profile.account.sections.publicProfile', 'Public profile'),
      subtitle: tr('profile.account.sections.publicProfileSubtitle', 'Shown on Identity'),
      fields: [
        { key: "avatarUrl",          label: tr('profile.account.fields.avatar', 'Avatar'),                          value: account.avatarUrl ? tr('profile.account.values.uploaded', 'Uploaded') : undefined },
        { key: "handle",             label: tr('profile.account.fields.handle', 'Handle'),                          value: account.handle ? `@${account.handle}` : undefined },
        { key: "longevityArchetype", label: tr('profile.account.fields.longevityArchetype', 'Longevity archetype'), value: account.longevityArchetype },
      ],
    },
    {
      title: tr('profile.account.sections.basicInfo', 'Basic Personal Information'),
      subtitle: tr('profile.account.sections.basicInfoSubtitle', 'Fixed identity data'),
      fields: [
        { key: "firstName",     label: tr('profile.account.fields.firstName', 'First name'),         value: account.firstName },
        { key: "lastName",      label: tr('profile.account.fields.lastName', 'Last name'),           value: account.lastName },
        { key: "dateOfBirth",   label: tr('profile.account.fields.dateOfBirth', 'Date of birth'),    value: formatAccountDate(account.dateOfBirth) },
        { key: "gender",        label: tr('profile.account.fields.gender', 'Gender'),                value: account.gender },
        { key: "maritalStatus", label: tr('profile.account.fields.maritalStatus', 'Marital status'), value: account.maritalStatus },
      ],
    },
    {
      title: tr('profile.account.sections.contactInfo', 'Contact Information'),
      fields: [
        { key: "email",   label: tr('profile.account.fields.email', 'Email'),     value: account.email },
        { key: "phone",   label: tr('profile.account.fields.phone', 'Phone'),     value: account.phone },
        { key: "address", label: tr('profile.account.fields.address', 'Address'), value: account.address },
        { key: "country", label: tr('profile.account.fields.country', 'Country'), value: account.country },
        { key: "city",    label: tr('profile.account.fields.city', 'City'),       value: account.city },
      ],
    },
    {
      title: tr('profile.account.sections.accountDetails', 'Account Details'),
      fields: [
        { key: "memberSince", label: tr('profile.account.fields.memberSince', 'Member since'), value: formatAccountDate(account.memberSince) },
        { key: "accountType", label: tr('profile.account.fields.accountType', 'Account type'), value: account.accountType },
        {
          key: "verificationStatus",
          label: tr('profile.account.fields.verificationStatus', 'Verification status'),
          value: account.verificationStatus
            ? account.verificationStatus.charAt(0).toUpperCase() +
              account.verificationStatus.slice(1)
            : undefined,
        },
      ],
    },
  ];
}

interface UseAccountVisibilityOptions {
  profile: UserProfile;
  isOwner: boolean;
}

interface UseAccountVisibilityResult {
  visibility: Record<AccountFieldKey, FieldVisibility>;
  sections: AccountSectionDef[];
  hasVisibleFields: boolean;
  cycleVisibility: (key: AccountFieldKey) => Promise<void>;
}

export function useAccountVisibility({
  profile,
  isOwner,
}: UseAccountVisibilityOptions): UseAccountVisibilityResult {
  const { setFieldVisibility } = useProfile();
  const { toast } = useToast();
  // Labels resolve through the i18n catalog — re-derive when the user's
  // chosen language changes.
  const { language, translate } = useTranslation();

  const account: AccountInfo = profile.account ?? {
    visibility: DEFAULT_ACCOUNT_VISIBILITY,
  };
  const visibility = account.visibility ?? DEFAULT_ACCOUNT_VISIBILITY;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allSections = useMemo(() => buildSections(account, translate), [account, language]);

  const sections = useMemo(() => {
    if (isOwner) return allSections;
    return allSections
      .map((s) => ({
        ...s,
        fields: s.fields.filter((f) => visibility[f.key] === "public"),
      }))
      .filter((s) => s.fields.length > 0);
  }, [allSections, isOwner, visibility]);

  const hasVisibleFields = sections.some((s) => s.fields.length > 0);

  const cycleVisibility = useCallback(
    async (key: AccountFieldKey) => {
      if (!isOwner) return;
      const next = NEXT_VISIBILITY[visibility[key]];
      try {
        await setFieldVisibility(key, next);
      } catch {
        notifyError('toasts.profile.couldNotUpdateVisibility');
      }
    },
    [isOwner, visibility, setFieldVisibility, toast],
  );

  return { visibility, sections, hasVisibleFields, cycleVisibility };
}
