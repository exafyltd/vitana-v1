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
import { useToast } from "@/hooks/use-toast";

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
  { label: string; icon: typeof Eye; tint: string }
> = {
  private:     { label: "Private",     icon: Lock,  tint: "hsl(0, 70%, 60%)"   },
  connections: { label: "Connections", icon: Users, tint: "hsl(42, 90%, 58%)"  },
  public:      { label: "Public",      icon: Eye,   tint: "hsl(150, 60%, 55%)" },
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
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function buildSections(account: AccountInfo): AccountSectionDef[] {
  return [
    {
      title: "Public profile",
      subtitle: "Shown on Identity",
      fields: [
        { key: "avatarUrl",          label: "Avatar",              value: account.avatarUrl ? "Uploaded" : undefined },
        { key: "handle",             label: "Handle",              value: account.handle ? `@${account.handle}` : undefined },
        { key: "longevityArchetype", label: "Longevity archetype", value: account.longevityArchetype },
      ],
    },
    {
      title: "Basic Personal Information",
      subtitle: "Fixed identity data",
      fields: [
        { key: "firstName",     label: "First name",     value: account.firstName },
        { key: "lastName",      label: "Last name",      value: account.lastName },
        { key: "dateOfBirth",   label: "Date of birth",  value: formatAccountDate(account.dateOfBirth) },
        { key: "gender",        label: "Gender",         value: account.gender },
        { key: "maritalStatus", label: "Marital status", value: account.maritalStatus },
      ],
    },
    {
      title: "Contact Information",
      fields: [
        { key: "email",   label: "Email",   value: account.email },
        { key: "phone",   label: "Phone",   value: account.phone },
        { key: "address", label: "Address", value: account.address },
        { key: "country", label: "Country", value: account.country },
        { key: "city",    label: "City",    value: account.city },
      ],
    },
    {
      title: "Account Details",
      fields: [
        { key: "memberSince",        label: "Member since", value: formatAccountDate(account.memberSince) },
        { key: "accountType",        label: "Account type", value: account.accountType },
        {
          key: "verificationStatus",
          label: "Verification status",
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

  const account: AccountInfo = profile.account ?? {
    visibility: DEFAULT_ACCOUNT_VISIBILITY,
  };
  const visibility = account.visibility ?? DEFAULT_ACCOUNT_VISIBILITY;

  const allSections = useMemo(() => buildSections(account), [account]);

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
      } catch (error: any) {
        toast({
          title: "Could not update visibility",
          description: error?.message ?? "Please try again.",
          variant: "destructive",
        });
      }
    },
    [isOwner, visibility, setFieldVisibility, toast],
  );

  return { visibility, sections, hasVisibleFields, cycleVisibility };
}
