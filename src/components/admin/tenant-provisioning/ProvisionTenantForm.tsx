/**
 * VTID-05221 — step 1 of the exafy-admin "New community" panel.
 *
 * Fields are exactly ProvisionTenantSchema (gateway
 * services/tenant-provisioning/schemas.ts). Nothing is sent on render; the
 * POST /api/v1/admin/tenants call happens only when the admin presses the
 * create button and every field passes the client checks in ./validation.
 */
import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notify, notifyError, t } from '@/lib/i18n-toast';
import {
  provisionTenant,
  TenantProvisioningError,
  type ProvisionedTenant,
} from '@/lib/tenant-provisioning-api';
import {
  buildProvisionBody,
  emptyProvisionForm,
  validateProvisionForm,
  type ProvisionField,
  type ProvisionFormValues,
  type ValidationKey,
} from './validation';

const NS = 'tenantProvisioning';
const FALLBACK_ERROR_KEY = `${NS}.steps.provision.failed`;
/** Server codes that are about the slug field itself. */
const SLUG_SERVER_CODES = new Set(['RESERVED_SLUG', 'SLUG_TAKEN']);

/** Field order — also the order the first invalid field is focused in. */
const FIELD_ORDER: ProvisionField[] = [
  'slug',
  'name',
  'displayName',
  'adminEmail',
  'allMembersGroupName',
  'defaultLocale',
  'enabledLocales',
  'timezone',
  'currency',
  'jevBudget',
];

interface FieldProps {
  id: string;
  field: ProvisionField;
  value: string;
  onChange: (value: string) => void;
  error: ValidationKey | null;
  serverError?: string | null;
  required?: boolean;
  ltr?: boolean;
  inputMode?: 'text' | 'email' | 'decimal';
  type?: 'text' | 'email';
  autoComplete?: string;
}

function Field({
  id,
  field,
  value,
  onChange,
  error,
  serverError,
  required,
  ltr,
  inputMode,
  type = 'text',
  autoComplete = 'off',
}: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = Boolean(error || serverError);
  return (
    <div className="space-y-1.5 text-start">
      <Label htmlFor={id}>
        {t(`${NS}.steps.provision.fields.${field}.label`)}
        {!required && <span className="ms-1 text-xs font-normal text-muted-foreground">{t(`${NS}.steps.provision.optional`)}</span>}
      </Label>
      <Input
        id={id}
        data-testid={`provision-${field}`}
        type={type}
        dir={ltr ? 'ltr' : undefined}
        className={ltr ? 'text-start' : undefined}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${errorId} ${hintId}` : hintId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p id={hintId} className="text-xs text-muted-foreground">
        {t(`${NS}.steps.provision.fields.${field}.hint`)}
      </p>
      {invalid && (
        <p id={errorId} className="text-xs text-destructive" data-testid={`provision-error-${field}`}>
          {error ? t(`${NS}.validation.${error}`) : t(serverError as string)}
        </p>
      )}
    </div>
  );
}

export function ProvisionTenantForm({ onProvisioned }: { onProvisioned: (tenant: ProvisionedTenant) => void }) {
  const ids = useId();
  const [values, setValues] = useState<ProvisionFormValues>(emptyProvisionForm);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<{ key: string; code: string | null } | null>(null);

  const errors = validateProvisionForm(values);
  const fieldId = (f: ProvisionField) => `${ids}-${f}`;
  const errorFor = (f: ProvisionField): ValidationKey | null => (showErrors ? errors[f] ?? null : null);
  const set = (f: ProvisionField) => (v: string) => {
    setValues((prev) => ({ ...prev, [f]: v }));
    if (f === 'slug' && serverError?.code && SLUG_SERVER_CODES.has(serverError.code)) setServerError(null);
  };
  const slugServerError = serverError?.code && SLUG_SERVER_CODES.has(serverError.code) ? serverError.key : null;

  const submit = async () => {
    if (busy) return;
    setShowErrors(true);
    const firstInvalid = FIELD_ORDER.find((f) => errors[f]);
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }
    setBusy(true);
    setServerError(null);
    try {
      const tenant = await provisionTenant(buildProvisionBody(values));
      notify(`${NS}.steps.provision.success`, undefined, { slug: tenant.slug });
      onProvisioned(tenant);
    } catch (e) {
      const key = e instanceof TenantProvisioningError ? e.i18nKey : FALLBACK_ERROR_KEY;
      const code = e instanceof TenantProvisioningError ? e.code : null;
      setServerError({ key, code });
      notifyError(key);
      if (code && SLUG_SERVER_CODES.has(code)) document.getElementById(fieldId('slug'))?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      aria-labelledby={`${ids}-title`}
      data-testid="provision-tenant-form"
      className="space-y-5 text-start"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="space-y-1">
        <h3 id={`${ids}-title`} className="text-base font-semibold">
          {t(`${NS}.steps.provision.title`)}
        </h3>
        <p className="text-sm text-muted-foreground">{t(`${NS}.steps.provision.description`)}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id={fieldId('slug')}
          field="slug"
          value={values.slug}
          onChange={(v) => set('slug')(v.toLowerCase())}
          error={errorFor('slug')}
          serverError={slugServerError}
          required
          ltr
        />
        <Field id={fieldId('name')} field="name" value={values.name} onChange={set('name')} error={errorFor('name')} required />
        <Field
          id={fieldId('displayName')}
          field="displayName"
          value={values.displayName}
          onChange={set('displayName')}
          error={errorFor('displayName')}
        />
        <Field
          id={fieldId('adminEmail')}
          field="adminEmail"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.adminEmail}
          onChange={set('adminEmail')}
          error={errorFor('adminEmail')}
          required
          ltr
        />
        <Field
          id={fieldId('allMembersGroupName')}
          field="allMembersGroupName"
          value={values.allMembersGroupName}
          onChange={set('allMembersGroupName')}
          error={errorFor('allMembersGroupName')}
          required
        />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">{t(`${NS}.steps.provision.regionalLegend`)}</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id={fieldId('defaultLocale')}
            field="defaultLocale"
            value={values.defaultLocale}
            onChange={set('defaultLocale')}
            error={errorFor('defaultLocale')}
            ltr
          />
          <Field
            id={fieldId('enabledLocales')}
            field="enabledLocales"
            value={values.enabledLocales}
            onChange={set('enabledLocales')}
            error={errorFor('enabledLocales')}
            ltr
          />
          <Field
            id={fieldId('timezone')}
            field="timezone"
            value={values.timezone}
            onChange={set('timezone')}
            error={errorFor('timezone')}
            ltr
          />
          <Field
            id={fieldId('currency')}
            field="currency"
            value={values.currency}
            onChange={(v) => set('currency')(v.toUpperCase())}
            error={errorFor('currency')}
            ltr
          />
          <Field
            id={fieldId('jevBudget')}
            field="jevBudget"
            inputMode="decimal"
            value={values.jevBudget}
            onChange={set('jevBudget')}
            error={errorFor('jevBudget')}
            ltr
          />
        </div>
      </fieldset>

      {serverError && !slugServerError && (
        <p role="alert" className="text-sm text-destructive" data-testid="provision-server-error">
          {t(serverError.key)}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={busy} aria-busy={busy || undefined} data-testid="provision-submit">
          {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />}
          {busy ? t(`${NS}.steps.provision.submitting`) : t(`${NS}.steps.provision.submit`)}
        </Button>
      </div>
    </form>
  );
}
