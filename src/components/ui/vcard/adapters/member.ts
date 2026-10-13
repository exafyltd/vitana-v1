/**
 * VTID-05110 — community member → VCard slots (rail / row lists). Pure (no
 * hooks, no JSX). Links through `profilePath`, the one place that defines
 * where a member's profile lives.
 *
 * Callers pass only members they are already allowed to show (e.g. the people
 * the viewer follows); this adapter never decides who is listed.
 */
import { t } from '@/lib/i18n-toast';
import { profilePath } from '@/lib/profile-path';
import type { VCardData } from './index';

export interface MemberLike {
  user_id: string;
  display_name?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
}

export function memberToVCard(member: MemberLike): VCardData {
  const name = member.display_name?.trim() || t('spotlightSocial.common.member');
  const handle = member.handle?.trim();
  return {
    key: member.user_id,
    media: { src: member.avatar_url || null, alt: name },
    title: name,
    meta: handle ? `@${handle}` : undefined,
    href: profilePath(member.user_id, member.handle) ?? undefined,
  };
}
