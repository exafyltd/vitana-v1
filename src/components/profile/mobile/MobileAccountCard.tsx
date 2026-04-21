import { useMemo } from "react";
import { Eye, EyeOff, Lock, Users, Pencil, ShieldCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AccountFieldKey,
  AccountInfo,
  DEFAULT_ACCOUNT_VISIBILITY,
  FieldVisibility,
  UserProfile,
} from "@/types/profile";
import { useProfile } from "@/context/ProfileProvider";
import { useToast } from "@/hooks/use-toast";

interface MobileAccountCardProps {
  profile: UserProfile;
  isOwner?: boolean;
  editMode?: boolean;
  onEdit?: () => void;
  className?: string;
}

interface FieldDef {
  key: AccountFieldKey;
  label: string;
  value?: string;
  placeholder?: string;
}

interface SectionDef {
  title: string;
  subtitle?: string;
  fields: FieldDef[];
}

const VISIBILITY_META: Record<
  FieldVisibility,
  { label: string; icon: typeof Eye; tint: string }
> = {
  private:     { label: "Private",     icon: Lock, tint: "hsl(0, 70%, 60%)"   },
  connections: { label: "Connections", icon: Users, tint: "hsl(42, 90%, 58%)" },
  public:      { label: "Public",      icon: Eye,  tint: "hsl(150, 60%, 55%)" },
};

const NEXT_VISIBILITY: Record<FieldVisibility, FieldVisibility> = {
  private: "connections",
  connections: "public",
  public: "private",
};

function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function MobileAccountCard({
  profile,
  isOwner = true,
  editMode = false,
  onEdit,
  className,
}: MobileAccountCardProps) {
  const { setFieldVisibility } = useProfile();
  const { toast } = useToast();

  const account: AccountInfo = profile.account ?? {
    visibility: DEFAULT_ACCOUNT_VISIBILITY,
  };
  const visibility = account.visibility ?? DEFAULT_ACCOUNT_VISIBILITY;

  const allSections: SectionDef[] = useMemo(
    () => [
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
          { key: "dateOfBirth",   label: "Date of birth",  value: formatDate(account.dateOfBirth) },
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
          { key: "memberSince",        label: "Member since", value: formatDate(account.memberSince) },
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
    ],
    [account],
  );

  // Non-owners only see fields explicitly marked public. Connections/private stay hidden.
  const sections: SectionDef[] = useMemo(() => {
    if (isOwner) return allSections;
    return allSections
      .map((s) => ({
        ...s,
        fields: s.fields.filter((f) => visibility[f.key] === "public"),
      }))
      .filter((s) => s.fields.length > 0);
  }, [allSections, isOwner, visibility]);

  const hasVisibleFields = sections.some((s) => s.fields.length > 0);

  const handleCycleVisibility = async (key: AccountFieldKey) => {
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
  };

  return (
    <div className={cn("px-4 pb-2", className)}>
      <div
        className="relative rounded-2xl border border-white/5 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(216, 53%, 8%) 0%, hsl(222, 47%, 11%) 100%)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        }}
      >
        {isOwner && editMode && onEdit && (
          <button
            onClick={onEdit}
            aria-label="Edit account details"
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white z-10 flex items-center justify-center transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-white/5 border border-white/10 mb-3">
              <ShieldCheck className="h-3.5 w-3.5 text-white/70 mr-1.5" />
              <span className="text-[10px] font-medium tracking-[0.2em] text-white/60 uppercase">
                Account
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white">Personal data vault</h2>
            <p className="text-xs text-white/50 mt-1">
              Each field has a value and a visibility rule.
            </p>
          </div>

          {/* Sections */}
          {hasVisibleFields ? (
            <div className="space-y-5">
              {sections.map((section) => (
                <AccountSection
                  key={section.title}
                  section={section}
                  visibility={visibility}
                  isOwner={isOwner}
                  onCycleVisibility={handleCycleVisibility}
                  onEditField={isOwner && editMode ? onEdit : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Lock className="h-5 w-5 text-white/40" />
              </div>
              <p className="text-sm text-white/50">
                This user keeps account details private.
              </p>
            </div>
          )}

          {/* Sensitive data notice */}
          <div
            className="mt-6 rounded-xl p-4 border border-white/5"
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(14, 165, 233, 0.06))",
            }}
          >
            <div className="flex gap-3">
              <Info className="h-4 w-4 text-white/60 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-white/60">
                Some personal information is used to personalize your experience,
                improve trust, and support relevant services. You control what is
                shared publicly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AccountSectionProps {
  section: SectionDef;
  visibility: Record<AccountFieldKey, FieldVisibility>;
  isOwner: boolean;
  onCycleVisibility: (key: AccountFieldKey) => void;
  onEditField?: () => void;
}

function AccountSection({
  section,
  visibility,
  isOwner,
  onCycleVisibility,
  onEditField,
}: AccountSectionProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h3 className="text-[11px] font-semibold tracking-[0.15em] text-white/80 uppercase">
          {section.title}
        </h3>
        {section.subtitle && (
          <span className="text-[10px] text-white/40">{section.subtitle}</span>
        )}
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        {section.fields.map((field, idx) => (
          <AccountRow
            key={field.key}
            field={field}
            visibility={visibility[field.key]}
            isOwner={isOwner}
            onCycleVisibility={() => onCycleVisibility(field.key)}
            onEditField={onEditField}
            isLast={idx === section.fields.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface AccountRowProps {
  field: FieldDef;
  visibility: FieldVisibility;
  isOwner: boolean;
  onCycleVisibility: () => void;
  onEditField?: () => void;
  isLast: boolean;
}

function AccountRow({
  field,
  visibility,
  isOwner,
  onCycleVisibility,
  onEditField,
  isLast,
}: AccountRowProps) {
  const meta = VISIBILITY_META[visibility];
  const Icon = meta.icon;
  const hasValue = !!field.value;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-3",
        !isLast && "border-b border-white/5",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium tracking-wide text-white/40 uppercase">
          {field.label}
        </p>
        {hasValue ? (
          <p className="text-sm text-white/90 truncate mt-0.5">{field.value}</p>
        ) : (
          <p className="text-sm italic text-white/30 mt-0.5">
            {isOwner ? "Not set" : "—"}
          </p>
        )}
      </div>

      {isOwner && onEditField && (
        <button
          onClick={onEditField}
          aria-label={`Edit ${field.label}`}
          className="h-7 w-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}

      {isOwner ? (
        <button
          onClick={onCycleVisibility}
          aria-label={`Visibility: ${meta.label}. Tap to change.`}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border transition-all active:scale-95"
          style={{
            borderColor: `${meta.tint}40`,
            backgroundColor: `${meta.tint}12`,
            color: meta.tint,
          }}
        >
          <Icon className="h-3 w-3" strokeWidth={2.25} />
          <span className="text-[10px] font-semibold">{meta.label}</span>
        </button>
      ) : visibility === "private" ? (
        <div
          className="flex items-center gap-1 h-7 px-2 rounded-full"
          style={{ color: "hsl(0, 0%, 50%)" }}
          title="Private"
        >
          <EyeOff className="h-3 w-3" />
        </div>
      ) : null}
    </div>
  );
}
