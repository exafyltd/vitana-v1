/**
 * VTID-05221 — step 2 of the exafy-admin "New community" panel: the brand pack.
 *
 * Fields are TenantBrandPackPatchSchema (gateway
 * services/tenant-provisioning/schemas.ts) minus the ones step 1 already set
 * (display name, locales, timezone, currency). Only fields the admin filled
 * in are sent. Open sign-up starts off. `override_reason` appears only after
 * the server refused open sign-up because the tenant is not ready yet
 * (409 TENANT_NOT_READY). Nothing is sent on render; the PATCH happens only
 * when the admin presses the save button.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { notify, notifyError, t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';
import { patchTenantBrandPack, TenantProvisioningError } from '@/lib/tenant-provisioning-api';
import {
  buildBrandPackPatch,
  emptyBrandPackForm,
  LANDING_CTAS,
  validateBrandPackForm,
  type BrandPackField,
  type BrandPackFormValues,
  type LandingCta,
  type ValidationKey,
} from './validation';

const NS = 'tenantProvisioning';
const FALLBACK_ERROR_KEY = `${NS}.steps.brandPack.failed`;
/** The server's readiness gate for open sign-up (admin-tenants.ts PATCH /:id). */
const NOT_READY_CODE = 'TENANT_NOT_READY';

type TextField = Exclude<BrandPackField, 'landingCta' | 'openSignup' | 'openSignupTouched'>;

const PERSONA_FIELDS: TextField[] = [
  'communityName',
  'communityPronunciation',
  'anchorName',
  'anchorPronunciation',
  'anchorRole',
  'storyFacts',
  'offerFacts',
  'tone',
];
const FIELD_ORDER: TextField[] = [
  'colorAccent',
  'colorBg',
  'colorFg',
  'legalEntityLine',
  'supportEmail',
  'senderName',
  'senderEmail',
  ...PERSONA_FIELDS,
  'overrideReason',
];

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive';

interface FieldProps {
  id: string;
  field: TextField;
  value: string;
  onChange: (value: string) => void;
  error: ValidationKey | null;
  hint?: boolean;
  ltr?: boolean;
  mono?: boolean;
  multiline?: boolean;
  type?: 'text' | 'email';
  inputMode?: 'text' | 'email';
}

function Field({ id, field, value, onChange, error, hint, ltr, mono, multiline, type = 'text', inputMode }: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  const common = {
    id,
    'data-testid': `brand-pack-${field}`,
    dir: ltr ? 'ltr' : undefined,
    className: cn('text-start', mono && 'font-mono'),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    value,
  } as const;
  return (
    <div className="space-y-1.5 text-start">
      <Label htmlFor={id}>{t(`${NS}.steps.brandPack.fields.${field}.label`)}</Label>
      {multiline ? (
        <Textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input {...common} type={type} inputMode={inputMode} autoComplete="off" onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {t(`${NS}.steps.brandPack.fields.${field}.hint`)}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive" data-testid={`brand-pack-error-${field}`}>
          {t(`${NS}.validation.${error}`)}
        </p>
      )}
    </div>
  );
}

