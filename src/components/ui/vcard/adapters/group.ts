/**
 * VTID-05110 — community group → VCard slots. Pure (no hooks, no JSX). The
 * cover falls back to the same deterministic group image the Groups list has
 * always used (`generateGroupImage`), so desktop and phone match.
 */
import { generateGroupImage } from '@/lib/groupCardTransformers';
import { t } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';
import type { VCardData } from './index';

export interface GroupLike {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  cover_url?: string | null;
  member_count?: number | null;
}

export function groupToVCard(group: GroupLike): VCardData {
  return {
    key: group.id,
    media: { src: group.cover_url || generateGroupImage(group.id), alt: '' },
    eyebrow: group.category?.trim() || undefined,
    title: group.name,
    meta:
      typeof group.member_count === 'number'
        ? t('spotlightSocial.common.membersCount', { count: fmtNumber(group.member_count) })
        : undefined,
    body: group.description?.trim() || undefined,
    href: `/comm/groups/${encodeURIComponent(group.id)}`,
  };
}
