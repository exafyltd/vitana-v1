/**
 * VTID-05221 — step 3 of the exafy-admin "New community" panel: logo, favicon
 * and og_image. Only png/jpeg/webp (the gateway's ALLOWED_ASSET_TYPES); any
 * other file is refused here before it is sent. Nothing is uploaded until the
 * admin presses the row's upload button.
 */
import { useId, useState, type ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t } from '@/lib/i18n-toast';
import {
  ALLOWED_ASSET_MIME,
  ASSET_KINDS,
  TenantProvisioningError,
  uploadTenantAsset,
  type AssetKind,
} from '@/lib/tenant-provisioning-api';

const NS = 'tenantProvisioning.steps.assets';
const ACCEPT = ALLOWED_ASSET_MIME.join(',');

function isAllowedMime(type: string): boolean {
  return (ALLOWED_ASSET_MIME as readonly string[]).includes(type);
}

function errorText(err: unknown): string {
  return err instanceof TenantProvisioningError && err.i18nKey ? t(err.i18nKey) : t(`${NS}.uploadFailed`);
}

function AssetRow({ tenantId, kind, onUploaded }: { tenantId: string; kind: AssetKind; onUploaded: () => void }) {
  const baseId = useId();
  const inputId = `${baseId}-file`;
  const hintId = `${baseId}-hint`;
  const statusId = `${baseId}-status`;
  const [file, setFile] = useState<File | null>(null);
  const [typeError, setTypeError] = useState(false);

  const mutation = useMutation({
    mutationFn: (f: File) => uploadTenantAsset(tenantId, kind, f),
    onSuccess: () => onUploaded(),
  });

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    mutation.reset();
    const picked = e.target.files?.[0] ?? null;
    if (picked && !isAllowedMime(picked.type)) {
      setFile(null);
      setTypeError(true);
      e.target.value = '';
      return;
    }
    setTypeError(false);
    setFile(picked);
  };

  const onUpload = () => {
    if (!file || mutation.isPending) return;
    mutation.mutate(file);
  };

  return (
    <li className="space-y-2 py-3" data-testid={`asset-row-${kind}`}>
      <div className="space-y-1">
        <Label htmlFor={inputId}>{t(`${NS}.kinds.${kind}.label`)}</Label>
        <p id={hintId} className="text-xs text-muted-foreground">
          {t(`${NS}.kinds.${kind}.hint`)} {t(`${NS}.allowedTypes`)}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          id={inputId}
          type="file"
          accept={ACCEPT}
          onChange={onChange}
          aria-describedby={`${hintId} ${statusId}`}
          aria-invalid={typeError || undefined}
          className="sm:flex-1"
        />
        <Button type="button" onClick={onUpload} disabled={!file || mutation.isPending}>
          <Upload className="me-2 size-4" aria-hidden="true" />
          {mutation.isPending ? t(`${NS}.uploading`) : t(`${NS}.upload`)}
        </Button>
      </div>
      <div id={statusId} aria-live="polite" className="text-sm">
        {typeError && (
          <p role="alert" className="text-status-error">
            {t(`${NS}.invalidType`)}
          </p>
        )}
        {mutation.isError && (
          <p role="alert" className="text-status-error">
            {errorText(mutation.error)}
          </p>
        )}
        {mutation.isSuccess && <p className="text-status-success">{t(`${NS}.uploaded`)}</p>}
      </div>
    </li>
  );
}

export function AssetUpload({ tenantId, onUploaded }: { tenantId: string; onUploaded: () => void }) {
  return (
    <section className="space-y-2" aria-labelledby="tenant-assets-heading" data-testid="asset-upload">
      <h3 id="tenant-assets-heading" className="text-base font-semibold">
        {t(`${NS}.title`)}
      </h3>
      <p className="text-sm text-muted-foreground">{t(`${NS}.description`)}</p>
      <ul className="divide-y">
        {ASSET_KINDS.map((kind) => (
          <AssetRow key={kind} tenantId={tenantId} kind={kind} onUploaded={onUploaded} />
        ))}
      </ul>
    </section>
  );
}
