import { EyeOff, Lock, Pencil, ShieldCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AccountFieldKey,
  FieldVisibility,
  UserProfile,
} from "@/types/profile";
import {
  AccountFieldDef,
  AccountSectionDef,
  VISIBILITY_META,
  useAccountVisibility,
} from "../shared/useAccountVisibility";

interface DesktopAccountCardProps {
  profile: UserProfile;
  isOwner?: boolean;
  editMode?: boolean;
  onEdit?: () => void;
  className?: string;
}

export function DesktopAccountCard({
  profile,
  isOwner = true,
  editMode = false,
  onEdit,
  className,
}: DesktopAccountCardProps) {
  const { visibility, sections, hasVisibleFields, cycleVisibility } =
    useAccountVisibility({ profile, isOwner });

  return (
    <div className={cn("relative rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden", className)}>
      {isOwner && editMode && onEdit && (
        <button
          onClick={onEdit}
          aria-label="Edit account details"
          className="absolute top-4 right-4 h-9 w-9 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground z-10 flex items-center justify-center transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}

      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 border border-primary/20">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Personal data vault</h2>
              <p className="text-sm text-muted-foreground">
                Each field has a value and a visibility rule.
              </p>
            </div>
          </div>
        </div>

        {/* Sections */}
        {hasVisibleFields ? (
          <div className="space-y-8">
            {sections.map((section) => (
              <DesktopAccountSection
                key={section.title}
                section={section}
                visibility={visibility}
                isOwner={isOwner}
                onCycleVisibility={cycleVisibility}
                onEditField={isOwner && editMode ? onEdit : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              This user keeps account details private.
            </p>
          </div>
        )}

        {/* Sensitive data notice */}
        <div className="mt-8 rounded-xl p-4 border bg-muted/30">
          <div className="flex gap-3">
            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Some personal information is used to personalize your experience,
              improve trust, and support relevant services. You control what is
              shared publicly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DesktopAccountSectionProps {
  section: AccountSectionDef;
  visibility: Record<AccountFieldKey, FieldVisibility>;
  isOwner: boolean;
  onCycleVisibility: (key: AccountFieldKey) => void;
  onEditField?: () => void;
}

function DesktopAccountSection({
  section,
  visibility,
  isOwner,
  onCycleVisibility,
  onEditField,
}: DesktopAccountSectionProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-[0.15em] text-foreground/80 uppercase">
          {section.title}
        </h3>
        {section.subtitle && (
          <span className="text-xs text-muted-foreground">{section.subtitle}</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {section.fields.map((field) => (
          <DesktopAccountRow
            key={field.key}
            field={field}
            visibility={visibility[field.key]}
            isOwner={isOwner}
            onCycleVisibility={() => onCycleVisibility(field.key)}
            onEditField={onEditField}
          />
        ))}
      </div>
    </div>
  );
}

interface DesktopAccountRowProps {
  field: AccountFieldDef;
  visibility: FieldVisibility;
  isOwner: boolean;
  onCycleVisibility: () => void;
  onEditField?: () => void;
}

function DesktopAccountRow({
  field,
  visibility,
  isOwner,
  onCycleVisibility,
  onEditField,
}: DesktopAccountRowProps) {
  const meta = VISIBILITY_META[visibility];
  const Icon = meta.icon;
  const hasValue = !!field.value;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background/60 px-4 py-3 transition-colors hover:bg-background">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {field.label}
        </p>
        {hasValue ? (
          <p className="text-sm text-foreground truncate mt-0.5">{field.value}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground/60 mt-0.5">
            {isOwner ? "Not set" : "—"}
          </p>
        )}
      </div>

      {isOwner && onEditField && (
        <button
          onClick={onEditField}
          aria-label={`Edit ${field.label}`}
          className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}

      {isOwner ? (
        <button
          onClick={onCycleVisibility}
          aria-label={`Visibility: ${meta.label}. Click to change.`}
          className="flex items-center gap-1.5 h-8 px-3 rounded-full border transition-all active:scale-95"
          style={{
            borderColor: `${meta.tint}40`,
            backgroundColor: `${meta.tint}12`,
            color: meta.tint,
          }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
          <span className="text-xs font-semibold">{meta.label}</span>
        </button>
      ) : visibility === "private" ? (
        <div
          className="flex items-center gap-1 h-8 px-2 rounded-full text-muted-foreground"
          title="Private"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </div>
      ) : null}
    </div>
  );
}
