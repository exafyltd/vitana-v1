// Profile visibility scope system
export type Scope = 'owner' | 'followers' | 'public';

export interface ScopeContext {
  isOwner: boolean;
  isFollower: boolean;
  editMode: boolean;
  viewAs?: 'me' | 'public' | 'follower';
}

export function getScope(ctx: ScopeContext): Scope {
  if (ctx.editMode && ctx.isOwner) {
    // In edit mode, respect the viewAs setting
    switch (ctx.viewAs) {
      case 'follower': return 'followers';
      case 'public': return 'public';
      default: return 'owner';
    }
  }
  
  if (ctx.isOwner) return 'owner';
  if (ctx.isFollower) return 'followers';
  return 'public';
}

export function shouldShowField(
  fieldVisibility: 'public' | 'followers' | 'private',
  scope: Scope
): boolean {
  switch (fieldVisibility) {
    case 'public': return true;
    case 'followers': return scope === 'owner' || scope === 'followers';
    case 'private': return scope === 'owner';
    default: return false;
  }
}