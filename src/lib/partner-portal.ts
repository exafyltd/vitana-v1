/** Shared Partner Portal presentation helpers (VTID-03546). */
export const stateBadgeVariant = (state: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (state === 'active' || state === 'certified') return 'default';
  if (state === 'revoked' || state === 'failed') return 'destructive';
  if (state === 'approval_required' || state === 'authorization_required') return 'outline';
  return 'secondary';
};
