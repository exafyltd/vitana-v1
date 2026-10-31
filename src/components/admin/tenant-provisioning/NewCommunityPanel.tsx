/**
 * VTID-05221 — exafy-admin "New community" panel, mounted inline on
 * /admin/system/tenants (TenantManagement.tsx) only for exafy admins; the
 * gateway enforces exafy_admin on every call as well.
 *
 * Three explicit steps: 1 create the tenant → 2 brand pack → 3 assets +
 * readiness. Nothing is written on render; every write is a button press
 * inside the step forms.
 */
import { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { VCard } from '@/components/ui/vcard';
import { t } from '@/lib/i18n-toast';
import type { ProvisionedTenant } from '@/lib/tenant-provisioning-api';
import { ProvisionTenantForm } from './ProvisionTenantForm';
import { BrandPackForm } from './BrandPackForm';
import { AssetUpload } from './AssetUpload';
import { ReadinessChecklist } from './ReadinessChecklist';

const NS = 'tenantProvisioning.panel';
const STEPS = [1, 2, 3] as const;
type Step = (typeof STEPS)[number];

function StepIndicator({ current }: { current: Step }) {
  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:gap-4" aria-label={t(`${NS}.stepsLabel`)} data-testid="new-community-steps">
      {STEPS.map((step) => {
        const state = step < current ? 'done' : step === current ? 'current' : 'pending';
        const tone =
          state === 'current'
            ? 'border-primary text-primary'
            : state === 'done'
              ? 'border-status-success text-status-success'
              : 'border-border text-muted-foreground';
        return (
          <li
            key={step}
            className={`flex items-center gap-2 text-sm ${state === 'current' ? 'font-semibold' : ''}`}
            aria-current={state === 'current' ? 'step' : undefined}
            data-state={state}
          >
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${tone}`} aria-hidden="true">
              {state === 'done' ? <Check className="size-3" /> : step}
            </span>
            <span>{t(`${NS}.steps.${step}`)}</span>
            <span className="sr-only">{t(`${NS}.stepState.${state}`)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function NewCommunityPanel() {
  const headingId = useId();
  const [step, setStep] = useState<Step>(1);
  const [tenant, setTenant] = useState<ProvisionedTenant | null>(null);
  const [uploads, setUploads] = useState(0);

  const onProvisioned = (created: ProvisionedTenant) => {
    setTenant(created);
    setStep(2);
  };

  return (
    <section data-testid="new-community-panel" aria-labelledby={headingId} className="space-y-4">
      <VCard
        size="standard"
        as="div"
        eyebrow={t(`${NS}.eyebrow`)}
        title={<h2 id={headingId}>{t(`${NS}.title`)}</h2>}
        meta={t(`${NS}.stepOf`, { step, total: STEPS.length })}
        body={t(`${NS}.description`)}
      />
      <StepIndicator current={step} />
      {tenant && (
        <p className="text-sm text-muted-foreground" data-testid="new-community-tenant">
          {t(`${NS}.tenantCreated`, { slug: tenant.slug })}
        </p>
      )}
      <div className="rounded-vcard border bg-card p-4 text-card-foreground">
        {step === 1 && <ProvisionTenantForm onProvisioned={onProvisioned} />}
        {step === 2 && tenant && <BrandPackForm tenantId={tenant.id} onSaved={() => setStep(3)} />}
        {step === 3 && tenant && (
          <div className="space-y-6">
            <AssetUpload tenantId={tenant.id} onUploaded={() => setUploads((n) => n + 1)} />
            <ReadinessChecklist tenantId={tenant.id} refreshSignal={uploads} />
          </div>
        )}
      </div>
    </section>
  );
}
