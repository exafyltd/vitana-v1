import { Eye, EyeOff, Lock, Pencil, ShieldCheck, Info } from "lucide-react";
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
import { t } from '@/lib/i18n-toast';
import { useTranslation } from '@/hooks/useTranslation';

interface MobileAccountCardProps {
  profile: UserProfile;
  isOwner?: boolean;
  editMode?: boolean;
  onEdit?: () => void;
  className?: string;
}

export function MobileAccountCard({
  profile,
  isOwner = true,
  editMode = false,
  onEdit,
  className,
}: MobileAccountCardProps) {
  const { visibility, sections, hasVisibleFields, cycleVisibility } =
    useAccountVisibility({ profile, isOwner });

  return (
    <div className={cn("px-4 pb-2", className)}>
      <div
        className="relative rounded-2xl border border-white/60 overflow-hidden"
        style={{
          // Android WebView (Appilix) can drop a card's gradient `background`
          // when the card paints on its own compositing layer, washing it out
          // to the page underneath (see MobileIdentityCard.tsx for the
          // original occurrence). Keep a SOLID pastel `backgroundColor` as a
          // fallback so the card still renders on-brand even if the gradient
          // layer fails to paint, and promote the card onto its own stable
          // compositing layer so descendants can't knock out its background.
          backgroundColor: "hsl(215, 60%, 93%)",
          backgroundImage: "linear-gradient(160deg, hsl(210, 75%, 92%) 0%, hsl(235, 65%, 94%) 55%, hsl(270, 45%, 94%) 100%)",
          boxShadow: "0 4px 20px rgba(99, 102, 241, 0.10)",
          isolation: "isolate",
          transform: "translateZ(0)",
        }}
      >
        {isOwner && editMode && onEdit && (
          <button
            onClick={onEdit}
            aria-label={t('screens.profile.editAccountDetails')}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/60 hover:bg-white/90 text-slate-500 hover:text-slate-800 z-10 flex items-center justify-center transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-white/60 border border-white/80 mb-3">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-700 mr-1.5" />
              <span className="text-[10px] font-medium tracking-[0.2em] text-teal-700/80 uppercase">
                {t('screens.profile.account')}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">{t('screens.profile.personalDataVault')}</h2>
            <p className="text-xs text-slate-500 mt-1">
              {t('screens.profile.eachFieldHasValueVisibilityRule')}
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
                  onCycleVisibility={cycleVisibility}
                  onEditField={isOwner && editMode ? onEdit : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center mx-auto mb-3">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <p className="text-sm text-slate-500">
                {t('screens.profile.thisUserKeepsAccountDetailsPrivate')}
              </p>
            </div>
          )}

          {/* Sensitive data notice */}
          <div
            className="mt-6 rounded-xl p-4 border border-white/70"
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(14, 165, 233, 0.06))",
            }}
          >
            <div className="flex gap-3">
              <Info className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-slate-600">{t('screens.profile.somePersonalInformationUsedPersonalizeYour2')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AccountSectionProps {
  section: AccountSectionDef;
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
        <h3 className="text-[11px] font-semibold tracking-[0.15em] text-slate-600 uppercase">
          {section.title}
        </h3>
        {section.subtitle && (
          <span className="text-[10px] text-slate-500">{section.subtitle}</span>
        )}
      </div>

      <div className="rounded-xl border border-white/70 bg-white/50 overflow-hidden">
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
  field: AccountFieldDef;
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
  const { translate } = useTranslation();
  const meta = VISIBILITY_META[visibility];
  const Icon = meta.icon;
  const hasValue = !!field.value;
  const visibilityFallbacks: Record<string, string> = {
    private: 'Private', connections: 'Connections', public: 'Public',
  };
  const metaLabel = translate(meta.labelKey, visibilityFallbacks[visibility]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-3",
        !isLast && "border-b border-black/5",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
          {field.label}
        </p>
        {hasValue ? (
          <p className="text-sm text-slate-800 truncate mt-0.5">{field.value}</p>
        ) : (
          <p className="text-sm italic text-slate-400 mt-0.5">
            {isOwner ? translate('profile.account.notSet', 'Not set') : "—"}
          </p>
        )}
      </div>

      {isOwner && onEditField && (
        <button
          onClick={onEditField}
          aria-label={t('profile.account.editField', { field: field.label })}
          className="h-7 w-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}

      {isOwner ? (
        <button
          onClick={onCycleVisibility}
          aria-label={t('profile.account.visibilityToggle', { label: metaLabel })}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border transition-all active:scale-95"
          style={{
            borderColor: `${meta.tint}40`,
            backgroundColor: `${meta.tint}12`,
            color: meta.tint,
          }}
        >
          <Icon className="h-3 w-3" strokeWidth={2.25} />
          <span className="text-[10px] font-semibold">{metaLabel}</span>
        </button>
      ) : visibility === "private" ? (
        <div
          className="flex items-center gap-1 h-7 px-2 rounded-full"
          style={{ color: "hsl(0, 0%, 50%)" }}
          title={t('screens.profile.private')}
        >
          <EyeOff className="h-3 w-3" />
        </div>
      ) : null}
    </div>
  );
}