export function BrandPackForm({ tenantId, onSaved }: { tenantId: string; onSaved: () => void }) {
  const ids = useId();
  const [values, setValues] = useState<BrandPackFormValues>(emptyBrandPackForm);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErrorKey, setServerErrorKey] = useState<string | null>(null);
  const [overrideRequired, setOverrideRequired] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const pendingFocus = useRef<TextField | null>(null);

  const errors = validateBrandPackForm(values, overrideRequired);
  const fieldId = (f: TextField) => `${ids}-${f}`;
  const errorFor = (f: TextField): ValidationKey | null => (showErrors ? errors[f] ?? null : null);
  const set = (f: TextField) => (v: string) => setValues((prev) => ({ ...prev, [f]: v }));
  const showOverride = overrideRequired && values.openSignup;

  // Focus moves after the render that mounts the target (collapsed persona
  // fields, the override reason).
  useEffect(() => {
    const f = pendingFocus.current;
    if (!f) return;
    pendingFocus.current = null;
    document.getElementById(fieldId(f))?.focus();
  });

  const submit = async () => {
    if (busy) return;
    setShowErrors(true);
    const firstInvalid = FIELD_ORDER.find((f) => errors[f]);
    if (firstInvalid) {
      if (PERSONA_FIELDS.includes(firstInvalid)) setPersonaOpen(true);
      pendingFocus.current = firstInvalid;
      // Trigger the focus effect even when nothing else changed.
      setValues((prev) => ({ ...prev }));
      return;
    }
    if (errors.form) return;
    setBusy(true);
    setServerErrorKey(null);
    try {
      await patchTenantBrandPack(tenantId, buildBrandPackPatch(values, overrideRequired));
      setOverrideRequired(false);
      notify(`${NS}.steps.brandPack.success`);
      onSaved();
    } catch (e) {
      const key = e instanceof TenantProvisioningError ? e.i18nKey : FALLBACK_ERROR_KEY;
      setServerErrorKey(key);
      notifyError(key);
      if (e instanceof TenantProvisioningError && e.code === NOT_READY_CODE) {
        setOverrideRequired(true);
        pendingFocus.current = 'overrideReason';
      }
    } finally {
      setBusy(false);
    }
  };

  const ctaId = `${ids}-landingCta`;
  const signupId = `${ids}-openSignup`;

  return (
    <form
      noValidate
      aria-labelledby={`${ids}-title`}
      data-testid="brand-pack-form"
      className="space-y-5 text-start"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="space-y-1">
        <h3 id={`${ids}-title`} className="text-base font-semibold">
          {t(`${NS}.steps.brandPack.title`)}
        </h3>
        <p className="text-sm text-muted-foreground">{t(`${NS}.steps.brandPack.description`)}</p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{t(`${NS}.steps.brandPack.colorsLegend`)}</legend>
        <p className="text-xs text-muted-foreground">{t(`${NS}.steps.brandPack.colorsHint`)}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {(['colorAccent', 'colorBg', 'colorFg'] as const).map((f) => (
            <Field key={f} id={fieldId(f)} field={f} value={values[f]} onChange={set(f)} error={errorFor(f)} ltr mono />
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field
            id={fieldId('legalEntityLine')}
            field="legalEntityLine"
            value={values.legalEntityLine}
            onChange={set('legalEntityLine')}
            error={errorFor('legalEntityLine')}
            hint
          />
        </div>
        <Field
          id={fieldId('supportEmail')}
          field="supportEmail"
          type="email"
          inputMode="email"
          value={values.supportEmail}
          onChange={set('supportEmail')}
          error={errorFor('supportEmail')}
          ltr
        />
        <Field
          id={fieldId('senderName')}
          field="senderName"
          value={values.senderName}
          onChange={set('senderName')}
          error={errorFor('senderName')}
        />
        <Field
          id={fieldId('senderEmail')}
          field="senderEmail"
          type="email"
          inputMode="email"
          value={values.senderEmail}
          onChange={set('senderEmail')}
          error={errorFor('senderEmail')}
          ltr
        />
        <div className="space-y-1.5 text-start">
          <Label htmlFor={ctaId}>{t(`${NS}.steps.brandPack.fields.landingCta.label`)}</Label>
          <select
            id={ctaId}
            data-testid="brand-pack-landingCta"
            className={SELECT_CLASS}
            aria-describedby={`${ctaId}-hint`}
            value={values.landingCta}
            onChange={(e) => setValues((prev) => ({ ...prev, landingCta: e.target.value as LandingCta | '' }))}
          >
            <option value="">{t(`${NS}.steps.brandPack.fields.landingCta.unset`)}</option>
            {LANDING_CTAS.map((c) => (
              <option key={c} value={c}>
                {t(`${NS}.steps.brandPack.fields.landingCta.options.${c}`)}
              </option>
            ))}
          </select>
          <p id={`${ctaId}-hint`} className="text-xs text-muted-foreground">
            {t(`${NS}.steps.brandPack.fields.landingCta.hint`)}
          </p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-md border p-3">
        <div className="min-w-0 space-y-0.5">
          <Label htmlFor={signupId}>{t(`${NS}.steps.brandPack.fields.openSignup.label`)}</Label>
          <p id={`${signupId}-hint`} className="text-xs text-muted-foreground">
            {t(`${NS}.steps.brandPack.fields.openSignup.hint`)}
          </p>
        </div>
        <Switch
          id={signupId}
          data-testid="brand-pack-openSignup"
          aria-describedby={`${signupId}-hint`}
          checked={values.openSignup}
          onCheckedChange={(c) => setValues((prev) => ({ ...prev, openSignup: c, openSignupTouched: true }))}
        />
      </div>

      {showOverride && (
        <div className="space-y-2 rounded-md border border-destructive p-3" data-testid="brand-pack-override">
          <p className="text-sm">{t(`${NS}.steps.brandPack.overrideExplanation`)}</p>
          <Field
            id={fieldId('overrideReason')}
            field="overrideReason"
            value={values.overrideReason}
            onChange={set('overrideReason')}
            error={errorFor('overrideReason')}
            multiline
            hint
          />
        </div>
      )}

      <Collapsible open={personaOpen} onOpenChange={setPersonaOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between px-0"
            data-testid="brand-pack-persona-toggle"
          >
            <span>{t(`${NS}.steps.brandPack.personaToggle`)}</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', personaOpen && 'rotate-180')} aria-hidden />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2" data-testid="brand-pack-persona">
          <p className="text-xs text-muted-foreground">{t(`${NS}.steps.brandPack.personaHint`)}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id={fieldId('communityName')}
              field="communityName"
              value={values.communityName}
              onChange={set('communityName')}
              error={errorFor('communityName')}
            />
            <Field
              id={fieldId('communityPronunciation')}
              field="communityPronunciation"
              value={values.communityPronunciation}
              onChange={set('communityPronunciation')}
              error={errorFor('communityPronunciation')}
              hint
            />
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">{t(`${NS}.steps.brandPack.anchorLegend`)}</legend>
            <div className="grid gap-4 md:grid-cols-3">
              {(['anchorName', 'anchorPronunciation', 'anchorRole'] as const).map((f) => (
                <Field key={f} id={fieldId(f)} field={f} value={values[f]} onChange={set(f)} error={errorFor(f)} />
              ))}
            </div>
          </fieldset>
          {(['storyFacts', 'offerFacts', 'tone'] as const).map((f) => (
            <Field key={f} id={fieldId(f)} field={f} value={values[f]} onChange={set(f)} error={errorFor(f)} multiline hint />
          ))}
        </CollapsibleContent>
      </Collapsible>

      {showErrors && errors.form && (
        <p role="alert" className="text-sm text-destructive" data-testid="brand-pack-form-error">
          {t(`${NS}.validation.${errors.form}`)}
        </p>
      )}
      {serverErrorKey && (
        <p role="alert" className="text-sm text-destructive" data-testid="brand-pack-server-error">
          {t(serverErrorKey)}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={busy} aria-busy={busy || undefined} data-testid="brand-pack-submit">
          {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />}
          {busy ? t(`${NS}.steps.brandPack.submitting`) : t(`${NS}.steps.brandPack.submit`)}
        </Button>
      </div>
    </form>
  );
}
